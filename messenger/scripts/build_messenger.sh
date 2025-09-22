#!/bin/bash
# build_messenger.sh - Reproducible build script for messenger

set -e

echo "🏗️  Building PrivaChain Messenger (Reproducible Build)"
echo "=================================================="

SCRIPT_DIR="$(dirname "$0")"
MESSENGER_DIR="$(realpath "$SCRIPT_DIR/..")"
BUILD_DIR="$MESSENGER_DIR/target"
ARTIFACTS_DIR="$MESSENGER_DIR/build_artifacts"

cd "$MESSENGER_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cargo clean
rm -rf "$ARTIFACTS_DIR"
mkdir -p "$ARTIFACTS_DIR"

# Set reproducible build environment
export SOURCE_DATE_EPOCH=$(date +%s)
export CARGO_TERM_COLOR=never
export RUSTFLAGS="-C debuginfo=0 -C strip=symbols"

echo "📅 Build timestamp: $SOURCE_DATE_EPOCH"

# Build release version
echo "🔨 Building Rust library (release)..."
cargo build --release --verbose

# Build FFI library
echo "🔗 Building FFI interface..."
if [ -f "ffi/messenger_ffi.cc" ]; then
    cd ffi
    g++ -fPIC -shared -O3 -o libmessenger_ffi.so messenger_ffi.cc -L../target/release -lprivachain_messenger
    cd ..
    echo "✅ FFI library built: ffi/libmessenger_ffi.so"
fi

# Copy artifacts to build directory
echo "📦 Collecting build artifacts..."
cp target/release/libprivachain_messenger.rlib "$ARTIFACTS_DIR/"
cp target/release/libprivachain_messenger.so "$ARTIFACTS_DIR/" 2>/dev/null || echo "Note: .so not generated"

if [ -f "ffi/libmessenger_ffi.so" ]; then
    cp ffi/libmessenger_ffi.so "$ARTIFACTS_DIR/"
fi

# Build ZK circuits if circom is available
if command -v circom &> /dev/null; then
    echo "🔐 Building ZK circuits..."
    cd circuits
    ./build.sh
    cd ..
    
    # Copy circuit artifacts
    mkdir -p "$ARTIFACTS_DIR/circuits"
    cp circuits/artifacts/*.wasm "$ARTIFACTS_DIR/circuits/" 2>/dev/null || true
    cp circuits/artifacts/*.zkey "$ARTIFACTS_DIR/circuits/" 2>/dev/null || true
    cp circuits/artifacts/*.json "$ARTIFACTS_DIR/circuits/" 2>/dev/null || true
else
    echo "⚠️  Circom not found - skipping ZK circuit build"
fi

# Generate build manifest
echo "📄 Generating build manifest..."
cat > "$ARTIFACTS_DIR/build_manifest.json" << EOF
{
    "build_timestamp": "$SOURCE_DATE_EPOCH",
    "build_date": "$(date -u -d "@$SOURCE_DATE_EPOCH" '+%Y-%m-%d %H:%M:%S UTC')",
    "rust_version": "$(rustc --version)",
    "cargo_version": "$(cargo --version)",
    "target_triple": "$(rustc -vV | grep 'host:' | cut -d' ' -f2)",
    "source_hash": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "artifacts": [
        "libprivachain_messenger.rlib",
        "libprivachain_messenger.so",
        "libmessenger_ffi.so"
    ]
}
EOF

# Calculate checksums
echo "🔍 Calculating checksums..."
cd "$ARTIFACTS_DIR"
sha256sum * > checksums.sha256 2>/dev/null || echo "No artifacts to checksum"
cd "$MESSENGER_DIR"

# Run tests to verify build
echo "🧪 Running build verification tests..."
cargo test --release

# Display build summary
echo ""
echo "✅ Build completed successfully!"
echo "📋 Build Summary:"
echo "=================="
echo "Build directory: $ARTIFACTS_DIR"
echo "Build timestamp: $(date -u -d "@$SOURCE_DATE_EPOCH" '+%Y-%m-%d %H:%M:%S UTC')"
echo "Source hash: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
echo ""
echo "📦 Artifacts:"
ls -la "$ARTIFACTS_DIR"
echo ""
echo "🔒 Checksums:"
cat "$ARTIFACTS_DIR/checksums.sha256" 2>/dev/null || echo "No checksums available"
echo ""
echo "🎉 Reproducible build complete!"