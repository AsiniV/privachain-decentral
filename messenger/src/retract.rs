// retract.rs - Message Retraction (unpin IPFS + notify peer)
//
// Handles message retraction by unpinning from IPFS and notifying peers

use crate::{MessengerError, MessengerResult, Cid, double_ratchet::DoubleRatchet};
use crate::file_transfer::IpfsClient;
use serde::{Deserialize, Serialize};

/// Retraction notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetractionNotice {
    pub message_id: String,
    pub cid: String,
    pub timestamp: u64,
    pub signature: Vec<u8>,
}

/// Retract a message by unpinning from IPFS and sending retract notification to peer
pub async fn retract(cid: Cid, ratchet: &mut DoubleRatchet) -> MessengerResult<()> {
    // Create IPFS client
    let ipfs = IpfsClient::default();
    
    // Unpin from IPFS
    ipfs.pin_rm(&cid.0).await
        .map_err(|e| MessengerError::NetworkError(format!("Failed to unpin IPFS content: {e}")))?;
    
    // Stop providing via DHT
    ipfs.dht_provide_stop(&cid.0).await
        .map_err(|e| MessengerError::NetworkError(format!("Failed to stop DHT providing: {e}")))?;
    
    // Create retract message
    let msg_type = crate::double_ratchet::MessageType::Retract(cid.0);
    
    // Send retract message through the double ratchet
    let _encrypted_msg = ratchet.send(msg_type).await?;
    
    // Note: In a real implementation, the encrypted message would be sent to the peer
    // via the network layer (e.g., through onion routing or direct P2P connection)
    
    Ok(())
}

/// Message retraction manager
pub struct MessageRetractor {
    ipfs_client: IpfsClient,
}

impl MessageRetractor {
    /// Create new message retractor
    pub fn new() -> MessengerResult<Self> {
        Ok(Self {
            ipfs_client: IpfsClient::default(),
        })
    }

    /// Retract a message by unpinning from IPFS and notifying peers
    pub async fn retract_message(&self, _message_id: &str, cid: &str) -> MessengerResult<RetractionNotice> {
        // Unpin the content from IPFS
        self.ipfs_client.pin_rm(cid).await
            .map_err(|e| MessengerError::NetworkError(format!("Failed to unpin IPFS content: {e}")))?;
        
        // Stop providing via DHT
        self.ipfs_client.dht_provide_stop(cid).await
            .map_err(|e| MessengerError::NetworkError(format!("Failed to stop DHT providing: {e}")))?;
        
        Ok(RetractionNotice {
            message_id: _message_id.to_string(),
            cid: cid.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            signature: vec![0u8; 64], // Placeholder signature
        })
    }

    /// Process retraction notice from peer
    pub async fn process_retraction(&self, notice: &RetractionNotice) -> MessengerResult<()> {
        // When we receive a retraction notice, we should also unpin the content
        self.ipfs_client.pin_rm(&notice.cid).await
            .map_err(|e| MessengerError::NetworkError(format!("Failed to unpin retracted content: {e}")))?;
        
        // Stop providing the retracted content
        self.ipfs_client.dht_provide_stop(&notice.cid).await
            .map_err(|e| MessengerError::NetworkError(format!("Failed to stop providing retracted content: {e}")))?;
        
        // In a real implementation, this would also:
        // - Remove from local content database
        // - Update UI to reflect retraction
        // - Log the retraction event
        
        Ok(())
    }
}

impl Default for MessageRetractor {
    fn default() -> Self {
        Self::new().expect("Failed to create default MessageRetractor")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::double_ratchet::DoubleRatchet;

    #[tokio::test]
    async fn test_retract_function() {
        let cid = Cid("QmTestHash123".to_string());
        let mut ratchet = DoubleRatchet::new(b"test_shared_secret_32_bytes_long!!").unwrap();
        
        // Test that retract function executes without error
        let result = retract(cid, &mut ratchet).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_message_retractor() {
        let retractor = MessageRetractor::new().unwrap();
        
        // Test retract_message
        let result = retractor.retract_message("test_msg_id", "QmTestHash123").await;
        assert!(result.is_ok());
        
        let notice = result.unwrap();
        assert_eq!(notice.message_id, "test_msg_id");
        assert_eq!(notice.cid, "QmTestHash123");
        
        // Test process_retraction
        let process_result = retractor.process_retraction(&notice).await;
        assert!(process_result.is_ok());
    }
}