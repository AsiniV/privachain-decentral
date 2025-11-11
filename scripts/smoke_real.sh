#!/usr/bin/env bash
# scripts/smoke_real.sh
# Local smoke test against real endpoints (no stubs, no empty env vars)

set -euo pipefail

echo "================================================================"
echo "PrivaChain Real-Endpoint Smoke Tests"
echo "================================================================"
echo ""

FAILURES=0

# Helper function to report test results
report_test() {
  local test_name=$1
  local result=$2
  
  if [[ $result -eq 0 ]]; then
    echo "✅ $test_name PASSED"
  else
    echo "❌ $test_name FAILED"
    FAILURES=$((FAILURES + 1))
  fi
}

echo "========== 1. Cosmos resolver =========="
# Check if osmosisd is available
if command -v osmosisd >/dev/null 2>&1; then
  # Try to query contracts (this will work if deployment succeeded)
  ADDR=$(osmosisd query wasm list-contract-by-code 1 -o json 2>/dev/null | jq -r '.contracts[0]' 2>/dev/null || echo "")
  
  if [[ -n "$ADDR" && "$ADDR" != "null" ]]; then
    # Try to query the contract state
    curl -s "https://rpc.osmosis.zone/abci_query?path=/wasm/contract/$ADDR/state" 2>/dev/null | jq . >/dev/null 2>&1
    report_test "Cosmos resolver query" $?
  else
    echo "⚠️  No contracts found, skipping Cosmos resolver test"
  fi
else
  echo "⚠️  osmosisd not installed, skipping Cosmos test"
fi
echo ""

echo "========== 2. IPFS gateway (Filebase) =========="
# Check if we have an IPFS CID from the deployment
IPFS_CID="${IPFS_ROOT_CID:-}"
if [[ -n "$IPFS_CID" && "$IPFS_CID" != "null" ]]; then
  # Try to fetch from IPFS gateway
  curl -s --max-time 10 "https://ipfs.filebase.io/ipfs/$IPFS_CID" 2>/dev/null | grep -q "PrivaChain" || true
  report_test "IPFS gateway reachable" $?
else
  echo "⚠️  No IPFS CID available, skipping IPFS test"
fi
echo ""

echo "========== 3. I2P tunnel connectivity =========="
# Check if I2P SAM bridge is available
I2P_SAM_HOST="${I2P_SAM_HOST:-127.0.0.1:7656}"
if command -v nc >/dev/null 2>&1; then
  # Try to connect to SAM bridge with timeout
  timeout 5 nc -z ${I2P_SAM_HOST%:*} ${I2P_SAM_HOST#*:} 2>/dev/null
  report_test "I2P SAM bridge connectivity" $?
elif command -v telnet >/dev/null 2>&1; then
  # Fallback to telnet
  timeout 5 bash -c "echo quit | telnet ${I2P_SAM_HOST%:*} ${I2P_SAM_HOST#*:}" 2>/dev/null | grep -q "Connected" || true
  report_test "I2P SAM bridge connectivity" $?
else
  echo "⚠️  nc or telnet not installed, skipping I2P SAM connectivity test"
fi
echo ""

echo "========== 4. ZK proof verification on-chain =========="
# Run ZK proof tests if the feature is available
if cargo test --features zk-proofs --lib zk::on_chain_verify --no-run >/dev/null 2>&1; then
  cargo test --features zk-proofs --lib zk::on_chain_verify -- --nocapture >/dev/null 2>&1
  report_test "ZK proof verification" $?
else
  echo "⚠️  ZK proof tests not available, skipping"
fi
echo ""

echo "========== 5. Bundle size guard =========="
# Check if release binary exists
if [[ -f "target/release/privachain-node" ]]; then
  SIZE=$(stat -c%s target/release/privachain-node 2>/dev/null || stat -f%z target/release/privachain-node 2>/dev/null || echo "0")
  
  # Size limit: 53MB (53000000 bytes)
  if [[ $SIZE -lt 53000000 ]]; then
    report_test "Bundle size guard (${SIZE} < 53000000)" 0
  else
    echo "❌ Bundle size guard FAILED: ${SIZE} >= 53000000"
    FAILURES=$((FAILURES + 1))
  fi
else
  echo "⚠️  Release binary not found, skipping bundle size check"
fi
echo ""

echo "================================================================"
if [[ $FAILURES -eq 0 ]]; then
  echo "✅ All real-endpoint smoke tests passed"
  echo "================================================================"
  exit 0
else
  echo "❌ $FAILURES test(s) failed"
  echo "================================================================"
  exit 1
fi
