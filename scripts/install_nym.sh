#!/bin/bash
# install_nym.sh - Install Nym mixnet client for metadata protection
# Downloads official Nym binary and sets up client configuration

set -e

echo "🕸️ Installing Nym mixnet client..."

# Configuration
NYM_VERSION="v1.1.37"
NYM_DIR="$HOME/.nym"
NYM_BIN_DIR="$NYM_DIR/bin"

# Create directories
mkdir -p "$NYM_BIN_DIR"

# Detect architecture
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

case "$ARCH" in
    x86_64|amd64)
        ARCH_SUFFIX="x86_64"
        ;;
    arm64|aarch64)
        ARCH_SUFFIX="aarch64"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Construct download URL
NYM_BINARY="nym-client"
if [ "$OS" = "linux" ]; then
    DOWNLOAD_URL="https://github.com/nymtech/nym/releases/download/$NYM_VERSION/nym-client-${ARCH_SUFFIX}-unknown-linux-gnu"
elif [ "$OS" = "darwin" ]; then
    DOWNLOAD_URL="https://github.com/nymtech/nym/releases/download/$NYM_VERSION/nym-client-${ARCH_SUFFIX}-apple-darwin"
else
    echo "❌ Unsupported OS: $OS"
    exit 1
fi

echo "📥 Downloading Nym client from: $DOWNLOAD_URL"

# Download binary
if command -v wget >/dev/null 2>&1; then
    wget -O "$NYM_BIN_DIR/nym-client" "$DOWNLOAD_URL"
elif command -v curl >/dev/null 2>&1; then
    curl -L -o "$NYM_BIN_DIR/nym-client" "$DOWNLOAD_URL"
else
    echo "❌ Neither wget nor curl found. Please install one of them."
    exit 1
fi

# Make executable
chmod +x "$NYM_BIN_DIR/nym-client"

# Verify installation
if [ -x "$NYM_BIN_DIR/nym-client" ]; then
    echo "✅ Nym client installed successfully"
    echo "📍 Binary location: $NYM_BIN_DIR/nym-client"
    
    # Show version
    "$NYM_BIN_DIR/nym-client" --version || echo "⚠️ Could not get version (binary may need initialization)"
    
    echo ""
    echo "🔧 To initialize the client, run:"
    echo "   $NYM_BIN_DIR/nym-client init --id priva"
    echo ""
    echo "🚀 To start the client, run:"
    echo "   $NYM_BIN_DIR/nym-client run --id priva &"
    echo ""
    echo "🌐 Client will be available at: http://localhost:1977"
else
    echo "❌ Installation failed"
    exit 1
fi

# Optional: Add to PATH
if [[ ":$PATH:" != *":$NYM_BIN_DIR:"* ]]; then
    echo "💡 Add to your PATH for easier access:"
    echo "   export PATH=\"$NYM_BIN_DIR:\$PATH\""
fi

echo "✅ Nym mixnet installation completed!"