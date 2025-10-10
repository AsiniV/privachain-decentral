#!/bin/bash
# Build script for DPI-WASM package
# Usage: ./build.sh

set -e

echo "Building DPI-WASM package..."

# Navigate to the wasm directory
cd "$(dirname "$0")"

# Build with wasm-pack
wasm-pack build --target web --out-dir ../src/wasm-pkg

echo "✅ Build complete! Output in ../src/wasm-pkg/"
echo ""
echo "To test, open example.html in a browser with a local server:"
echo "  python3 -m http.server 8000"
echo "  # Then open http://localhost:8000/example.html"
