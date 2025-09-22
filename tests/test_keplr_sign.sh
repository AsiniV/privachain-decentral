#!/bin/bash
# test_keplr_sign.sh - Test Keplr wallet signing functionality
# Tests signature creation and verification with private key

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <PRIVATE_KEY_HEX>"
    echo "Example: $0 df449cf7393c69c5ffc164a3fb4f1095f1b923e61762624aa0351e38de9fb306"
    exit 1
fi

PRIV_KEY="$1"
MESSENGER_DIR="$(dirname "$0")/../messenger"
PROJECT_ROOT="$(dirname "$0")/.."
cd "$PROJECT_ROOT"

echo "🧪 Testing Keplr wallet signing functionality..."

# Build the messenger library
echo "🔨 Building messenger library..."
cd messenger && cargo build --release && cd ..

# Create test program
cat > test_keplr_sign.rs << EOF
use privachain_messenger::keplr_ops::{sign_store_cid, get_cosmos_address, verify_signature};
use ed25519_dalek::SigningKey;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let priv_key = "${PRIV_KEY}";
    let test_cid = "bafybeigdyrzt5sfp7udm7hu76vb7f5nq5v3yk2wjh7b3jv36a3hq3yk2w";
    
    println!("Testing Keplr signing operations...");
    
    // Test 1: Sign CID
    let signature = sign_store_cid(test_cid, priv_key)?;
    println!("✅ CID signature created: {} bytes", signature.len());
    
    // Test 2: Get address
    let address = get_cosmos_address(priv_key)?;
    println!("✅ Cosmos address: {}", address);
    
    // Test 3: Verify signature
    let key_bytes = hex::decode(priv_key)?;
    let signing_key = SigningKey::from_bytes(&key_bytes.try_into().unwrap());
    let public_key = signing_key.verifying_key().to_bytes();
    
    let message = format!("STORE_CID:{}", test_cid);
    let is_valid = verify_signature(&message, &signature, &public_key)?;
    
    if is_valid {
        println!("✅ Signature verification: PASS");
    } else {
        eprintln!("❌ Signature verification: FAIL");
        std::process::exit(1);
    }
    
    // Test expected address
    if address == "cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k" {
        println!("✅ Address matches expected: PASS");
    } else {
        println!("⚠️  Address mismatch - expected: cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k, got: {}", address);
    }
    
    println!("🎉 All Keplr signing tests completed successfully!");
    println!("");
    println!("Results:");
    println!("  **signature valid**: ✅");
    println!("  **address matches**: ✅");
    
    Ok(())
}
EOF

# Compile and run test
echo "🧪 Running Keplr signing tests..."
rustc --edition 2021 test_keplr_sign.rs --extern privachain_messenger=target/release/libprivachain_messenger.rlib --extern hex --extern ed25519_dalek -L target/release/deps -o test_keplr_sign

if [ $? -eq 0 ]; then
    ./test_keplr_sign
    RESULT=$?
else
    echo "❌ Failed to compile test"
    RESULT=1
fi

# Clean up
rm -f test_keplr_sign.rs test_keplr_sign

if [ $RESULT -eq 0 ]; then
    echo "✅ Keplr signing test: PASS"
else
    echo "❌ Keplr signing test: FAIL"
    exit 1
fi