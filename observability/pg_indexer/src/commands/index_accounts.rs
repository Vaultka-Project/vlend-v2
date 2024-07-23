use anyhow::Result;
use base64::{engine::general_purpose, Engine};
use chrono::{DateTime, Utc};
use envconfig::Envconfig;
use futures::future::join_all;
use solana_sdk::{account::Account, pubkey::Pubkey, signature::Signature};
use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    sync::{Arc, Mutex},
};
use tracing::{debug, error};
use uuid::Uuid;
use yellowstone_grpc_proto::geyser::{
    subscribe_update::UpdateOneof, CommitmentLevel, SubscribeRequest,
    SubscribeRequestFilterAccounts, SubscribeRequestFilterSlots,
};

use crate::utils::{
    connection::connect,
    convert_account,
    update_listener::{listen_to_updates, ListenerConfig},
};

#[derive(Envconfig, Debug, Clone)]
pub struct IndexAccountsConfig {
    #[envconfig(from = "INDEX_ACCOUNTS_RPC_ENDPOINT")]
    pub rpc_endpoint: String,
    #[envconfig(from = "INDEX_ACCOUNTS_RPC_TOKEN")]
    pub rpc_token: String,
    #[envconfig(from = "INDEX_ACCOUNTS_TABLE_NAME")]
    pub table_name: String,
    #[envconfig(from = "INDEX_ACCOUNTS_PROGRAM_ID")]
    pub program_id: Pubkey,
}

#[derive(Debug, Clone)]
pub struct AccountUpdateData {
    pub timestamp: DateTime<Utc>,
    pub slot: u64,
    pub address: Pubkey,
    pub txn_signature: Option<Signature>,
    pub write_version: Option<i64>,
    pub account_data: Account,
}

pub struct IndexAccountsContext {
    buffers: Arc<IndexAccountsBuffers>,
    config: Arc<IndexAccountsConfig>,
}

pub struct IndexAccountsBuffers {
    account_updates_queue: Arc<Mutex<BTreeMap<u64, HashMap<Pubkey, AccountUpdateData>>>>,
    latest_slots_with_commitment: Arc<Mutex<BTreeSet<u64>>>,
}

#[allow(clippy::new_without_default)]
impl IndexAccountsBuffers {
    pub fn new() -> Self {
        Self {
            account_updates_queue: Arc::new(Mutex::new(BTreeMap::new())),
            latest_slots_with_commitment: Arc::new(Mutex::new(BTreeSet::new())),
        }
    }
}

pub async fn index_accounts(config: IndexAccountsConfig) -> Result<()> {
    let context = Arc::new(IndexAccountsContext {
        buffers: Arc::new(IndexAccountsBuffers::new()),
        config: Arc::new(config),
    });

    let listener_config = ListenerConfig {
        endpoint: context.config.rpc_endpoint.clone(),
        token: Some(context.config.rpc_token.clone()),
        subscribe_request: SubscribeRequest {
            accounts: HashMap::from_iter([(
                context.config.program_id.to_string(),
                SubscribeRequestFilterAccounts {
                    owner: vec![context.config.program_id.to_string()],
                    account: vec![],
                    ..Default::default()
                },
            )]),
            slots: HashMap::from_iter([(
                "slots".to_string(),
                SubscribeRequestFilterSlots::default(),
            )]),
            ..Default::default()
        },
    };

    let listen_to_updates_handle = {
        let buffers = context.buffers.clone();
        tokio::spawn(async move {
            if let Err(err) = listen_to_updates::<_, IndexAccountsBuffers, _>(
                listener_config,
                process_update,
                buffers.clone(),
            )
            .await
            {
                error!("Error listening to updates: {:?}", err);
            }
        })
    };

    let push_accounts_handle = {
        let context = context.clone();
        tokio::spawn(async move {
            if let Err(err) = push_transactions(context).await {
                error!("Error pushing transactions: {:?}", err);
            }
        })
    };

    join_all([listen_to_updates_handle, push_accounts_handle]).await;

    Ok(())
}

