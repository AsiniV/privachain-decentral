#![cfg(feature = "zk-proofs")]

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub struct VerifyMsg {
    pub proof: Vec<u8>,          // 192 bytes Groth16
    pub payer_hash: [u8; 32],    // public input
    pub gas_limit: u64,
    pub gas_price: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct VerifyResponse {
    pub verified: bool,
    pub action: String,
}

/// Verify ZK proof on-chain
/// 
/// This is a placeholder implementation for CosmWasm contract integration.
/// In production, this would:
/// 1. Load the verification key from contract storage
/// 2. Deserialize the Groth16 proof
/// 3. Prepare public inputs (payer_hash, gas_limit, gas_price)
/// 4. Call ark_groth16::verify_with_processed_vk
/// 5. Return verification result
pub fn verify_zk_proof(msg: VerifyMsg) -> Result<VerifyResponse, String> {
    // Validate proof size
    if msg.proof.len() != 192 {
        return Err(format!(
            "Invalid proof size: expected 192 bytes, got {}",
            msg.proof.len()
        ));
    }

    // Validate gas_limit
    if msg.gas_limit > 30_000_000 {
        return Err(format!(
            "Gas limit exceeds maximum: {} > 30000000",
            msg.gas_limit
        ));
    }

    // In production, this would perform actual ZK verification
    // using ark-groth16 with the verification key
    // For now, we return a placeholder response
    
    Ok(VerifyResponse {
        verified: false, // Would be true if proof verifies
        action: "verify_zk".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_invalid_proof_size() {
        let msg = VerifyMsg {
            proof: vec![0u8; 100], // Wrong size
            payer_hash: [0u8; 32],
            gas_limit: 21000,
            gas_price: 20000000000,
        };
        let result = verify_zk_proof(msg);
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_gas_limit_exceeded() {
        let msg = VerifyMsg {
            proof: vec![0u8; 192],
            payer_hash: [0u8; 32],
            gas_limit: 40_000_000, // Exceeds max
            gas_price: 20000000000,
        };
        let result = verify_zk_proof(msg);
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_valid_input() {
        let msg = VerifyMsg {
            proof: vec![0u8; 192],
            payer_hash: [0u8; 32],
            gas_limit: 21000,
            gas_price: 20000000000,
        };
        let result = verify_zk_proof(msg);
        assert!(result.is_ok());
    }
}
