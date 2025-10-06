// local_vault.rs - Local Encrypted Database for OTC Storage
//
// Stores OTC pairs in a SQLite database with encryption layer

use crate::{MessengerError, MessengerResult};
use rusqlite::{Connection, params};
use sha2::{Sha256, Digest};
use rand::{RngCore, rngs::OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};

/// Get device-specific encryption key for the vault
fn device_key() -> [u8; 32] {
    // In production, this would derive from device-specific entropy
    // For now, use a deterministic key based on system info
    let mut hasher = Sha256::new();
    hasher.update(b"privachain_vault_key");
    
    // Add some system-specific entropy if available
    if let Ok(hostname) = std::env::var("HOSTNAME") {
        hasher.update(hostname.as_bytes());
    }
    
    let result = hasher.finalize();
    result.into()
}

/// Encrypt data using AES-256-GCM
fn encrypt_data(data: &str) -> MessengerResult<String> {
    let device_key_bytes = device_key();
    let key = Key::<Aes256Gcm>::from_slice(&device_key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, data.as_bytes())
        .map_err(|_| MessengerError::CryptoError("Encryption failed".to_string()))?;
    
    // Combine nonce and ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&ciphertext);
    
    Ok(hex::encode(result))
}

/// Decrypt data using AES-256-GCM
fn decrypt_data(encrypted_hex: &str) -> MessengerResult<String> {
    let encrypted_data = hex::decode(encrypted_hex)
        .map_err(|_| MessengerError::CryptoError("Invalid hex data".to_string()))?;
    
    if encrypted_data.len() < 12 {
        return Err(MessengerError::CryptoError("Invalid encrypted data".to_string()));
    }
    
    let device_key_bytes = device_key();
    let key = Key::<Aes256Gcm>::from_slice(&device_key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    let nonce = Nonce::from_slice(&encrypted_data[0..12]);
    let ciphertext = &encrypted_data[12..];
    
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|_| MessengerError::CryptoError("Decryption failed".to_string()))?;
    
    String::from_utf8(plaintext)
        .map_err(|_| MessengerError::CryptoError("Invalid UTF-8".to_string()))
}

/// Initialize the vault database
pub fn initialize_vault() -> MessengerResult<Connection> {
    let conn = Connection::open("vault.db")
        .map_err(|e| MessengerError::CryptoError(format!("Failed to open vault: {}", e)))?;
    
    // Create OTC table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS otc (
            id INTEGER PRIMARY KEY,
            code1 TEXT NOT NULL,
            code2 TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            used_at INTEGER
        )",
        [],
    ).map_err(|e| MessengerError::CryptoError(format!("Failed to create table: {}", e)))?;
    
    Ok(conn)
}

/// Save OTC pair to encrypted local database
pub fn save_otc_pair(otc1: &str, otc2: &str) -> MessengerResult<()> {
    let conn = initialize_vault()?;
    
    let now = chrono::Utc::now().timestamp();
    let encrypted_otc1 = encrypt_data(otc1)?;
    let encrypted_otc2 = encrypt_data(otc2)?;
    
    conn.execute(
        "INSERT OR REPLACE INTO otc (id, code1, code2, created_at) VALUES (1, ?, ?, ?)",
        params![encrypted_otc1, encrypted_otc2, now],
    ).map_err(|e| MessengerError::CryptoError(format!("Failed to save OTC pair: {}", e)))?;
    
    Ok(())
}

