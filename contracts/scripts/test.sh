#!/bin/bash

# Test all smart contracts

set -e

echo "Testing PrivaChain smart contracts..."

# Test mail contract
echo "Testing mail contract..."
cd mail
cargo test
cd ..

# Test domain registry contract
echo "Testing domain registry contract..."
cd domain-registry
cargo test
echo "Building domain registry for deployment..."
cargo build --release --target wasm32-unknown-unknown
cd ..

echo "All tests passed!"