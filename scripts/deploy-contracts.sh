#!/bin/bash

# Contract Deployment Script for Local Testing and CI/CD
# Comprehensive deployment setup with dependency checking

set -e

echo "🚀 Starting PrivaChain Contract Deployment"

# Configuration
NETWORK=${1:-"local"}
NODE_URL=${NODE_URL:-"ws://localhost:9944"}
SKIP_BLOCKCHAIN=${SKIP_BLOCKCHAIN:-"false"}

echo "📋 Deployment Configuration:"
echo "   Network: $NETWORK"
echo "   Node URL: $NODE_URL"
echo "   Skip Blockchain: $SKIP_BLOCKCHAIN"
echo ""

# System Requirements Check
echo "🔍 Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js v18+"
    exit 1
fi
echo "✅ Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi
echo "✅ npm $(npm --version) found"

# Check Rust/Cargo
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo not found. Please install from https://rustup.rs/"
    exit 1
fi
echo "✅ Cargo $(cargo --version | cut -d' ' -f2) found"

# Check wasm32 target
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "⚠️  wasm32-unknown-unknown target not found. Installing..."
    rustup target add wasm32-unknown-unknown
fi
echo "✅ wasm32-unknown-unknown target available"

echo ""

# Contract Building
echo "🔨 Building smart contracts..."

# Ensure we're in the right directory
if [ ! -d "contracts/mail" ]; then
    echo "❌ contracts/mail directory not found. Are you in the project root?"
    exit 1
fi

# Build contracts
cd contracts/mail
echo "   Building mail contract..."
cargo build --release --target wasm32-unknown-unknown

if [ ! -f "target/wasm32-unknown-unknown/release/privachain_mail.wasm" ]; then
    echo "❌ Mail contract build failed - WASM file not generated"
    exit 1
fi

# TODO: Add domain registry once WASM build issues are resolved
# cd ../domain-registry
# echo "   Building domain registry contract..."
# cargo build --release --target wasm32-unknown-unknown

cd ../..
echo "✅ Smart contracts built successfully"

# Create artifacts directory and copy WASM files
echo "📦 Preparing deployment artifacts..."
mkdir -p contracts/artifacts
cp contracts/mail/target/wasm32-unknown-unknown/release/privachain_mail.wasm contracts/artifacts/
# TODO: Add domain registry once build issues are resolved
# cp contracts/domain-registry/target/wasm32-unknown-unknown/release/privachain_domain_registry.wasm contracts/artifacts/
echo "✅ Artifacts prepared in contracts/artifacts/"

# Test contract functionality
echo "🧪 Running contract tests..."
cd contracts && ./scripts/test.sh && cd ..
echo "✅ Contract tests passed"

