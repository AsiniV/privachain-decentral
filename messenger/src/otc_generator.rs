// otc_generator.rs - OTC (One-Time Code) Generation using BIP-39
//
// Generates pairs of 12-word mnemonic codes for premium restoration

use crate::{MessengerError, MessengerResult};
use bip39::{Mnemonic, Language};
use rand::{Rng, rngs::OsRng};

/// Generate a pair of OTC codes using BIP-39 standard
pub fn generate_otc_pair() -> MessengerResult<(String, String)> {
    let mut rng = OsRng;
    
    // Generate 16 bytes (128 bits) of entropy for each mnemonic (12 words)
    let mut entropy1 = [0u8; 16];
    let mut entropy2 = [0u8; 16];
    rng.fill(&mut entropy1);
    rng.fill(&mut entropy2);
    
    let otc1 = Mnemonic::from_entropy_in(Language::English, &entropy1)
        .map_err(|e| MessengerError::CryptoError(format!("Failed to generate first OTC: {e}")))?;
    
    let otc2 = Mnemonic::from_entropy_in(Language::English, &entropy2)
        .map_err(|e| MessengerError::CryptoError(format!("Failed to generate second OTC: {e}")))?;
    
    Ok((otc1.to_string(), otc2.to_string()))
}

/// Validate that a given string is a valid BIP-39 mnemonic
pub fn validate_otc_code(code: &str) -> bool {
    Mnemonic::parse_in_normalized(Language::English, code).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_otc_pair() {
        let result = generate_otc_pair();
        assert!(result.is_ok());
        
        let (otc1, otc2) = result.unwrap();
        
        // Both codes should be valid BIP-39 mnemonics
        assert!(validate_otc_code(&otc1));
        assert!(validate_otc_code(&otc2));
        
        // Codes should be different
        assert_ne!(otc1, otc2);
        
        // Each code should have 12 words
        assert_eq!(otc1.split_whitespace().count(), 12);
        assert_eq!(otc2.split_whitespace().count(), 12);
    }

    #[test]
    fn test_validate_otc_code() {
        // Valid 12-word mnemonic
        let valid_code = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        assert!(validate_otc_code(valid_code));
        
        // Invalid code
        let invalid_code = "invalid code test";
        assert!(!validate_otc_code(invalid_code));
        
        // Empty code
        assert!(!validate_otc_code(""));
    }

    #[test]
    fn test_multiple_generations_are_different() {
        let (otc1_a, otc2_a) = generate_otc_pair().unwrap();
        let (otc1_b, otc2_b) = generate_otc_pair().unwrap();
        
        // Different generations should produce different codes
        assert_ne!(otc1_a, otc1_b);
        assert_ne!(otc2_a, otc2_b);
        assert_ne!(otc1_a, otc2_a);
        assert_ne!(otc1_b, otc2_b);
    }
}