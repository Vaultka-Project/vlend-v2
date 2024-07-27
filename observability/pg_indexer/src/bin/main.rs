use anyhow::Result;
use clap::Parser;
use std::backtrace::Backtrace;

fn main() -> Result<()> {
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("Panic occurred: {:#?}", panic_info);

        eprintln!("Backtrace: {}", Backtrace::capture());

        std::process::exit(1);
    }));

    pg_indexer::entrypoint::entry(pg_indexer::entrypoint::Opts::parse())
}
