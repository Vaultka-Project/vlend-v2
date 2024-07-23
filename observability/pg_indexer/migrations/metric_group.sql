CREATE TABLE IF NOT EXISTS {table_name} (
    id VARCHAR PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    pubkey VARCHAR NOT NULL,
    marginfi_accounts_count INTEGER NOT NULL,
    banks_count INTEGER NOT NULL,
    mints_count INTEGER NOT NULL,
    total_assets_in_usd FLOAT NOT NULL,
    total_liabilities_in_usd FLOAT NOT NULL
);
