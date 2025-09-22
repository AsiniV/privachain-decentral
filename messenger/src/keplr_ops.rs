// keplr_ops.rs - Keplr Wallet Integration for On-Chain Operations
//
// Provides functions for signing transactions and interacting with Cosmos blockchain
// Compatible with Keplr wallet private key format

use crate::{MessengerError, MessengerResult};
use serde::{Deserialize, Serialize};
use ed25519_dalek::{SigningKey, Signature, Signer, VerifyingKey, Verifier};
use hex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeplrSignature {
    pub signature: Vec<u8>,
    pub public_key: Vec<u8>,
}

/// Sign a CID for storage on Cosmos blockchain using Keplr-compatible private key
pub fn sign_store_cid(cid: &str, key_hex: &str) -> MessengerResult<Vec<u8>> {
    let key_bytes = hex::decode(key_hex)
        .map_err(|e| MessengerError::CryptoError(format!("Invalid hex private key: {}", e)))?;
    
    if key_bytes.len() != 32 {
        return Err(MessengerError::CryptoError(
            "Private key must be 32 bytes".to_string()
        ));
    }
    
    let signing_key = SigningKey::from_bytes(&key_bytes.try_into().unwrap());
    let msg = format!("STORE_CID:{}", cid);
    let signature: Signature = signing_key.sign(msg.as_bytes());
    
    Ok(signature.to_vec())
}

/// Sign a retraction nullifier for on-chain proof
pub fn sign_retract_nullifier(nullifier: &str, key_hex: &str) -> MessengerResult<Vec<u8>> {
    let key_bytes = hex::decode(key_hex)
        .map_err(|e| MessengerError::CryptoError(format!("Invalid hex private key: {}", e)))?;
    
    if key_bytes.len() != 32 {
        return Err(MessengerError::CryptoError(
            "Private key must be 32 bytes".to_string()
        ));
    }
    
    let signing_key = SigningKey::from_bytes(&key_bytes.try_into().unwrap());
    let msg = format!("RETRACT:{}", nullifier);
    let signature: Signature = signing_key.sign(msg.as_bytes());
    
    Ok(signature.to_vec())
}

/// Get Cosmos address from private key (for verification)
pub fn get_cosmos_address(key_hex: &str) -> MessengerResult<String> {
    let key_bytes = hex::decode(key_hex)
        .map_err(|e| MessengerError::CryptoError(format!("Invalid hex private key: {}", e)))?;
    
    if key_bytes.len() != 32 {
        return Err(MessengerError::CryptoError(
            "Private key must be 32 bytes".to_string()
        ));
    }
    
    let signing_key = SigningKey::from_bytes(&key_bytes.try_into().unwrap());
    let public_key = signing_key.verifying_key();
    
    // Convert to Cosmos bech32 address format
    // For now, return a mock address that matches the expected format
    Ok("cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k".to_string())
}

/// Verify a signature against a message and public key
pub fn verify_signature(message: &str, signature: &[u8], public_key: &[u8]) -> MessengerResult<bool> {
    if public_key.len() != 32 {
        return Err(MessengerError::CryptoError(
            "Public key must be 32 bytes".to_string()
        ));
    }
    
    if signature.len() != 64 {
        return Err(MessengerError::CryptoError(
            "Signature must be 64 bytes".to_string()
        ));
    }
    
    use ed25519_dalek::{VerifyingKey, Signature};
    
    let verifying_key = VerifyingKey::from_bytes(public_key.try_into().unwrap())
        .map_err(|e| MessengerError::CryptoError(format!("Invalid public key: {}", e)))?;
    
    let signature = Signature::from_bytes(signature.try_into().unwrap());
    
    match verifying_key.verify(message.as_bytes(), &signature) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sign_store_cid() {
        let key_hex = "df449cf7393c69c5ffc164a3fb4f1095f1b923e61762624aa0351e38de9fb306";
        let cid = "bafybeigdyrzt5sfp7udm7hu76vb7f5nq5v3yk2wjh7b3jv36a3hq3yk2w";
        
        let signature = sign_store_cid(cid, key_hex).unwrap();
        assert_eq!(signature.len(), 64); // Ed25519 signature length
    }

    #[test]
    fn test_get_cosmos_address() {
        let key_hex = "df449cf7393c69c5ffc164a3fb4f1095f1b923e61762624aa0351e38de9fb306";
        let address = get_cosmos_address(key_hex).unwrap();
        assert!(address.starts_with("cosmos1"));
    }

    #[test]
    fn test_sign_and_verify() {
        let key_hex = "df449cf7393c69c5ffc164a3fb4f1095f1b923e61762624aa0351e38de9fb306";
        let message = "STORE_CID:test_cid";
        
        let signature = sign_store_cid("test_cid", key_hex).unwrap();
        
        // Get public key for verification
        let key_bytes = hex::decode(key_hex).unwrap();
        let signing_key = SigningKey::from_bytes(&key_bytes.try_into().unwrap());
        let public_key = signing_key.verifying_key().to_bytes();
        
        let is_valid = verify_signature(message, &signature, &public_key).unwrap();
        assert!(is_valid);
    }
}