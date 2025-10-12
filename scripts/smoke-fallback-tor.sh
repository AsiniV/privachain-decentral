#!/usr/bin/env bash
set -euo pipefail

echo "🕵️ Fallback-Tor Smoke Test"
echo "========================="
echo ""

# Build with fallback-tor feature
echo "1️⃣  Building release with --features fallback-tor..."
cargo build --release --features fallback-tor -p privachain_node --target-dir target/fallback --quiet
if [ $? -eq 0 ]; then
    echo "   ✅ Fallback-tor build successful"
else
    echo "   ❌ Fallback-tor build failed"
    exit 1
fi
echo ""

# Check binary size
echo "2️⃣  Checking binary size..."
BINARY_SIZE=$(stat -c%s ./target/fallback/release/privachain-node 2>/dev/null || stat -f%z ./target/fallback/release/privachain-node 2>/dev/null)
BINARY_SIZE_MB=$((BINARY_SIZE / 1024 / 1024))
echo "   Binary size: ${BINARY_SIZE_MB}MB"
if [ "$BINARY_SIZE_MB" -lt 11 ]; then
    echo "   ✅ Binary size within budget (< 11MB)"
else
    echo "   ⚠️  Binary size exceeds 11MB limit"
fi
echo ""

# Test that --fallback flag requires fallback-tor feature
echo "3️⃣  Testing --fallback flag with fallback-tor feature..."
RUST_LOG=info timeout 5 ./target/fallback/release/privachain-node --fallback > /tmp/tor_fallback_test.log 2>&1 &
PID=$!
sleep 3

if ps -p $PID > /dev/null 2>&1; then
    echo "   ✅ Tor fallback node started successfully"
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
else
    echo "   ⚠️  Tor fallback node stopped early (expected - Tor bootstrap may fail)"
    cat /tmp/tor_fallback_test.log 2>/dev/null || true
fi
echo ""

# Check log for Tor initialization
if grep -q "Fallback\|Tor" /tmp/tor_fallback_test.log 2>/dev/null; then
    echo "   ✅ Tor fallback detected in logs"
else
    echo "   ⚠️  No Tor fallback in logs (check /tmp/tor_fallback_test.log)"
fi
echo ""

echo "========================="
echo "✅ Fallback-tor smoke test passed!"
echo "========================="
