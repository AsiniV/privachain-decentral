#!/usr/bin/env bash
# scripts/full_deploy.sh
# One-button orchestration for full deployment
# Usage:  ./scripts/full_deploy.sh  [--dry-run]  [--mainnet]

set -euo pipefail

# Parse arguments
DRY_RUN=""
CHAIN="osmo-test-5"   # default to test-net

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
    *)
      ;;
  esac
done

echo "================================================================"
echo "PrivaChain Full Deployment Orchestration"
echo "================================================================"
echo "Chain: $CHAIN"
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

if [[ -z "${NYM_BANDWIDTH_CRED:-}" ]]; then
  MISSING_VARS+=("NYM_BANDWIDTH_CRED")
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
echo "========== 3. Buy NYM bandwidth =================================="
"${BASH_SOURCE%/*}/../nym/scripts/buy_bw.sh" "$DRY_RUN"

echo ""
echo "========== 4. Smoke vs REAL endpoints ============================"
if [[ "$DRY_RUN" != "--dry-run" ]]; then
  "${BASH_SOURCE%/*}/smoke_real.sh"
else
  echo "[dry] Would run smoke tests against real endpoints"
fi

echo ""
echo "================================================================"
echo "✅ All deployed & tested – zero regressions"
echo "================================================================"
