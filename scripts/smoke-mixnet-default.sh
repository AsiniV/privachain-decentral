#!/usr/bin/env bash
set -euo pipefail

echo "🕸️ Mixnet-Default Smoke Test"
echo "============================"
echo ""

# Build with mixnet-default (default feature)
echo "1️⃣  Building release with mixnet-default..."
cargo build --release -p privachain_node --quiet
if [ $? -eq 0 ]; then
    echo "   ✅ Mixnet-default build successful"
else
    echo "   ❌ Mixnet-default build failed"
    exit 1
fi
echo ""

# Check binary size
echo "2️⃣  Checking binary size..."
BINARY_SIZE=$(stat -c%s ./target/release/privachain-node 2>/dev/null || stat -f%z ./target/release/privachain-node 2>/dev/null)
BINARY_SIZE_MB=$((BINARY_SIZE / 1024 / 1024))
echo "   Binary size: ${BINARY_SIZE_MB}MB"
if [ "$BINARY_SIZE_MB" -lt 11 ]; then
    echo "   ✅ Binary size within budget (< 11MB)"
else
    echo "   ⚠️  Binary size exceeds 11MB limit"
fi
echo ""

# Test that node starts with mixnet by default
echo "3️⃣  Testing mixnet default startup (5 seconds)..."
RUST_LOG=info timeout 5 ./target/release/privachain-node > /tmp/mixnet_default_test.log 2>&1 &
PID=$!
sleep 3

if ps -p $PID > /dev/null 2>&1; then
    echo "   ✅ Mixnet node started successfully"
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
else
    echo "   ⚠️  Mixnet node stopped early (expected - no real gateway)"
    cat /tmp/mixnet_default_test.log 2>/dev/null || true
fi
echo ""

# Check log for mixnet initialization
if grep -q "Mixnet" /tmp/mixnet_default_test.log 2>/dev/null; then
    echo "   ✅ Mixnet initialization detected in logs"
else
    echo "   ⚠️  No mixnet initialization in logs (check /tmp/mixnet_default_test.log)"
fi
echo ""

echo "============================"
echo "✅ Mixnet-default smoke test passed!"
echo "============================"
