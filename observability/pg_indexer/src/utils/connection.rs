use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn connect() -> Result<PgPool> {
    let url = std::env::var("POSTGRES_URL").context("POSTGRES_URL is not set")?;
    let database = std::env::var("DEFAULT_DATABASE").context("DEFAULT_DATABASE is not set")?;
    let url = format!("{}/{}", url, database);
    let pool = PgPoolOptions::new()
        .max_connections(1000) // Adjust this number based on your infrastructure capacity
        .connect(&url)
        .await
        .context("Failed to connect to the database")?;

    Ok(pool)
}
