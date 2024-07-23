use crate::utils::{
    connection::connect,
    convert_account,
    metrics::{LendingPoolBankMetrics, MarginfiAccountMetrics, MarginfiGroupMetrics},
    snapshot::{AccountRoutingType, BankUpdateRoutingType, Snapshot},
    update_listener::{listen_to_updates, ListenerConfig},
    PubkeyVec,
};
use anyhow::Result;
use chrono::{DateTime, Utc};
use envconfig::Envconfig;
use futures::future::join_all;
use itertools::Itertools;
use rayon::prelude::*;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{account::Account, pubkey::Pubkey, signature::Signature};
use sqlx::{PgPool, Postgres, QueryBuilder};
use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    sync::{
        atomic::{AtomicBool, AtomicI64},
        Arc,
    },
    time::{Duration, Instant},
};
use tokio::sync::Mutex;
use tracing::{debug, error, info};
use uuid::Uuid;
use yellowstone_grpc_proto::geyser::{
    subscribe_update::UpdateOneof, CommitmentLevel, SubscribeRequest,
    SubscribeRequestFilterAccounts, SubscribeRequestFilterBlocksMeta, SubscribeRequestFilterSlots,
};

#[derive(Envconfig, Debug, Clone)]
pub struct SnapshotAccountsConfig {
    #[envconfig(from = "SNAPSHOT_ACCOUNTS_RPC_ENDPOINT")]
    pub rpc_endpoint: String,
    #[envconfig(from = "SNAPSHOT_ACCOUNTS_RPC_ENDPOINT_GEYSER")]
    pub rpc_endpoint_geyser: String,
    #[envconfig(from = "SNAPSHOT_ACCOUNTS_RPC_TOKEN")]
    pub rpc_token: String,
    #[envconfig(from = "SNAPSHOT_ACCOUNTS_PROGRAM_ID")]
    pub program_id: Pubkey,
    #[envconfig(from = "SNAPSHOT_ACCOUNTS_ADDITIONAL_ACCOUNTS")]
    pub additional_accounts: PubkeyVec,

    #[envconfig(from = "SNAPSHOT_ACCOUNTS_TABLE_GROUP_METRICS")]
    pub table_group: String,
    #[envconfig(from = "SNAPSHOT_ACCOUNTS_TABLE_BANK_METRICS")]
    pub table_bank: String,
    #[envconfig(from = "SNAPSHOT_ACCOUNTS_TABLE_ACCOUNT_METRICS")]
    pub table_account: String,

    #[envconfig(from = "SNAPSHOT_INTERVAL")]
    pub snapshot_interval: u64,
    #[envconfig(from = "FORCED_SNAPSHOT_INTERVAL")]
    pub forced_snapshot_interval: u64,
}

#[derive(Clone, Debug)]
pub struct AccountUpdate {
    pub timestamp: DateTime<Utc>,
    pub slot: u64,
    pub address: Pubkey,
    pub txn_signature: Option<Signature>,
    pub write_version: Option<u64>,
    pub account_data: Account,
}

#[derive(Debug, Clone)]
pub struct SnapshotAccountBuffers {
    account_snapshot: Arc<Mutex<Snapshot>>,
    account_updates_queue: Arc<Mutex<BTreeMap<u64, HashMap<Pubkey, AccountUpdate>>>>,
    latest_slots_with_commitment: Arc<Mutex<BTreeSet<u64>>>,
    timestamp: Arc<AtomicI64>,
}

impl SnapshotAccountBuffers {
    pub fn new(config: SnapshotAccountsConfig, rpc_client: Arc<RpcClient>) -> Self {
        Self {
            account_snapshot: Arc::new(Mutex::new(Snapshot::new(
                config.program_id,
                rpc_client.clone(),
            ))),
            account_updates_queue: Arc::new(Mutex::new(BTreeMap::new())),
            latest_slots_with_commitment: Arc::new(Mutex::new(BTreeSet::new())),
            timestamp: Arc::new(AtomicI64::new(0)),
        }
    }
}

pub struct SnapshotAccountContext {
    pub config: SnapshotAccountsConfig,
    pub buffers: Arc<SnapshotAccountBuffers>,
    pub rpc_client: Arc<RpcClient>,
    // Flag to indicate if this is the first run of the indexer
    // so we dont push disabled accounts on the next runs
    pub first_run: AtomicBool,
}

