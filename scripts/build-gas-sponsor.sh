#!/bin/bash
set -e

# Build script for gas-sponsor contract v0.2.0
# Produces optimized WASM artifact
# Note: 'pq' in filename stands for 'post-quantum' indicating this version
# is part of the privachain post-quantum security features

echo "🔨 Building gas-sponsor contract..."

# Navigate to workspace root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$WORKSPACE_ROOT"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd contracts/gas-sponsor
cargo clean
cd "$WORKSPACE_ROOT"

# Build optimized release (library only, not schema binary)
echo "🚀 Building optimized release..."
cd contracts/gas-sponsor
RUSTFLAGS='-C link-arg=-s' cargo build --release --lib --target wasm32-unknown-unknown

# Create artifacts directory
cd "$WORKSPACE_ROOT"
mkdir -p artifacts

# Copy the wasm file from workspace target
# Using gas-sponsor-pq.wasm naming to indicate this is part of PQ security suite
cp target/wasm32-unknown-unknown/release/gas_sponsor.wasm artifacts/gas-sponsor-pq.wasm

# Get file size
SIZE=$(du -h artifacts/gas-sponsor-pq.wasm | cut -f1)

echo "✅ Build complete!"
echo "📦 Artifact: artifacts/gas-sponsor-pq.wasm"
echo "📏 Size: $SIZE"
echo ""
echo "Contract version: 0.2.0"
echo "Features:"
echo "  ✓ Configurable denom (no hardcoded uatom)"
echo "  ✓ Owner withdrawal support"
echo "  ✓ Multi-coin safety checks"
echo "  ✓ Migration from v0.1.0"
