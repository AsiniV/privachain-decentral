// pq_ffi.rs - FFI exports for Flutter (Dart)
//
// Provides C-compatible functions for post-quantum operations

#![cfg(feature = "post-quantum")]

use crate::crypto::pq_handshake::generate_hybrid_keypair;
use crate::crypto::pq_sign::hybrid_sign;
use ed25519_dalek::SigningKey;

/// Generate hybrid keypair and return as concatenated bytes
/// Returns: [32 bytes X25519 public key][1184 bytes Kyber768 public key]
#[no_mangle]
pub extern "C" fn pq_generate_keypair(out: *mut u8, out_len: *mut usize) -> i32 {
    if out.is_null() || out_len.is_null() {
        return -1;
    }
    
    let (classical_pk, pq_pk) = generate_hybrid_keypair();
    
    let total_len = classical_pk.len() + pq_pk.len();
    unsafe {
        if (*out_len) < total_len {
            *out_len = total_len;
            return -2; // Buffer too small
        }
        
        let slice = std::slice::from_raw_parts_mut(out, total_len);
        slice[..32].copy_from_slice(&classical_pk);
        slice[32..].copy_from_slice(&pq_pk);
        *out_len = total_len;
    }
    
    0
}

/// Sign message with hybrid signature
/// Returns: [64 bytes Ed25519 sig][~2420 bytes Dilithium sig]
#[no_mangle]
pub extern "C" fn pq_hybrid_sign(
    msg: *const u8,
    msg_len: usize,
    sk_ed: *const u8,
    sk_ed_len: usize,
    out: *mut u8,
    out_len: *mut usize,
) -> i32 {
    if msg.is_null() || sk_ed.is_null() || out.is_null() || out_len.is_null() {
        return -1;
    }
    
    if sk_ed_len != 32 {
        return -3; // Invalid Ed25519 key size
    }
    
    unsafe {
        let msg_slice = std::slice::from_raw_parts(msg, msg_len);
        let sk_bytes = std::slice::from_raw_parts(sk_ed, sk_ed_len);
        
        let sk = match SigningKey::from_bytes(&sk_bytes.try_into().unwrap_or([0u8; 32])) {
            sk => sk,
        };
        
        let sig = match hybrid_sign(msg_slice, &sk) {
            Ok(s) => s,
            Err(_) => return -4,
        };
        
        let ed_bytes = sig.ecdsa.to_bytes();
        let total_len = ed_bytes.len() + sig.dilithium.len();
        
        if (*out_len) < total_len {
            *out_len = total_len;
            return -2; // Buffer too small
        }
        
        let out_slice = std::slice::from_raw_parts_mut(out, total_len);
        out_slice[..64].copy_from_slice(&ed_bytes);
        out_slice[64..].copy_from_slice(&sig.dilithium);
        *out_len = total_len;
    }
    
    0
}

/// Rust-friendly wrapper for Dart FFI
pub fn pq_generate_keypair_vec() -> Vec<u8> {
    let (classical_pk, pq_pk) = generate_hybrid_keypair();
    let mut out = Vec::with_capacity(classical_pk.len() + pq_pk.len());
    out.extend_from_slice(&classical_pk);
    out.extend_from_slice(&pq_pk);
    out
}

/// Rust-friendly wrapper for hybrid signing
pub fn pq_hybrid_sign_vec(msg: &[u8], sk_ed: &[u8; 32]) -> Result<Vec<u8>, String> {
    let sk = SigningKey::from_bytes(sk_ed);
    let sig = hybrid_sign(msg, &sk).map_err(|e| format!("{:?}", e))?;
    
    let ed_bytes = sig.ecdsa.to_bytes();
    let mut out = Vec::with_capacity(ed_bytes.len() + sig.dilithium.len());
    out.extend_from_slice(&ed_bytes);
    out.extend_from_slice(&sig.dilithium);
    
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pq_generate_keypair_vec() {
        let keys = pq_generate_keypair_vec();
        assert_eq!(keys.len(), 32 + 1184); // X25519 + Kyber768
    }

    #[test]
    fn test_pq_hybrid_sign_vec() {
        let sk = [1u8; 32];
        let msg = b"test message";
        let result = pq_hybrid_sign_vec(msg, &sk);
        assert!(result.is_ok());
        let sig = result.unwrap();
        assert!(sig.len() >= 64); // At least Ed25519 signature
    }
}
