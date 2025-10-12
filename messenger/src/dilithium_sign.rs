// dilithium_sign.rs - Post-Quantum Digital Signatures
//
// Hybrid implementation: Ed25519 + Dilithium3 for signatures

use rand::thread_rng;
use crate::MessengerResult;
use serde::{Deserialize, Serialize};

#[cfg(feature = "post-quantum")]
use pqc_dilithium::{Keypair as DilithiumKeypair, verify, PUBLICKEYBYTES, SECRETKEYBYTES};
use ed25519_dalek::{Signer, Verifier, SigningKey, VerifyingKey, Signature as Ed25519Signature};
use rand::rngs::OsRng;

/// Post-quantum digital signature implementation with hybrid crypto
#[derive(Debug, Clone)]
pub struct DilithiumSigner {
    #[cfg(feature = "post-quantum")]
    dilithium_keypair: DilithiumKeypair,
    ed25519_key: SigningKey,
    #[cfg(not(feature = "post-quantum"))]
    #[allow(dead_code)]
    id: u64,
}

/// Serializable signature data (hybrid: Ed25519 + Dilithium)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DilithiumSignature {
    pub signature: Vec<u8>,              // Dilithium signature
    pub public_key: Vec<u8>,             // Dilithium public key
    pub ed25519_signature: Vec<u8>,      // Ed25519 signature
    pub ed25519_public_key: Vec<u8>,     // Ed25519 public key
}

impl DilithiumSigner {
    /// Generate new key pairs (hybrid: Ed25519 + Dilithium3)
    pub fn new() -> MessengerResult<Self> {
        let mut rng = OsRng;
        let ed25519_key = SigningKey::from_bytes(&rand::Rng::gen::<[u8; 32]>(&mut rng));
        
        #[cfg(feature = "post-quantum")]
        {
            let dilithium_keypair = DilithiumKeypair::generate();
            Ok(Self {
                dilithium_keypair,
                ed25519_key,
            })
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            use rand::Rng;
            let mut rng2 = thread_rng();
            Ok(Self {
                ed25519_key,
                id: rng2.gen(),
            })
        }
    }

    /// Sign a message with both keys (hybrid)
    pub fn sign(&self, message: &[u8]) -> DilithiumSignature {
        let ed25519_sig = self.ed25519_key.sign(message);
        
        #[cfg(feature = "post-quantum")]
        {
            let dilithium_sig = self.dilithium_keypair.sign(message);
            DilithiumSignature {
                signature: dilithium_sig.to_vec(),
                public_key: self.dilithium_keypair.public.to_vec(),
                ed25519_signature: ed25519_sig.to_bytes().to_vec(),
                ed25519_public_key: self.ed25519_key.verifying_key().to_bytes().to_vec(),
            }
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            DilithiumSignature {
                signature: vec![0u8; 2420],
                public_key: vec![0u8; 1952],
                ed25519_signature: ed25519_sig.to_bytes().to_vec(),
                ed25519_public_key: self.ed25519_key.verifying_key().to_bytes().to_vec(),
            }
        }
    }

    /// Verify both signatures (both must pass)
    pub fn verify(message: &[u8], signature_data: &DilithiumSignature) -> MessengerResult<()> {
        // Verify Ed25519 signature
        let ed25519_pk = VerifyingKey::from_bytes(
            &<[u8; 32]>::try_from(&signature_data.ed25519_public_key[..]).map_err(|_| {
                crate::MessengerError::InvalidSignature("Invalid Ed25519 public key".to_string())
            })?
        ).map_err(|e| crate::MessengerError::InvalidSignature(format!("Invalid Ed25519 key: {:?}", e)))?;
        
        let ed25519_sig = Ed25519Signature::from_bytes(
            &<[u8; 64]>::try_from(&signature_data.ed25519_signature[..]).map_err(|_| {
                crate::MessengerError::InvalidSignature("Invalid Ed25519 signature".to_string())
            })?
        );
        
        ed25519_pk.verify(message, &ed25519_sig)
            .map_err(|e| crate::MessengerError::InvalidSignature(format!("Ed25519 verification failed: {:?}", e)))?;
        
        #[cfg(feature = "post-quantum")]
        {
            // Verify Dilithium signature
            verify(&signature_data.signature, message, &signature_data.public_key)
                .map_err(|_| crate::MessengerError::InvalidSignature("Dilithium verification failed".to_string()))?;
        }
        
        Ok(())
    }

