#!/usr/bin/env bash
# cosmos/scripts/deploy_all.sh
# Master deploy script for Cosmos smart contracts

set -euo pipefail

CHAIN=$1
DRY=${2:-}

echo "========================================="
echo "Cosmos Smart Contract Deployment"
echo "Chain: $CHAIN"
echo "Dry Run: ${DRY:-false}"
echo "========================================="

# Check required environment variables
if [[ -z "${COSMOS_MNEMONIC:-}" ]]; then
  echo "❌ COSMOS_MNEMONIC environment variable is required"
  exit 1
fi

# Export chain configuration for child scripts
# Select appropriate RPC node based on chain
# NOTE: Only osmosis-1 (mainnet) and osmo-test-5 (testnet) are currently supported
if [[ "$CHAIN" == "osmosis-1" ]]; then
  export OSMOSIS_NODE="${OSMOSIS_NODE:-https://rpc.osmosis.zone:443}"
elif [[ "$CHAIN" == "osmo-test-5" ]]; then
  export OSMOSIS_NODE="${OSMOSIS_NODE:-https://rpc.testnet.osmosis.zone:443}"
else
  echo "⚠️  Unknown chain '$CHAIN', using default testnet RPC"
  export OSMOSIS_NODE="${OSMOSIS_NODE:-https://rpc.testnet.osmosis.zone:443}"
fi

# Import wallet (idempotent - will not duplicate)
echo "Setting up wallet..."
if [[ "$DRY" != "--dry-run" ]]; then
  # Use 'test' keyring backend in CI/CD environments (non-interactive)
  # Use 'file' keyring backend for local deployments (requires password)
  KEYRING_BACKEND="${KEYRING_BACKEND:-test}"
  
  # Check if key already exists
  if osmosisd keys show privachain-main --keyring-backend "$KEYRING_BACKEND" >/dev/null 2>&1; then
    echo "✅ Wallet already exists (keyring: $KEYRING_BACKEND)"
  else
    echo "Importing wallet from mnemonic (keyring: $KEYRING_BACKEND)..."
    echo "$COSMOS_MNEMONIC" | osmosisd keys add privachain-main --recover --keyring-backend "$KEYRING_BACKEND" 2>&1 || {
      echo "❌ Failed to import wallet"
      exit 1
    }
    echo "✅ Wallet imported successfully"
  fi
else
  echo "[dry] Would import wallet from COSMOS_MNEMONIC"
fi

# Store contract code
echo ""
echo "Step 1: Storing contract code..."
"${BASH_SOURCE%/*}/store_code.sh" "$CHAIN" "$DRY"

# Instantiate contract
echo ""
echo "Step 2: Instantiating contract..."
"${BASH_SOURCE%/*}/instantiate.sh" "$CHAIN" "$DRY"

echo ""
echo "========================================="
echo "✅ Contracts live on $CHAIN"
echo "========================================="
