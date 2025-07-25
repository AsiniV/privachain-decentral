#!/bin/bash

# Test all smart contracts

set -e

echo "Testing PrivaChain smart contracts..."

# Test mail contract
echo "Testing mail contract..."
cd contracts/mail
cargo test
cd ../..

echo "All tests passed!"