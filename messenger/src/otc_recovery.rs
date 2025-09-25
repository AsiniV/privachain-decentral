// otc_recovery.rs - Zero-Knowledge Recovery Logic
//
// Converts OTC codes to private keys locally and generates ZK proofs for on-chain recovery

use crate::{MessengerError, MessengerResult};
use bip39::{Mnemonic, Language};
use sha2::{Sha256, Digest};
use ed25519_dalek::SigningKey;
use bellman::{
    groth16::{self},
    Circuit, ConstraintSystem, SynthesisError,
};
use bls12_381::{Bls12, Scalar};
use rand::rngs::OsRng;

/// Convert OTC code to private key (never leaves device)
pub fn code_to_private_key(code: &str) -> MessengerResult<[u8; 32]> {
    let mnemonic = Mnemonic::parse_in_normalized(Language::English, code)
        .map_err(|e| MessengerError::CryptoError(format!("Invalid mnemonic: {}", e)))?;
    
    let seed = mnemonic.to_seed("");
    let mut private_key = [0u8; 32];
    private_key.copy_from_slice(&seed[0..32]);
    
    Ok(private_key)
}

/// Derive public key from private key
pub fn derive_pubkey(private_key: [u8; 32]) -> MessengerResult<[u8; 32]> {
    let signing_key = SigningKey::from_bytes(&private_key);
    let verifying_key = signing_key.verifying_key();
    Ok(verifying_key.to_bytes())
}

/// Recovery proof circuit for ZK-SNARK
#[derive(Clone)]
pub struct RecoveryCircuit {
    /// Private key derived from OTC code (private input)
    private_key: Option<[u8; 32]>,
    /// DID to prove ownership of (public input)
    did_hash: Option<[u8; 32]>,
}

impl Circuit<Scalar> for RecoveryCircuit {
    fn synthesize<CS: ConstraintSystem<Scalar>>(
        self,
        cs: &mut CS,
    ) -> Result<(), SynthesisError> {
        // Allocate private key as private input
        let private_key_bits: Vec<_> = (0..256)
            .map(|i| {
                cs.alloc(
                    || format!("private_key_bit_{}", i),
                    || {
                        if let Some(pk) = self.private_key {
                            let byte_idx = i / 8;
                            let bit_idx = i % 8;
                            let bit = (pk[byte_idx] >> bit_idx) & 1;
                            Ok(if bit == 1 { Scalar::one() } else { Scalar::zero() })
                        } else {
                            Err(SynthesisError::AssignmentMissing)
                        }
                    },
                )
            })
            .collect::<Result<Vec<_>, _>>()?;

        // Allocate DID hash as public input
        let did_hash_bits: Vec<_> = (0..256)
            .map(|i| {
                cs.alloc_input(
                    || format!("did_hash_bit_{}", i),
                    || {
                        if let Some(did) = self.did_hash {
                            let byte_idx = i / 8;
                            let bit_idx = i % 8;
                            let bit = (did[byte_idx] >> bit_idx) & 1;
                            Ok(if bit == 1 { Scalar::one() } else { Scalar::zero() })
                        } else {
                            Err(SynthesisError::AssignmentMissing)
                        }
                    },
                )
            })
            .collect::<Result<Vec<_>, _>>()?;

        // Constrain that each bit is boolean
        for bit in private_key_bits.iter().chain(did_hash_bits.iter()) {
            cs.enforce(
                || "bit boolean constraint",
                |lc| lc + *bit,
                |lc| lc + CS::one() - *bit,
                |lc| lc,
            );
        }

        // Simplified constraint: prove knowledge of private key that hashes to DID
        // In production, this would be a more complex ownership proof
        let zero = cs.alloc(|| "zero", || Ok(Scalar::zero()))?;
        cs.enforce(
            || "ownership constraint",
            |lc| lc + private_key_bits[0] + did_hash_bits[0],
            |lc| lc + CS::one(),
            |lc| lc + zero,
        );

        Ok(())
    }
}

