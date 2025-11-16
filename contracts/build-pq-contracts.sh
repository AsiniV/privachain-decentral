#!/bin/bash
set -e

# Build all PQ contracts for WASM
# Note: This builds without the 'pq' feature as liboqs for WASM requires special setup

CONTRACTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$CONTRACTS_DIR/../target/wasm32-unknown-unknown/release"

echo "Building PQ contracts..."
echo "========================"

cd "$CONTRACTS_DIR"

for contract in pq-verifier reputation gas-sponsor; do
  echo ""
  echo "Building $contract..."
  cd "$contract"
  cargo build --release --target wasm32-unknown-unknown --lib
  cd ..
  echo "✓ $contract built successfully"
done

echo ""
echo "========================"
echo "WASM files generated:"
ls -lh "$TARGET_DIR"/*.wasm | grep -E "(pq_verifier|reputation|gas_sponsor)"

echo ""
echo "To verify WASM files with cosmwasm-check (if installed):"
echo "  cosmwasm-check $TARGET_DIR/pq_verifier.wasm"
echo "  cosmwasm-check $TARGET_DIR/reputation.wasm"
echo "  cosmwasm-check $TARGET_DIR/gas_sponsor.wasm"
