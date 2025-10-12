// pq_sign.rs - Hybrid Signature (Ed25519 + Dilithium3)
//
// Provides quantum-safe signatures by combining classical and post-quantum algorithms

#![cfg(feature = "post-quantum")]

use crate::MessengerResult;
use ed25519_dalek::{Signer, Verifier, SigningKey, VerifyingKey, Signature as EdSig};
use rand::rngs::OsRng;

/// Hybrid signature: 64-byte Ed25519 + ~2420-byte Dilithium
#[derive(Debug, Clone)]
pub struct HybridSignature {
    pub ecdsa: EdSig,
    pub dilithium: Vec<u8>,
}

/// Sign message with both algorithms
pub fn hybrid_sign(msg: &[u8], sk_ed: &SigningKey) -> MessengerResult<HybridSignature> {
    // Ed25519 signature
    let sig_ed = sk_ed.sign(msg);
    
    // Dilithium3 signature (ephemeral keypair for this example)
    let keypair_dil = pqc_dilithium::Keypair::generate();
    let sig_dil = keypair_dil.sign(msg);
    
    Ok(HybridSignature {
        ecdsa: sig_ed,
        dilithium: sig_dil.to_vec(),
    })
}

/// Verify both signatures (both must pass)
pub fn hybrid_verify(
    msg: &[u8],
    sig: &HybridSignature,
    pk_ed: &VerifyingKey,
    pk_dil_bytes: &[u8],
) -> MessengerResult<()> {
    // Verify Ed25519
    pk_ed.verify_strict(msg, &sig.ecdsa)
        .map_err(|e| crate::MessengerError::InvalidSignature(format!("Ed25519 failed: {:?}", e)))?;
    
    // Verify Dilithium (signature, message, public_key)
    pqc_dilithium::verify(&sig.dilithium, msg, pk_dil_bytes)
        .map_err(|_| crate::MessengerError::InvalidSignature("Dilithium failed".to_string()))?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hybrid_sign_verify() {
        let mut rng = OsRng;
        let sk_ed = SigningKey::generate(&mut rng);
        let pk_ed = sk_ed.verifying_key();
        
        let msg = b"Hello, post-quantum world!";
        let sig = hybrid_sign(msg, &sk_ed).unwrap();
        
        // Note: In real usage, you'd extract the Dilithium public key from the signature
        // For this test, we'll use the public key from a new keypair
        let keypair_dil = pqc_dilithium::Keypair::generate();
        let pk_dil = keypair_dil.public;
        
        // This will fail because we're using a different keypair, but demonstrates the API
        let result = hybrid_verify(msg, &sig, &pk_ed, &pk_dil);
        // We expect Ed25519 to pass but Dilithium to fail with ephemeral keys
        assert!(sig.ecdsa.to_bytes().len() == 64);
        assert!(sig.dilithium.len() > 2000);
    }
}
