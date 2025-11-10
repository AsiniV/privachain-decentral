//! PrivaChain I2P SAMv3 Tunnel Integration
//! 
//! Provides I2P tunnel functionality for anonymous networking using the SAMv3 protocol.
//! Features:
//! - SAMv3 SESSION_CREATE and STREAM_CREATE
//! - Persistent .i2p key management
//! - Latency monitoring (target < 300ms)
//! - Automatic reseed support

pub mod client;
pub mod error;
pub mod keys;
pub mod session;

pub use client::I2pClient;
pub use error::{I2pError, I2pResult};
pub use keys::{I2pKeyPair, I2pDestination};
pub use session::I2pSession;

/// Default I2P SAM host
pub const DEFAULT_SAM_HOST: &str = "127.0.0.1:7656";

/// Latency budget target (milliseconds)
pub const LATENCY_TARGET_MS: u64 = 300;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constants() {
        assert_eq!(DEFAULT_SAM_HOST, "127.0.0.1:7656");
        assert_eq!(LATENCY_TARGET_MS, 300);
    }
}
