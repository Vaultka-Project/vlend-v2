use anyhow::Result;
use std::{fs, path::Path};
use tracing::info;

use crate::commands::create_table::TableType;

pub async fn run_migration_with_table_name(
    table_type: TableType,
    table_friendly_name: Option<String>,
    table_description: Option<String>,
) -> Result<()> {
    let client = crate::utils::connection::connect().await?;

    // Read the migration file
    let migration_file =
        Path::new("./migrations").join(format!("{}.sql", table_type.default_name()));
    let mut sql = fs::read_to_string(&migration_file)?;

    // Replace {table_name} with the table name in the migration file payload
    let table_name =
        table_friendly_name.unwrap_or_else(|| format!("{:?}", table_type.default_name()));
    sql = sql.replace("{table_name}", &table_name);

    // Run the migration
    sqlx::query(&sql).execute(&client).await?;

    // Add a comment to the table only if a description is provided
    if let Some(description) = table_description {
        sqlx::query(&comment_table_payload(&table_name, &description))
            .execute(&client)
            .await?;
    }

    info!("Migration completed successfully for table: {}", table_name);

    Ok(())
}

/// Helper function to generate the comment payload for a table
fn comment_table_payload(table_name: &str, description: &str) -> String {
    format!("\n COMMENT ON TABLE {} IS '{}';", table_name, description)
}
