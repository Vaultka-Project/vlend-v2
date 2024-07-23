CREATE TABLE IF NOT EXISTS {table_name} (
    id TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    pubkey TEXT NOT NULL,
    marginfi_group TEXT NOT NULL,
    owner TEXT NOT NULL,
    total_assets_in_usd FLOAT NOT NULL,
    total_liabilities_in_usd FLOAT NOT NULL,
    total_assets_in_usd_maintenance FLOAT NOT NULL,
    total_liabilities_in_usd_maintenance FLOAT NOT NULL,
    total_assets_in_usd_initial FLOAT NOT NULL,
    total_liabilities_in_usd_initial FLOAT NOT NULL,
    positions TEXT NOT NULL
);
