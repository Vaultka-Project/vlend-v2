use crate::commands::{
    create_table::{create_table, TableType},
    index_accounts::{index_accounts, IndexAccountsConfig},
    index_transactions::{index_transactions, IndexTransactionsConfig},
    snapshot_account::{snapshot_accounts, SnapshotAccountsConfig},
};

use anyhow::Result;
use clap::Parser;
use envconfig::Envconfig;
use tracing::subscriber;
use tracing_subscriber::{layer::SubscriberExt, EnvFilter};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Parser)]
pub struct GlobalOptions {
    #[clap(long)]
    pub pretty_log: bool,
}

#[derive(Debug, Parser)]
#[clap(version = VERSION)]
pub struct Opts {
    #[clap(flatten)]
    pub global_config: GlobalOptions,
    #[clap(subcommand)]
    pub command: Command,
}

#[derive(Debug, Parser)]
pub enum Command {
    CreateTable {
        #[clap(long)]
        table_type: TableType,
        #[clap(long)]
        table_friendly_name: Option<String>,
        #[clap(long)]
        table_description: Option<String>,
    },
    Backfill,
    IndexTransactions,
    IndexAccounts,
    SnapshotAccounts,
}

#[tokio::main]
pub async fn entry(opts: Opts) -> Result<()> {
    dotenv::dotenv().ok();

    let filter = EnvFilter::from_default_env();
    let stackdriver = tracing_stackdriver::layer();
    let subscriber = tracing_subscriber::registry().with(filter);
    if opts.global_config.pretty_log {
        let subscriber = subscriber.with(tracing_subscriber::fmt::layer().compact());
        tracing::subscriber::set_global_default(subscriber).unwrap();
    } else {
        let subscriber = subscriber.with(stackdriver);
        subscriber::set_global_default(subscriber).unwrap();
    }

    match opts.command {
        Command::CreateTable {
            table_type,
            table_friendly_name,
            table_description,
        } => create_table(table_type, table_friendly_name, table_description).await,
        Command::IndexTransactions => {
            let config = IndexTransactionsConfig::init_from_env()?;
            index_transactions(config).await
        }
        Command::IndexAccounts => {
            let config = IndexAccountsConfig::init_from_env()?;
            index_accounts(config).await
        }
        Command::SnapshotAccounts => {
            let config = SnapshotAccountsConfig::init_from_env()?;
            snapshot_accounts(config).await
        }
        _ => Ok(()),
    }
}
