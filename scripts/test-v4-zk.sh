#!/usr/bin/env bash
# Quick v4.0 ZK-proofs test - validates the implementation

set -euo pipefail

echo "🚀 PrivaChain v4.0 ZK-Proofs Quick Test"
echo "========================================"
echo ""

# Compile circuits
echo "📐 Compiling circuits..."
./scripts/zk_compile.sh
echo ""

# Build with ZK features
echo "🔨 Building with zk-proofs..."
cargo build --release --features zk-proofs -p privachain_node
echo "✅ Build complete"
echo ""

# Run tests
echo "🧪 Running ZK tests..."
cargo test -p privachain_node --features zk-proofs --lib zk
echo ""

# Verify no regression
echo "🔄 Testing v3.0 compatibility..."
cargo build --release --no-default-features --features mixnet-default,post-quantum -p privachain_node
echo "✅ v3.0 compatibility maintained"
echo ""

echo "🎉 All tests passed! v4.0 ZK-proofs working correctly."
echo ""
echo "To use in your app:"
echo "  cargo build --release --features zk-proofs"
echo ""
echo "Documentation: docs/v4-zk-proofs.md"
