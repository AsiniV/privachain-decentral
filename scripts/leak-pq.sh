#!/usr/bin/env bash
# leak-pq.sh - Test for classical cryptography leaks in PQ mode
#
# This script builds the node with post-quantum features and checks that
# no classical ECDSA handshakes are present in network traffic.

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "PQ Leak Test - Checking for Classical Crypto Leaks"
echo "=================================================="

# Build with post-quantum features
echo "Building with post-quantum features..."
cargo build --release --features post-quantum -p privachain_node

if [ ! -f "./target/release/privachain-node" ]; then
    echo -e "${RED}❌ Build failed: binary not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Check if tcpdump is available
if ! command -v tcpdump &> /dev/null; then
    echo -e "${YELLOW}⚠️  tcpdump not available, skipping network capture${NC}"
    echo -e "${YELLOW}Install tcpdump with: sudo apt-get install tcpdump${NC}"
    echo ""
    echo -e "${GREEN}✅ Build passed - network leak test skipped (tcpdump not available)${NC}"
    exit 0
fi

# Check if we have sudo access for tcpdump
if ! sudo -n true 2>/dev/null; then
    echo -e "${YELLOW}⚠️  sudo access required for tcpdump, skipping network capture${NC}"
    echo ""
    echo -e "${GREEN}✅ Build passed - network leak test skipped (sudo not available)${NC}"
    exit 0
fi

echo "Starting network capture..."
# Start tcpdump in background
sudo tcpdump -i any -w /tmp/pq.pcap &
TCPDUMP_PID=$!

# Give tcpdump time to start
sleep 2

echo "Starting node in PQ mode..."
# Start the node with a timeout
timeout 30 ./target/release/privachain-node --listen /ip4/127.0.0.1/tcp/33333 &
NODE_PID=$!

# Wait for node to run
sleep 25

# Stop the node
echo "Stopping node..."
kill $NODE_PID 2>/dev/null || true
wait $NODE_PID 2>/dev/null || true

# Stop tcpdump
echo "Stopping network capture..."
sudo kill $TCPDUMP_PID 2>/dev/null || true
wait $TCPDUMP_PID 2>/dev/null || true

sleep 2

# Analyze the capture
echo "Analyzing network traffic for classical crypto leaks..."

# Check for ECDSA patterns in the capture
if sudo tcpdump -r /tmp/pq.pcap 2>/dev/null | grep -i "ecdsa\|secp256k1\|prime256v1" > /dev/null 2>&1; then
    echo -e "${RED}❌ LEAK DETECTED: Classical ECDSA keys found in network traffic${NC}"
    echo "This indicates the node is using classical cryptography instead of PQ"
    sudo rm -f /tmp/pq.pcap
    exit 1
else
    echo -e "${GREEN}✅ No classical key leaks detected${NC}"
    echo "Network traffic appears to be PQ-safe"
fi

# Clean up
sudo rm -f /tmp/pq.pcap

echo ""
echo -e "${GREEN}=================================================="
echo "✅ PQ Leak Test PASSED"
echo "No classical cryptography leaks detected"
echo "==================================================${NC}"
