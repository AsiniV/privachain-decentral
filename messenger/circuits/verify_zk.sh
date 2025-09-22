#!/bin/bash
# verify_zk.sh - Verify ZK circuit integrity and key hashes

set -e

echo "🔍 Verifying ZK circuit integrity..."

ARTIFACTS_DIR="artifacts"

# Check if required files exist
required_files=(
    "$ARTIFACTS_DIR/metadata_seal.wasm"
    "$ARTIFACTS_DIR/metadata_seal_final.zkey"
    "$ARTIFACTS_DIR/metadata_seal_verification_key.json"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        echo "Run ./build.sh first to generate circuit artifacts"
        exit 1
    fi
done

# Verify proving key integrity
echo "🔍 Verifying proving key..."
snarkjs zkey verify artifacts/metadata_seal.r1cs "$ARTIFACTS_DIR/powersOfTau28_hez_final_15.ptau" "$ARTIFACTS_DIR/metadata_seal_final.zkey"

if [ $? -eq 0 ]; then
    echo "✅ Proving key verification passed"
else
    echo "❌ Proving key verification failed"
    exit 1
fi

# Calculate and display file hashes for verification
echo ""
echo "📋 File integrity hashes:"
echo "========================"

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        hash=$(sha256sum "$file" | cut -d' ' -f1)
        echo "$file: $hash"
    fi
done

# Verify verification key format
echo ""
echo "🔍 Checking verification key format..."
if jq empty "$ARTIFACTS_DIR/metadata_seal_verification_key.json" 2>/dev/null; then
    echo "✅ Verification key is valid JSON"
    
    # Check for required fields
    if jq -e '.vk_alpha_1 and .vk_beta_2 and .vk_gamma_2 and .vk_delta_2 and .IC' "$ARTIFACTS_DIR/metadata_seal_verification_key.json" > /dev/null; then
        echo "✅ Verification key contains all required fields"
    else
        echo "❌ Verification key missing required fields"
        exit 1
    fi
else
    echo "❌ Verification key is not valid JSON"
    exit 1
fi

echo ""
echo "✅ All ZK circuit verifications passed!"
echo ""
echo "⚠️  Remember:"
echo "   - These are development keys only"
echo "   - Use a proper trusted setup ceremony for production"
echo "   - Verify hashes match your trusted setup"