/// Load current OTC pair from encrypted database
pub fn load_otc_pair() -> MessengerResult<(String, String)> {
    let conn = initialize_vault()?;
    
    let mut stmt = conn.prepare("SELECT code1, code2 FROM otc WHERE id = 1")
        .map_err(|e| MessengerError::CryptoError(format!("Failed to prepare statement: {}", e)))?;
    
    let mut rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
        ))
    }).map_err(|e| MessengerError::CryptoError(format!("Failed to query OTC pair: {}", e)))?;
    
    if let Some(row) = rows.next() {
        let (encrypted_code1, encrypted_code2) = row.map_err(|e| MessengerError::CryptoError(format!("Failed to read row: {}", e)))?;
        
        let code1 = decrypt_data(&encrypted_code1)?;
        let code2 = decrypt_data(&encrypted_code2)?;
        
        Ok((code1, code2))
    } else {
        Err(MessengerError::CryptoError("No OTC pair found".to_string()))
    }
}

/// Mark OTC pair as used and burn the old codes
pub fn burn_otc_pair() -> MessengerResult<()> {
    let conn = initialize_vault()?;
    
    // Generate random data to overwrite old codes
    let mut rng = OsRng;
    let mut burn_data1 = vec![0u8; 32];
    let mut burn_data2 = vec![0u8; 32];
    rng.fill_bytes(&mut burn_data1);
    rng.fill_bytes(&mut burn_data2);
    
    let burn_str1 = hex::encode(burn_data1);
    let burn_str2 = hex::encode(burn_data2);
    let now = chrono::Utc::now().timestamp();
    
    // Encrypt the burn data
    let encrypted_burn1 = encrypt_data(&burn_str1)?;
    let encrypted_burn2 = encrypt_data(&burn_str2)?;
    
    conn.execute(
        "UPDATE otc SET code1 = ?, code2 = ?, used_at = ? WHERE id = 1",
        params![encrypted_burn1, encrypted_burn2, now],
    ).map_err(|e| MessengerError::CryptoError(format!("Failed to burn OTC pair: {}", e)))?;
    
    Ok(())
}

