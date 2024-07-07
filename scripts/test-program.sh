#!/usr/bin/env bash
set -e

ROOT=$(git rev-parse --show-toplevel)
cd $ROOT

loglevel=$1

if [ "$loglevel" == "--sane" ]; then
    loglevel=warn
    nocapture="--test-threads=1"
else
    loglevel=debug
    nocapture="--nocapture"
fi

cd $ROOT/programs/marginfi

cmd="SBF_OUT_DIR=$ROOT/target/deploy RUST_LOG=solana_runtime::message_processor::stable_log=$loglevel cargo-test-bpf --features=test-bpf -- $nocapture"
echo "Running: $cmd"
eval "$cmd"
