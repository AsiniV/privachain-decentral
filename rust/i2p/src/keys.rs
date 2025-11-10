//! I2P key management and destination handling

use crate::error::{I2pError, I2pResult};
use base32;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::fs;

/// I2P destination (base32 address)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct I2pDestination {
    /// Base32-encoded destination
    pub address: String,
}

impl I2pDestination {
    /// Create from base32 address
    pub fn from_base32(address: String) -> I2pResult<Self> {
        if !address.ends_with(".b32.i2p") && !is_valid_base32(&address) {
            return Err(I2pError::KeyError("Invalid I2P destination format".to_string()));
        }
        Ok(Self { address })
    }

    /// Get full .b32.i2p address
    pub fn to_base32_address(&self) -> String {
        if self.address.ends_with(".b32.i2p") {
            self.address.clone()
        } else {
            format!("{}.b32.i2p", self.address)
        }
    }
}

/// I2P key pair
#[derive(Debug, Clone)]
pub struct I2pKeyPair {
    /// Private key data
    private_key: Vec<u8>,
    /// Public key / destination
    pub destination: I2pDestination,
}

impl I2pKeyPair {
    /// Generate new key pair
    pub fn generate() -> I2pResult<Self> {
        // In a real implementation, this would use I2P's crypto
        // For now, generate a deterministic key based on random data
        let random_data = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| I2pError::KeyError(format!("Time error: {}", e)))?
            .as_nanos()
            .to_le_bytes();

        let mut hasher = Sha256::new();
        hasher.update(&random_data);
        let private_key = hasher.finalize().to_vec();

        // Derive destination from private key
        let mut hasher = Sha256::new();
        hasher.update(&private_key);
        let dest_hash = hasher.finalize();
        
        let base32_str = base32::encode(base32::Alphabet::Rfc4648 { padding: false }, &dest_hash[..16]);
        let destination = I2pDestination::from_base32(base32_str)?;

        Ok(Self {
            private_key,
            destination,
        })
    }

    /// Load from file
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> I2pResult<Self> {
        let data = fs::read(path.as_ref())
            .map_err(|e| I2pError::KeyError(format!("Failed to read key file: {}", e)))?;
        
        if data.len() < 32 {
            return Err(I2pError::KeyError("Invalid key file format".to_string()));
        }

        let private_key = data[..32].to_vec();
        
        // Derive destination from private key
        let mut hasher = Sha256::new();
        hasher.update(&private_key);
        let dest_hash = hasher.finalize();
        
        let base32_str = base32::encode(base32::Alphabet::Rfc4648 { padding: false }, &dest_hash[..16]);
        let destination = I2pDestination::from_base32(base32_str)?;

        Ok(Self {
            private_key,
            destination,
        })
    }

    /// Save to file
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> I2pResult<()> {
        // Create parent directory if it doesn't exist
        if let Some(parent) = path.as_ref().parent() {
            fs::create_dir_all(parent)
                .map_err(|e| I2pError::KeyError(format!("Failed to create directory: {}", e)))?;
        }

        fs::write(path.as_ref(), &self.private_key)
            .map_err(|e| I2pError::KeyError(format!("Failed to write key file: {}", e)))?;
        
        Ok(())
    }

    /// Get default key file path
    pub fn default_key_path() -> PathBuf {
        let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push("privachain");
        path.push("i2p");
        path.push("priv_key.dat");
        path
    }
}

/// Check if string is valid base32
fn is_valid_base32(s: &str) -> bool {
    s.chars().all(|c| {
        c.is_ascii_uppercase() || c.is_ascii_digit() || c == '='
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_destination_creation() {
        let dest = I2pDestination::from_base32("ABCDEFGHIJKLMNOP".to_string()).unwrap();
        assert_eq!(dest.to_base32_address(), "ABCDEFGHIJKLMNOP.b32.i2p");
    }

    #[test]
    fn test_destination_with_suffix() {
        let dest = I2pDestination::from_base32("ABCDEFGHIJKLMNOP.b32.i2p".to_string()).unwrap();
        assert_eq!(dest.to_base32_address(), "ABCDEFGHIJKLMNOP.b32.i2p");
    }

    #[test]
    fn test_keypair_generation() {
        let keypair = I2pKeyPair::generate().unwrap();
        assert!(!keypair.private_key.is_empty());
        assert!(!keypair.destination.address.is_empty());
    }

    #[test]
    fn test_base32_validation() {
        assert!(is_valid_base32("ABCDEFGHIJKLMNOP"));
        assert!(is_valid_base32("ABCD1234"));
        assert!(!is_valid_base32("abcd")); // lowercase not valid
        assert!(!is_valid_base32("ABC@DEF")); // special chars not valid
    }
}