# Deploy to blockchain (if not skipped)
if [ "$SKIP_BLOCKCHAIN" != "true" ] && [ "$NETWORK" != "local" ]; then
    echo ""
    echo "🚀 Starting blockchain deployment..."
    
    # Check for deployment environment variables
    if [ -z "$DEPLOYER_MNEMONIC" ]; then
        echo "❌ DEPLOYER_MNEMONIC environment variable is required for deployment"
        echo "   Set it with: export DEPLOYER_MNEMONIC=\"your mnemonic phrase here\""
        exit 1
    fi
    
    # Check for cosm CLI
    if ! command -v cosm &> /dev/null; then
        echo "❌ cosm CLI not found. Please install from https://github.com/cosmos/cosmos-sdk"
        echo "   Or use: go install github.com/cosmos/cosmos-sdk/cmd/cosm@latest"
        exit 1
    fi
    echo "✅ cosm CLI found"
    
    # Set network configuration
    case $NETWORK in
        "testnet")
            CHAIN_ID=${CHAIN_ID:-"theta-testnet-001"}
            NODE_URL=${NODE_URL:-"https://rpc.theta-testnet.polypore.xyz:443"}
            FEE_TOKEN=${FEE_TOKEN:-"uatom"}
            GAS_PRICE=${GAS_PRICE:-"0.025uatom"}
            ;;
        "mainnet")
            CHAIN_ID=${CHAIN_ID:-"cosmoshub-4"}
            NODE_URL=${NODE_URL:-"https://rpc.cosmos.network:443"}
            FEE_TOKEN=${FEE_TOKEN:-"uatom"}
            GAS_PRICE=${GAS_PRICE:-"0.025uatom"}
            ;;
        *)
            echo "❌ Unknown network for deployment: $NETWORK"
            exit 1
            ;;
    esac
    
    echo "   Chain ID: $CHAIN_ID"
    echo "   Node URL: $NODE_URL"
    echo "   Gas Price: $GAS_PRICE"
    echo ""
    
    # Create deployer key from mnemonic
    echo "🔑 Setting up deployer wallet..."
    echo "$DEPLOYER_MNEMONIC" | cosm keys add deployer --recover --keyring-backend test
    
    DEPLOYER_ADDRESS=$(cosm keys show deployer -a --keyring-backend test)
    echo "   Deployer address: $DEPLOYER_ADDRESS"
    
    # Check deployer balance
    echo "💰 Checking deployer balance..."
    BALANCE=$(cosm query bank balances $DEPLOYER_ADDRESS --node $NODE_URL --chain-id $CHAIN_ID -o json 2>/dev/null | jq -r '.balances[0].amount // "0"')
    echo "   Balance: $BALANCE $FEE_TOKEN"
    
    if [ "$BALANCE" = "0" ]; then
        echo "⚠️  Warning: Deployer has no balance. Deployment may fail."
        echo "   Get test tokens from faucet for testnet deployment"
    fi
    
    # Deploy mail contract
    echo "📤 Deploying mail contract..."
    MAIL_CODE_ID=$(cosm tx wasm store contracts/artifacts/privachain_mail.wasm \
        --from deployer \
        --chain-id $CHAIN_ID \
        --node $NODE_URL \
        --gas auto \
        --gas-adjustment 1.3 \
        --gas-prices $GAS_PRICE \
        --keyring-backend test \
        -y \
        -o json | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')
    
    if [ -z "$MAIL_CODE_ID" ] || [ "$MAIL_CODE_ID" = "null" ]; then
        echo "❌ Failed to deploy mail contract"
        exit 1
    fi
    echo "✅ Mail contract stored with code ID: $MAIL_CODE_ID"
    
    # Instantiate mail contract
    echo "⚡ Instantiating mail contract..."
    MAIL_INIT_MSG='{"admin":null,"domain_registration_fee":"1000","email_fee":"10","pow_difficulty":4}'
    MAIL_CONTRACT_ADDR=$(cosm tx wasm instantiate $MAIL_CODE_ID "$MAIL_INIT_MSG" \
        --from deployer \
        --label "Privachain Mail" \
        --chain-id $CHAIN_ID \
        --node $NODE_URL \
        --gas auto \
        --gas-adjustment 1.3 \
        --gas-prices $GAS_PRICE \
        --keyring-backend test \
        -y \
        -o json | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')
    
    if [ -z "$MAIL_CONTRACT_ADDR" ] || [ "$MAIL_CONTRACT_ADDR" = "null" ]; then
        echo "❌ Failed to instantiate mail contract"
        exit 1
    fi
    echo "✅ Mail contract instantiated at: $MAIL_CONTRACT_ADDR"
    
    # Deploy domain registry contract (TODO: Enable once build issues resolved)
    # echo "📤 Deploying domain registry contract..."
    # DOMAIN_CODE_ID=$(cosm tx wasm store contracts/artifacts/privachain_domain_registry.wasm \
    #     --from deployer \
    #     --chain-id $CHAIN_ID \
    #     --node $NODE_URL \
    #     --gas auto \
    #     --gas-adjustment 1.3 \
    #     --gas-prices $GAS_PRICE \
    #     --keyring-backend test \
    #     -y \
    #     -o json | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')
    
    # if [ -z "$DOMAIN_CODE_ID" ] || [ "$DOMAIN_CODE_ID" = "null" ]; then
    #     echo "❌ Failed to deploy domain registry contract"
    #     exit 1
    # fi
    # echo "✅ Domain registry contract stored with code ID: $DOMAIN_CODE_ID"
    
    # # Instantiate domain registry contract
    # echo "⚡ Instantiating domain registry contract..."
    # DOMAIN_INIT_MSG='{"domain_registration_fee":"5000","domain_transfer_fee":"1000","admin":null}'
    # DOMAIN_CONTRACT_ADDR=$(cosm tx wasm instantiate $DOMAIN_CODE_ID "$DOMAIN_INIT_MSG" \
    #     --from deployer \
    #     --label "Privachain Domain Registry" \
    #     --chain-id $CHAIN_ID \
    #     --node $NODE_URL \
    #     --gas auto \
    #     --gas-adjustment 1.3 \
    #     --gas-prices $GAS_PRICE \
    #     --keyring-backend test \
    #     -y \
    #     -o json | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')
    
    # if [ -z "$DOMAIN_CONTRACT_ADDR" ] || [ "$DOMAIN_CONTRACT_ADDR" = "null" ]; then
    #     echo "❌ Failed to instantiate domain registry contract"
    #     exit 1
    # fi
    # echo "✅ Domain registry contract instantiated at: $DOMAIN_CONTRACT_ADDR"
    
    # Save deployment info
    echo "💾 Saving deployment information..."
    DEPLOYMENT_INFO="{
  \"network\": \"$NETWORK\",
  \"chainId\": \"$CHAIN_ID\",
  \"nodeUrl\": \"$NODE_URL\",
  \"deployerAddress\": \"$DEPLOYER_ADDRESS\",
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"contracts\": {
    \"mail\": {
      \"codeId\": \"$MAIL_CODE_ID\",
      \"address\": \"$MAIL_CONTRACT_ADDR\"
    }
  }
}"
    
    echo "$DEPLOYMENT_INFO" > contracts/artifacts/deployment-${NETWORK}.json
    echo "✅ Deployment info saved to contracts/artifacts/deployment-${NETWORK}.json"
    
    echo ""
    echo "🎉 Blockchain deployment completed successfully!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "   ✅ Mail Contract Code ID: $MAIL_CODE_ID"
    echo "   ✅ Mail Contract Address: $MAIL_CONTRACT_ADDR"
    echo "   ✅ Network: $NETWORK ($CHAIN_ID)"
    echo "   ✅ Deployer: $DEPLOYER_ADDRESS"
    echo "   ⏳ Domain Registry: Pending (build issues being resolved)"
    echo ""
    
    # Clean up deployer key for security
    cosm keys delete deployer --keyring-backend test -y 2>/dev/null || true
    echo "🔒 Deployer key cleaned up for security"
    
