// pq_tx.rs - Cosmos Transaction with Hybrid Signatures
//
// Provides quantum-safe transaction signing for Cosmos SDK

#![cfg(feature = "post-quantum")]

use crate::crypto::pq_sign::{hybrid_sign, HybridSignature};
use crate::MessengerResult;
use ed25519_dalek::SigningKey;
use serde::{Deserialize, Serialize};

/// Simplified Cosmos transaction structure
/// In production, this would integrate with cosmrs or cosmos-sdk-proto
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PqCosmosTransaction {
    pub body_bytes: Vec<u8>,
    pub auth_info_bytes: Vec<u8>,
    pub signatures: Vec<PqSignatureWrapper>,
}

/// Wrapper for hybrid signatures in Cosmos format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PqSignatureWrapper {
    pub signature_type: String,
    pub signature_data: Vec<u8>,
}

impl HybridSignature {
    /// Encode to protobuf-like format for Cosmos transactions
    pub fn encode_to_vec(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        
        // Ed25519 signature (64 bytes)
        buf.extend_from_slice(&self.ecdsa.to_bytes());
        
        // Dilithium signature length prefix (4 bytes little-endian)
        buf.extend_from_slice(&(self.dilithium.len() as u32).to_le_bytes());
        
        // Dilithium signature
        buf.extend_from_slice(&self.dilithium);
        
        buf
    }
    
    /// Decode from protobuf-like format
    pub fn decode_from_bytes(bytes: &[u8]) -> MessengerResult<Self> {
        if bytes.len() < 68 {
            return Err(crate::MessengerError::InvalidInput("Signature too short".to_string()));
        }
        
        // Extract Ed25519 signature
        let ed_bytes = &bytes[..64];
        let ecdsa = ed25519_dalek::Signature::from_bytes(
            &<[u8; 64]>::try_from(ed_bytes).map_err(|_| {
                crate::MessengerError::InvalidSignature("Invalid Ed25519 signature".to_string())
            })?
        );
        
        // Extract Dilithium length
        let dil_len = u32::from_le_bytes([bytes[64], bytes[65], bytes[66], bytes[67]]) as usize;
        
        // Extract Dilithium signature
        if bytes.len() < 68 + dil_len {
            return Err(crate::MessengerError::InvalidInput("Truncated Dilithium signature".to_string()));
        }
        
        let dilithium = bytes[68..68 + dil_len].to_vec();
        
        Ok(HybridSignature {
            ecdsa,
            dilithium,
        })
    }
}

/// Sign a Cosmos transaction with hybrid PQ signature
pub fn sign_pq_tx(
    body_bytes: &[u8],
    auth_info_bytes: &[u8],
    signing_key: &SigningKey,
) -> MessengerResult<PqCosmosTransaction> {
    // Create sign doc (standard Cosmos signing format)
    let mut sign_doc = Vec::new();
    sign_doc.extend_from_slice(body_bytes);
    sign_doc.extend_from_slice(auth_info_bytes);
    
    // Generate hybrid signature
    let sig = hybrid_sign(&sign_doc, signing_key)?;
    
    // Wrap signature for Cosmos format
    let sig_wrapper = PqSignatureWrapper {
        signature_type: "privachain.crypto.v1.HybridSignature".to_string(),
        signature_data: sig.encode_to_vec(),
    };
    
    Ok(PqCosmosTransaction {
        body_bytes: body_bytes.to_vec(),
        auth_info_bytes: auth_info_bytes.to_vec(),
        signatures: vec![sig_wrapper],
    })
}

/// Verify a PQ Cosmos transaction signature
pub fn verify_pq_tx(
    tx: &PqCosmosTransaction,
    verifying_key: &ed25519_dalek::VerifyingKey,
    dilithium_pk: &[u8],
) -> MessengerResult<()> {
    if tx.signatures.is_empty() {
        return Err(crate::MessengerError::InvalidSignature("No signatures".to_string()));
    }
    
    // Reconstruct sign doc
    let mut sign_doc = Vec::new();
    sign_doc.extend_from_slice(&tx.body_bytes);
    sign_doc.extend_from_slice(&tx.auth_info_bytes);
    
    // Decode and verify signature
    let sig = HybridSignature::decode_from_bytes(&tx.signatures[0].signature_data)?;
    crate::crypto::pq_sign::hybrid_verify(&sign_doc, &sig, verifying_key, dilithium_pk)?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::rngs::OsRng;

    #[test]
    fn test_hybrid_signature_encoding() {
        let mut rng = rand::rngs::OsRng;
        let sk_bytes: [u8; 32] = rand::Rng::gen(&mut rng);
        let sk = SigningKey::from_bytes(&sk_bytes);
        let msg = b"test transaction";
        
        let sig = hybrid_sign(msg, &sk).unwrap();
        let encoded = sig.encode_to_vec();
        
        assert!(encoded.len() >= 68); // At least 64 (Ed25519) + 4 (length) bytes
        
        let decoded = HybridSignature::decode_from_bytes(&encoded).unwrap();
        assert_eq!(decoded.ecdsa.to_bytes(), sig.ecdsa.to_bytes());
        assert_eq!(decoded.dilithium, sig.dilithium);
    }

    #[test]
    fn test_sign_pq_tx() {
        let mut rng = rand::rngs::OsRng;
        let sk_bytes: [u8; 32] = rand::Rng::gen(&mut rng);
        let sk = SigningKey::from_bytes(&sk_bytes);
        
        let body = b"transaction body";
        let auth_info = b"auth info";
        
        let result = sign_pq_tx(body, auth_info, &sk);
        assert!(result.is_ok());
        
        let tx = result.unwrap();
        assert_eq!(tx.body_bytes, body);
        assert_eq!(tx.auth_info_bytes, auth_info);
        assert_eq!(tx.signatures.len(), 1);
    }
}
