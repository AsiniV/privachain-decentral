//! Kyber-1024 Key Encapsulation Mechanism
//!
//! Provides post-quantum secure key encapsulation using Kyber-1024 (NIST level 5).
//! 
//! Key sizes:
//! - Public key: 1568 bytes
//! - Secret key: 3168 bytes
//! - Ciphertext: 1568 bytes
//! - Shared secret: 32 bytes

use anyhow::{Result, anyhow};
use pqcrypto_kyber::kyber1024;
use pqcrypto_traits::kem::{
    PublicKey as PqPublicKey, 
    SecretKey as PqSecretKey, 
    Ciphertext as PqCiphertext,
    SharedSecret as PqSharedSecret
};

/// Kyber-1024 KEM wrapper
pub struct KyberKem;

/// Kyber-1024 public key (1568 bytes)
#[derive(Clone)]
pub struct KyberPublicKey(kyber1024::PublicKey);

/// Kyber-1024 secret key (3168 bytes)
#[derive(Clone)]
pub struct KyberSecretKey(kyber1024::SecretKey);

/// Kyber-1024 ciphertext (1568 bytes)
#[derive(Clone)]
pub struct KyberCiphertext(kyber1024::Ciphertext);

impl KyberKem {
    /// Generate a new Kyber-1024 keypair
    pub fn keypair() -> Result<(KyberPublicKey, KyberSecretKey)> {
        let (pk, sk) = kyber1024::keypair();
        Ok((KyberPublicKey(pk), KyberSecretKey(sk)))
    }

    /// Encapsulate: generate shared secret and ciphertext
    /// Returns (shared_secret: 32 bytes, ciphertext: 1568 bytes)
    pub fn encapsulate(pk: &KyberPublicKey) -> Result<(Vec<u8>, KyberCiphertext)> {
        let (ss, ct) = kyber1024::encapsulate(&pk.0);
        Ok((ss.as_bytes().to_vec(), KyberCiphertext(ct)))
    }

    /// Decapsulate: recover shared secret from ciphertext
    /// Returns shared_secret: 32 bytes
    pub fn decapsulate(ct: &KyberCiphertext, sk: &KyberSecretKey) -> Result<Vec<u8>> {
        let ss = kyber1024::decapsulate(&ct.0, &sk.0);
        Ok(ss.as_bytes().to_vec())
    }
}

impl KyberPublicKey {
    /// Get public key bytes (1568 bytes)
    pub fn as_bytes(&self) -> &[u8] {
        self.0.as_bytes()
    }

    /// Create public key from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != kyber1024::public_key_bytes() {
            return Err(anyhow!(
                "Invalid Kyber public key length: expected {}, got {}",
                kyber1024::public_key_bytes(),
                bytes.len()
            ));
        }
        let pk = kyber1024::PublicKey::from_bytes(bytes)
            .map_err(|_| anyhow!("Failed to parse Kyber public key"))?;
        Ok(Self(pk))
    }

    /// Get expected key size
    pub fn size() -> usize {
        kyber1024::public_key_bytes()
    }
}

impl KyberSecretKey {
    /// Get secret key bytes (3168 bytes)
    pub fn as_bytes(&self) -> &[u8] {
        self.0.as_bytes()
    }

    /// Create secret key from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != kyber1024::secret_key_bytes() {
            return Err(anyhow!(
                "Invalid Kyber secret key length: expected {}, got {}",
                kyber1024::secret_key_bytes(),
                bytes.len()
            ));
        }
        let sk = kyber1024::SecretKey::from_bytes(bytes)
            .map_err(|_| anyhow!("Failed to parse Kyber secret key"))?;
        Ok(Self(sk))
    }

    /// Get expected key size
    pub fn size() -> usize {
        kyber1024::secret_key_bytes()
    }
}

impl KyberCiphertext {
    /// Get ciphertext bytes (1568 bytes)
    pub fn as_bytes(&self) -> &[u8] {
        self.0.as_bytes()
    }

    /// Create ciphertext from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != kyber1024::ciphertext_bytes() {
            return Err(anyhow!(
                "Invalid Kyber ciphertext length: expected {}, got {}",
                kyber1024::ciphertext_bytes(),
                bytes.len()
            ));
        }
        let ct = kyber1024::Ciphertext::from_bytes(bytes)
            .map_err(|_| anyhow!("Failed to parse Kyber ciphertext"))?;
        Ok(Self(ct))
    }

    /// Get expected ciphertext size
    pub fn size() -> usize {
        kyber1024::ciphertext_bytes()
    }
}

// Manual Debug implementations to prevent accidental logging of secrets
impl std::fmt::Debug for KyberPublicKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("KyberPublicKey")
            .field("size", &self.as_bytes().len())
            .finish()
    }
}

impl std::fmt::Debug for KyberSecretKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("KyberSecretKey")
            .field("size", &self.as_bytes().len())
            .finish()
    }
}

impl std::fmt::Debug for KyberCiphertext {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("KyberCiphertext")
            .field("size", &self.as_bytes().len())
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let (pk, sk) = KyberKem::keypair().unwrap();
        assert_eq!(pk.as_bytes().len(), KyberPublicKey::size());
        assert_eq!(sk.as_bytes().len(), KyberSecretKey::size());
    }

    #[test]
    fn test_encapsulation_decapsulation() {
        let (pk, sk) = KyberKem::keypair().unwrap();
        
        // Encapsulate
        let (ss1, ct) = KyberKem::encapsulate(&pk).unwrap();
        assert_eq!(ss1.len(), 32); // Shared secret is 32 bytes
        assert_eq!(ct.as_bytes().len(), KyberCiphertext::size());
        
        // Decapsulate
        let ss2 = KyberKem::decapsulate(&ct, &sk).unwrap();
        assert_eq!(ss2.len(), 32);
        
        // Shared secrets should match
        assert_eq!(ss1, ss2);
    }

    #[test]
    fn test_public_key_serialization() {
        let (pk, _) = KyberKem::keypair().unwrap();
        let bytes = pk.as_bytes();
        let pk2 = KyberPublicKey::from_bytes(bytes).unwrap();
        assert_eq!(pk.as_bytes(), pk2.as_bytes());
    }

    #[test]
    fn test_secret_key_serialization() {
        let (_, sk) = KyberKem::keypair().unwrap();
        let bytes = sk.as_bytes();
        let sk2 = KyberSecretKey::from_bytes(bytes).unwrap();
        assert_eq!(sk.as_bytes(), sk2.as_bytes());
    }

    #[test]
    fn test_ciphertext_serialization() {
        let (pk, _) = KyberKem::keypair().unwrap();
        let (_, ct) = KyberKem::encapsulate(&pk).unwrap();
        let bytes = ct.as_bytes();
        let ct2 = KyberCiphertext::from_bytes(bytes).unwrap();
        assert_eq!(ct.as_bytes(), ct2.as_bytes());
    }

    #[test]
    fn test_key_sizes() {
        assert_eq!(KyberPublicKey::size(), 1568);
        assert_eq!(KyberSecretKey::size(), 3168);
        assert_eq!(KyberCiphertext::size(), 1568);
    }

    #[test]
    fn test_invalid_public_key_length() {
        let result = KyberPublicKey::from_bytes(&[0u8; 100]);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_secret_key_length() {
        let result = KyberSecretKey::from_bytes(&[0u8; 100]);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_ciphertext_length() {
        let result = KyberCiphertext::from_bytes(&[0u8; 100]);
        assert!(result.is_err());
    }
}
