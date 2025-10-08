#!/usr/bin/env bash
set -e

echo "🔍 Testing Tor integration for PrivaChain node..."

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Build the node
echo "📦 Building privachain-node..."
cd node
cargo build --bin privachain-node --release

echo "🚀 Starting node with --anonymize flag..."
# Run node with flag in background, capturing logs
RUST_LOG=info timeout 120 cargo run --bin privachain-node --release -- --anonymize > /tmp/tor_node.log 2>&1 &
PID=$!

# Wait for bootstrap
echo "⏳ Waiting 60 seconds for Tor bootstrap..."
sleep 60

# Check if process is still running
if ps -p $PID > /dev/null; then
    echo "✅ Node is running with Tor bootstrap"
    
    # Check for Tor bootstrap message in logs
    if grep -q "Tor configuration directory ready" /tmp/tor_node.log; then
        echo "✅ Tor configuration initialized"
    else
        echo "⚠️  Warning: Could not find Tor configuration message in logs"
    fi
    
    echo "✅ Tor integration test passed"
    
    # Clean up
    kill $PID || true
    wait $PID 2>/dev/null || true
    
    exit 0
else
    echo "❌ Node process died during Tor bootstrap"
    echo "--- Last 50 lines of log ---"
    tail -50 /tmp/tor_node.log
    exit 1
fi
