#!/bin/bash
# circuits/build.sh
set -e

echo "🔧 Building ZK circuits for messenger..."

# Create artifacts directory
mkdir -p artifacts

# Download Powers of Tau ceremony file (ptau15)
PTAU_FILE="artifacts/ptau15.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo "📥 Downloading Powers of Tau ceremony file..."
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau15_0000.ptau -o "$PTAU_FILE"
    echo "✅ Downloaded ptau15 file"
fi

# Prepare phase 2
echo "🔧 Preparing phase 2..."
snarkjs powersoftau prepare phase2 "$PTAU_FILE" artifacts/pot15_final.ptau

# Compile the metadata seal circuit
echo "🔨 Compiling metadata_seal.circom..."
circom metadata_seal.circom --r1cs --wasm --sym -o artifacts/

# Generate witness calculator
echo "📦 Building witness calculator..."
cd artifacts/metadata_seal_js
npm install
cd ../..

# Generate proving and verification keys
echo "🔑 Generating proving key..."
snarkjs groth16 setup artifacts/metadata_seal.r1cs artifacts/pot15_final.ptau artifacts/metadata_seal_0000.zkey

# Contribute to the ceremony (development only - use real ceremony for production)
echo "🎲 Contributing to ceremony (development)..."
snarkjs zkey contribute artifacts/metadata_seal_0000.zkey artifacts/metadata_seal_final.zkey --name="priva$(date +%s)"

# Export verification key
echo "🔐 Exporting verification key..."
snarkjs zkey export verificationkey artifacts/metadata_seal_final.zkey artifacts/vk.json

echo "✅ ZK circuit build complete!"
echo ""
echo "Generated files:"
echo "  - artifacts/metadata_seal.wasm (witness calculator)"
echo "  - artifacts/metadata_seal_final.zkey (proving key)"
echo "  - artifacts/vk.json (verification key)"
echo ""
echo "⚠️  IMPORTANT: For production, conduct a proper trusted setup ceremony!"