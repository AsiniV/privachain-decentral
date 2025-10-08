/// Example demonstrating basic FFI usage from Rust
/// This shows what the generated Dart code would do

use privachain_crypto::dr::{IdentityKey, SignedPreKey, EphemeralKey};

fn main() {
    println!("PrivaChain Double Ratchet FFI Example\n");

    // Generate keys
    println!("1. Generating keys...");
    let alice_identity = IdentityKey::generate().expect("Failed to generate key");
    let alice_signed_pre = SignedPreKey::generate(&alice_identity).expect("Failed to generate key");
    let alice_ephemeral = EphemeralKey::generate().expect("Failed to generate key");
    
    println!("   Alice Identity Key: {} bytes", alice_identity.public_bytes().len());
    println!("   Alice Signed PreKey: {} bytes", alice_signed_pre.public_bytes().len());
    println!("   Alice Ephemeral Key: {} bytes", alice_ephemeral.public_bytes().len());

    let bob_identity = IdentityKey::generate().expect("Failed to generate key");
    let bob_signed_pre = SignedPreKey::generate(&bob_identity).expect("Failed to generate key");
    let bob_ephemeral = EphemeralKey::generate().expect("Failed to generate key");
    
    println!("   Bob Identity Key: {} bytes", bob_identity.public_bytes().len());
    println!("   Bob Signed PreKey: {} bytes", bob_signed_pre.public_bytes().len());
    println!("   Bob Ephemeral Key: {} bytes", bob_ephemeral.public_bytes().len());

    // Establish session directly using crypto module
    println!("\n2. Establishing session...");
    use privachain_crypto::dr::establish_outbound_session;
    
    let mut session = match establish_outbound_session(
        bob_identity.clone(),
        bob_signed_pre.clone(),
        bob_ephemeral.clone(),
    ) {
        Ok(s) => {
            println!("   ✓ Session established");
            s
        }
        Err(e) => {
            println!("   ✗ Failed: {:?}", e);
            return;
        }
    };

    // Encrypt message
    println!("\n3. Encrypting message...");
    let plaintext = b"Hello, Bob! This is a secure message.";
    println!("   Plaintext: \"{}\"", String::from_utf8_lossy(plaintext));
    
    match session.encrypt(plaintext) {
        Ok(cipher_msg) => {
            println!("   ✓ Message encrypted");
            println!("   Ciphertext: {} bytes", cipher_msg.ciphertext.len());
            println!("   Message number: {}", cipher_msg.message_number);
            
            // Decrypt message
            println!("\n4. Decrypting message...");
            match session.decrypt(&cipher_msg) {
                Ok(decrypted) => {
                    println!("   ✓ Message decrypted");
                    println!("   Decrypted: \"{}\"", String::from_utf8_lossy(&decrypted));
                    
                    if &decrypted[..] == plaintext {
                        println!("   ✓ Plaintext matches!");
                    } else {
                        println!("   ✗ Plaintext mismatch!");
                    }
                }
                Err(e) => println!("   ✗ Decryption failed: {:?}", e),
            }
        }
        Err(e) => println!("   ✗ Encryption failed: {:?}", e),
    }

    println!("\n✅ Example completed successfully!");
}
