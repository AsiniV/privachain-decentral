#!/bin/bash

# ZK-SNARK Trusted Setup Script for PrivaChain
# This script sets up the development trusted setup for ZK circuits

set -e

echo "🔧 Setting up ZK-SNARK trusted setup for PrivaChain..."

# Create directories
mkdir -p circuits/artifacts

# Check if circom and snarkjs are available
if ! command -v circom &> /dev/null; then
    echo "❌ circom not found. Install with: npm install -g circom@latest"
    exit 1
fi

if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs not found. Install with: npm install -g snarkjs@latest"
    exit 1
fi

echo "✅ circom and snarkjs found"

# Download Powers of Tau if not exists
POT_FILE="circuits/artifacts/pot14_final.ptau"
if [ ! -f "$POT_FILE" ]; then
    echo "📥 Downloading Powers of Tau ceremony file..."
    curl -L "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau" -o "$POT_FILE"
    echo "✅ Powers of Tau downloaded"
else
    echo "✅ Powers of Tau file already exists"
fi

# Compile Domain Registration Circuit
echo "🔨 Compiling domain registration circuit..."
cd circuits
if circom domain_register.circom --r1cs --wasm --sym -o artifacts/; then
    echo "✅ Domain registration circuit compiled"
else
    echo "❌ Failed to compile domain registration circuit"
    exit 1
fi

# Setup Domain Registration Circuit
echo "🔑 Setting up domain registration circuit..."
snarkjs groth16 setup artifacts/domain_register.r1cs artifacts/pot14_final.ptau artifacts/domain_register_0000.zkey

# Contribute to Phase 2 ceremony (development only)
echo "🎲 Contributing to Phase 2 ceremony for domain registration..."
echo "dev-contribution-1" | snarkjs zkey contribute artifacts/domain_register_0000.zkey artifacts/domain_register_0001.zkey --name="Dev contribution 1" -e
echo "dev-contribution-2" | snarkjs zkey contribute artifacts/domain_register_0001.zkey artifacts/domain_register_final.zkey --name="Dev contribution 2" -e

# Export verification key
echo "📋 Exporting domain registration verification key..."
snarkjs zkey export verificationkey artifacts/domain_register_final.zkey artifacts/domain_register_verification_key.json

# Compile Search Inclusion Circuit
echo "🔨 Compiling search inclusion circuit..."
if circom search_inclusion.circom --r1cs --wasm --sym -o artifacts/; then
    echo "✅ Search inclusion circuit compiled"
else
    echo "❌ Failed to compile search inclusion circuit"
    exit 1
fi

# Setup Search Inclusion Circuit
echo "🔑 Setting up search inclusion circuit..."
snarkjs groth16 setup artifacts/search_inclusion.r1cs artifacts/pot14_final.ptau artifacts/search_inclusion_0000.zkey

# Contribute to Phase 2 ceremony (development only)
echo "🎲 Contributing to Phase 2 ceremony for search inclusion..."
echo "dev-contribution-1" | snarkjs zkey contribute artifacts/search_inclusion_0000.zkey artifacts/search_inclusion_0001.zkey --name="Dev contribution 1" -e
echo "dev-contribution-2" | snarkjs zkey contribute artifacts/search_inclusion_0001.zkey artifacts/search_inclusion_final.zkey --name="Dev contribution 2" -e

# Export verification key
echo "📋 Exporting search inclusion verification key..."
snarkjs zkey export verificationkey artifacts/search_inclusion_final.zkey artifacts/search_inclusion_verification_key.json

# Clean up intermediate files
echo "🧹 Cleaning up intermediate files..."
rm -f artifacts/domain_register_0000.zkey artifacts/domain_register_0001.zkey
rm -f artifacts/search_inclusion_0000.zkey artifacts/search_inclusion_0001.zkey

cd ..

# Verify setup
echo "🔍 Verifying setup..."
echo "Domain registration files:"
ls -la circuits/artifacts/domain_register*

echo "Search inclusion files:"
ls -la circuits/artifacts/search_inclusion*

echo "✅ ZK-SNARK trusted setup complete!"
echo ""
echo "📁 Generated files:"
echo "  - circuits/artifacts/domain_register.wasm"
echo "  - circuits/artifacts/domain_register_final.zkey"
echo "  - circuits/artifacts/domain_register_verification_key.json"
echo "  - circuits/artifacts/search_inclusion.wasm"
echo "  - circuits/artifacts/search_inclusion_final.zkey"
echo "  - circuits/artifacts/search_inclusion_verification_key.json"
echo ""
echo "🚨 WARNING: This is a DEVELOPMENT setup only!"
echo "   For production, use a proper multi-party trusted setup ceremony."
echo ""
echo "📝 Next steps:"
echo "   1. Test the circuits: npm run test:zk:crypto"
echo "   2. Set environment variables for production"
echo "   3. Update application to use real circuit files"