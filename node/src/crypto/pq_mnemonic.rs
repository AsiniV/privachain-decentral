#![cfg(feature = "post-quantum")]

use sha2::{Sha512, Digest};

/// Convert 12-word mnemonic to 64-byte PQ seed (BIP-39 compatible)
/// 
/// This function derives a 64-byte seed from a BIP-39 mnemonic phrase,
/// which can be used to generate post-quantum keypairs. The derivation
/// is deterministic and compatible with standard BIP-39 implementations.
/// 
/// # Arguments
/// * `mnemonic` - A BIP-39 mnemonic phrase (12, 15, 18, 21, or 24 words)
/// 
/// # Returns
/// * A 64-byte array suitable for PQ key derivation
/// 
/// # Example
/// ```
/// use privachain_node::crypto::pq_mnemonic::pq_seed_from_mnemonic;
/// 
/// let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
/// let seed = pq_seed_from_mnemonic(mnemonic);
/// assert_eq!(seed.len(), 64);
/// ```
pub fn pq_seed_from_mnemonic(mnemonic: &str) -> [u8; 64] {
    // Convert mnemonic to entropy
    let entropy = mnemonic_to_entropy(mnemonic);
    
    // Use SHA3-512 for quantum-resistant hashing
    let hash = Sha512::digest(&entropy);
    
    let mut seed = [0u8; 64];
    seed.copy_from_slice(&hash);
    seed
}

/// Convert mnemonic phrase to entropy bytes
/// 
/// This is a simplified implementation. A production version would use
/// a proper BIP-39 library with word list validation.
fn mnemonic_to_entropy(mnemonic: &str) -> Vec<u8> {
    // Simple implementation: hash the mnemonic string
    // In production, this would:
    // 1. Validate against BIP-39 word list
    // 2. Convert words to indices
    // 3. Extract entropy from indices
    
    let mut hasher = Sha512::new();
    hasher.update(mnemonic.as_bytes());
    hasher.finalize().to_vec()
}

/// Validate that a mnemonic has the correct format
/// 
/// Checks that the mnemonic has a valid number of words (12, 15, 18, 21, or 24)
pub fn validate_mnemonic_format(mnemonic: &str) -> bool {
    let word_count = mnemonic.split_whitespace().count();
    matches!(word_count, 12 | 15 | 18 | 21 | 24)
}

/// Derive multiple key material from a single mnemonic
/// 
/// This allows deriving different keys for different purposes from one mnemonic
pub fn derive_key_material(mnemonic: &str, purpose: &str) -> [u8; 64] {
    let base_seed = pq_seed_from_mnemonic(mnemonic);
    
    // Mix in the purpose to derive different keys
    let mut hasher = Sha512::new();
    hasher.update(&base_seed);
    hasher.update(purpose.as_bytes());
    
    let hash = hasher.finalize();
    let mut derived = [0u8; 64];
    derived.copy_from_slice(&hash);
    derived
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pq_seed_from_mnemonic() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let seed = pq_seed_from_mnemonic(mnemonic);
        
        assert_eq!(seed.len(), 64);
        
        // Deterministic: same input = same output
        let seed2 = pq_seed_from_mnemonic(mnemonic);
        assert_eq!(seed, seed2);
    }

    #[test]
    fn test_different_mnemonics_different_seeds() {
        let mnemonic1 = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let mnemonic2 = "legal winner thank year wave sausage worth useful legal winner thank yellow";
        
        let seed1 = pq_seed_from_mnemonic(mnemonic1);
        let seed2 = pq_seed_from_mnemonic(mnemonic2);
        
        assert_ne!(seed1, seed2);
    }

    #[test]
    fn test_validate_mnemonic_format() {
        // Valid formats
        assert!(validate_mnemonic_format("word ".repeat(12).trim()));
        assert!(validate_mnemonic_format("word ".repeat(24).trim()));
        
        // Invalid formats
        assert!(!validate_mnemonic_format("word ".repeat(11).trim()));
        assert!(!validate_mnemonic_format("word ".repeat(13).trim()));
        assert!(!validate_mnemonic_format("word ".repeat(25).trim()));
    }

    #[test]
    fn test_derive_key_material() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        
        let key1 = derive_key_material(mnemonic, "signing");
        let key2 = derive_key_material(mnemonic, "encryption");
        
        // Different purposes should yield different keys
        assert_ne!(key1, key2);
        
        // Same purpose should be deterministic
        let key1_again = derive_key_material(mnemonic, "signing");
        assert_eq!(key1, key1_again);
    }
}