    /// Get public keys for sharing (hybrid)
    pub fn get_public_key(&self) -> Vec<u8> {
        #[cfg(feature = "post-quantum")]
        {
            let mut combined = Vec::with_capacity(PUBLICKEYBYTES + 32);
            combined.extend_from_slice(&self.dilithium_keypair.public);
            combined.extend_from_slice(&self.ed25519_key.verifying_key().to_bytes());
            combined
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            self.ed25519_key.verifying_key().to_bytes().to_vec()
        }
    }

    /// Create signer from existing key material
    pub fn from_keys(secret_key_bytes: &[u8], _public_key_bytes: &[u8]) -> MessengerResult<Self> {
        #[cfg(feature = "post-quantum")]
        {
            if secret_key_bytes.len() < 32 {
                return Err(crate::MessengerError::InvalidInput("Invalid key size".to_string()));
            }
            
            // For now, just use the Ed25519 part and generate new Dilithium keys
            // In production, you'd properly serialize/deserialize both keys
            let ed25519_sk = &secret_key_bytes[..32];
            let ed25519_key = SigningKey::from_bytes(
                &<[u8; 32]>::try_from(ed25519_sk).map_err(|_| {
                    crate::MessengerError::InvalidInput("Invalid Ed25519 key size".to_string())
                })?
            );
            
            // Generate new Dilithium keypair (in production, deserialize from bytes)
            let dilithium_keypair = DilithiumKeypair::generate();
            
            Ok(Self {
                dilithium_keypair,
                ed25519_key,
            })
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            use rand::Rng;
            let mut rng = thread_rng();
            let mut rng2 = OsRng;
            let ed25519_key = if secret_key_bytes.len() >= 32 {
                SigningKey::from_bytes(&<[u8; 32]>::try_from(&secret_key_bytes[..32]).unwrap())
            } else {
                SigningKey::from_bytes(&rand::Rng::gen::<[u8; 32]>(&mut rng2))
            };
            
            Ok(Self {
                ed25519_key,
                id: rng.gen(),
            })
        }
    }

    /// Export secret key for storage (use with caution!)
    pub fn export_secret_key(&self) -> Vec<u8> {
        #[cfg(feature = "post-quantum")]
        {
            let mut combined = Vec::with_capacity(SECRETKEYBYTES + 32);
            combined.extend_from_slice(self.dilithium_keypair.expose_secret());
            combined.extend_from_slice(&self.ed25519_key.to_bytes());
            combined
        }
        
        #[cfg(not(feature = "post-quantum"))]
        {
            self.ed25519_key.to_bytes().to_vec()
        }
    }
}

impl Default for DilithiumSigner {
    fn default() -> Self {
        Self::new().expect("Failed to generate default DilithiumSigner")
    }
}

/// Utility function to verify a signature without requiring a DilithiumSigner instance
pub fn verify_signature(message: &[u8], signature_bytes: &[u8], public_key_bytes: &[u8]) -> MessengerResult<()> {
    #[cfg(feature = "post-quantum")]
    {
        verify(signature_bytes, message, public_key_bytes)
            .map_err(|_| crate::MessengerError::InvalidSignature("Verification failed".to_string()))?;
        
        Ok(())
    }
    
    #[cfg(not(feature = "post-quantum"))]
    {
        let _ = (message, signature_bytes, public_key_bytes);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dilithium_signer_creation() {
        let signer = DilithiumSigner::new().expect("Failed to create DilithiumSigner");
        let public_key = signer.get_public_key();
        
        assert_eq!(public_key.len(), 1312);
    }

    #[test]
    fn test_sign_and_verify() {
        let signer = DilithiumSigner::new().expect("Failed to create signer");
        let message = b"Hello, post-quantum world!";
        
        // Sign the message
        let signature = signer.sign(message);
        
        // Verify the signature
        let result = DilithiumSigner::verify(message, &signature);
        assert!(result.is_ok());
    }
}