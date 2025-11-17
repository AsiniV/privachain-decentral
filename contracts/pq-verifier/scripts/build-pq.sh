#!/usr/bin/env bash
set -euo pipefail

# Build script for pq-verifier with Wasm-ready liboqs
# This script builds the contract with post-quantum crypto support

echo "Building pq-verifier with PQ features..."

# 1. liboqs wasm target (single-thread, no heap-heavy flags)
export CFLAGS="-O3 -fno-exceptions -fno-rtti -s"
export CXXFLAGS="$CFLAGS"
export LDFLAGS="-s MODULARIZE=1 -s EXPORTED_FUNCTIONS=_OQS_SIG_dilithium_5,_OQS_SIG_verify,_OQS_SIG_free"

# 2. build oqs-sys with wasm-bindgen feature
echo "Building with wasm32-unknown-unknown target..."
cargo build --release --target wasm32-unknown-unknown --features pq

# 3. run cosmwasm-optimizer
echo "Running cosmwasm-optimizer..."
if command -v docker &> /dev/null; then
    docker run --rm -v "$(pwd)":/code \
      cosmwasm/rust-optimizer:0.15.0 ./contracts/pq-verifier
    echo "Build complete! Artifacts in artifacts/"
else
    echo "Warning: Docker not available, skipping optimization step"
    echo "Build artifacts in target/wasm32-unknown-unknown/release/"
fi

echo "Done!"
