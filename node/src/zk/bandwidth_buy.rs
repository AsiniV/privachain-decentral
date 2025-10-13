#![cfg(feature = "zk-proofs")]

use crate::zk::prover::ZkProver;
use anyhow::{Result, Context};
use sha2::{Sha256, Digest};

/// Poseidon hash simulation (in production, use ark-crypto-primitives)
fn poseidon_hash(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"poseidon:");
    hasher.update(data);
    hasher.finalize().into()
}

/// Buy bandwidth anonymously using ZK proof
/// 
/// This function demonstrates how to purchase Nym network bandwidth
/// while keeping the payer's identity private using ZK-SNARK proofs.
/// 
/// # Arguments
/// * `mb` - Amount of bandwidth to purchase in megabytes
/// * `payer_secret` - Private secret known only to the payer (never revealed)
/// 
/// # Returns
/// * `Ok(())` on successful bandwidth purchase
/// * `Err(_)` if proof generation or bandwidth purchase fails
/// 
/// # Example
/// ```no_run
/// # #[cfg(feature = "zk-proofs")]
/// # async {
/// use privachain_node::zk::bandwidth_buy::buy_bandwidth_anon;
/// 
/// // Buy 100 MB anonymously
/// let result = buy_bandwidth_anon(100, 123456789).await;
/// # };
/// ```
pub async fn buy_bandwidth_anon(
    mb: u64,
    payer_secret: u64,      // private
) -> Result<()> {
    println!("🔐 Purchasing bandwidth anonymously with ZK proof...");
    println!("   Amount: {} MB", mb);
    
    // Create ZK prover
    let prover = ZkProver::new()
        .context("Failed to initialize ZK prover")?;
    
    // Compute public commitment (hash of secret)
    let payer_hash = poseidon_hash(&payer_secret.to_le_bytes());
    println!("   Payer hash: {}", hex::encode(&payer_hash));
    
    // Generate ZK proof
    // The proof demonstrates knowledge of payer_secret without revealing it
    let gas_limit = mb * 1_000_000; // Convert MB to gas units
    let gas_price = 0; // Price in this context
    
    println!("   Generating ZK proof...");
    let proof = prover.prove(payer_secret, payer_hash, gas_limit, gas_price)
        .context("Failed to generate ZK proof")?;
    
    println!("   ✅ ZK proof generated ({} bytes)", proof.len());
    
    // In production, this would:
    // 1. Submit proof + public inputs to bandwidth controller
    // 2. Controller verifies proof on-chain or via trusted verifier
    // 3. If valid, bandwidth is credited to anonymous address
    
    // For now, we simulate the bandwidth purchase
    simulate_bandwidth_purchase(mb, &proof, &payer_hash).await?;
    
    println!("   ✅ Bandwidth purchased anonymously");
    println!("   🔒 Payer identity remains private");
    
    Ok(())
}

/// Simulate bandwidth purchase with ZK proof
/// 
/// In production, this would interact with Nym's bandwidth controller:
/// ```rust,no_run
/// use nym_client_core::bandwidth::BandwidthController;
/// 
/// let ctrl = BandwidthController::new_zk(proof).await?;
/// ctrl.buy(mb * 1_000_000, "nym").await?;
/// ```
async fn simulate_bandwidth_purchase(
    mb: u64,
    proof: &[u8],
    payer_hash: &[u8; 32],
) -> Result<()> {
    // Validate inputs
    if mb == 0 {
        anyhow::bail!("Bandwidth amount must be greater than 0");
    }
    
    if proof.len() != 192 {
        anyhow::bail!("Invalid proof size: expected 192 bytes, got {}", proof.len());
    }
    
    println!("   📡 Submitting to Nym bandwidth controller...");
    println!("      - Proof: {} bytes", proof.len());
    println!("      - Commitment: {}", hex::encode(payer_hash));
    println!("      - Amount: {} MB", mb);
    
    // Simulate network delay
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    
    println!("   ✅ Bandwidth controller accepted proof");
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_poseidon_hash() {
        let data = 123456789u64.to_le_bytes();
        let hash1 = poseidon_hash(&data);
        let hash2 = poseidon_hash(&data);
        
        // Hash should be deterministic
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 32);
    }

    #[test]
    fn test_poseidon_hash_different_inputs() {
        let data1 = 123456789u64.to_le_bytes();
        let data2 = 987654321u64.to_le_bytes();
        
        let hash1 = poseidon_hash(&data1);
        let hash2 = poseidon_hash(&data2);
        
        // Different inputs should produce different hashes
        assert_ne!(hash1, hash2);
    }

    #[tokio::test]
    async fn test_simulate_bandwidth_purchase() {
        let mb = 100;
        let proof = vec![0u8; 192];
        let payer_hash = [0u8; 32];
        
        let result = simulate_bandwidth_purchase(mb, &proof, &payer_hash).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_simulate_bandwidth_purchase_invalid_proof() {
        let mb = 100;
        let proof = vec![0u8; 100]; // Wrong size
        let payer_hash = [0u8; 32];
        
        let result = simulate_bandwidth_purchase(mb, &proof, &payer_hash).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_simulate_bandwidth_purchase_zero_amount() {
        let mb = 0;
        let proof = vec![0u8; 192];
        let payer_hash = [0u8; 32];
        
        let result = simulate_bandwidth_purchase(mb, &proof, &payer_hash).await;
        assert!(result.is_err());
    }
}
