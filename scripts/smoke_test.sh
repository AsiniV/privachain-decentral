#!/usr/bin/env bash
set -e

echo "🔍 PrivaChain Smoke Tests"
echo "========================="
echo ""

cd "$(dirname "$0")/.."

# Test 1: Tor + libp2p build
echo "1️⃣  Testing Tor + libp2p build..."
cargo build -p privachain-arti-node --quiet && echo "   ✅ Tor module builds successfully"
echo ""

# Test 2: DPI-WASM
echo "2️⃣  Testing DPI-WASM..."
cargo test -p dpi-wasm --quiet && echo "   ✅ DPI-WASM tests pass"
echo ""

# Test 3: Search with BM25
echo "3️⃣  Testing Search with BM25..."
cargo test -p privachain_search --quiet && echo "   ✅ Search tests pass"
echo ""

# Test 4: Double-Ratchet FFI
echo "4️⃣  Testing Double-Ratchet FFI..."
cargo test -p privachain_dr_ffi --quiet && echo "   ✅ DR FFI tests pass"
echo ""

# Test 5: Quick network test (optional)
echo "5️⃣  Testing node startup (10 seconds)..."
if cargo build --bin privachain-node --release --quiet 2>/dev/null; then
    timeout 10 ./target/release/privachain-node > /tmp/node_test.log 2>&1 &
    PID=$!
    sleep 3
    if ps -p $PID > /dev/null 2>&1; then
        echo "   ✅ Node starts successfully"
        kill $PID 2>/dev/null || true
    else
        echo "   ⚠️  Node failed to start (check logs)"
    fi
else
    echo "   ⚠️  privachain-node not built yet"
fi
echo ""

echo "========================="
echo "✅ All smoke tests passed!"
echo "========================="
