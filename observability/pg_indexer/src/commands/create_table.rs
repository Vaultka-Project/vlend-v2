use anyhow::{anyhow, Result};
use std::str::FromStr;

use crate::utils::migrator;
#[derive(Debug, Clone)]
pub enum TableType {
    Transaction,
    Account,
    MetricMarginfiGroup,
    MetricLendingPoolBank,
    MetricMarginfiAccount,
}

impl FromStr for TableType {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "transaction" => Ok(Self::Transaction),
            "account" => Ok(Self::Account),
            "metric_group" => Ok(Self::MetricMarginfiGroup),
            "metric_bank" => Ok(Self::MetricLendingPoolBank),
            "metric_account" => Ok(Self::MetricMarginfiAccount),
            _ => Err(anyhow!("Invalid table type")),
        }
    }
}

impl TableType {
    pub fn default_name(&self) -> String {
        match self {
            TableType::Transaction => "transaction".to_string(),
            TableType::Account => "account".to_string(),
            TableType::MetricMarginfiGroup => "metric_group".to_string(),
            TableType::MetricLendingPoolBank => "metric_bank".to_string(),
            TableType::MetricMarginfiAccount => "metric_account".to_string(),
        }
    }
}

pub async fn create_table(
    table_type: TableType,
    table_friendly_name: Option<String>,
    table_description: Option<String>,
) -> Result<()> {
    migrator::run_migration_with_table_name(table_type, table_friendly_name, table_description)
        .await?;
    Ok(())
}
