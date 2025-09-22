// lib.rs - Main messenger library entry point
//
// Provides post-quantum secure messaging with the following features:
// - Kyber post-quantum key encapsulation mechanism (KEM)  
// - Dilithium post-quantum digital signatures
// - Double Ratchet protocol for forward secrecy
// - Integration with existing TypeScript E2E encryption system

pub mod double_ratchet;
pub mod kyber_upgrade;
pub mod dilithium_sign;
pub mod chunk_pad;
pub mod decoy_loop;
pub mod zk_metadata_seal;
pub mod file_transfer;
pub mod webrtc_p2p;
pub mod retract;
pub mod nym_sender;
pub mod global_dpi_test;
pub mod onion_integration;

use serde::{Deserialize, Serialize};

/// Core messenger error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessengerError {
    KeyGenerationFailed(String),
    EncryptionFailed(String),
    DecryptionFailed(String),
    InvalidSignature(String),
    NetworkError(String),
    ZkProofError(String),
}

impl std::fmt::Display for MessengerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MessengerError::KeyGenerationFailed(msg) => write!(f, "Key generation failed: {}", msg),
            MessengerError::EncryptionFailed(msg) => write!(f, "Encryption failed: {}", msg),
            MessengerError::DecryptionFailed(msg) => write!(f, "Decryption failed: {}", msg),
            MessengerError::InvalidSignature(msg) => write!(f, "Invalid signature: {}", msg),
            MessengerError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            MessengerError::ZkProofError(msg) => write!(f, "ZK proof error: {}", msg),
        }
    }
}

impl std::error::Error for MessengerError {}

/// Result type for messenger operations
pub type MessengerResult<T> = Result<T, MessengerError>;

/// Re-export key modules for external use
pub use kyber_upgrade::PqHandshake;
pub use double_ratchet::DoubleRatchet;
pub use dilithium_sign::DilithiumSigner;