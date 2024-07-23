use crate::utils::{
    connection::connect,
    update_listener::{listen_to_updates, ListenerConfig},
};
use anyhow::Result;
use base64::{engine::general_purpose, Engine};
use chrono::{DateTime, Utc};
use envconfig::Envconfig;
use futures::future::join_all;
use solana_sdk::{pubkey::Pubkey, signature::Signature, transaction::TransactionVersion};
use solana_transaction_status::{
    TransactionWithStatusMeta, UiTransactionStatusMeta, VersionedTransactionWithStatusMeta,
};
use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    sync::{Arc, Mutex},
};
use tracing::{debug, error};
use uuid::Uuid;
use yellowstone_grpc_proto::{
    convert_from,
    geyser::{
        subscribe_update::UpdateOneof, CommitmentLevel, SubscribeRequest,
        SubscribeRequestFilterSlots, SubscribeRequestFilterTransactions,
    },
};

#[derive(Envconfig, Debug, Clone)]
pub struct IndexTransactionsConfig {
    #[envconfig(from = "INDEX_TRANSACTIONS_RPC_ENDPOINT")]
    pub rpc_endpoint: String,
    #[envconfig(from = "INDEX_TRANSACTIONS_RPC_TOKEN")]
    pub rpc_token: String,
    #[envconfig(from = "INDEX_TRANSACTIONS_TABLE_NAME")]
    pub table_name: String,
    #[envconfig(from = "INDEX_TRANSACTIONS_PROGRAM_ID")]
    pub program_id: Pubkey,
}

#[derive(Debug, Clone)]
pub struct TransactionData {
    pub timestamp: DateTime<Utc>,
    pub slot: u64,
    pub signature: Signature,
    pub transaction: VersionedTransactionWithStatusMeta,
}

pub struct IndexTransactionsContext {
    buffers: Arc<IndexTransactionsBuffers>,
    config: Arc<IndexTransactionsConfig>,
}

pub struct IndexTransactionsBuffers {
    pub transactions_queue: Arc<Mutex<BTreeMap<u64, Vec<TransactionData>>>>,
    pub lastest_slot_with_commitment: Arc<Mutex<BTreeSet<u64>>>,
}

#[allow(clippy::new_without_default)]
impl IndexTransactionsBuffers {
    pub fn new() -> Self {
        Self {
            transactions_queue: Arc::new(Mutex::new(BTreeMap::new())),
            lastest_slot_with_commitment: Arc::new(Mutex::new(BTreeSet::new())),
        }
    }
}

pub async fn index_transactions(config: IndexTransactionsConfig) -> Result<()> {
    let context = Arc::new(IndexTransactionsContext {
        buffers: Arc::new(IndexTransactionsBuffers::new()),
        config: Arc::new(config),
    });

    let listener_config = ListenerConfig {
        endpoint: context.config.rpc_endpoint.clone(),
        token: Some(context.config.rpc_token.clone()),
        subscribe_request: SubscribeRequest {
            slots: HashMap::from_iter([(
                "client".to_string(),
                SubscribeRequestFilterSlots {
                    filter_by_commitment: Some(false),
                },
            )]),
            transactions: HashMap::from_iter([(
                context.config.program_id.to_string(),
                SubscribeRequestFilterTransactions {
                    vote: Some(false),
                    failed: Some(false),
                    account_include: vec![context.config.program_id.to_string()],
                    account_exclude: vec![],
                    ..Default::default()
                },
            )]),
            commitment: Some(CommitmentLevel::Processed as i32),
            ..Default::default()
        },
    };

    let listen_to_updates_handle = {
        let buffers = context.buffers.clone();
        tokio::spawn(async move {
            if let Err(err) = listen_to_updates::<_, IndexTransactionsBuffers, _>(
                listener_config,
                process_update,
                buffers.clone(),
            )
            .await
            {
                tracing::error!("Error listening to updates: {:?}", err);
            }
        })
    };

    let push_transactions_handle = {
        let context = context.clone();
        tokio::spawn(async move {
            if let Err(err) = push_transactions(context).await {
                tracing::error!("Error pushing transactions: {:?}", err);
            }
        })
    };

    join_all([listen_to_updates_handle, push_transactions_handle]).await;

    Ok(())
}

