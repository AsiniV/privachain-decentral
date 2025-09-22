// onion_integration.rs - Integration example for decoy traffic with onion routing
//
// Shows how to inject decoy traffic into onion routing as specified in Action 3

use crate::chunk_pad::pad_to_chunks;
use crate::decoy_loop::spawn_decoy;
use tokio::sync::mpsc;

/// Example integration showing how to inject decoy traffic into onion routing
/// This demonstrates Action 3 from the problem statement
pub async fn send_with_decoy_example(
    plaintext: &[u8],
    onion_tx: mpsc::Sender<Vec<u8>>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Action 3: Inject into sender
    let chunks = pad_to_chunks(plaintext);
    for block in chunks {
        onion_tx.send(block.to_vec()).await?;
    }
    spawn_decoy(onion_tx.clone());
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{timeout, Duration};

    #[tokio::test]
    async fn test_onion_integration() {
        let (tx, mut rx) = mpsc::channel::<Vec<u8>>(100);
        
        let plaintext = b"This is a test message for onion routing with decoy traffic";
        
        // Send message with decoy integration
        send_with_decoy_example(plaintext, tx).await.unwrap();
        
        // Receive the actual message chunks - just check first few
        let mut received_count = 0;
        while let Ok(Some(chunk)) = timeout(Duration::from_millis(50), rx.recv()).await {
            // All chunks should be exactly 262,144 bytes
            assert_eq!(chunk.len(), 262_144);
            received_count += 1;
            
            // Break after receiving a reasonable number to avoid waiting too long
            if received_count >= 3 {
                break;
            }
        }
        
        // Should have received at least one chunk (the data)
        assert!(received_count > 0);
    }
}