impl SnapshotAccountContext {
    pub fn new(config: SnapshotAccountsConfig) -> Self {
        let rpc_client = Arc::new(RpcClient::new(config.rpc_endpoint.clone()));
        let buffers = Arc::new(SnapshotAccountBuffers::new(
            config.clone(),
            rpc_client.clone(),
        ));

        Self {
            config,
            rpc_client,
            buffers,
            first_run: AtomicBool::new(true),
        }
    }
}

pub async fn snapshot_accounts(config: SnapshotAccountsConfig) -> Result<()> {
    let context = Arc::new(SnapshotAccountContext::new(config));

    let non_program_accounts = {
        let mut snapshot = context.buffers.account_snapshot.lock().await;
        snapshot.init().await.unwrap();

        snapshot
            .routing_lookup
            .iter()
            .filter(|(_, routing_type)| match routing_type {
                AccountRoutingType::MarginfiGroup => false,
                AccountRoutingType::MarginfiAccount => false,
                AccountRoutingType::Bank(_, bank_update_routing_type) => {
                    !matches!(bank_update_routing_type, BankUpdateRoutingType::State)
                }
                _ => true,
            })
            .map(|(pubkey, _)| *pubkey)
            .unique()
            .collect_vec()
    };

    let geyser_subscription_config = compute_geyser_config(&context.config, &non_program_accounts);

    let listen_to_updates_handle = {
        let buffers = context.buffers.clone();
        tokio::spawn(async move {
            if let Err(err) = listen_to_updates::<_, SnapshotAccountBuffers, _>(
                geyser_subscription_config,
                process_update,
                buffers.clone(),
            )
            .await
            {
                error!("Error listening to updates: {:?}", err);
            }
        })
    };

    let update_account_map_handle = {
        let buffers = context.buffers.clone();
        tokio::spawn(async move {
            update_account_map(buffers).await;
        })
    };

    let push_snapshots_handle = {
        let ctx = context.clone();
        tokio::spawn(async move {
            if let Err(err) = push_snapshots(ctx).await {
                error!("Error pushing snapshots: {:?}", err);
            }
        })
    };

    join_all([
        listen_to_updates_handle,
        update_account_map_handle,
        push_snapshots_handle,
    ])
    .await;

    Ok(())
}

async fn process_update(update: UpdateOneof, buffers: Arc<SnapshotAccountBuffers>) {
    match update {
        UpdateOneof::Account(account_update) => {
            let update_slot = account_update.slot;
            if let Some(account_info) = account_update.account {
                let address = Pubkey::try_from(account_info.pubkey.clone()).unwrap();
                let txn_signature = account_info
                    .txn_signature
                    .clone()
                    .map(|sig_bytes| Signature::try_from(sig_bytes).unwrap());

                let mut account_updates_queue = buffers.account_updates_queue.lock().await;

                let slot_account_updates = match account_updates_queue.get_mut(&update_slot) {
                    Some(slot_account_updates) => slot_account_updates,
                    None => {
                        account_updates_queue.insert(update_slot, HashMap::new());
                        account_updates_queue.get_mut(&update_slot).unwrap()
                    }
                };

                slot_account_updates.insert(
                    address,
                    AccountUpdate {
                        address,
                        timestamp: Utc::now(),
                        slot: update_slot,
                        txn_signature,
                        write_version: Some(account_info.write_version),
                        account_data: convert_account(account_info).unwrap(),
                    },
                );
            }
        }
        UpdateOneof::Slot(slot_update) => {
            if slot_update.status == CommitmentLevel::Confirmed as i32
                || slot_update.status == CommitmentLevel::Processed as i32
            {
                let mut latest_slots = buffers.latest_slots_with_commitment.lock().await;
                let slot_inserted = latest_slots.insert(slot_update.slot);
                if slot_inserted && latest_slots.len() > 50 {
                    let oldest_slots = *latest_slots.first().unwrap();
                    latest_slots.remove(&oldest_slots);
                }
            }
        }
        UpdateOneof::BlockMeta(block_meta_update) => {
            if let Some(block_time) = block_meta_update.block_time {
                buffers
                    .timestamp
                    .store(block_time.timestamp, std::sync::atomic::Ordering::Relaxed);
            }
        }
        _ => {}
    }
}