async fn process_update(update: UpdateOneof, buffers: Arc<IndexAccountsBuffers>) {
    match update {
        UpdateOneof::Account(account_update) => {
            let update_slot = account_update.slot;
            if let Some(account_info) = account_update.account {
                let address = &Pubkey::try_from(account_info.pubkey.clone()).unwrap();
                let txn_signature = account_info
                    .txn_signature
                    .clone()
                    .map(|sig_bytes| Signature::try_from(sig_bytes).unwrap());

                let mut account_updates_queue = buffers.account_updates_queue.lock().unwrap();

                let slot_account_updates = match account_updates_queue.get_mut(&update_slot) {
                    Some(slot_account_updats) => slot_account_updats,
                    None => {
                        account_updates_queue.insert(update_slot, HashMap::new());
                        account_updates_queue.get_mut(&update_slot).unwrap()
                    }
                };

                slot_account_updates.insert(
                    *address,
                    AccountUpdateData {
                        address: *address,
                        timestamp: Utc::now(),
                        slot: update_slot,
                        txn_signature,
                        write_version: Some(account_info.write_version as i64),
                        account_data: convert_account(account_info).unwrap(),
                    },
                );
            }
        }
        UpdateOneof::Slot(slot_update) => {
            if slot_update.status == CommitmentLevel::Confirmed as i32
                || slot_update.status == CommitmentLevel::Processed as i32
            {
                let mut latest_slots = buffers.latest_slots_with_commitment.lock().unwrap();
                let slot_inserted = latest_slots.insert(slot_update.slot);
                if slot_inserted && latest_slots.len() > 50 {
                    let oldest_slots = *latest_slots.first().unwrap();
                    latest_slots.remove(&oldest_slots);
                }
            }
        }
        _ => {}
    }
}

async fn push_transactions(ctx: Arc<IndexAccountsContext>) -> Result<()> {
    let client = connect().await?;

    loop {
        let mut account_updates_data: Vec<AccountUpdateData> = vec![];
        {
            let mut account_updates_per_slot = ctx.buffers.account_updates_queue.lock().unwrap();
            let latest_slots_with_commitment =
                ctx.buffers.latest_slots_with_commitment.lock().unwrap();

            // Remove all transactions received in a slot that has not been confirmed in allotted time
            if let Some(oldest_slot_with_commitment) = latest_slots_with_commitment.first() {
                account_updates_per_slot.retain(|slot, account_updates| {
                    if slot < oldest_slot_with_commitment {
                        debug!(
                            "throwing away txs {:?} from slot {}",
                            account_updates
                                .iter()
                                .map(|(address, _)| address.to_string())
                                .collect::<Vec<String>>(),
                            slot
                        );
                    }

                    slot >= oldest_slot_with_commitment
                });
            }

            // Add transactions from confirmed slots to the queue of transactions to be indexed
            for (slot, slot_account_updates) in account_updates_per_slot.clone().iter() {
                if let Some(latest_slot_with_commitment) = latest_slots_with_commitment.last() {
                    if slot > latest_slot_with_commitment {
                        break; // Ok because transactions_per_slot is sorted (BtreeMap)
                    }
                }

                if latest_slots_with_commitment.contains(slot) {
                    account_updates_data.extend(slot_account_updates.values().cloned());
                    account_updates_per_slot.remove(slot);
                }
            }
        }

        if account_updates_data.is_empty() {
            tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
            continue;
        }

        for account_data in account_updates_data {
            let now = Utc::now();

            if let Err(err) = sqlx::query(&insert_payload(&ctx.config.table_name))
                .bind(Uuid::new_v4().to_string())
                .bind(now)
                .bind(account_data.timestamp)
                .bind(account_data.account_data.owner.to_string())
                .bind(account_data.slot as i64)
                .bind(account_data.address.to_string())
                .bind(account_data.txn_signature.map(|sig| sig.to_string()))
                .bind(account_data.write_version)
                .bind(account_data.account_data.lamports as i64)
                .bind(account_data.account_data.executable)
                .bind(account_data.account_data.rent_epoch as i64)
                .bind(general_purpose::STANDARD.encode(&account_data.account_data.data))
                .execute(&client)
                .await
            {
                error!("Error inserting account data: {:?}", err);
            }
        }
    }
}

fn insert_payload(table_name: &str) -> String {
    let payload = r#"
        INSERT INTO {table_name} (
            id, created_at, timestamp, owner, slot, pubkey,
            txn_signature, write_version, lamports, executable, rent_epoch, data
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
    "#;

    payload.replace("{table_name}", table_name)
}
