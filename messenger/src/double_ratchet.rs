// double_ratchet.rs - Simplified Double Ratchet Protocol
//
// Placeholder implementation for post-quantum integration

use hkdf::Hkdf;
use sha2::Sha256;
use aes_gcm::{Aes256Gcm, Key, Nonce, KeyInit};
use aes_gcm::aead::Aead;
use rand::{thread_rng, RngCore};
use crate::{MessengerError, MessengerResult, kyber_upgrade::PqHandshake};
use serde::{Deserialize, Serialize};

/// Double Ratchet state for a messaging session (simplified)
#[derive(Debug, Clone)]
pub struct DoubleRatchet {
    /// Root key for deriving new chain keys
    root_key: [u8; 32],
    /// Current sending chain key
    sending_chain_key: Option<[u8; 32]>,
    /// Current receiving chain key
    receiving_chain_key: Option<[u8; 32]>,
    /// Number of messages sent in current sending chain
    sending_chain_length: u32,
    /// Number of messages received in current receiving chain
    receiving_chain_length: u32,
    /// Post-quantum handshake component
    pq_handshake: Option<PqHandshake>,
    /// Whether PQ upgrade has been completed
    pq_upgraded: bool,
}

/// Encrypted message structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatchetMessage {
    /// Encrypted message content
    pub ciphertext: Vec<u8>,
    /// Message number in current chain
    pub message_number: u32,
    /// Previous chain length
    pub previous_chain_length: u32,
}

impl DoubleRatchet {
    /// Initialize Double Ratchet with shared key from initial handshake
    pub fn new(initial_shared_key: &[u8]) -> MessengerResult<Self> {
        let root_key = Self::derive_root_key(initial_shared_key)?;
        
        Ok(Self {
            root_key,
            sending_chain_key: None,
            receiving_chain_key: None,
            sending_chain_length: 0,
            receiving_chain_length: 0,
            pq_handshake: None,
            pq_upgraded: false,
        })
    }

    /// Initialize as Bob (receiver)
    pub fn new_bob(initial_shared_key: &[u8], _alice_ratchet_key: &[u8]) -> MessengerResult<Self> {
        let mut ratchet = Self::new(initial_shared_key)?;
        
        // Initialize receiving chain
        ratchet.receiving_chain_key = Some(ratchet.derive_chain_key(&ratchet.root_key, b"receiving")?);
        
        Ok(ratchet)
    }

    /// Initialize as Alice (sender)
    pub fn new_alice(initial_shared_key: &[u8]) -> MessengerResult<Self> {
        let mut ratchet = Self::new(initial_shared_key)?;
        
        // Initialize sending chain
        ratchet.sending_chain_key = Some(ratchet.derive_chain_key(&ratchet.root_key, b"sending")?);
        
        Ok(ratchet)
    }

    /// Inject post-quantum shared secret into the ratchet state
    pub fn inject_pq_secret(&mut self, pq_shared_secret: &[u8]) -> MessengerResult<()> {
        // Mix PQ secret into root key using HKDF
        let hkdf = Hkdf::<Sha256>::new(Some(&self.root_key), pq_shared_secret);
        let mut new_root_key = [0u8; 32];
        hkdf.expand(b"pq_upgraded_root", &mut new_root_key)
            .map_err(|_| MessengerError::KeyGenerationFailed("Failed to expand PQ root key".to_string()))?;
        
        self.root_key = new_root_key;
        self.pq_upgraded = true;
        
        // Re-derive chain keys with new root key
        if self.sending_chain_key.is_some() {
            self.sending_chain_key = Some(self.derive_chain_key(&self.root_key, b"sending")?);
        }
        if self.receiving_chain_key.is_some() {
            self.receiving_chain_key = Some(self.derive_chain_key(&self.root_key, b"receiving")?);
        }
        
        Ok(())
    }

    /// Encrypt a message using the Double Ratchet protocol
    pub fn encrypt(&mut self, plaintext: &[u8]) -> MessengerResult<RatchetMessage> {
        // Ensure we have a sending chain key
        if self.sending_chain_key.is_none() {
            self.sending_chain_key = Some(self.derive_chain_key(&self.root_key, b"sending")?);
        }

        // Get current message key
        let (message_key, new_chain_key) = self.derive_message_key(
            &self.sending_chain_key.ok_or_else(|| 
                MessengerError::EncryptionFailed("No sending chain key".to_string()))?
        )?;

        // Update sending chain
        self.sending_chain_key = Some(new_chain_key);
        let message_number = self.sending_chain_length;
        self.sending_chain_length += 1;

        // Encrypt the message
        let ciphertext = self.encrypt_with_key(&message_key, plaintext)?;

        Ok(RatchetMessage {
            ciphertext,
            message_number,
            previous_chain_length: 0, // Simplified
        })
    }

