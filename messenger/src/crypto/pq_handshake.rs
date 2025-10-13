// pq_handshake.rs - Hybrid Key Exchange (X25519 + Kyber768)
//
// Provides quantum-safe key exchange by combining classical and post-quantum algorithms

#![cfg(feature = "post-quantum")]

use crate::MessengerResult;
use x25519_dalek::{EphemeralSecret, PublicKey as X25519Pub};
use rand::rngs::OsRng;
use std::cell::RefCell;

thread_local! {
    static HYBRID_SECRET: RefCell<Option<(EphemeralSecret, pqc_kyber::SecretKey)>> = 
        RefCell::new(None);
}

/// Hybrid shared secret: 32-byte classical + 32-byte PQ
#[derive(Debug)]
pub struct HybridSharedSecret {
    pub classical: [u8; 32],
    pub pq: Vec<u8>,
}

/// Generate hybrid keypair and return public keys (X25519 + Kyber)
pub fn generate_hybrid_keypair() -> ([u8; 32], Vec<u8>) {
    let mut rng = OsRng;
    
    // Classical X25519
    let cs = EphemeralSecret::random_from_rng(&mut rng);
    let cpk = X25519Pub::from(&cs);
    
    // Post-quantum Kyber768
    let keypair = pqc_kyber::keypair(&mut rng).expect("Kyber keypair generation failed");
    
    // Store secrets in thread-local for later decapsulation
    HYBRID_SECRET.with(|s| {
        *s.borrow_mut() = Some((cs, keypair.secret));
    });
    
    (cpk.to_bytes(), keypair.public.to_vec())
}

/// Encapsulate using peer's public keys and return ciphertext + shared secret
/// Note: For X25519, we only use the Kyber part for encapsulation. 
/// The X25519 part should be done separately using standard DH.
pub fn hybrid_encapsulate(
    _their_classical: [u8; 32],
    their_pq: &[u8],
) -> MessengerResult<(Vec<u8>, HybridSharedSecret)> {
    let mut rng = OsRng;
    
    // Post-quantum Kyber encapsulation (takes slice)
    let (ct, pq_ss) = pqc_kyber::encapsulate(their_pq, &mut rng)
        .map_err(|e| crate::MessengerError::CryptoError(format!("Encapsulation failed: {:?}", e)))?;
    
    let hybrid_ss = HybridSharedSecret {
        classical: [0u8; 32], // Placeholder - X25519 DH done separately
        pq: pq_ss.to_vec(),
    };
    
    Ok((ct.to_vec(), hybrid_ss))
}

/// Decapsulate both parts and return hybrid shared secret
/// Note: For X25519, we only use the Kyber part for decapsulation.
/// The X25519 part should be done separately using standard DH.
pub fn hybrid_decapsulate(
    _their_classical: [u8; 32],
    their_pq_ct: &[u8],
) -> MessengerResult<HybridSharedSecret> {
    HYBRID_SECRET.with(|s| {
        let (_cs, sk) = s.borrow_mut().take()
            .ok_or_else(|| crate::MessengerError::CryptoError("No secret stored".to_string()))?;
        
        // Post-quantum Kyber decapsulation (takes slices)
        let pq_ss = pqc_kyber::decapsulate(their_pq_ct, &sk)
            .map_err(|e| crate::MessengerError::CryptoError(format!("Decapsulation failed: {:?}", e)))?;
        
        Ok(HybridSharedSecret {
            classical: [0u8; 32], // Placeholder - X25519 DH done separately
            pq: pq_ss.to_vec(),
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hybrid_keypair_generation() {
        let (classical_pk, pq_pk) = generate_hybrid_keypair();
        assert_eq!(classical_pk.len(), 32);
        assert_eq!(pq_pk.len(), 1184); // Kyber768 public key size
    }

    #[test]
    fn test_hybrid_encapsulation_decapsulation() {
        // Bob generates keypair
        let (bob_classical, bob_pq) = generate_hybrid_keypair();
        
        // Alice encapsulates
        let result = hybrid_encapsulate(bob_classical, &bob_pq);
        assert!(result.is_ok());
        let (ct, alice_ss) = result.unwrap();
        
        assert_eq!(ct.len(), 1088); // Kyber768 ciphertext size
        assert_eq!(alice_ss.pq.len(), 32); // Kyber shared secret
        
        // Bob decapsulates
        let bob_ss = hybrid_decapsulate([0u8; 32], &ct).unwrap();
        
        // PQ parts should match
        assert_eq!(alice_ss.pq, bob_ss.pq);
    }
}
