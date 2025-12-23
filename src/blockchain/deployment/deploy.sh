#!/usr/bin/env bash

# PrivaChain Contract Deployment Scripts
# Bash scripts for easier deployment management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NETWORK="testnet"
COMMAND=""

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

show_help() {
    cat << EOF
🔗 PrivaChain Deployment Scripts

USAGE:
    ./deploy.sh [COMMAND] [NETWORK]

COMMANDS:
    deploy      Deploy all contracts
    verify      Verify deployment
    status      Check deployment status
    estimate    Estimate costs
    quick       Quick deployment
    clean       Clean deployment artifacts
    help        Show this help

NETWORKS:
    testnet     PrivaChain testnet (default)
    mainnet     PrivaChain mainnet
    local       Local development chain

EXAMPLES:
    ./deploy.sh deploy testnet
    ./deploy.sh verify mainnet
    ./deploy.sh status local
    ./deploy.sh quick testnet

ENVIRONMENT VARIABLES:
    DEPLOYER_MNEMONIC    Deployment wallet mnemonic (required)
    RPC_ENDPOINT         Custom RPC endpoint (optional)
    GAS_PRICE           Custom gas price (optional)

EOF
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check if TypeScript is available
    if ! command -v npx &> /dev/null; then
        log_error "npx is not available. Please ensure npm is properly installed."
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

check_environment() {
    log_info "Checking environment variables..."
    
    if [ -z "$DEPLOYER_MNEMONIC" ]; then
        log_error "DEPLOYER_MNEMONIC environment variable is required"
        log_info "Export your mnemonic: export DEPLOYER_MNEMONIC='your 12 or 24 word mnemonic'"
        exit 1
    fi
    
    # Validate mnemonic word count
    WORD_COUNT=$(echo "$DEPLOYER_MNEMONIC" | wc -w)
    if [ "$WORD_COUNT" -ne 12 ] && [ "$WORD_COUNT" -ne 24 ]; then
        log_error "DEPLOYER_MNEMONIC must be 12 or 24 words. Found $WORD_COUNT words."
        exit 1
    fi
    
    log_success "Environment check passed"
}

install_dependencies() {
    log_info "Installing npm dependencies..."
    npm install
    log_success "Dependencies installed"
}

deploy_contracts() {
    local network=$1
    log_info "Deploying contracts to $network..."
    
    # Run the TypeScript deployment script
    npx ts-node src/blockchain/deployment/cli.ts deploy "$network"
    
    log_success "Deployment to $network completed"
}

verify_deployment() {
    local network=$1
    log_info "Verifying deployment on $network..."
    
    npx ts-node src/blockchain/deployment/cli.ts verify "$network"
    
    log_success "Verification completed"
}

check_status() {
    local network=$1
    log_info "Checking deployment status on $network..."
    
    npx ts-node src/blockchain/deployment/cli.ts status "$network"
}

estimate_costs() {
    local network=$1
    log_info "Estimating deployment costs for $network..."
    
    npx ts-node src/blockchain/deployment/cli.ts estimate "$network"
}

quick_deploy() {
    local network=$1
    log_info "Starting quick deployment to $network..."
    
    check_dependencies
    check_environment
    install_dependencies
    
    npx ts-node src/blockchain/deployment/cli.ts quick "$network"
    
    log_success "Quick deployment completed"
}

clean_artifacts() {
    log_info "Cleaning deployment artifacts..."
    
    # Remove build artifacts
    rm -rf dist/
    rm -rf build/
    
    # Remove deployment state files
    rm -f deployment-*.json
    
    # Clear localStorage in development
    log_warning "Note: Browser localStorage may still contain deployment data"
    
    log_success "Artifacts cleaned"
}

backup_deployment() {
    local network=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="deployment_backup_${network}_${timestamp}.json"
    
    log_info "Creating backup of deployment state..."
    
    if [ -f "deployment-${network}.json" ]; then
        cp "deployment-${network}.json" "$backup_file"
        log_success "Backup created: $backup_file"
    else
        log_warning "No deployment state file found for $network"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        deploy|verify|status|estimate|quick|clean|help)
            COMMAND=$1
            shift
            ;;
        testnet|mainnet|local)
            NETWORK=$1
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set default command if none provided
if [ -z "$COMMAND" ]; then
    COMMAND="help"
fi

# Main execution
case $COMMAND in
    deploy)
        check_dependencies
        check_environment
        install_dependencies
        backup_deployment "$NETWORK"
        deploy_contracts "$NETWORK"
        ;;
    verify)
        check_dependencies
        verify_deployment "$NETWORK"
        ;;
    status)
        check_dependencies
        check_status "$NETWORK"
        ;;
    estimate)
        check_dependencies
        estimate_costs "$NETWORK"
        ;;
    quick)
        quick_deploy "$NETWORK"
        ;;
    clean)
        clean_artifacts
        ;;
    help)
        show_help
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac