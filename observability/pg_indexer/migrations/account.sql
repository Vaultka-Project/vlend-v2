CREATE TABLE IF NOT EXISTS {table_name} (
    id VARCHAR PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    owner VARCHAR NOT NULL,
    slot BIGINT NOT NULL,
    pubkey VARCHAR NOT NULL,
    txn_signature VARCHAR,
    write_version BIGINT,
    lamports BIGINT NOT NULL,
    executable BOOLEAN NOT NULL,
    rent_epoch BIGINT NOT NULL,
    data TEXT NOT NULL
);