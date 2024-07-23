use anyhow::Result;
use clap::Parser;

fn main() -> Result<()> {
    pg_indexer::entrypoint::entry(pg_indexer::entrypoint::Opts::parse())
}
