#!/usr/bin/env bash
# cosmos/scripts/store_code.sh
# Store smart contract code on-chain (Osmosis)

set -euo pipefail

CHAIN=$1
DRY=${2:-}
CODE_PATH="cosmos/contract/zk_verifier.wasm"

echo "Storing $CODE_PATH on $CHAIN"

if [[ "$DRY" == "--dry-run" ]]; then
  echo "[dry] osmosisd tx wasm store $CODE_PATH --from privachain-main --chain-id $CHAIN --gas 3000000 --fees 5000uosmo -y -b block"
  echo "CODE_ID=1" >> "${GITHUB_ENV:-/dev/null}"
  exit 0
fi

# Check if wasm file exists
if [[ ! -f "$CODE_PATH" ]]; then
  echo "❌ WASM file not found: $CODE_PATH"
  echo "Please build the contract first or ensure the path is correct"
  exit 1
fi

# Store code on chain
KEYRING_BACKEND="${KEYRING_BACKEND:-test}"
# Select appropriate RPC node based on chain
if [[ "$CHAIN" == "osmosis-1" ]]; then
  NODE_URL="${OSMOSIS_NODE:-https://rpc.osmosis.zone:443}"
else
  NODE_URL="${OSMOSIS_NODE:-https://rpc.testnet.osmosis.zone:443}"
fi

RES=$(osmosisd tx wasm store "$CODE_PATH" \
      --from privachain-main --chain-id "$CHAIN" \
      --node "$NODE_URL" \
      --keyring-backend "$KEYRING_BACKEND" \
      --gas 3000000 --fees 5000uosmo -y -b block -o json 2>&1) || {
  echo "❌ Failed to store code on chain"
  echo "$RES"
  exit 1
}

# Extract code ID from response
CODE_ID=$(echo "$RES" | jq -r '.logs[0].events[-1].attributes[] | select(.key=="code_id").value' 2>/dev/null || echo "")

if [[ -z "$CODE_ID" || "$CODE_ID" == "null" ]]; then
  echo "❌ Failed to extract CODE_ID from response"
  echo "$RES"
  exit 1
fi

echo "✅ Code stored successfully with CODE_ID=$CODE_ID"
echo "CODE_ID=$CODE_ID" >> "${GITHUB_ENV:-/dev/null}"
