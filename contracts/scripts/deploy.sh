#!/bin/bash

# Enhanced deployment script with real transaction handling and verification

set -e

NETWORK=${1:-testnet}
CHAIN_ID="privachain-testnet-1"
NODE_URL="https://rpc.privachain-testnet.com:443"

# Use environment variable for deployer mnemonic (secure)
if [ -z "$DEPLOYER_MNEMONIC" ]; then
    echo "❌ Error: DEPLOYER_MNEMONIC environment variable not set"
    echo "Please set your deployer mnemonic: export DEPLOYER_MNEMONIC='your mnemonic here'"
    exit 1
fi

# Add deployer key from mnemonic
echo "🔐 Adding deployer key from mnemonic..."
echo "$DEPLOYER_MNEMONIC" | wasmd keys add deployer --recover --keyring-backend test 2>/dev/null || true

DEPLOYER_ADDR=$(wasmd keys show deployer -a --keyring-backend test)
echo "📋 Deployer address: $DEPLOYER_ADDR"

# Check balance
echo "💰 Checking deployer balance..."
BALANCE=$(wasmd query bank balances $DEPLOYER_ADDR --node $NODE_URL --output json | jq -r '.balances[0].amount // "0"')
echo "Balance: ${BALANCE}uatom"

if [ "$BALANCE" -lt 1000000 ]; then
    echo "⚠️  Warning: Low balance. Make sure you have enough tokens for deployment."
fi

echo "🚀 Deploying to $NETWORK..."

# Build contracts first
echo "🔨 Building contracts..."
cd ../mail
cargo build --release --target wasm32-unknown-unknown
cargo run --example schema

# Optimize the contract
echo "⚡ Optimizing contract..."
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/rust-optimizer:0.15.0 || echo "⚠️  Optimization failed, using unoptimized binary"

cd ../scripts

# Deploy mail contract
echo "📤 Deploying mail contract..."
STORE_TX=$(wasmd tx wasm store ../mail/artifacts/privachain_mail.wasm \
    --from deployer \
    --chain-id $CHAIN_ID \
    --node $NODE_URL \
    --gas auto \
    --gas-adjustment 1.3 \
    --fees 100000uatom \
    --keyring-backend test \
    --output json -y)

# Wait for transaction to be included
echo "⏳ Waiting for store transaction to be included..."
STORE_TXHASH=$(echo $STORE_TX | jq -r '.txhash')
sleep 6

# Get code ID from transaction result
STORE_RESULT=$(wasmd query tx $STORE_TXHASH --node $NODE_URL --output json)
MAIL_CODE_ID=$(echo $STORE_RESULT | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')

if [ "$MAIL_CODE_ID" = "null" ] || [ -z "$MAIL_CODE_ID" ]; then
    echo "❌ Failed to get code ID from store transaction"
    echo "Store transaction result: $STORE_RESULT"
    exit 1
fi

echo "✅ Mail contract stored with code ID: $MAIL_CODE_ID"

# Instantiate mail contract
echo "🎯 Instantiating mail contract..."
INIT_MSG='{
    "admin": null,
    "domain_registration_fee": "1000000",
    "email_fee": "10000", 
    "pow_difficulty": 12
}'

INSTANTIATE_TX=$(wasmd tx wasm instantiate $MAIL_CODE_ID "$INIT_MSG" \
    --from deployer \
    --chain-id $CHAIN_ID \
    --node $NODE_URL \
    --label "PrivaChain Mail v1.0" \
    --gas auto \
    --gas-adjustment 1.3 \
    --fees 10000uatom \
    --keyring-backend test \
    --output json -y)

# Wait for transaction to be included
echo "⏳ Waiting for instantiate transaction to be included..."
INSTANTIATE_TXHASH=$(echo $INSTANTIATE_TX | jq -r '.txhash')
sleep 6

# Get contract address from transaction result
INSTANTIATE_RESULT=$(wasmd query tx $INSTANTIATE_TXHASH --node $NODE_URL --output json)
MAIL_CONTRACT=$(echo $INSTANTIATE_RESULT | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')

if [ "$MAIL_CONTRACT" = "null" ] || [ -z "$MAIL_CONTRACT" ]; then
    echo "❌ Failed to get contract address from instantiate transaction"
    echo "Instantiate transaction result: $INSTANTIATE_RESULT"
    exit 1
fi

echo "✅ Mail contract deployed at: $MAIL_CONTRACT"

# Verify deployment by querying contract
echo "🔍 Verifying deployment..."
CONFIG_RESULT=$(wasmd query wasm contract-state smart $MAIL_CONTRACT '{"get_config":{}}' --node $NODE_URL --output json)
echo "Contract config: $CONFIG_RESULT"

# Save comprehensive deployment info
cat > deployment-$NETWORK.json << EOF
{
    "network": "$NETWORK",
    "chain_id": "$CHAIN_ID",
    "node_url": "$NODE_URL",
    "deployer_address": "$DEPLOYER_ADDR",
    "contracts": {
        "mail": {
            "code_id": $MAIL_CODE_ID,
            "address": "$MAIL_CONTRACT",
            "store_txhash": "$STORE_TXHASH",
            "instantiate_txhash": "$INSTANTIATE_TXHASH"
        }
    },
    "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "version": "1.0.0"
}
EOF

echo ""
echo "🎉 Deployment complete!"
echo "📋 Network: $NETWORK"
echo "📋 Chain ID: $CHAIN_ID"
echo "📋 Mail Contract: $MAIL_CONTRACT"
echo "📋 Code ID: $MAIL_CODE_ID"
echo "📋 Explorer: https://explorer.privachain-testnet.com/tx/$INSTANTIATE_TXHASH"
echo "📋 Info saved to: deployment-$NETWORK.json"
echo ""
echo "🔍 To verify on explorer:"
echo "   Store TX: https://explorer.privachain-testnet.com/tx/$STORE_TXHASH"
echo "   Instantiate TX: https://explorer.privachain-testnet.com/tx/$INSTANTIATE_TXHASH"