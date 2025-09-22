#!/bin/bash
# sign_bins.sh - Sign binaries with minisign

set -e

echo "🔏 Signing messenger binaries with minisign"

SCRIPT_DIR="$(dirname "$0")"
MESSENGER_DIR="$(realpath "$SCRIPT_DIR/..")"
ARTIFACTS_DIR="$MESSENGER_DIR/build_artifacts"
KEYS_DIR="$MESSENGER_DIR/signing_keys"

cd "$MESSENGER_DIR"

# Check if minisign is available
if ! command -v minisign &> /dev/null; then
    echo "❌ minisign not found. Please install minisign:"
    echo "   Ubuntu/Debian: sudo apt install minisign"
    echo "   macOS: brew install minisign"
    echo "   Or download from: https://jedisct1.github.io/minisign/"
    exit 1
fi

# Create keys directory if it doesn't exist
mkdir -p "$KEYS_DIR"

# Generate signing key if it doesn't exist
PRIVATE_KEY="$KEYS_DIR/messenger.key"
PUBLIC_KEY="$KEYS_DIR/messenger.pub"

if [ ! -f "$PRIVATE_KEY" ]; then
    echo "🔑 Generating new signing key pair..."
    echo "Please enter a password for the private key:"
    minisign -G -p "$PUBLIC_KEY" -s "$PRIVATE_KEY"
    echo "✅ Key pair generated:"
    echo "   Private key: $PRIVATE_KEY"
    echo "   Public key: $PUBLIC_KEY"
else
    echo "🔑 Using existing signing key: $PRIVATE_KEY"
fi

# Check if artifacts directory exists
if [ ! -d "$ARTIFACTS_DIR" ]; then
    echo "❌ Build artifacts not found. Run ./build_messenger.sh first."
    exit 1
fi

# Sign each artifact
echo "🔏 Signing build artifacts..."
cd "$ARTIFACTS_DIR"

SIGNED_COUNT=0

for file in *.rlib *.so checksums.sha256 build_manifest.json; do
    if [ -f "$file" ]; then
        echo "📝 Signing: $file"
        minisign -S -s "$PRIVATE_KEY" -m "$file"
        
        if [ $? -eq 0 ]; then
            echo "✅ Signed: $file -> $file.minisig"
            SIGNED_COUNT=$((SIGNED_COUNT + 1))
        else
            echo "❌ Failed to sign: $file"
        fi
    fi
done

# Sign circuit artifacts if they exist
if [ -d "circuits" ]; then
    cd circuits
    for file in *.wasm *.zkey *.json; do
        if [ -f "$file" ]; then
            echo "📝 Signing circuit artifact: $file"
            minisign -S -s "$PRIVATE_KEY" -m "$file"
            
            if [ $? -eq 0 ]; then
                echo "✅ Signed: circuits/$file -> circuits/$file.minisig"
                SIGNED_COUNT=$((SIGNED_COUNT + 1))
            else
                echo "❌ Failed to sign: circuits/$file"
            fi
        fi
    done
    cd ..
fi

cd "$MESSENGER_DIR"

# Generate signature manifest
echo "📄 Generating signature manifest..."
cat > "$ARTIFACTS_DIR/signatures_manifest.json" << EOF
{
    "signing_timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
    "public_key_file": "$(basename "$PUBLIC_KEY")",
    "public_key_content": "$(cat "$PUBLIC_KEY")",
    "signed_files_count": $SIGNED_COUNT,
    "verification_command": "minisign -V -p messenger.pub -m <filename>"
}
EOF

# Copy public key to artifacts directory for distribution
cp "$PUBLIC_KEY" "$ARTIFACTS_DIR/"

echo ""
echo "✅ Signing completed!"
echo "📋 Signature Summary:"
echo "===================="
echo "Signed files: $SIGNED_COUNT"
echo "Public key: $ARTIFACTS_DIR/$(basename "$PUBLIC_KEY")"
echo ""
echo "🔍 To verify signatures:"
echo "minisign -V -p $(basename "$PUBLIC_KEY") -m <filename>"
echo ""
echo "📦 Signature files:"
find "$ARTIFACTS_DIR" -name "*.minisig" -type f | sed 's|.*/|  |'
echo ""
echo "⚠️  IMPORTANT:"
echo "- Keep the private key ($PRIVATE_KEY) secure"
echo "- Distribute the public key ($(basename "$PUBLIC_KEY")) with your binaries"
echo "- Users should verify signatures before using the binaries"