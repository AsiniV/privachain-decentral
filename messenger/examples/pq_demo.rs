// pq_demo.rs - Demonstration of post-quantum cryptography features
//
// Run with: cargo run --example pq_demo --features post-quantum

#[cfg(not(feature = "post-quantum"))]
fn main() {
    println!("❌ This example requires the 'post-quantum' feature.");
    println!("Run with: cargo run --example pq_demo --features post-quantum");
}

#[cfg(feature = "post-quantum")]
fn main() -> Result<(), Box<dyn std::error::Error>> {
    use privachain_messenger::crypto::pq_handshake::{generate_hybrid_keypair, hybrid_encapsulate, hybrid_decapsulate};
    use privachain_messenger::crypto::pq_sign::{hybrid_sign, hybrid_verify};
    use ed25519_dalek::SigningKey;
    use rand::Rng;

    println!("🔐 PrivaChain v3.0 Post-Quantum Cryptography Demo");
    println!("==================================================\n");

    // Demo 1: Hybrid Key Exchange
    println!("📦 Demo 1: Hybrid Key Exchange (X25519 + Kyber-768)");
    println!("---------------------------------------------------");
    
    // Alice generates her keypair
    let (alice_classical_pk, alice_pq_pk) = generate_hybrid_keypair();
    println!("✅ Alice generated hybrid keypair");
    println!("   Classical (X25519): {} bytes", alice_classical_pk.len());
    println!("   Post-quantum (Kyber): {} bytes", alice_pq_pk.len());
    
    // Bob generates his keypair  
    let (bob_classical_pk, bob_pq_pk) = generate_hybrid_keypair();
    println!("✅ Bob generated hybrid keypair");
    
    // Alice encapsulates a shared secret for Bob using Kyber-768
    let (kyber_ciphertext, alice_kyber_ss) = hybrid_encapsulate(bob_classical_pk, &bob_pq_pk)?;
    println!("✅ Alice encapsulated PQ shared secret (Kyber-768)");
    println!("   Ciphertext: {} bytes", kyber_ciphertext.len());
    println!("   Shared secret: {} bytes", alice_kyber_ss.pq.len());
    
    // Bob decapsulates the Kyber shared secret
    let bob_kyber_ss = hybrid_decapsulate(alice_classical_pk, &kyber_ciphertext)?;
    println!("✅ Bob decapsulated PQ shared secret");
    
    // Verify Kyber shared secrets match
    if alice_kyber_ss.pq == bob_kyber_ss.pq {
        println!("✅ Post-quantum shared secrets match!");
        println!("   Secure PQ channel established.\n");
    } else {
        println!("❌ Shared secrets don't match!\n");
        return Err("Key exchange failed".into());
    }
    
    println!("ℹ️  Note: In production, X25519 classical key exchange would be");
    println!("   combined with Kyber for full hybrid security.\n");

    // Demo 2: Hybrid Signatures
    println!("✍️  Demo 2: Hybrid Signatures (Ed25519 + Dilithium-3)");
    println!("----------------------------------------------------");
    
    let mut rng = rand::rngs::OsRng;
    let sk_bytes: [u8; 32] = rng.gen();
    let signing_key = SigningKey::from_bytes(&sk_bytes);
    let verifying_key = signing_key.verifying_key();
    println!("✅ Generated Ed25519 keypair");
    
    let message = b"Hello, post-quantum world!";
    println!("📝 Message: {:?}", std::str::from_utf8(message).unwrap());
    
    let signature = hybrid_sign(message, &signing_key)?;
    println!("✅ Signed with hybrid signature");
    println!("   Ed25519: {} bytes", signature.ecdsa.to_bytes().len());
    println!("   Dilithium: {} bytes", signature.dilithium.len());
    println!("   Total: {} bytes", signature.ecdsa.to_bytes().len() + signature.dilithium.len());
    
    // In a real scenario, you'd extract the Dilithium public key
    // For demo purposes, we'll use a fresh keypair (will fail verification)
    let dilithium_keypair = pqc_dilithium::Keypair::generate();
    let dilithium_pk = dilithium_keypair.public;
    
    // Try to verify (Ed25519 will pass, Dilithium will fail due to different keys)
    match hybrid_verify(message, &signature, &verifying_key, &dilithium_pk) {
        Ok(_) => println!("✅ Signature verified!"),
        Err(e) => println!("⚠️  Verification failed (expected, using different Dilithium keys): {:?}", e),
    }
    
    println!("\n==================================================");
    println!("✅ Demo complete!");
    println!("\nKey Takeaways:");
    println!("• Hybrid crypto combines classical and post-quantum algorithms");
    println!("• X25519 + Kyber-768 for key exchange");
    println!("• Ed25519 + Dilithium-3 for signatures");
    println!("• Both algorithms must verify for hybrid signatures");
    println!("• Provides quantum resistance while maintaining compatibility");
    
    Ok(())
}
