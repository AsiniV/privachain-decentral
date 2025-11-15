//! Post-Quantum WebRTC Handshake Extension
//! 
//! Extends Noise XX handshake with Kyber-1024 KEM payload using TLV encoding.
//! This provides additional post-quantum security layer on top of classical crypto.

use anyhow::{Result, anyhow};

pub const PQ_KEM_TLV: u8 = 0xFD;

/// Encapsulate Kyber KEM and insert into Noise handshake payload
/// 
/// Returns the shared secret (32 bytes)
#[cfg(feature = "post-quantum")]
pub fn encapsulate_and_insert(noise_buf: &mut Vec<u8>, kyber_pk: &[u8]) -> Result<[u8; 32]> {
    use privachain_crypto::pq::KyberKem;
    
    // Parse public key
    let pk = privachain_crypto::pq::KyberPublicKey::from_bytes(kyber_pk)?;
    
    // Encapsulate
    let (ss, ct) = KyberKem::encapsulate(&pk)?;
    let ct_bytes = ct.as_bytes();
    
    // Append TLV: type(1) + len(2) + ct(1568)
    noise_buf.push(PQ_KEM_TLV);
    noise_buf.extend_from_slice(&(ct_bytes.len() as u16).to_be_bytes());
    noise_buf.extend_from_slice(ct_bytes);
    
    // Convert Vec<u8> to [u8; 32]
    if ss.len() != 32 {
        return Err(anyhow!("Invalid shared secret length: {}", ss.len()));
    }
    let mut result = [0u8; 32];
    result.copy_from_slice(&ss);
    Ok(result)
}

/// Extract Kyber ciphertext from payload and decapsulate
/// 
/// Returns the shared secret (32 bytes) if found
#[cfg(feature = "post-quantum")]
pub fn extract_and_decapsulate(payload: &[u8], kyber_sk: &[u8]) -> Option<[u8; 32]> {
    use privachain_crypto::pq::KyberKem;
    
    let mut idx = 0;
    while idx + 3 <= payload.len() {
        if payload[idx] == PQ_KEM_TLV {
            let ct_len = u16::from_be_bytes([payload[idx+1], payload[idx+2]]) as usize;
            if idx + 3 + ct_len <= payload.len() {
                let ct_bytes = &payload[idx+3..idx+3+ct_len];
                
                // Parse secret key and ciphertext
                if let Ok(sk) = privachain_crypto::pq::KyberSecretKey::from_bytes(kyber_sk) {
                    if let Ok(ct) = privachain_crypto::pq::KyberCiphertext::from_bytes(ct_bytes) {
                        if let Ok(ss) = KyberKem::decapsulate(&ct, &sk) {
                            if ss.len() == 32 {
                                let mut result = [0u8; 32];
                                result.copy_from_slice(&ss);
                                return Some(result);
                            }
                        }
                    }
                }
            }
        }
        idx += 1;
    }
    None
}

// Stub implementations when PQ is disabled
#[cfg(not(feature = "post-quantum"))]
pub fn encapsulate_and_insert(_noise_buf: &mut Vec<u8>, _kyber_pk: &[u8]) -> Result<[u8; 32]> {
    Err(anyhow!("Post-quantum crypto not enabled. Build with --features post-quantum"))
}

#[cfg(not(feature = "post-quantum"))]
pub fn extract_and_decapsulate(_payload: &[u8], _kyber_sk: &[u8]) -> Option<[u8; 32]> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tlv_constant() {
        assert_eq!(PQ_KEM_TLV, 0xFD);
    }

    #[test]
    #[cfg(feature = "post-quantum")]
    fn test_encapsulate_and_insert() {
        use privachain_crypto::pq::KyberKem;
        
        let (pk, sk) = KyberKem::keypair().unwrap();
        let mut noise_buf = vec![0u8; 100]; // Some existing noise data
        
        let ss1 = encapsulate_and_insert(&mut noise_buf, pk.as_bytes()).unwrap();
        assert_eq!(ss1.len(), 32);
        
        // Verify TLV was appended
        assert!(noise_buf.len() > 100); // Should have grown
        
        // Extract and verify
        let payload = &noise_buf[100..]; // Skip initial noise data
        let ss2 = extract_and_decapsulate(payload, sk.as_bytes()).unwrap();
        assert_eq!(ss1, ss2);
    }

    #[test]
    #[cfg(not(feature = "post-quantum"))]
    fn test_stub_implementations() {
        let mut buf = vec![];
        assert!(encapsulate_and_insert(&mut buf, &[]).is_err());
        assert!(extract_and_decapsulate(&[], &[]).is_none());
    }
}
