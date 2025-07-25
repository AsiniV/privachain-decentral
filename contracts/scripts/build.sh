#!/bin/bash

# Build all smart contracts

set -e

echo "Building PrivaChain smart contracts..."

# Build mail contract
echo "Building mail contract..."
cd contracts/mail
cargo wasm
cd ../..

echo "All contracts built successfully!"

# Optimize contracts for deployment
echo "Optimizing contracts..."
if command -v docker &> /dev/null; then
    docker run --rm -v "$(pwd)":/code \
        --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
        --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
        cosmwasm/rust-optimizer:0.12.13 ./contracts/mail
    echo "Contracts optimized successfully!"
else
    echo "Docker not found. Skipping optimization."
fi