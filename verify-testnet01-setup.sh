#!/bin/bash

# PrivaChain Testnet01 Environment Verification Script
# Run this script after following the testnet01.md setup instructions

set -e

echo "🔍 PrivaChain Testnet01 Environment Verification"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Track results
TOTAL_CHECKS=0
PASSED_CHECKS=0

check_result() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ $1 -eq 0 ]; then
        log_success "$2"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log_error "$2"
    fi
}

echo ""
log_info "Checking system prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_result 0 "Node.js installed: $NODE_VERSION"
else
    check_result 1 "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_result 0 "npm installed: v$NPM_VERSION"
else
    check_result 1 "npm not found"
fi

# Check Rust
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version | cut -d' ' -f2)
    check_result 0 "Rust/Cargo installed: $CARGO_VERSION"
else
    check_result 1 "Rust/Cargo not found"
fi

# Check WebAssembly target
if rustup target list --installed | grep -q wasm32-unknown-unknown; then
    check_result 0 "WebAssembly target installed"
else
    check_result 1 "WebAssembly target not installed"
    log_warning "Run: rustup target add wasm32-unknown-unknown"
fi

echo ""
log_info "Checking project setup..."

# Check if in correct directory
if [ -f "package.json" ] && grep -q "privachain" package.json; then
    check_result 0 "In PrivaChain project directory"
else
    check_result 1 "Not in PrivaChain project directory"
fi

# Check node_modules
if [ -d "node_modules" ]; then
    check_result 0 "Node modules installed"
else
    check_result 1 "Node modules not installed"
    log_warning "Run: npm install"
fi

# Check environment file
if [ -f ".env.local" ]; then
    check_result 0 "Environment file (.env.local) exists"
    
    # Check critical environment variables
    if grep -q "DEVELOPER_MNEMONIC" .env.local && ! grep -q "your mnemonic phrase here" .env.local; then
        check_result 0 "Developer mnemonic configured"
    else
        check_result 1 "Developer mnemonic not properly configured"
        log_warning "Update DEVELOPER_MNEMONIC in .env.local"
    fi
    
    if grep -q "COSMOS_RPC_ENDPOINT" .env.local; then
        check_result 0 "Cosmos RPC endpoint configured"
    else
        check_result 1 "Cosmos RPC endpoint not configured"
    fi
else
    check_result 1 "Environment file (.env.local) not found"
    log_warning "Copy .env.example to .env.local and configure"
fi

echo ""
log_info "Testing network connectivity..."

# Test Cosmos testnet connection
if curl -s --max-time 10 https://rpc.theta-testnet.polypore.xyz/status > /dev/null; then
    check_result 0 "Cosmos testnet RPC accessible"
else
    check_result 1 "Cosmos testnet RPC not accessible"
fi

if curl -s --max-time 10 https://rest.theta-testnet.polypore.xyz:1317/cosmos/base/node/v1beta1/config > /dev/null; then
    check_result 0 "Cosmos testnet REST API accessible"
else
    check_result 1 "Cosmos testnet REST API not accessible"
fi

echo ""
log_info "Testing build capabilities..."

# Test TypeScript compilation
if npm run test:build > /dev/null 2>&1; then
    check_result 0 "TypeScript compilation successful"
else
    check_result 1 "TypeScript compilation failed"
fi

# Test contract compilation (basic check)
if cd contracts/mail && cargo check --target wasm32-unknown-unknown > /dev/null 2>&1; then
    check_result 0 "Smart contract compilation check passed"
    cd ../..
else
    check_result 1 "Smart contract compilation check failed"
    cd ../.. 2>/dev/null || true
fi

echo ""
log_info "Testing deployment scripts..."

# Check deployment script exists and is executable
if [ -x "src/blockchain/deployment/deploy.sh" ]; then
    check_result 0 "Deployment script is executable"
else
    check_result 1 "Deployment script not executable"
    log_warning "Run: chmod +x src/blockchain/deployment/deploy.sh"
fi

# Test tsx availability
if npx tsx --version > /dev/null 2>&1; then
    check_result 0 "tsx (TypeScript executor) available"
else
    check_result 1 "tsx not available"
fi

echo ""
echo "================================================"
log_info "Verification Summary"
echo "================================================"

PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

if [ $PASS_RATE -ge 90 ]; then
    log_success "Environment verification: $PASSED_CHECKS/$TOTAL_CHECKS passed ($PASS_RATE%)"
    echo ""
    log_success "🎉 Your environment is ready for PrivaChain testnet deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Set your DEVELOPER_MNEMONIC in .env.local"
    echo "2. Follow the deployment instructions in testnet01.md"
    echo "3. Run: ./src/blockchain/deployment/deploy.sh quick testnet"
elif [ $PASS_RATE -ge 70 ]; then
    log_warning "Environment verification: $PASSED_CHECKS/$TOTAL_CHECKS passed ($PASS_RATE%)"
    echo ""
    log_warning "⚠️ Your environment has some issues but may work for deployment."
    echo "Please fix the failed checks before proceeding."
else
    log_error "Environment verification: $PASSED_CHECKS/$TOTAL_CHECKS passed ($PASS_RATE%)"
    echo ""
    log_error "❌ Your environment needs significant fixes before deployment."
    echo "Please address the failed checks and run this script again."
fi

echo ""
echo "For detailed setup instructions, see: testnet01.md"
echo "For help, check the troubleshooting section in testnet01.md"