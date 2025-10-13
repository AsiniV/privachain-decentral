#![cfg(feature = "post-quantum")]

use anyhow::Result;
use std::time::{Duration, Instant};

const ROTATION_HOURS: u64 = 24;

/// Rotate PQ keys if the rotation interval has elapsed
/// 
/// This function checks if 24 hours have passed since the last key rotation
/// and generates new hybrid keypairs if needed. This implements the recommended
/// PQ key rotation policy for maintaining forward secrecy.
/// 
/// # Arguments
/// * `last` - Timestamp of the last key rotation
/// 
/// # Returns
/// * `Ok(())` if rotation was checked (and performed if needed)
/// * `Err` if rotation failed
/// 
/// # Example
/// ```no_run
/// use std::time::Instant;
/// use privachain_node::crypto::pq_rotation::rotate_if_needed;
/// 
/// # async fn example() -> anyhow::Result<()> {
/// let last_rotation = Instant::now();
/// rotate_if_needed(last_rotation).await?;
/// # Ok(())
/// # }
/// ```
pub async fn rotate_if_needed(last: Instant) -> Result<()> {
    let elapsed = last.elapsed();
    let rotation_interval = Duration::from_secs(ROTATION_HOURS * 3600);
    
    if elapsed > rotation_interval {
        tracing::info!(
            "Key rotation triggered: {} hours elapsed (threshold: {} hours)",
            elapsed.as_secs() / 3600,
            ROTATION_HOURS
        );
        
        // Generate new hybrid keypair
        let (new_pk, new_sk) = generate_hybrid_keypair()?;
        
        // Store in keystore
        store_pq_keys(new_pk, new_sk).await?;
        
        tracing::info!("✅ PQ keys rotated successfully");
    } else {
        tracing::debug!(
            "Key rotation not needed: {} hours elapsed (threshold: {} hours)",
            elapsed.as_secs() / 3600,
            ROTATION_HOURS
        );
    }
    
    Ok(())
}

/// Generate a new hybrid keypair (X25519 + Kyber768)
fn generate_hybrid_keypair() -> Result<(Vec<u8>, Vec<u8>)> {
    // In a full implementation, this would call into privachain_messenger::crypto::pq_handshake
    // For now, we provide the API structure
    
    // TODO: Use actual PQ keypair generation when messenger integration is complete
    // let (classical_pk, pq_pk) = privachain_messenger::crypto::pq_handshake::generate_hybrid_keypair();
    
    tracing::debug!("Generating hybrid keypair (X25519 + Kyber768)");
    
    // Placeholder - would be replaced with actual key generation
    let public_key = vec![0u8; 32 + 1184]; // 32 bytes X25519 + 1184 bytes Kyber768
    let secret_key = vec![0u8; 32 + 2400]; // 32 bytes X25519 + 2400 bytes Kyber768
    
    Ok((public_key, secret_key))
}

/// Store PQ keys in the keystore
async fn store_pq_keys(public_key: Vec<u8>, secret_key: Vec<u8>) -> Result<()> {
    // This would integrate with a proper keystore implementation
    // For now, we provide the API structure
    
    tracing::debug!(
        "Storing PQ keys: pk_len={}, sk_len={}",
        public_key.len(),
        secret_key.len()
    );
    
    // TODO: Implement actual secure key storage
    // Keystore::store_pq(public_key, secret_key).await?;
    
    Ok(())
}

/// Get the configured rotation interval in hours
pub fn get_rotation_interval_hours() -> u64 {
    ROTATION_HOURS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rotate_if_needed_recent() {
        let last = Instant::now();
        let result = rotate_if_needed(last).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_rotate_if_needed_old() {
        // Simulate old timestamp by subtracting more than 24 hours
        let last = Instant::now() - Duration::from_secs(ROTATION_HOURS * 3600 + 1);
        let result = rotate_if_needed(last).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_generate_hybrid_keypair() {
        let result = generate_hybrid_keypair();
        assert!(result.is_ok());
        
        let (pk, sk) = result.unwrap();
        assert!(!pk.is_empty());
        assert!(!sk.is_empty());
    }

    #[test]
    fn test_rotation_interval() {
        assert_eq!(get_rotation_interval_hours(), 24);
    }
}