async fn process_update(update: UpdateOneof, buffers: Arc<IndexTransactionsBuffers>) {
    match update {
        UpdateOneof::Transaction(transaction_update) => {
            if let Some(transaction_info) = transaction_update.transaction {
                let signature = Signature::try_from(transaction_info.signature.clone()).unwrap();
                let transaction = convert_from::create_tx_with_meta(transaction_info).unwrap();

                let mut transactions_queue = buffers.transactions_queue.lock().unwrap();
                let slot_transactions = match transactions_queue.get_mut(&transaction_update.slot) {
                    Some(slot_transactions) => slot_transactions,
                    None => {
                        transactions_queue.insert(transaction_update.slot, vec![]);
                        transactions_queue
                            .get_mut(&transaction_update.slot)
                            .unwrap()
                    }
                };

                let transaction = match transaction {
                    TransactionWithStatusMeta::MissingMetadata(_) => {
                        return;
                    }
                    TransactionWithStatusMeta::Complete(transaction) => transaction,
                };

                slot_transactions.push(TransactionData {
                    timestamp: Utc::now(),
                    slot: transaction_update.slot,
                    signature,
                    transaction,
                });
            }
        }
        UpdateOneof::Slot(slot_update) => {
            if slot_update.status == CommitmentLevel::Confirmed as i32
                || slot_update.status == CommitmentLevel::Finalized as i32
            {
                let mut latest_slots = buffers.lastest_slot_with_commitment.lock().unwrap();
                let slot_inserted = latest_slots.insert(slot_update.slot);
                if slot_inserted && latest_slots.len() > 50 {
                    let oldest_slot = *latest_slots.first().unwrap();
                    latest_slots.remove(&oldest_slot);
                }
            }
        }
        _ => {}
    }
}

async fn push_transactions(ctx: Arc<IndexTransactionsContext>) -> Result<()> {
    let client = connect().await?;

    loop {
        let mut transactions_data: Vec<TransactionData> = vec![];
        {
            let mut transactions_per_slot = ctx.buffers.transactions_queue.lock().unwrap();
            let latest_slots_with_commitment =
                ctx.buffers.lastest_slot_with_commitment.lock().unwrap();

            // Remove all transactions recevied in a lot that has not been confirmed in a alloted time
            if let Some(oldest_slot_with_commitment) = latest_slots_with_commitment.first() {
                transactions_per_slot.retain(|slot, transactions| {
                    if slot < oldest_slot_with_commitment {
                        debug!(
                            "throwing away txs {:?} from slot {}",
                            transactions
                                .iter()
                                .map(|tx| tx.signature.to_string())
                                .collect::<Vec<String>>(),
                            slot
                        );
                    }

                    slot >= oldest_slot_with_commitment
                });
            }

            // Add transactions from confirmed slots to the queue of transactions to be indexed
            for (slot, slot_transactions) in transactions_per_slot.clone().iter() {
                if let Some(latest_slot_with_commitment) = latest_slots_with_commitment.last() {
                    if slot > latest_slot_with_commitment {
                        break; // Ok because transactions_per_slot is sorted (BtreeMap)
                    }
                }

                if latest_slots_with_commitment.contains(slot) {
                    transactions_data.extend(slot_transactions.clone());
                    transactions_per_slot.remove(slot);
                }
            }
        }

        if transactions_data.is_empty() {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            continue;
        }

        for transaction_data in transactions_data {
            let now = Utc::now();

            let version = match transaction_data.transaction.transaction.version() {
                TransactionVersion::Legacy(_) => "legacy".to_string(),
                TransactionVersion::Number(version) => version.to_string(),
            };

            let meta_json = serde_json::to_string(&UiTransactionStatusMeta::from(
                transaction_data.transaction.meta.clone(),
            ))
            .unwrap_or_default();

            let message_encoded = general_purpose::STANDARD
                .encode(transaction_data.transaction.transaction.message.serialize());

            let signer = transaction_data
                .transaction
                .transaction
                .message
                .static_account_keys()
                .first()
                .unwrap()
                .to_string();

            if let Err(err) = sqlx::query(&insert_payload(&ctx.config.table_name))
                .bind(Uuid::new_v4().to_string())
                .bind(now)
                .bind(transaction_data.timestamp)
                .bind(transaction_data.signature.to_string())
                .bind(transaction_data.slot as i64)
                .bind(&signer)
                .bind(transaction_data.transaction.meta.status.is_ok())
                .bind(&version)
                .bind(transaction_data.transaction.meta.fee as i64)
                .bind(&meta_json)
                .bind(&message_encoded)
                .execute(&client)
                .await
            {
                error!("Error inserting transaction: {:?}", err);
            }
        }
    }
}

fn insert_payload(table_name: &str) -> String {
    let payload = r#"
                INSERT INTO {table_name} (
                    id, created_at, timestamp, signature, slot, signer,
                    success, version, fee, meta, message
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                )
                "#;

    payload.replace("{table_name}", table_name)
}
