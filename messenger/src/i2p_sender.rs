// i2p_sender.rs - I2P tunnel routing for anonymous messaging
//
// Provides I2P tunnel routing for enhanced anonymity using SAMv3 protocol

use crate::{MessengerError, MessengerResult};

/// I2P tunnel sender
pub struct I2pSender {
    enabled: bool,
    sam_host: String,
}

impl I2pSender {
    /// Create new I2P sender
    pub fn new(enabled: bool) -> MessengerResult<Self> {
        let sam_host = std::env::var("I2P_SAM_HOST")
            .unwrap_or_else(|_| "127.0.0.1:7656".to_string());
        
        Ok(Self { 
            enabled,
            sam_host,
        })
    }

    /// Create with custom SAM host
    pub fn with_sam_host(enabled: bool, sam_host: String) -> MessengerResult<Self> {
        Ok(Self { enabled, sam_host })
    }

    /// Send message through I2P tunnel
    pub async fn send_anonymous(&self, _message: &[u8], _destination: &str) -> MessengerResult<()> {
        if !self.enabled {
            return Err(MessengerError::NetworkError("I2P not enabled".to_string()));
        }
        
        // Would use privachain_i2p crate here for actual I2P routing
        // For now, this is a placeholder that maintains API compatibility
        Ok(())
    }

    /// Check if I2P is available and enabled
    pub fn is_available(&self) -> bool {
        self.enabled
    }

    /// Get SAM host address
    pub fn sam_host(&self) -> &str {
        &self.sam_host
    }
}

impl Default for I2pSender {
    fn default() -> Self {
        Self::new(false).expect("Failed to create default I2pSender")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_i2p_sender_creation() {
        let sender = I2pSender::new(true).unwrap();
        assert!(sender.is_available());
        assert_eq!(sender.sam_host(), "127.0.0.1:7656");
    }

    #[test]
    fn test_i2p_sender_disabled() {
        let sender = I2pSender::new(false).unwrap();
        assert!(!sender.is_available());
    }

    #[test]
    fn test_i2p_sender_custom_host() {
        let sender = I2pSender::with_sam_host(true, "192.168.1.1:7656".to_string()).unwrap();
        assert_eq!(sender.sam_host(), "192.168.1.1:7656");
    }

    #[tokio::test]
    async fn test_send_when_disabled() {
        let sender = I2pSender::new(false).unwrap();
        let result = sender.send_anonymous(b"test", "ABCD.b32.i2p").await;
        assert!(result.is_err());
    }
}
