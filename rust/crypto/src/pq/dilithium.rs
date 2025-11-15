//! Dilithium-5 Digital Signature Algorithm
//!
//! Provides post-quantum secure digital signatures using Dilithium-5 (NIST level 5).
//! This is used for long-term certificate signing and identity verification.
//!
//! Key sizes:
//! - Public key: 2592 bytes
//! - Secret key: 4864 bytes  
//! - Signature: ~4595 bytes (variable)

use anyhow::{Result, anyhow};
use pqcrypto_dilithium::dilithium5;
use pqcrypto_traits::sign::{
    PublicKey as PqPublicKey,
    SecretKey as PqSecretKey,
    SignedMessage as PqSignedMessage,
};

/// Dilithium-5 signature scheme wrapper
pub struct Dilithium5;

/// Dilithium-5 public key (2592 bytes)
#[derive(Clone)]
pub struct DilithiumPublicKey(dilithium5::PublicKey);

/// Dilithium-5 secret key (4864 bytes)
#[derive(Clone)]
pub struct DilithiumSecretKey(dilithium5::SecretKey);

impl Dilithium5 {
    /// Generate a new Dilithium-5 keypair
    pub fn keypair() -> Result<(Vec<u8>, Vec<u8>)> {
        let (pk, sk) = dilithium5::keypair();
        Ok((pk.as_bytes().to_vec(), sk.as_bytes().to_vec()))
    }

    /// Sign a message
    pub fn sign(msg: &[u8], sk: &[u8]) -> Result<Vec<u8>> {
        if sk.len() != dilithium5::secret_key_bytes() {
            return Err(anyhow!(
                "Invalid Dilithium secret key length: expected {}, got {}",
                dilithium5::secret_key_bytes(),
                sk.len()
            ));
        }
        
        let secret_key = dilithium5::SecretKey::from_bytes(sk)
            .map_err(|_| anyhow!("Failed to parse Dilithium secret key"))?;
        
        let signed = dilithium5::sign(msg, &secret_key);
        Ok(signed.as_bytes().to_vec())
    }

    /// Verify a signature
    pub fn verify(msg: &[u8], sig: &[u8], pk: &[u8]) -> Result<bool> {
        if pk.len() != dilithium5::public_key_bytes() {
            return Err(anyhow!(
                "Invalid Dilithium public key length: expected {}, got {}",
                dilithium5::public_key_bytes(),
                pk.len()
            ));
        }
        
        let public_key = dilithium5::PublicKey::from_bytes(pk)
            .map_err(|_| anyhow!("Failed to parse Dilithium public key"))?;
        
        let signed_msg = dilithium5::SignedMessage::from_bytes(sig)
            .map_err(|_| anyhow!("Failed to parse signed message"))?;
        
        match dilithium5::open(&signed_msg, &public_key) {
            Ok(recovered_msg) => Ok(recovered_msg == msg),
            Err(_) => Ok(false),
        }
    }
}

impl DilithiumPublicKey {
    pub fn as_bytes(&self) -> &[u8] {
        self.0.as_bytes()
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != dilithium5::public_key_bytes() {
            return Err(anyhow!("Invalid Dilithium public key length"));
        }
        let pk = dilithium5::PublicKey::from_bytes(bytes)
            .map_err(|_| anyhow!("Failed to parse Dilithium public key"))?;
        Ok(Self(pk))
    }

    pub fn size() -> usize {
        dilithium5::public_key_bytes()
    }
}

impl DilithiumSecretKey {
    pub fn as_bytes(&self) -> &[u8] {
        self.0.as_bytes()
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != dilithium5::secret_key_bytes() {
            return Err(anyhow!("Invalid Dilithium secret key length"));
        }
        let sk = dilithium5::SecretKey::from_bytes(bytes)
            .map_err(|_| anyhow!("Failed to parse Dilithium secret key"))?;
        Ok(Self(sk))
    }

    pub fn size() -> usize {
        dilithium5::secret_key_bytes()
    }
}

impl std::fmt::Debug for DilithiumPublicKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DilithiumPublicKey")
            .field("size", &self.as_bytes().len())
            .finish()
    }
}

impl std::fmt::Debug for DilithiumSecretKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DilithiumSecretKey")
            .field("size", &self.as_bytes().len())
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dilithium_kat() {
        // Known Answer Test - basic functional test
        let (pk, sk) = Dilithium5::keypair().unwrap();
        let msg = b"abc";
        let sig = Dilithium5::sign(msg, &sk).unwrap();
        assert!(Dilithium5::verify(msg, &sig, &pk).unwrap());
    }

    #[test]
    fn test_keypair_generation() {
        let (pk, sk) = Dilithium5::keypair().unwrap();
        assert_eq!(pk.len(), DilithiumPublicKey::size());
        assert_eq!(sk.len(), DilithiumSecretKey::size());
    }

    #[test]
    fn test_sign_verify() {
        let (pk, sk) = Dilithium5::keypair().unwrap();
        let msg = b"test message";
        
        let sig = Dilithium5::sign(msg, &sk).unwrap();
        assert!(Dilithium5::verify(msg, &sig, &pk).unwrap());
    }

    #[test]
    fn test_verify_wrong_message() {
        let (pk, sk) = Dilithium5::keypair().unwrap();
        let msg1 = b"original message";
        let msg2 = b"different message";
        
        let sig = Dilithium5::sign(msg1, &sk).unwrap();
        assert!(!Dilithium5::verify(msg2, &sig, &pk).unwrap());
    }

    #[test]
    fn test_verify_wrong_key() {
        let (pk1, sk1) = Dilithium5::keypair().unwrap();
        let (pk2, _sk2) = Dilithium5::keypair().unwrap();
        let msg = b"test message";
        
        let sig = Dilithium5::sign(msg, &sk1).unwrap();
        assert!(!Dilithium5::verify(msg, &sig, &pk2).unwrap());
    }

    #[test]
    fn test_key_serialization() {
        let (pk_bytes, sk_bytes) = Dilithium5::keypair().unwrap();
        
        let pk = DilithiumPublicKey::from_bytes(&pk_bytes).unwrap();
        let sk = DilithiumSecretKey::from_bytes(&sk_bytes).unwrap();
        
        assert_eq!(pk.as_bytes(), pk_bytes.as_slice());
        assert_eq!(sk.as_bytes(), sk_bytes.as_slice());
    }

    #[test]
    fn test_invalid_key_lengths() {
        assert!(DilithiumPublicKey::from_bytes(&[0u8; 100]).is_err());
        assert!(DilithiumSecretKey::from_bytes(&[0u8; 100]).is_err());
    }
}

