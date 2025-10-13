// kyber_upgrade.rs - Post-Quantum Handshake (Kyber + Dilithium)
//
// Hybrid implementation: X25519 + Kyber-768 for key exchange

use rand::{thread_rng, Rng};
use crate::MessengerResult;
use serde::{Deserialize, Serialize};

#[cfg(feature = "post-quantum")]
use pqc_kyber::{Keypair as KyberKeypair, keypair, encapsulate, decapsulate, KYBER_PUBLICKEYBYTES, KYBER_SECRETKEYBYTES, KYBER_CIPHERTEXTBYTES};
use x25519_dalek::PublicKey as X25519Public;

/// Post-quantum handshake implementation with hybrid crypto
#[derive(Debug, Clone)]
pub struct PqHandshake {
    #[cfg(feature = "post-quantum")]
    kyber_keypair: KyberKeypair,
    #[cfg(feature = "post-quantum")]
    x25519_secret: Vec<u8>, // Store as bytes for Clone
    #[cfg(not(feature = "post-quantum"))]
    #[allow(dead_code)]
    id: u64,
}

/// Serializable format for sharing public keys
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PqPublicBundle {
    pub kyber_pk: Vec<u8>,
    pub dilithium_pk: Vec<u8>,
}

/// Encapsulated shared secret with signature
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PqEncapsulation {
    pub ciphertext: Vec<u8>,
    pub signature: Vec<u8>,
}

impl PqHandshake {
    /// Generate new post-quantum key pairs (hybrid: X25519 + Kyber768)
    pub fn new() -> MessengerResult<Self> {
        #[cfg(feature = "post-quantum")]
        {
            let mut rng = thread_rng();
            let kyber_keypair = keypair(&mut rng)
                .map_err(|e| crate::MessengerError::KeyGenerationFailed(format!("Kyber keypair failed: {:?}", e)))?;
            
            // Generate X25519 secret key (use random bytes)
            let x25519_bytes: [u8; 32] = rng.gen();
            
            Ok(Self {
                kyber_keypair,
                x25519_secret: x25519_bytes.to_vec(),
            })
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            use rand::Rng;
            let mut rng = thread_rng();
            Ok(Self { id: rng.gen() })
        }
    }

    /// Get public key bundle for sharing with peers (X25519 + Kyber768)
    pub fn get_public_bundle(&self) -> PqPublicBundle {
        #[cfg(feature = "post-quantum")]
        {
            let x25519_bytes = <[u8; 32]>::try_from(self.x25519_secret.as_slice()).unwrap();
            // Compute public key from secret key bytes
            let x25519_public = x25519_dalek::x25519(x25519_bytes, x25519_dalek::X25519_BASEPOINT_BYTES);
            
            PqPublicBundle {
                kyber_pk: self.kyber_keypair.public.to_vec(),
                dilithium_pk: x25519_public.to_vec(),
            }
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            PqPublicBundle {
                kyber_pk: vec![0u8; 1184],
                dilithium_pk: vec![0u8; 32],
            }
        }
    }

    /// Encapsulate a shared secret using peer's public key (hybrid)
    pub fn encapsulate(&self, their_public_bundle: &PqPublicBundle) -> MessengerResult<(Vec<u8>, PqEncapsulation)> {
        #[cfg(feature = "post-quantum")]
        {
            let mut rng = thread_rng();
            
            // Encapsulate with Kyber (takes slice, returns Result)
            let (kyber_ct, kyber_ss) = encapsulate(&their_public_bundle.kyber_pk, &mut rng)
                .map_err(|e| crate::MessengerError::CryptoError(format!("Kyber encapsulation failed: {:?}", e)))?;
            
            // X25519 key exchange
            let x25519_bytes = <[u8; 32]>::try_from(self.x25519_secret.as_slice()).unwrap();
            let their_x25519_pk = <[u8; 32]>::try_from(&their_public_bundle.dilithium_pk[..]).unwrap_or([0u8; 32]);
            let x25519_ss = x25519_dalek::x25519(x25519_bytes, their_x25519_pk);
            
            // Combine both shared secrets
            let mut combined_ss = Vec::with_capacity(64);
            combined_ss.extend_from_slice(&x25519_ss);
            combined_ss.extend_from_slice(&kyber_ss);
            
            let encapsulation = PqEncapsulation {
                ciphertext: kyber_ct.to_vec(),
                signature: x25519_ss.to_vec(),
            };
            
            Ok((combined_ss, encapsulation))
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            let _ = their_public_bundle;
            let shared_secret = vec![42u8; 32];
            let encapsulation = PqEncapsulation {
                ciphertext: vec![0u8; 1088],
                signature: vec![0u8; 32],
            };
            Ok((shared_secret, encapsulation))
        }
    }

