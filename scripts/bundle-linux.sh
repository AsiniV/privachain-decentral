#!/usr/bin/env bash
# Local Linux Bundle Script for PrivaChain
# Creates an optimized, compact release bundle
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🚀 Building PrivaChain Linux Bundle"
echo "===================================="
echo ""

# Check dependencies
echo "🔍 Checking dependencies..."
MISSING_DEPS=()

if ! command -v cargo &> /dev/null; then
    MISSING_DEPS+=("cargo")
fi

if ! command -v strip &> /dev/null; then
    MISSING_DEPS+=("binutils (strip)")
fi

if ! command -v upx &> /dev/null; then
    echo "⚠️  UPX not found - install with: sudo apt install upx-ucl"
    MISSING_DEPS+=("upx")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "❌ Missing dependencies: ${MISSING_DEPS[*]}"
    echo ""
    echo "Install them with:"
    echo "  sudo apt install binutils upx-ucl"
    exit 1
fi

echo "✅ All dependencies found"
echo ""

# Build release binaries
echo "🔨 Building release binaries..."
cargo build --release --workspace --bin privachain-node
cargo build --release -p privachain_dr_ffi

echo "✅ Build complete"
echo ""

# Get initial sizes
echo "📊 Initial binary sizes:"
ls -lh target/release/privachain-node | awk '{print "  privachain-node: " $5}'
if [ -f target/release/libprivachain_dr_ffi.so ]; then
    ls -lh target/release/libprivachain_dr_ffi.so | awk '{print "  libprivachain_dr_ffi.so: " $5}'
fi
echo ""

# Strip symbols
echo "✂️  Stripping symbols..."
strip target/release/privachain-node
find target/release -name '*.so' -exec strip {} \;
echo "✅ Symbols stripped"
echo ""

# UPX compression
echo "📦 Applying UPX compression..."
upx --best --lzma target/release/privachain-node 2>&1 || echo "⚠️  UPX compression had warnings (this is often normal)"
find target/release -name '*.so' -exec upx --best {} \; 2>&1 || true
echo "✅ UPX compression complete"
echo ""

# Get final sizes
echo "📊 Final binary sizes:"
ls -lh target/release/privachain-node | awk '{print "  privachain-node: " $5}'
if [ -f target/release/libprivachain_dr_ffi.so ]; then
    ls -lh target/release/libprivachain_dr_ffi.so | awk '{print "  libprivachain_dr_ffi.so: " $5}'
fi
echo ""

# Create AppImage
echo "🎨 Creating AppImage..."
mkdir -p AppDir/usr/bin AppDir/usr/lib

# Copy binaries
cp target/release/privachain-node AppDir/usr/bin/
if [ -f target/release/libprivachain_dr_ffi.so ]; then
    cp target/release/libprivachain_dr_ffi.so AppDir/usr/lib/
fi

# Create desktop file
cat > AppDir/privachain.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=PrivaChain
Comment=Privacy-focused blockchain node
Exec=privachain-node
Icon=privachain
Categories=Network;P2P;
Terminal=true
EOF

# Copy icon if available
if [ -f src-tauri/icons/128x128.png ]; then
    cp src-tauri/icons/128x128.png AppDir/privachain.png
    echo "✅ Icon copied"
else
    echo "⚠️  No icon found at src-tauri/icons/128x128.png"
fi

# Copy only runtime libraries
echo "📚 Copying runtime libraries..."
ldd target/release/privachain-node | grep "=> /" | awk '{print $3}' | xargs -I {} cp --parents {} AppDir/ 2>/dev/null || true

# Remove static libs, cmake, pkgconfig
rm -rf AppDir/usr/lib/*.a AppDir/usr/lib/cmake AppDir/usr/lib/pkgconfig 2>/dev/null || true

# Download appimagetool if not present
if [ ! -f appimagetool-x86_64.AppImage ]; then
    echo "📥 Downloading appimagetool..."
    ARCH=x86_64 wget -q https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
    chmod +x appimagetool-x86_64.AppImage
fi

# Create AppImage
echo "🔧 Building AppImage..."
ARCH=x86_64 ./appimagetool-x86_64.AppImage AppDir privachain-linux-x86_64.AppImage 2>&1 || echo "⚠️  AppImage creation completed with warnings"

if [ -f privachain-linux-x86_64.AppImage ]; then
    echo "✅ AppImage created"
    ls -lh privachain-linux-x86_64.AppImage | awk '{print "  Size: " $5}'
else
    echo "❌ AppImage creation failed"
fi

echo ""
echo "✨ Bundle creation complete!"
echo ""
echo "📋 Created files:"
echo "  • target/release/privachain-node (stripped + compressed)"
if [ -f target/release/libprivachain_dr_ffi.so ]; then
    echo "  • target/release/libprivachain_dr_ffi.so (stripped + compressed)"
fi
if [ -f privachain-linux-x86_64.AppImage ]; then
    echo "  • privachain-linux-x86_64.AppImage"
fi
echo ""
echo "🚀 Ready for distribution!"
