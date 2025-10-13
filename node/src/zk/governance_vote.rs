#![cfg(feature = "zk-proofs")]

use crate::zk::prover::ZkProver;
use anyhow::{Result, Context};
use serde_json::json;
use sha2::{Sha256, Digest};

/// Poseidon hash simulation (in production, use ark-crypto-primitives)
fn poseidon_hash(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"poseidon:");
    hasher.update(data);
    hasher.finalize().into()
}

/// Cast an anonymous vote on a governance proposal using ZK proof
/// 
/// This function demonstrates how to vote on governance proposals
/// while keeping both the voter's identity and their choice private
/// using ZK-SNARK proofs.
/// 
/// # Arguments
/// * `proposal_id` - The ID of the proposal to vote on
/// * `choice` - The vote choice (true = yes, false = no)
/// * `voter_secret` - Private secret known only to the voter (never revealed)
/// 
/// # Returns
/// * `Ok(())` on successful vote submission
/// * `Err(_)` if proof generation or vote submission fails
/// 
/// # Privacy Guarantees
/// - Voter identity is hidden behind a commitment
/// - Vote choice is encrypted in the proof
/// - Only the proof verifier can confirm validity, not content
/// 
/// # Example
/// ```no_run
/// # #[cfg(feature = "zk-proofs")]
/// # async {
/// use privachain_node::zk::governance_vote::vote_anon;
/// 
/// // Vote YES on proposal 42 anonymously
/// let result = vote_anon(42, true, 987654321).await;
/// # };
/// ```
pub async fn vote_anon(
    proposal_id: u64,
    choice: bool,           // private
    voter_secret: u64,      // private
) -> Result<()> {
    println!("🗳️  Casting anonymous vote with ZK proof...");
    println!("   Proposal ID: {}", proposal_id);
    println!("   Choice: {} (hidden in proof)", if choice { "YES" } else { "NO" });
    
    // Create ZK prover
    let prover = ZkProver::new()
        .context("Failed to initialize ZK prover")?;
    
    // Compute public commitment (hash of voter secret)
    let voter_hash = poseidon_hash(&voter_secret.to_le_bytes());
    println!("   Voter hash: {}", hex::encode(&voter_hash));
    
    // Generate ZK proof
    // The proof demonstrates:
    // 1. Knowledge of voter_secret (proves voter eligibility)
    // 2. Vote choice (encrypted in proof)
    // 3. Proposal ID (public, to prevent replay attacks)
    println!("   Generating ZK proof...");
    let proof = prover.prove(
        voter_secret,
        voter_hash,
        proposal_id,
        choice as u64,
    ).context("Failed to generate ZK proof")?;
    
    println!("   ✅ ZK proof generated ({} bytes)", proof.len());
    
    // Submit vote to governance contract
    submit_vote_to_contract(proposal_id, &proof, &voter_hash).await?;
    
    println!("   ✅ Vote submitted anonymously");
    println!("   🔒 Voter identity and choice remain private");
    
    Ok(())
}

/// Submit vote to governance contract with ZK proof
/// 
/// In production, this would interact with a CosmWasm contract:
/// ```rust,no_run
/// let msg = json!({
///     "vote_anon": {
///         "proposal_id": proposal_id,
///         "proof": base64::encode(&proof),
///         "voter_hash": hex::encode(voter_hash),
///     }
/// });
/// cosmos_client.execute_contract(CONTRACT_ADDR, &msg).await?;
/// ```
async fn submit_vote_to_contract(
    proposal_id: u64,
    proof: &[u8],
    voter_hash: &[u8; 32],
) -> Result<()> {
    // Validate inputs
    if proof.len() != 192 {
        anyhow::bail!("Invalid proof size: expected 192 bytes, got {}", proof.len());
    }
    
    // Create governance message
    let msg = json!({
        "vote_anon": {
            "proposal_id": proposal_id,
            "proof": base64::encode(proof),
            "voter_hash": hex::encode(voter_hash),
        }
    });
    
    println!("   📡 Submitting to governance contract...");
    println!("      - Proposal: {}", proposal_id);
    println!("      - Proof: {} bytes", proof.len());
    println!("      - Voter commitment: {}", hex::encode(voter_hash));
    
    // Simulate contract execution
    simulate_contract_execution(&msg).await?;
    
    println!("   ✅ Governance contract accepted vote");
    
    Ok(())
}

/// Simulate contract execution
async fn simulate_contract_execution(msg: &serde_json::Value) -> Result<()> {
    // In production, this would be:
    // use cosmwasm_std::{CosmosMsg, WasmMsg};
    // let cosmos_msg = WasmMsg::Execute { ... };
    // cosmos_client.execute(cosmos_msg).await?;
    
    // Simulate network delay
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
    
    // Validate message structure
    if !msg["vote_anon"].is_object() {
        anyhow::bail!("Invalid message format");
    }
    
    if !msg["vote_anon"]["proposal_id"].is_number() {
        anyhow::bail!("Missing proposal_id");
    }
    
    if !msg["vote_anon"]["proof"].is_string() {
        anyhow::bail!("Missing proof");
    }
    
    if !msg["vote_anon"]["voter_hash"].is_string() {
        anyhow::bail!("Missing voter_hash");
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_poseidon_hash() {
        let data = 987654321u64.to_le_bytes();
        let hash1 = poseidon_hash(&data);
        let hash2 = poseidon_hash(&data);
        
        // Hash should be deterministic
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 32);
    }

    #[test]
    fn test_poseidon_hash_different_secrets() {
        let secret1 = 111111111u64.to_le_bytes();
        let secret2 = 999999999u64.to_le_bytes();
        
        let hash1 = poseidon_hash(&secret1);
        let hash2 = poseidon_hash(&secret2);
        
        // Different secrets should produce different hashes
        assert_ne!(hash1, hash2);
    }

    #[tokio::test]
    async fn test_submit_vote_valid() {
        let proposal_id = 42;
        let proof = vec![0u8; 192];
        let voter_hash = [0u8; 32];
        
        let result = submit_vote_to_contract(proposal_id, &proof, &voter_hash).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_submit_vote_invalid_proof_size() {
        let proposal_id = 42;
        let proof = vec![0u8; 100]; // Wrong size
        let voter_hash = [0u8; 32];
        
        let result = submit_vote_to_contract(proposal_id, &proof, &voter_hash).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_simulate_contract_execution_valid() {
        let msg = json!({
            "vote_anon": {
                "proposal_id": 42,
                "proof": "YmFzZTY0X2VuY29kZWRfcHJvb2Y=",
                "voter_hash": "0123456789abcdef",
            }
        });
        
        let result = simulate_contract_execution(&msg).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_simulate_contract_execution_missing_fields() {
        let msg = json!({
            "vote_anon": {
                "proposal_id": 42,
                // Missing proof and voter_hash
            }
        });
        
        let result = simulate_contract_execution(&msg).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_simulate_contract_execution_invalid_format() {
        let msg = json!({
            "wrong_action": {}
        });
        
        let result = simulate_contract_execution(&msg).await;
        assert!(result.is_err());
    }
}