else
    echo ""
    echo "⏭️ Skipping blockchain deployment (SKIP_BLOCKCHAIN=$SKIP_BLOCKCHAIN, NETWORK=$NETWORK)"
fi

# Blockchain connectivity check (for information only)
if [ "$SKIP_BLOCKCHAIN" == "true" ] || [ "$NETWORK" == "local" ]; then
    echo ""
    echo "🔗 Blockchain connectivity check..."
    
    case $NETWORK in
        "local")
            echo "   Local network selected - no blockchain required for development"
            echo "   Frontend will run with mock blockchain responses"
            ;;
        *)
            echo "   Blockchain deployment skipped (SKIP_BLOCKCHAIN=$SKIP_BLOCKCHAIN)"
            ;;
    esac
fi

echo ""
echo "✅ Contract deployment preparation completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   ✅ System requirements verified"
echo "   ✅ Smart contracts built and tested"
echo "   ✅ Deployment artifacts prepared"
echo "   ✅ Ready for $(echo $NETWORK | tr '[:lower:]' '[:upper:]') deployment"
echo ""
echo "🚀 Next steps:"
echo "   • Run 'npm run dev' to start the development server"
echo "   • Run 'npm run test:all' to verify everything works"
echo "   • See LOCAL_TESTING.md for comprehensive testing guide"
echo ""
echo "✨ Setup completed successfully!"