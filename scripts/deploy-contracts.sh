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
    echo "❌ Contract build failed - WASM file not generated"
    exit 1
fi

cd ../..
echo "✅ Smart contracts built successfully"

# Create artifacts directory and copy WASM files
echo "📦 Preparing deployment artifacts..."
mkdir -p contracts/artifacts
cp contracts/mail/target/wasm32-unknown-unknown/release/privachain_mail.wasm contracts/artifacts/
echo "✅ Artifacts prepared in contracts/artifacts/"

# Test contract functionality
echo "🧪 Running contract tests..."
cd contracts && ./scripts/test.sh && cd ..
echo "✅ Contract tests passed"

# Blockchain connectivity check (optional)
if [ "$SKIP_BLOCKCHAIN" != "true" ]; then
    echo ""
    echo "🔗 Blockchain connectivity check..."
    
    case $NETWORK in
        "local")
            echo "   Local network selected - no blockchain required for development"
            echo "   Frontend will run with mock blockchain responses"
            ;;
        "testnet")
            echo "   Testnet deployment requires:"
            echo "   - Running Cosmos SDK node"
            echo "   - Valid wallet with test tokens"
            echo "   - Network connectivity to testnet RPC"
            echo "   Use 'npm run deploy:testnet' for actual deployment"
            ;;
        *)
            echo "   Unknown network: $NETWORK"
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