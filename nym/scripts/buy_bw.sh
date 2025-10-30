#!/usr/bin/env bash
# nym/scripts/buy_bw.sh
# Purchase NYM bandwidth credentials

set -euo pipefail

DRY=${1:-}

echo "========================================="
echo "NYM Bandwidth Purchase"
echo "========================================="

# Check required environment variables
if [[ "$DRY" != "--dry-run" ]]; then
  if [[ -z "${NYM_BANDWIDTH_CRED:-}" ]]; then
    echo "❌ NYM_BANDWIDTH_CRED environment variable is required"
    exit 1
  fi
fi

if [[ "$DRY" == "--dry-run" ]]; then
  echo "[dry] Would burn 1,000 NYM for bandwidth credentials"
  echo "[dry] echo \$NYM_BANDWIDTH_CRED | nym-wallet bandwidth-buy --file-stdin"
  exit 0
fi

# Purchase bandwidth using credential
echo "Burning NYM credential for bandwidth..."
echo "$NYM_BANDWIDTH_CRED" | nym-wallet bandwidth-buy --file-stdin 2>&1 || {
  echo "❌ Failed to purchase NYM bandwidth"
  echo "Note: This requires nym-wallet to be installed and properly configured"
  exit 1
}

echo ""
echo "========================================="
echo "✅ 1,000 NYM bandwidth credited"
echo "========================================="
