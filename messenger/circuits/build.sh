#!/bin/bash
# build.sh - Build ZK circuits and download trusted setup

set -e

echo "🔧 Building ZK circuits for messenger..."

# Create artifacts directory
mkdir -p artifacts

# Download Powers of Tau ceremony file (ptau15)
PTAU_FILE="artifacts/powersOfTau28_hez_final_15.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo "📥 Downloading Powers of Tau ceremony file..."
    wget -O "$PTAU_FILE" https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau
    echo "✅ Downloaded ptau15 file"
fi

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
snarkjs groth16 setup artifacts/metadata_seal.r1cs "$PTAU_FILE" artifacts/metadata_seal_0000.zkey

# Contribute to the ceremony (development only - use real ceremony for production)
echo "🎲 Contributing to ceremony (development)..."
echo "dev-contribution" | snarkjs zkey contribute artifacts/metadata_seal_0000.zkey artifacts/metadata_seal_final.zkey --name="dev-contribution"

# Export verification key
echo "🔐 Exporting verification key..."
snarkjs zkey export verificationkey artifacts/metadata_seal_final.zkey artifacts/metadata_seal_verification_key.json

# Export Solidity verifier (for smart contract integration)
echo "📜 Generating Solidity verifier..."
snarkjs zkey export solidityverifier artifacts/metadata_seal_final.zkey artifacts/MetadataSealVerifier.sol

echo "✅ ZK circuit build complete!"
echo ""
echo "Generated files:"
echo "  - artifacts/metadata_seal.wasm (witness calculator)"
echo "  - artifacts/metadata_seal_final.zkey (proving key)"
echo "  - artifacts/metadata_seal_verification_key.json (verification key)"
echo "  - artifacts/MetadataSealVerifier.sol (Solidity verifier)"
echo ""
echo "⚠️  IMPORTANT: For production, conduct a proper trusted setup ceremony!"