/// Check if OTC pair exists in vault
pub fn has_otc_pair() -> bool {
    load_otc_pair().is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::otc_generator::generate_otc_pair;
    use tempfile::tempdir;

    #[test]
    fn test_vault_initialization() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test_vault.db");
        
        let result = initialize_vault_test(&db_path);
        assert!(result.is_ok());
    }

    fn initialize_vault_test(db_path: &std::path::Path) -> MessengerResult<Connection> {
        let conn = Connection::open(db_path)
            .map_err(|e| MessengerError::CryptoError(format!("Failed to open vault: {}", e)))?;
        
        // Create OTC table if it doesn't exist
        conn.execute(
            "CREATE TABLE IF NOT EXISTS otc (
                id INTEGER PRIMARY KEY,
                code1 TEXT NOT NULL,
                code2 TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                used_at INTEGER
            )",
            [],
        ).map_err(|e| MessengerError::CryptoError(format!("Failed to create table: {}", e)))?;
        
        Ok(conn)
    }

    fn save_otc_pair_test(db_path: &std::path::Path, otc1: &str, otc2: &str) -> MessengerResult<()> {
        let conn = initialize_vault_test(db_path)?;
        
        let now = chrono::Utc::now().timestamp();
        let encrypted_otc1 = encrypt_data(otc1)?;
        let encrypted_otc2 = encrypt_data(otc2)?;
        
        conn.execute(
            "INSERT OR REPLACE INTO otc (id, code1, code2, created_at) VALUES (1, ?, ?, ?)",
            params![encrypted_otc1, encrypted_otc2, now],
        ).map_err(|e| MessengerError::CryptoError(format!("Failed to save OTC pair: {}", e)))?;
        
        Ok(())
    }

    fn load_otc_pair_test(db_path: &std::path::Path) -> MessengerResult<(String, String)> {
        let conn = initialize_vault_test(db_path)?;
        
        let mut stmt = conn.prepare("SELECT code1, code2 FROM otc WHERE id = 1")
            .map_err(|e| MessengerError::CryptoError(format!("Failed to prepare statement: {}", e)))?;
        
        let mut rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
            ))
        }).map_err(|e| MessengerError::CryptoError(format!("Failed to query OTC pair: {}", e)))?;
        
        if let Some(row) = rows.next() {
            let (encrypted_code1, encrypted_code2) = row.map_err(|e| MessengerError::CryptoError(format!("Failed to read row: {}", e)))?;
            
            let code1 = decrypt_data(&encrypted_code1)?;
            let code2 = decrypt_data(&encrypted_code2)?;
            
            Ok((code1, code2))
        } else {
            Err(MessengerError::CryptoError("No OTC pair found".to_string()))
        }
    }

    fn burn_otc_pair_test(db_path: &std::path::Path) -> MessengerResult<()> {
        let conn = initialize_vault_test(db_path)?;
        
        // Generate random data to overwrite old codes
        let mut rng = OsRng;
        let mut burn_data1 = vec![0u8; 32];
        let mut burn_data2 = vec![0u8; 32];
        rng.fill_bytes(&mut burn_data1);
        rng.fill_bytes(&mut burn_data2);
        
        let burn_str1 = hex::encode(burn_data1);
        let burn_str2 = hex::encode(burn_data2);
        let now = chrono::Utc::now().timestamp();
        
        // Encrypt the burn data
        let encrypted_burn1 = encrypt_data(&burn_str1)?;
        let encrypted_burn2 = encrypt_data(&burn_str2)?;
        
        conn.execute(
            "UPDATE otc SET code1 = ?, code2 = ?, used_at = ? WHERE id = 1",
            params![encrypted_burn1, encrypted_burn2, now],
        ).map_err(|e| MessengerError::CryptoError(format!("Failed to burn OTC pair: {}", e)))?;
        
        Ok(())
    }

    fn has_otc_pair_test(db_path: &std::path::Path) -> bool {
        load_otc_pair_test(db_path).is_ok()
    }

    #[test]
    fn test_encrypt_decrypt_data() {
        let original = "test data for encryption";
        let encrypted = encrypt_data(original).unwrap();
        let decrypted = decrypt_data(&encrypted).unwrap();
        
        assert_eq!(original, decrypted);
        assert_ne!(original, encrypted);
    }

    #[test]
    fn test_save_and_load_otc_pair() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test_vault.db");
        
        let (otc1, otc2) = generate_otc_pair().unwrap();
        
        // Save the pair
        let save_result = save_otc_pair_test(&db_path, &otc1, &otc2);
        assert!(save_result.is_ok());
        
        // Load the pair back
        let load_result = load_otc_pair_test(&db_path);
        assert!(load_result.is_ok());
        
        let (loaded_otc1, loaded_otc2) = load_result.unwrap();
        assert_eq!(otc1, loaded_otc1);
        assert_eq!(otc2, loaded_otc2);
    }

    #[test]
    fn test_has_otc_pair() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test_vault.db");
        
        // Should return false when no pair exists
        assert!(!has_otc_pair_test(&db_path));
        
        // Save a pair
        let (otc1, otc2) = generate_otc_pair().unwrap();
        save_otc_pair_test(&db_path, &otc1, &otc2).unwrap();
        
        // Should return true when pair exists
        assert!(has_otc_pair_test(&db_path));
    }

    #[test]
    fn test_burn_otc_pair() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test_vault.db");
        
        let (otc1, otc2) = generate_otc_pair().unwrap();
        save_otc_pair_test(&db_path, &otc1, &otc2).unwrap();
        
        // Burn the pair
        let burn_result = burn_otc_pair_test(&db_path);
        assert!(burn_result.is_ok());
        
        // Load the pair - should be different (burned)
        let (burned_otc1, burned_otc2) = load_otc_pair_test(&db_path).unwrap();
        assert_ne!(otc1, burned_otc1);
        assert_ne!(otc2, burned_otc2);
    }

    #[test]
    fn test_device_key_consistency() {
        let key1 = device_key();
        let key2 = device_key();
        
        // Device key should be consistent across calls
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
    }
}