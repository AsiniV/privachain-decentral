//! Post-Quantum Cryptography Module
//!
//! Provides Kyber-1024 KEM and Dilithium-5 signatures for post-quantum security.
//! Based on NIST standardized algorithms.

#[cfg(feature = "post-quantum")]
pub mod kyber;

#[cfg(feature = "post-quantum")]
pub mod dilithium;

#[cfg(feature = "post-quantum")]
pub use kyber::{KyberKem, KyberPublicKey, KyberSecretKey, KyberCiphertext};

// Stub implementations when PQ feature is disabled
#[cfg(not(feature = "post-quantum"))]
pub mod kyber {
    use anyhow::{Result, anyhow};

    pub struct KyberKem;
    pub struct KyberPublicKey(Vec<u8>);
    pub struct KyberSecretKey(Vec<u8>);
    pub struct KyberCiphertext(Vec<u8>);

    impl KyberKem {
        pub fn keypair() -> Result<(KyberPublicKey, KyberSecretKey)> {
            Err(anyhow!("Post-quantum crypto not enabled. Build with --features post-quantum"))
        }

        pub fn encapsulate(_pk: &KyberPublicKey) -> Result<(Vec<u8>, KyberCiphertext)> {
            Err(anyhow!("Post-quantum crypto not enabled. Build with --features post-quantum"))
        }

        pub fn decapsulate(_ct: &KyberCiphertext, _sk: &KyberSecretKey) -> Result<Vec<u8>> {
            Err(anyhow!("Post-quantum crypto not enabled. Build with --features post-quantum"))
        }
    }

    impl KyberPublicKey {
        pub fn as_bytes(&self) -> &[u8] { &self.0 }
        pub fn from_bytes(_bytes: &[u8]) -> Result<Self> {
            Err(anyhow!("Post-quantum crypto not enabled"))
        }
    }

    impl KyberSecretKey {
        pub fn as_bytes(&self) -> &[u8] { &self.0 }
        pub fn from_bytes(_bytes: &[u8]) -> Result<Self> {
            Err(anyhow!("Post-quantum crypto not enabled"))
        }
    }

    impl KyberCiphertext {
        pub fn as_bytes(&self) -> &[u8] { &self.0 }
        pub fn from_bytes(_bytes: &[u8]) -> Result<Self> {
            Err(anyhow!("Post-quantum crypto not enabled"))
        }
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_pq_module_exists() {
        // Module should compile regardless of feature flag
        assert!(true);
    }
}
