// lib.rs - Main crypto library entry point
//
// Re-exports Double Ratchet functionality from privachain_messenger

pub mod dr {
    pub use privachain_messenger::double_ratchet::{DoubleRatchet as Session, RatchetMessage};
    pub use privachain_messenger::kyber_upgrade::PqPublicBundle;
    use anyhow::Result;
    use serde::{Deserialize, Serialize};

    /// Identity key for X3DH protocol
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct IdentityKey {
        public: Vec<u8>,
        private: Vec<u8>,
    }

    impl IdentityKey {
        pub fn generate() -> Result<Self> {
            // Generate Ed25519 key pair
            let private = vec![1u8; 32]; // Placeholder - would use real key generation
            let public = vec![2u8; 32];
            Ok(Self { public, private })
        }

        pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
            if bytes.len() < 32 {
                return Err(anyhow::anyhow!("Invalid key length"));
            }
            Ok(Self {
                private: bytes[0..32].to_vec(),
                public: vec![2u8; 32], // Would derive from private
            })
        }

        pub fn public_bytes(&self) -> Vec<u8> {
            self.public.clone()
        }

        pub fn private_bytes(&self) -> Vec<u8> {
            self.private.clone()
        }
    }

    /// Signed pre-key for X3DH protocol
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SignedPreKey {
        public: Vec<u8>,
        private: Vec<u8>,
    }

    impl SignedPreKey {
        pub fn generate(_identity: &IdentityKey) -> Result<Self> {
            let private = vec![3u8; 32];
            let public = vec![4u8; 32];
            Ok(Self { public, private })
        }

        pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
            if bytes.len() < 32 {
                return Err(anyhow::anyhow!("Invalid key length"));
            }
            Ok(Self {
                private: bytes[0..32].to_vec(),
                public: vec![4u8; 32],
            })
        }

        pub fn public_bytes(&self) -> Vec<u8> {
            self.public.clone()
        }

        pub fn private_bytes(&self) -> Vec<u8> {
            self.private.clone()
        }
    }

    /// Ephemeral key for X3DH protocol
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct EphemeralKey {
        public: Vec<u8>,
        private: Vec<u8>,
    }

    impl EphemeralKey {
        pub fn generate() -> Result<Self> {
            let private = vec![5u8; 32];
            let public = vec![6u8; 32];
            Ok(Self { public, private })
        }

        pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
            if bytes.len() < 32 {
                return Err(anyhow::anyhow!("Invalid key length"));
            }
            Ok(Self {
                private: bytes[0..32].to_vec(),
                public: vec![6u8; 32],
            })
        }

        pub fn public_bytes(&self) -> Vec<u8> {
            self.public.clone()
        }

        pub fn private_bytes(&self) -> Vec<u8> {
            self.private.clone()
        }
    }

    /// Establish outbound session (Alice initiates)
    pub fn establish_outbound_session(
        _their_identity: IdentityKey,
        _their_signed_pre: SignedPreKey,
        _their_ephemeral: EphemeralKey,
    ) -> Result<Session> {
        // X3DH key agreement would happen here
        let shared_secret = vec![42u8; 32];
        Session::new_alice(&shared_secret)
            .map_err(|e| anyhow::anyhow!("Failed to establish outbound: {}", e))
    }

    /// Establish inbound session (Bob receives)
    pub fn establish_inbound_session(
        _identity: IdentityKey,
        _signed_pre: SignedPreKey,
        _ephemeral: EphemeralKey,
    ) -> Result<Session> {
        // X3DH key agreement would happen here
        let shared_secret = vec![42u8; 32];
        Session::new_bob(&shared_secret, &[0u8; 32])
            .map_err(|e| anyhow::anyhow!("Failed to establish inbound: {}", e))
    }
}

// Post-quantum cryptography module
pub mod pq;
