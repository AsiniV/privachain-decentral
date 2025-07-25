#!/bin/bash

# Deploy contracts to Cosmos testnet

set -e

NETWORK=${1:-testnet}
CHAIN_ID="privachain-testnet-1"
NODE_URL="https://rpc.privachain-testnet.com:443"
DEPLOYER_KEY="cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k"

echo "Deploying to $NETWORK..."

# Deploy mail contract
echo "Deploying mail contract..."
MAIL_CODE_ID=$(wasmd tx wasm store artifacts/privachain_mail.wasm \
    --from $DEPLOYER_KEY \
    --chain-id $CHAIN_ID \
    --node $NODE_URL \
    --gas auto \
    --gas-adjustment 1.3 \
    --output json | jq -r '.code_id')

echo "Mail contract code ID: $MAIL_CODE_ID"

# Instantiate mail contract
INIT_MSG='{
    "admin": null,
    "domain_registration_fee": "1000000",
    "email_fee": "10000", 
    "pow_difficulty": 12
}'

MAIL_CONTRACT=$(wasmd tx wasm instantiate $MAIL_CODE_ID "$INIT_MSG" \
    --from $DEPLOYER_KEY \
    --chain-id $CHAIN_ID \
    --node $NODE_URL \
    --label "PrivaChain Mail v1.0" \
    --gas auto \
    --gas-adjustment 1.3 \
    --output json | jq -r '.contract_address')

echo "Mail contract deployed at: $MAIL_CONTRACT"

# Save deployment info
cat > deployment-$NETWORK.json << EOF
{
    "network": "$NETWORK",
    "chain_id": "$CHAIN_ID",
    "contracts": {
        "mail": {
            "code_id": $MAIL_CODE_ID,
            "address": "$MAIL_CONTRACT"
        }
    },
    "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "Deployment complete! Info saved to deployment-$NETWORK.json"