async fn update_account_map(buffers: Arc<SnapshotAccountBuffers>) {
    loop {
        let mut confirmed_account_updates: Vec<AccountUpdate> = vec![];
        {
            let mut account_updates_per_slot = buffers.account_updates_queue.lock().await;
            let latest_slots_with_commitment = buffers.latest_slots_with_commitment.lock().await;

            // Remove all transactions received in a slot that has not been confirmed in allotted time
            if let Some(oldest_slot_with_commitment) = latest_slots_with_commitment.first() {
                account_updates_per_slot.retain(|slot, account_updates| {
                    if slot < oldest_slot_with_commitment {
                        debug!(
                            "throwing away txs {:?} from slot {}",
                            account_updates
                                .iter()
                                .map(|(address, _)| address.to_string())
                                .collect_vec(),
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
                    confirmed_account_updates.extend(slot_account_updates.values().cloned());
                    account_updates_per_slot.remove(slot);
                }
            }
        }

        if confirmed_account_updates.is_empty() {
            tokio::time::sleep(Duration::from_millis(10)).await;
            continue;
        }

        let mut accounts_snapshot = buffers.account_snapshot.lock().await;
        for account_update in confirmed_account_updates {
            if accounts_snapshot
                .routing_lookup
                .contains_key(&account_update.address)
            {
                accounts_snapshot
                    .udpate_entry(&account_update.address, &account_update.account_data);
            } else {
                accounts_snapshot
                    .create_entry(&account_update.address, &account_update.account_data)
                    .await;

                // TODO: Add new non_program_accounts into geyser sub req
            }
        }
    }
}

async fn push_snapshots(ctx: Arc<SnapshotAccountContext>) -> Result<()> {
    tokio::time::sleep(Duration::from_secs(5)).await;

    while ctx
        .buffers
        .timestamp
        .load(std::sync::atomic::Ordering::Relaxed)
        == 0
    {
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    loop {
        let client = connect().await?;

        let start = Instant::now();
        let mut snapshot = ctx.buffers.account_snapshot.lock().await;

        let timestamp = ctx
            .buffers
            .timestamp
            .load(std::sync::atomic::Ordering::Relaxed);

        let all_group_metrics = snapshot
            .marginfi_groups
            .par_iter()
            .map(|(marginfi_group_pk, marginfi_group)| {
                (
                    marginfi_group_pk,
                    MarginfiGroupMetrics::new(
                        timestamp,
                        marginfi_group_pk,
                        marginfi_group,
                        &snapshot,
                    )
                    .unwrap(),
                )
            })
            .collect::<Vec<_>>();

        let all_bank_metrics = snapshot
            .banks
            .par_iter()
            .map(|(bank_pk, bank_accounts)| {
                (
                    bank_pk,
                    LendingPoolBankMetrics::new(timestamp, bank_pk, bank_accounts, &snapshot)
                        .unwrap(),
                )
            })
            .collect::<Vec<_>>();

        let current_time = Utc::now();

        let (all_marginfi_account_metrics, accounts_to_update): (Vec<_>, HashMap<_, _>) = snapshot
            .marginfi_accounts
            .par_iter()
            .filter_map(|(marginfi_account_pk, marginfi_account)| {
                let time_elapsed_from_last_update =
                    current_time.timestamp() - marginfi_account.update_time.timestamp();

                if marginfi_account.pushed
                    && time_elapsed_from_last_update
                        < Duration::from_secs(60 * ctx.config.forced_snapshot_interval).as_secs()
                            as i64
                {
                    return None;
                }

                let metrics = MarginfiAccountMetrics::new(
                    timestamp,
                    marginfi_account_pk,
                    &marginfi_account.account,
                    &snapshot,
                )
                .unwrap();

                Some((
                    (*marginfi_account_pk, metrics),
                    (*marginfi_account_pk, current_time),
                ))
            })
            .unzip();

        let current_timestamp = Utc::now();

        for marginfi_group_metric in all_group_metrics {
            if let Err(err) = sqlx::query(&insert_metric_group_payload(&ctx.config.table_group))
                .bind(Uuid::new_v4().to_string())
                .bind(current_timestamp)
                .bind(DateTime::<Utc>::from_timestamp(timestamp, 0).expect("Invalid timestamp"))
                .bind(marginfi_group_metric.1.pubkey.to_string())
                .bind(marginfi_group_metric.1.marginfi_accounts_count as i32)
                .bind(marginfi_group_metric.1.banks_count as i32)
                .bind(marginfi_group_metric.1.mints_count as i32)
                .bind(marginfi_group_metric.1.total_assets_in_usd)
                .bind(marginfi_group_metric.1.total_liabilities_in_usd)
                .execute(&client)
                .await
            {
                error!("Error inserting marginfi group metrics: {:?}", err);
            }
        }

        for marginfi_bank_metric in all_bank_metrics {
            if let Err(err) = sqlx::query(&insert_metric_bank_payload(&ctx.config.table_bank))
                .bind(Uuid::new_v4().to_string())
                .bind(current_timestamp)
                .bind(DateTime::<Utc>::from_timestamp(timestamp, 0).expect("Invalid timestamp"))
                .bind(marginfi_bank_metric.1.pubkey.to_string())
                .bind(marginfi_bank_metric.1.marginfi_group.to_string())
                .bind(marginfi_bank_metric.1.mint.to_string())
                .bind(marginfi_bank_metric.1.usd_price)
                .bind(marginfi_bank_metric.1.operational_state.to_string())
                .bind(marginfi_bank_metric.1.asset_weight_maintenance)
                .bind(marginfi_bank_metric.1.liability_weight_maintenance)
                .bind(marginfi_bank_metric.1.asset_weight_initial)
                .bind(marginfi_bank_metric.1.liability_weight_initial)
                .bind(marginfi_bank_metric.1.deposit_limit_in_tokens)
                .bind(marginfi_bank_metric.1.borrow_limit_in_tokens)
                .bind(marginfi_bank_metric.1.deposit_limit_in_usd)
                .bind(marginfi_bank_metric.1.borrow_limit_in_usd)
                .bind(marginfi_bank_metric.1.lenders_count as i32)
                .bind(marginfi_bank_metric.1.borrowers_count as i32)
                .bind(marginfi_bank_metric.1.deposit_rate)
                .bind(marginfi_bank_metric.1.borrow_rate)
                .bind(marginfi_bank_metric.1.group_fee)
                .bind(marginfi_bank_metric.1.insurance_fee)
                .bind(marginfi_bank_metric.1.total_assets_in_tokens)
                .bind(marginfi_bank_metric.1.total_liabilities_in_tokens)
                .bind(marginfi_bank_metric.1.total_assets_in_usd)
                .bind(marginfi_bank_metric.1.total_liabilities_in_usd)
                .bind(marginfi_bank_metric.1.liquidity_vault_balance)
                .bind(marginfi_bank_metric.1.insurance_vault_balance)
                .bind(marginfi_bank_metric.1.fee_vault_balance)
                .execute(&client)
                .await
            {
                error!("Error inserting marginfi bank metrics: {:?}", err);
            }
        }

        info!(
            "Uploading {} marginfi account metrics",
            all_marginfi_account_metrics.len()
        );

        if let Err(err) = batch_insert_account_metrics(
            &client,
            &ctx.config.table_account,
            all_marginfi_account_metrics,
            current_timestamp,
            timestamp,
            &ctx.first_run,
        )
        .await
        {
            error!("Error inserting marginfi account metrics: {:?}", err);
        }

        debug!("Uploaded metrics in {}ms", start.elapsed().as_millis());

        // Update the snapshot after the iteration
        for (account_pk, update_time) in accounts_to_update {
            if let Some(account) = snapshot.marginfi_accounts.get_mut(&account_pk) {
                account.update_time = update_time;
                account.pushed = true;
            }
        }

        tokio::time::sleep(Duration::from_secs(60 * ctx.config.snapshot_interval)).await;

        ctx.first_run
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }
}

fn compute_geyser_config(
    config: &SnapshotAccountsConfig,
    non_program_pubkeys: &[Pubkey],
) -> ListenerConfig {
    let mut accounts = config.additional_accounts.0.clone();
    accounts.append(&mut non_program_pubkeys.to_vec());
    accounts.sort();
    accounts.dedup();

    ListenerConfig {
        endpoint: config.rpc_endpoint_geyser.clone(),
        token: Some(config.rpc_token.clone()),
        subscribe_request: SubscribeRequest {
            accounts: HashMap::from_iter([
                (
                    config.program_id.to_string(),
                    SubscribeRequestFilterAccounts {
                        owner: vec![config.program_id.to_string()],
                        ..Default::default()
                    },
                ),
                (
                    "lol".to_string(),
                    SubscribeRequestFilterAccounts {
                        account: accounts.iter().map(|x| x.to_string()).collect_vec(),
                        ..Default::default()
                    },
                ),
            ]),
            slots: HashMap::from_iter([(
                "slots".to_string(),
                SubscribeRequestFilterSlots {
                    filter_by_commitment: Some(false),
                },
            )]),
            blocks_meta: HashMap::from_iter([(
                "blocks_meta".to_string(),
                SubscribeRequestFilterBlocksMeta::default(),
            )]),
            commitment: Some(CommitmentLevel::Processed as i32),
            ..Default::default()
        },
    }
}

async fn batch_insert_account_metrics(
    client: &PgPool,
    table_name: &str,
    all_marginfi_account_metrics: Vec<(Pubkey, MarginfiAccountMetrics)>,
    current_timestamp: DateTime<Utc>,
    timestamp: i64,
    push_disabled_accounts: &AtomicBool,
) -> Result<(), sqlx::Error> {
    for chunk in all_marginfi_account_metrics.chunks(1000) {
        let mut query_builder: QueryBuilder<Postgres> =
            QueryBuilder::new(format!("INSERT INTO {} (", table_name));

        query_builder.push(
            "id, created_at, timestamp, pubkey, marginfi_group, owner, \
            total_assets_in_usd, total_liabilities_in_usd, \
            total_assets_in_usd_maintenance, total_liabilities_in_usd_maintenance, \
            total_assets_in_usd_initial, total_liabilities_in_usd_initial, positions",
        );

        query_builder.push(") ");
        query_builder.push_values(
            chunk.iter().filter(|(_, metric)| {
                push_disabled_accounts.load(std::sync::atomic::Ordering::Relaxed)
                    || !metric.positions.is_empty()
            }),
            |mut b, (_, metric)| {
                b.push_bind(Uuid::new_v4().to_string())
                    .push_bind(current_timestamp)
                    .push_bind(
                        DateTime::<Utc>::from_timestamp(timestamp, 0).expect("Invalid timestamp"),
                    )
                    .push_bind(metric.pubkey.to_string())
                    .push_bind(metric.marginfi_group.to_string())
                    .push_bind(metric.owner.to_string())
                    .push_bind(metric.total_assets_in_usd)
                    .push_bind(metric.total_liabilities_in_usd)
                    .push_bind(metric.total_assets_in_usd_maintenance)
                    .push_bind(metric.total_liabilities_in_usd_maintenance)
                    .push_bind(metric.total_assets_in_usd_initial)
                    .push_bind(metric.total_liabilities_in_usd_initial)
                    .push_bind(serde_json::to_string(&metric.positions).unwrap());
            },
        );

        let query = query_builder.build();
        query.execute(client).await?;
    }

    Ok(())
}

fn insert_metric_group_payload(table_name: &str) -> String {
    let payload = r#"
        INSERT INTO {table_name} (
            id, created_at, timestamp, pubkey, 
            marginfi_accounts_count, banks_count, mints_count,
            total_assets_in_usd, total_liabilities_in_usd
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
    "#;

    payload.replace("{table_name}", table_name)
}

fn insert_metric_bank_payload(table_name: &str) -> String {
    let payload = r#"
        INSERT INTO {table_name} (
            id, created_at, timestamp, pubkey, marginfi_group, mint,
            usd_price, operational_state, asset_weight_maintenance,
            liability_weight_maintenance, asset_weight_initial,
            liability_weight_initial, deposit_limit_in_tokens,
            borrow_limit_in_tokens, deposit_limit_in_usd,
            borrow_limit_in_usd, lenders_count, borrowers_count,
            deposit_rate, borrow_rate, group_fee, insurance_fee,
            total_assets_in_tokens, total_liabilities_in_tokens,
            total_assets_in_usd, total_liabilities_in_usd,
            liquidity_vault_balance, insurance_vault_balance,
            fee_vault_balance
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29
        )
    "#;

    payload.replace("{table_name}", table_name)
}