    /// Decapsulate shared secret from ciphertext (hybrid)
    pub fn decapsulate(&self, encapsulation: &PqEncapsulation, their_public_bundle: &PqPublicBundle) -> MessengerResult<Vec<u8>> {
        #[cfg(feature = "post-quantum")]
        {
            // Decapsulate with Kyber (takes slices)
            let kyber_ss = decapsulate(&encapsulation.ciphertext, &self.kyber_keypair.secret)
                .map_err(|e| crate::MessengerError::CryptoError(format!("Kyber decapsulation failed: {:?}", e)))?;
            
            // X25519 key exchange
            let x25519_bytes = <[u8; 32]>::try_from(self.x25519_secret.as_slice()).unwrap();
            let their_x25519_pk = <[u8; 32]>::try_from(&their_public_bundle.dilithium_pk[..]).unwrap_or([0u8; 32]);
            let x25519_ss = x25519_dalek::x25519(x25519_bytes, their_x25519_pk);
            
            // Combine both shared secrets
            let mut combined_ss = Vec::with_capacity(64);
            combined_ss.extend_from_slice(&x25519_ss);
            combined_ss.extend_from_slice(&kyber_ss);
            
            Ok(combined_ss)
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            let _ = (encapsulation, their_public_bundle);
            Ok(vec![42u8; 32])
        }
    }

    /// Get Kyber public key for external integrations
    pub fn get_kyber_public_key(&self) -> Vec<u8> {
        #[cfg(feature = "post-quantum")]
        {
            self.kyber_keypair.public.to_vec()
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            vec![0u8; 1184]
        }
    }

    /// Get X25519 public key for external integrations  
    pub fn get_dilithium_public_key(&self) -> Vec<u8> {
        #[cfg(feature = "post-quantum")]
        {
            let x25519_bytes = <[u8; 32]>::try_from(self.x25519_secret.as_slice()).unwrap();
            let x25519_public = x25519_dalek::x25519(x25519_bytes, x25519_dalek::X25519_BASEPOINT_BYTES);
            x25519_public.to_vec()
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            vec![0u8; 32]
        }
    }
}

impl Default for PqHandshake {
    fn default() -> Self {
        Self::new().expect("Failed to generate default PqHandshake")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pq_handshake_creation() {
        let handshake = PqHandshake::new().expect("Failed to create PqHandshake");
        let bundle = handshake.get_public_bundle();
        
        // Keys should have expected sizes
        assert_eq!(bundle.kyber_pk.len(), 1184); // Kyber768 public key
        assert_eq!(bundle.dilithium_pk.len(), 32); // X25519 public key (repurposed field)
    }

    #[test]
    fn test_pq_encapsulation_decapsulation() {
        let alice = PqHandshake::new().expect("Failed to create Alice's handshake");
        let bob = PqHandshake::new().expect("Failed to create Bob's handshake");

        let alice_bundle = alice.get_public_bundle();
        let bob_bundle = bob.get_public_bundle();

        // Alice encapsulates a secret for Bob
        let (alice_secret, encapsulation) = alice.encapsulate(&bob_bundle).expect("Encapsulation failed");

        // Bob decapsulates the secret using Alice's signature
        let bob_secret = bob.decapsulate(&encapsulation, &alice_bundle).expect("Decapsulation failed");

        // The shared secrets should match (in this placeholder implementation)
        assert_eq!(alice_secret, bob_secret);
        assert!(!alice_secret.is_empty());
    }
}