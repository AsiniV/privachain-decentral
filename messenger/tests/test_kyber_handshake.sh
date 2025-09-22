#!/bin/bash
# test_kyber_handshake.sh - Test Kyber PQ handshake (100/100 success rate)

set -e

echo "🧪 Testing Kyber post-quantum handshake (100/100 success rate)..."

MESSENGER_DIR="$(dirname "$0")/.."
cd "$MESSENGER_DIR"

# Build the messenger library
echo "🔨 Building messenger library..."
cargo build --release

echo "🔐 Testing PQ handshake reliability..."

# Create handshake test
cat > test_kyber_handshake.rs << 'EOF'
use privachain_messenger::kyber_upgrade::PqHandshake;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing Kyber post-quantum handshake...");
    
    let mut successful_handshakes = 0;
    let total_tests = 100;
    
    for i in 0..total_tests {
        if (i + 1) % 10 == 0 {
            println!("🔄 Progress: {}/{} handshakes", i + 1, total_tests);
        }
        
        // Test Alice-Bob handshake
        match test_single_handshake() {
            Ok(_) => successful_handshakes += 1,
            Err(e) => {
                eprintln!("❌ Handshake {} failed: {}", i + 1, e);
            }
        }
    }
    
    let success_rate = (successful_handshakes as f64 / total_tests as f64) * 100.0;
    println!("📊 Success rate: {}/{} ({:.1}%)", successful_handshakes, total_tests, success_rate);
    
    if successful_handshakes != total_tests {
        eprintln!("❌ Handshake reliability test failed: expected 100% success rate, got {:.1}%", success_rate);
        std::process::exit(1);
    }
    
    println!("✅ Handshake reliability: PASS (100% success rate)");
    
    // Test key bundle serialization/deserialization
    println!("🔍 Testing key bundle serialization...");
    let alice = PqHandshake::new()?;
    let alice_bundle = alice.get_public_bundle();
    
    // Serialize to JSON and back
    let serialized = serde_json::to_string(&alice_bundle)?;
    let deserialized: privachain_messenger::kyber_upgrade::PqPublicBundle = serde_json::from_str(&serialized)?;
    
    if alice_bundle.kyber_pk != deserialized.kyber_pk || alice_bundle.dilithium_pk != deserialized.dilithium_pk {
        eprintln!("❌ Key bundle serialization test failed");
        std::process::exit(1);
    }
    
    println!("✅ Key bundle serialization: PASS");
    
    // Test signature verification edge cases
    println!("🔍 Testing signature verification edge cases...");
    let alice = PqHandshake::new()?;
    let bob = PqHandshake::new()?;
    let eve = PqHandshake::new()?;
    
    let alice_bundle = alice.get_public_bundle();
    let bob_bundle = bob.get_public_bundle();
    let eve_bundle = eve.get_public_bundle();
    
    // Valid case
    let (alice_secret, encapsulation) = alice.encapsulate(&bob_bundle)?;
    let bob_secret = bob.decapsulate(&encapsulation, &alice_bundle)?;
    
    if alice_secret != bob_secret {
        eprintln!("❌ Valid signature verification failed");
        std::process::exit(1);
    }
    
    // Invalid case (wrong signer)
    match bob.decapsulate(&encapsulation, &eve_bundle) {
        Ok(_) => {
            eprintln!("❌ Invalid signature verification should have failed");
            std::process::exit(1);
        }
        Err(_) => {
            // Expected to fail
        }
    }
    
    println!("✅ Signature verification edge cases: PASS");
    
    // Performance test
    println!("⚡ Testing handshake performance...");
    let start_time = std::time::Instant::now();
    
    for _ in 0..10 {
        test_single_handshake()?;
    }
    
    let elapsed = start_time.elapsed();
    let avg_time_ms = elapsed.as_millis() / 10;
    
    println!("📈 Performance: {}ms average per handshake", avg_time_ms);
    
    if avg_time_ms > 1000 {
        eprintln!("⚠️  Warning: handshake taking longer than 1 second");
    }
    
    println!("✅ Performance test: PASS");
    
    println!("🎉 All Kyber handshake tests passed!");
    Ok(())
}

fn test_single_handshake() -> Result<(), Box<dyn std::error::Error>> {
    // Create Alice and Bob
    let alice = PqHandshake::new()?;
    let bob = PqHandshake::new()?;
    
    // Exchange public keys
    let alice_bundle = alice.get_public_bundle();
    let bob_bundle = bob.get_public_bundle();
    
    // Alice encapsulates a secret for Bob
    let (alice_secret, encapsulation) = alice.encapsulate(&bob_bundle)?;
    
    // Bob decapsulates the secret
    let bob_secret = bob.decapsulate(&encapsulation, &alice_bundle)?;
    
    // Verify shared secrets match
    if alice_secret != bob_secret {
        return Err("Shared secrets do not match".into());
    }
    
    // Verify shared secret is not empty
    if alice_secret.is_empty() {
        return Err("Shared secret is empty".into());
    }
    
    Ok(())
}
EOF

# Compile and run the test
rustc test_kyber_handshake.rs --extern privachain_messenger=target/release/libprivachain_messenger.rlib --extern serde_json -L target/release/deps
./test_kyber_handshake

# Clean up
rm -f test_kyber_handshake.rs test_kyber_handshake

echo "✅ Kyber handshake tests completed successfully!"