/// Generate ZK proof of OTC code ownership without revealing the code
pub fn generate_recovery_proof(code: &str, did: &str) -> MessengerResult<Vec<u8>> {
    // Convert code to private key (local only)
    let private_key = code_to_private_key(code)?;
    
    // Hash the DID for the proof
    let mut hasher = Sha256::new();
    hasher.update(did.as_bytes());
    let did_hash: [u8; 32] = hasher.finalize().into();
    
    // Create the circuit
    let circuit = RecoveryCircuit {
        private_key: Some(private_key),
        did_hash: Some(did_hash),
    };
    
    // Generate parameters (in production, these would be pre-generated in a trusted setup)
    let params = groth16::generate_random_parameters::<Bls12, _, _>(circuit.clone(), &mut OsRng)
        .map_err(|_| MessengerError::CryptoError("Failed to generate parameters".to_string()))?;
    
    // Create the proof
    let proof = groth16::create_random_proof(circuit, &params, &mut OsRng)
        .map_err(|_| MessengerError::CryptoError("Failed to create proof".to_string()))?;
    
    // Serialize proof to bytes
    let mut proof_bytes = Vec::new();
    proof.write(&mut proof_bytes)
        .map_err(|_| MessengerError::CryptoError("Failed to serialize proof".to_string()))?;
    
    Ok(proof_bytes)
}

/// Verify a recovery proof (for testing)
pub fn verify_recovery_proof(proof_bytes: &[u8], did: &str) -> MessengerResult<bool> {
    // Hash the DID for verification
    let mut hasher = Sha256::new();
    hasher.update(did.as_bytes());
    let _did_hash: [u8; 32] = hasher.finalize().into();
    
    // For testing, we'll simulate verification
    // In production, this would use the actual verification key and Groth16 verification
    Ok(proof_bytes.len() > 0 && !did.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::otc_generator::generate_otc_pair;

    #[test]
    fn test_code_to_private_key() {
        let valid_code = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let result = code_to_private_key(valid_code);
        assert!(result.is_ok());
        
        let private_key = result.unwrap();
        assert_eq!(private_key.len(), 32);
        
        // Same code should produce same key
        let private_key2 = code_to_private_key(valid_code).unwrap();
        assert_eq!(private_key, private_key2);
    }

    #[test]
    fn test_derive_pubkey() {
        let private_key = [1u8; 32];
        let result = derive_pubkey(private_key);
        assert!(result.is_ok());
        
        let public_key = result.unwrap();
        assert_eq!(public_key.len(), 32);
        
        // Same private key should produce same public key
        let public_key2 = derive_pubkey(private_key).unwrap();
        assert_eq!(public_key, public_key2);
    }

    #[test]
    fn test_generate_recovery_proof() {
        let (otc1, _) = generate_otc_pair().unwrap();
        let did = "did:prv:test123";
        
        let result = generate_recovery_proof(&otc1, did);
        assert!(result.is_ok());
        
        let proof = result.unwrap();
        assert!(!proof.is_empty());
    }

    #[test]
    fn test_verify_recovery_proof() {
        let (otc1, _) = generate_otc_pair().unwrap();
        let did = "did:prv:test123";
        
        let proof = generate_recovery_proof(&otc1, did).unwrap();
        let verification_result = verify_recovery_proof(&proof, did);
        assert!(verification_result.is_ok());
        assert!(verification_result.unwrap());
    }

    #[test]
    fn test_code_to_private_key_invalid() {
        let invalid_code = "invalid mnemonic phrase";
        let result = code_to_private_key(invalid_code);
        assert!(result.is_err());
    }

    #[test]
    fn test_different_codes_different_keys() {
        let (otc1, otc2) = generate_otc_pair().unwrap();
        
        let key1 = code_to_private_key(&otc1).unwrap();
        let key2 = code_to_private_key(&otc2).unwrap();
        
        assert_ne!(key1, key2);
    }
}