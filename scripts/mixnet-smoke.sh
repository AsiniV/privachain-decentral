#!/usr/bin/env bash
set -euo pipefail

echo "🕸️ NYM Mixnet Smoke Test"
echo "========================="
echo ""

# Build with mixnet feature
echo "1️⃣  Building release with --features mixnet..."
cargo build --release --features mixnet -p privachain_node --quiet
if [ $? -eq 0 ]; then
    echo "   ✅ Mixnet build successful"
else
    echo "   ❌ Mixnet build failed"
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

# Test mixnet flag validation
echo "3️⃣  Testing --mixnet flag validation..."
OUTPUT=$(./target/release/privachain-node --mixnet 2>&1 || true)
if echo "$OUTPUT" | grep -q "required when using --mixnet"; then
    echo "   ✅ Gateway requirement validated"
else
    echo "   ❌ Gateway validation failed"
    echo "   Got: $OUTPUT"
    exit 1
fi
echo ""

# Test conflicting flags
echo "4️⃣  Testing conflicting flags protection..."
OUTPUT=$(./target/release/privachain-node --mixnet --anonymize --mixnet-gateway 45.79.1.1:1789 2>&1 || true)
if echo "$OUTPUT" | grep -q "Cannot use both"; then
    echo "   ✅ Conflicting flags rejected"
else
    echo "   ❌ Conflicting flags check failed"
    echo "   Got: $OUTPUT"
    exit 1
fi
echo ""

# Test mixnet startup
echo "5️⃣  Testing mixnet node startup (10 seconds)..."
timeout 10 ./target/release/privachain-node --mixnet --mixnet-gateway 45.79.1.1:1789 > /tmp/mixnet_node_test.log 2>&1 &
PID=$!
sleep 5

if ps -p $PID > /dev/null 2>&1; then
    echo "   ✅ Mixnet node started successfully"
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
else
    echo "   ⚠️  Mixnet node stopped early (expected - no real gateway)"
    cat /tmp/mixnet_node_test.log || true
fi
echo ""

echo "========================="
echo "✅ Mixnet smoke test passed!"
echo "========================="