    /// Decrypt a message using the Double Ratchet protocol
    pub fn decrypt(&mut self, message: &RatchetMessage) -> MessengerResult<Vec<u8>> {
        // Ensure we have a receiving chain key
        if self.receiving_chain_key.is_none() {
            self.receiving_chain_key = Some(self.derive_chain_key(&self.root_key, b"receiving")?);
        }

        // Get message key
        let (message_key, new_chain_key) = self.derive_message_key(
            &self.receiving_chain_key.ok_or_else(|| 
                MessengerError::DecryptionFailed("No receiving chain key".to_string()))?
        )?;

        // Update receiving chain
        self.receiving_chain_key = Some(new_chain_key);
        self.receiving_chain_length += 1;

        // Decrypt the message
        self.decrypt_with_key(&message_key, &message.ciphertext)
    }

    /// Derive root key from initial shared secret
    fn derive_root_key(shared_secret: &[u8]) -> MessengerResult<[u8; 32]> {
        let hkdf = Hkdf::<Sha256>::new(None, shared_secret);
        let mut root_key = [0u8; 32];
        hkdf.expand(b"root_key", &mut root_key)
            .map_err(|_| MessengerError::KeyGenerationFailed("Failed to derive root key".to_string()))?;
        Ok(root_key)
    }

    /// Derive chain key from root key
    fn derive_chain_key(&self, root_key: &[u8; 32], info: &[u8]) -> MessengerResult<[u8; 32]> {
        let hkdf = Hkdf::<Sha256>::new(Some(root_key), &[]);
        let mut chain_key = [0u8; 32];
        hkdf.expand(info, &mut chain_key)
            .map_err(|_| MessengerError::KeyGenerationFailed("Failed to derive chain key".to_string()))?;
        Ok(chain_key)
    }

    /// Derive message key from chain key
    fn derive_message_key(&self, chain_key: &[u8; 32]) -> MessengerResult<([u8; 32], [u8; 32])> {
        let hkdf = Hkdf::<Sha256>::new(Some(chain_key), &[]);
        let mut output = [0u8; 64];
        hkdf.expand(b"message_keys", &mut output)
            .map_err(|_| MessengerError::KeyGenerationFailed("Failed to derive message key".to_string()))?;

        let mut message_key = [0u8; 32];
        let mut new_chain_key = [0u8; 32];
        message_key.copy_from_slice(&output[0..32]);
        new_chain_key.copy_from_slice(&output[32..64]);

        Ok((message_key, new_chain_key))
    }

    /// Encrypt with AES-GCM using message key
    fn encrypt_with_key(&self, key: &[u8; 32], plaintext: &[u8]) -> MessengerResult<Vec<u8>> {
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
        
        let mut nonce_bytes = [0u8; 12];
        thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let mut ciphertext = cipher.encrypt(nonce, plaintext)
            .map_err(|_| MessengerError::EncryptionFailed("AES-GCM encryption failed".to_string()))?;

        // Prepend nonce to ciphertext
        let mut result = nonce_bytes.to_vec();
        result.append(&mut ciphertext);

        Ok(result)
    }

    /// Decrypt with AES-GCM using message key
    fn decrypt_with_key(&self, key: &[u8; 32], ciphertext_with_nonce: &[u8]) -> MessengerResult<Vec<u8>> {
        if ciphertext_with_nonce.len() < 12 {
            return Err(MessengerError::DecryptionFailed("Ciphertext too short".to_string()));
        }

        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
        let nonce = Nonce::from_slice(&ciphertext_with_nonce[0..12]);
        let ciphertext = &ciphertext_with_nonce[12..];

        cipher.decrypt(nonce, ciphertext)
            .map_err(|_| MessengerError::DecryptionFailed("AES-GCM decryption failed".to_string()))
    }

    /// Check if PQ upgrade has been completed
    pub fn is_pq_upgraded(&self) -> bool {
        self.pq_upgraded
    }

    /// Get our current ratchet public key for sharing (placeholder)
    pub fn get_our_ratchet_public_key(&self) -> Option<Vec<u8>> {
        Some(vec![0u8; 32]) // Placeholder
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alice_bob_exchange() {
        let initial_shared_key = b"test_shared_key_32_bytes_long!!!";
        
        // Create Alice and Bob with same initial state
        let mut alice = DoubleRatchet::new(initial_shared_key).unwrap();
        let mut bob = DoubleRatchet::new(initial_shared_key).unwrap();
        
        // Manually initialize them both to use same chain for this test
        alice.sending_chain_key = Some(alice.derive_chain_key(&alice.root_key, b"test_chain").unwrap());
        bob.receiving_chain_key = Some(bob.derive_chain_key(&bob.root_key, b"test_chain").unwrap());
        
        // Alice sends message to Bob
        let message = b"Hello Bob!";
        let encrypted = alice.encrypt(message).unwrap();
        let decrypted = bob.decrypt(&encrypted).unwrap();
        
        assert_eq!(message, decrypted.as_slice());
    }

    #[test]
    fn test_pq_secret_injection() {
        let initial_shared_key = b"test_shared_key_32_bytes_long!!!";
        let mut ratchet = DoubleRatchet::new(initial_shared_key).unwrap();
        
        assert!(!ratchet.is_pq_upgraded());
        
        let pq_secret = b"post_quantum_secret_key_32_bytes";
        ratchet.inject_pq_secret(pq_secret).unwrap();
        
        assert!(ratchet.is_pq_upgraded());
    }
}