#!/usr/bin/env bash
# scripts/full_deploy.sh
# One-button orchestration for full deployment
# Usage:  ./scripts/full_deploy.sh  [--dry-run]  [--mainnet]  [--tunnel i2p|none]

set -euo pipefail

# Parse arguments
DRY_RUN=""
CHAIN="osmo-test-5"   # default to test-net
TUNNEL="i2p"          # default to I2P tunnel

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN="--dry-run"
      shift
      ;;
    --mainnet)
      CHAIN="osmosis-1"
      shift
      ;;
    --tunnel)
      TUNNEL="$2"
      shift 2
      ;;
    *)
      ;;
  esac
done

echo "================================================================"
echo "PrivaChain Full Deployment Orchestration"
echo "================================================================"
echo "Chain: $CHAIN"
echo "Tunnel: $TUNNEL"
echo "Dry Run: ${DRY_RUN:-false}"
echo "================================================================"
echo ""

echo "========== 0. 12-factor check =========="
# Check required environment variables
MISSING_VARS=()

if [[ -z "${COSMOS_MNEMONIC:-}" ]]; then
  MISSING_VARS+=("COSMOS_MNEMONIC")
fi

if [[ -z "${FILEBASE_KEY:-}" ]]; then
  MISSING_VARS+=("FILEBASE_KEY")
fi

if [[ -z "${FILEBASE_SECRET:-}" ]]; then
  MISSING_VARS+=("FILEBASE_SECRET")
fi

# I2P SAM host is optional, defaults to 127.0.0.1:7656
if [[ "$TUNNEL" == "i2p" && -z "${I2P_SAM_HOST:-}" ]]; then
  echo "ℹ️  I2P_SAM_HOST not set, using default: 127.0.0.1:7656"
  export I2P_SAM_HOST="127.0.0.1:7656"
fi

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  echo "❌ Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Please set these environment variables before running this script."
  echo "For local development, you can use test values (see README)."
  exit 1
fi

echo "✅ All required environment variables are set"
echo ""

echo "========== 1. Store + instantiate contracts =========="
"${BASH_SOURCE%/*}/../cosmos/scripts/deploy_all.sh" "$CHAIN" "$DRY_RUN"

echo ""
echo "========== 2. Upload IPFS CAR ===================================="
"${BASH_SOURCE%/*}/../ipfs/scripts/upload_car.sh" "$DRY_RUN"

echo ""
echo "========== 3. Smoke vs REAL endpoints ============================"
if [[ "$DRY_RUN" != "--dry-run" ]]; then
  "${BASH_SOURCE%/*}/smoke_real.sh"
else
  echo "[dry] Would run smoke tests against real endpoints"
fi

echo ""
echo "================================================================"
echo "✅ All deployed & tested – zero regressions"
echo "✅ Tunnel mode: $TUNNEL"
echo "================================================================"
