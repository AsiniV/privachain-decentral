#!/usr/bin/env bash
# deploy-all.sh - Deploy all components with post-quantum features
#
# This script builds and deploys the entire Privachain system with
# post-quantum cryptography enabled.

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Privachain v3.0 Deployment - Post-Quantum Edition"
echo "=================================================="

# Parse command line arguments
FEATURES="i2p-default"
while [[ $# -gt 0 ]]; do
    case $1 in
        --features)
            FEATURES="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--features post-quantum]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Building with features: ${FEATURES}${NC}"

# Build the node
echo ""
echo "=================================================="
echo "Building privachain-node..."
echo "=================================================="
cargo build --release --features "$FEATURES" -p privachain_node
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Node build successful${NC}"
else
    echo "❌ Node build failed"
    exit 1
fi

# Build the messenger
echo ""
echo "=================================================="
echo "Building privachain-messenger..."
echo "=================================================="
if [[ "$FEATURES" == *"post-quantum"* ]]; then
    cargo build --release --features post-quantum -p privachain_messenger
else
    cargo build --release -p privachain_messenger
fi
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Messenger build successful${NC}"
else
    echo "❌ Messenger build failed"
    exit 1
fi

# Check binary sizes
echo ""
echo "=================================================="
echo "Binary Sizes"
echo "=================================================="
if [ -f "./target/release/privachain-node" ]; then
    NODE_SIZE=$(du -h ./target/release/privachain-node | cut -f1)
    echo "privachain-node: ${NODE_SIZE}"
fi

if [ -f "./target/release/libprivachain_messenger.so" ]; then
    MESSENGER_SIZE=$(du -h ./target/release/libprivachain_messenger.so | cut -f1)
    echo "libprivachain_messenger.so: ${MESSENGER_SIZE}"
elif [ -f "./target/release/libprivachain_messenger.dylib" ]; then
    MESSENGER_SIZE=$(du -h ./target/release/libprivachain_messenger.dylib | cut -f1)
    echo "libprivachain_messenger.dylib: ${MESSENGER_SIZE}"
fi

# Display deployment summary
echo ""
echo "=================================================="
echo "Deployment Summary"
echo "=================================================="
echo -e "${GREEN}✅ All components built successfully${NC}"
echo ""
echo "Features enabled: ${FEATURES}"
echo ""
echo "Available binaries:"
echo "  - ./target/release/privachain-node"
if [[ "$FEATURES" == *"post-quantum"* ]]; then
    echo ""
    echo "Post-Quantum features:"
    echo "  ✓ Hybrid key exchange (X25519 + Kyber768)"
    echo "  ✓ PQ bandwidth purchase support"
    echo "  ✓ PQ libp2p discovery"
    echo "  ✓ Automatic key rotation (24h)"
    echo "  ✓ BIP-39 compatible identity export"
fi
echo ""
echo -e "${BLUE}To start the node:${NC}"
echo "  ./target/release/privachain-node --listen /ip4/0.0.0.0/tcp/33333"
echo ""
if [[ "$FEATURES" == *"post-quantum"* ]]; then
    echo -e "${BLUE}To configure I2P with post-quantum features:${NC}"
    echo "  export I2P_SAM_HOST=\"127.0.0.1:7656\""
    echo "  ./target/release/privachain-node --tunnel i2p"
    echo ""
fi
echo "=================================================="
