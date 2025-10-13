#![cfg(feature = "zk-proofs")]

use super::ZkProver;
use anyhow::Result;

#[derive(Debug)]
pub enum ZkError {
    ProverFailed(String),
    InvalidInput(String),
}

impl std::fmt::Display for ZkError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ZkError::ProverFailed(msg) => write!(f, "Prover failed: {}", msg),
            ZkError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}

impl std::error::Error for ZkError {}

/// Generate a ZK proof for gas payer
/// This can be called from Flutter via FFI
pub fn zk_prove_gas_payer(
    secret: u64,
    hash: Vec<u8>,
    limit: u64,
    price: u64,
) -> Result<Vec<u8>, ZkError> {
    // Validate input
    if hash.len() != 32 {
        return Err(ZkError::InvalidInput(
            format!("Hash must be 32 bytes, got {}", hash.len())
        ));
    }

    let prover = ZkProver::new()
        .map_err(|e| ZkError::ProverFailed(e.to_string()))?;
    
    let hash_array: [u8; 32] = hash.try_into()
        .map_err(|_| ZkError::InvalidInput("Failed to convert hash to array".to_string()))?;
    
    prover.prove(secret, hash_array, limit, price)
        .map_err(|e| ZkError::ProverFailed(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zk_prove_invalid_hash() {
        let result = zk_prove_gas_payer(
            123456789,
            vec![0u8; 16], // Wrong size
            21000,
            20000000000,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_zk_prove_valid_input() {
        let result = zk_prove_gas_payer(
            123456789,
            vec![0u8; 32],
            21000,
            20000000000,
        );
        // Will fail because no proving key, but validates input
        assert!(matches!(result, Err(ZkError::ProverFailed(_))));
    }
}
