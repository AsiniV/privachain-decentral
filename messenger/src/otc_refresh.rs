// otc_refresh.rs - Code refresh functionality after use
//
// Provides secure code refresh that burns old codes and generates new ones

use crate::{MessengerError, MessengerResult, local_vault, otc_generator};
use rand::{RngCore, rngs::OsRng};

/// Refresh OTC codes by burning old pair and generating new ones
pub fn refresh_codes() -> MessengerResult<(String, String)> {
    // First, burn the old codes for security
    burn_old_codes()?;
    
    // Generate new OTC pair
    let (new_otc1, new_otc2) = otc_generator::generate_otc_pair()?;
    
    // Save the new pair
    local_vault::save_otc_pair(&new_otc1, &new_otc2)?;
    
    Ok((new_otc1, new_otc2))
}

/// Burn old codes by overwriting with random data
fn burn_old_codes() -> MessengerResult<()> {
    // Try to burn old codes if they exist
    match local_vault::burn_otc_pair() {
        Ok(()) => Ok(()),
        Err(_) => {
            // If burning fails (e.g., no existing codes), continue anyway
            Ok(())
        }
    }
}

/// Refresh codes after successful recovery
pub fn refresh_after_recovery(used_code: &str) -> MessengerResult<(String, String)> {
    // Validate that the used code is a valid BIP-39 mnemonic
    if !otc_generator::validate_otc_code(used_code) {
        return Err(MessengerError::InvalidInput("Invalid recovery code".to_string()));
    }
    
    // Burn the old codes
    burn_old_codes()?;
    
    // Generate new codes
    let (new_otc1, new_otc2) = otc_generator::generate_otc_pair()?;
    
    // Save new codes
    local_vault::save_otc_pair(&new_otc1, &new_otc2)?;
    
    // Return new codes for display
    Ok((new_otc1, new_otc2))
}

/// Secure overwrite of old data in memory
pub fn secure_overwrite(data: &mut [u8]) {
    let mut rng = OsRng;
    
    // First pass: random data
    rng.fill_bytes(data);
    
    // Second pass: zeros
    data.fill(0);
    
    // Third pass: ones
    data.fill(0xFF);
    
    // Final pass: random again
    rng.fill_bytes(data);
}

/// Check if codes need refresh (after recovery)
pub fn should_refresh_codes() -> bool {
    // In a real implementation, this would check if a recovery was recently performed
    // For now, we'll return false to avoid automatic refreshes
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn cleanup_test_db() {
        let _ = fs::remove_file("test_vault.db");
    }

    #[test]
    fn test_refresh_codes() {
        cleanup_test_db();
        
        // First generate some initial codes
        let (initial_otc1, initial_otc2) = otc_generator::generate_otc_pair().unwrap();
        local_vault::save_otc_pair(&initial_otc1, &initial_otc2).unwrap();
        
        // Refresh the codes
        let result = refresh_codes();
        assert!(result.is_ok());
        
        let (new_otc1, new_otc2) = result.unwrap();
        
        // New codes should be different from initial ones
        assert_ne!(initial_otc1, new_otc1);
        assert_ne!(initial_otc2, new_otc2);
        
        // Both codes should be valid
        assert!(otc_generator::validate_otc_code(&new_otc1));
        assert!(otc_generator::validate_otc_code(&new_otc2));
        
        cleanup_test_db();
    }

    #[test]
    fn test_refresh_after_recovery() {
        cleanup_test_db();
        
        let valid_code = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        
        let result = refresh_after_recovery(valid_code);
        assert!(result.is_ok());
        
        let (new_otc1, new_otc2) = result.unwrap();
        assert!(otc_generator::validate_otc_code(&new_otc1));
        assert!(otc_generator::validate_otc_code(&new_otc2));
        
        cleanup_test_db();
    }

    #[test]
    fn test_refresh_after_recovery_invalid_code() {
        let invalid_code = "invalid code";
        
        let result = refresh_after_recovery(invalid_code);
        assert!(result.is_err());
    }

    #[test]
    fn test_secure_overwrite() {
        let mut test_data = vec![0x42u8; 32];
        let original = test_data.clone();
        
        secure_overwrite(&mut test_data);
        
        // Data should be different after overwrite
        assert_ne!(test_data, original);
        
        // Should not be all the same value
        let first_byte = test_data[0];
        let all_same = test_data.iter().all(|&b| b == first_byte);
        assert!(!all_same);
    }

    #[test]
    fn test_burn_old_codes_no_existing() {
        cleanup_test_db();
        
        // Should not fail even if no codes exist
        let result = burn_old_codes();
        assert!(result.is_ok());
        
        cleanup_test_db();
    }
}