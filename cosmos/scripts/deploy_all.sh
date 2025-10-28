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

# Import wallet (idempotent - will not duplicate)
echo "Setting up wallet..."
if [[ "$DRY" != "--dry-run" ]]; then
  # Check if key already exists
  if osmosisd keys show privachain-main --keyring-backend file >/dev/null 2>&1; then
    echo "✅ Wallet already exists"
  else
    echo "Importing wallet from mnemonic..."
    echo "$COSMOS_MNEMONIC" | osmosisd keys add privachain-main --recover --keyring-backend file 2>&1 || {
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
./cosmos/scripts/store_code.sh "$CHAIN" "$DRY"

# Instantiate contract
echo ""
echo "Step 2: Instantiating contract..."
./cosmos/scripts/instantiate.sh "$CHAIN" "$DRY"

echo ""
echo "========================================="
echo "✅ Contracts live on $CHAIN"
echo "========================================="
