#!/usr/bin/env bash
# cosmos/scripts/instantiate.sh
# Instantiate smart contracts on-chain

set -euo pipefail

CHAIN=$1
DRY=${2:-}
CODE_ID=${CODE_ID:-1}   # from previous step or default
INIT='{"verifier_key":"'"${ZK_VERIFICATION_KEY:-default_key}"'"}'

echo "Instantiating contract CODE_ID=$CODE_ID on $CHAIN"

if [[ "$DRY" == "--dry-run" ]]; then
  echo "[dry] osmosisd tx wasm instantiate $CODE_ID '$INIT' --label privachain_zk_verifier --from privachain-main --chain-id $CHAIN"
  exit 0
fi

# Instantiate contract
KEYRING_BACKEND="${KEYRING_BACKEND:-test}"
# Use RPC node URL from environment (set by deploy_all.sh) or default
NODE_URL="${OSMOSIS_NODE:-https://rpc.testnet.osmosis.zone:443}"

RES=$(osmosisd tx wasm instantiate "$CODE_ID" "$INIT" \
  --label privachain_zk_verifier --from privachain-main \
  --node "$NODE_URL" \
  --keyring-backend "$KEYRING_BACKEND" \
  --chain-id "$CHAIN" --gas 3000000 --fees 5000uosmo -y -b block -o json 2>&1) || {
  echo "❌ Failed to instantiate contract"
  echo "$RES"
  exit 1
}

# Extract contract address
CONTRACT_ADDR=$(echo "$RES" | jq -r '.logs[0].events[-1].attributes[] | select(.key=="_contract_address").value' 2>/dev/null || echo "")

if [[ -z "$CONTRACT_ADDR" || "$CONTRACT_ADDR" == "null" ]]; then
  echo "⚠️  Could not extract contract address from response"
else
  echo "✅ Contract instantiated at: $CONTRACT_ADDR"
  echo "CONTRACT_ADDRESS=$CONTRACT_ADDR" >> "${GITHUB_ENV:-/dev/null}"
fi
