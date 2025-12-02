//! ECH Key Generator CLI
//!
//! Generates ECH (Encrypted Client Hello) configurations for use with
//! QUIC+ECH transport. The generated config can be published to IPFS
//! and referenced via IPNS for automatic key rotation.
//!
//! # Usage
//! ```bash
//! cargo run --bin ech-keygen --features quic-ech > ech-config.bin
//! ```
//!
//! # Output Format
//! The output is a binary ECHConfigList that can be directly used
//! by clients for TLS ECH encryption.

use std::io::Write;

/// ECH configuration version (draft-ietf-tls-esni-18)
const ECH_VERSION: u16 = 0xfe0d;

/// Default public name for the outer ClientHello
const DEFAULT_PUBLIC_NAME: &str = "cloudflare-ech.com";

/// Generate a new X25519 key pair for ECH using proper cryptographic implementation
fn generate_x25519_keypair() -> ([u8; 32], [u8; 32]) {
    use rand::RngCore;
    use x25519_dalek::{StaticSecret, PublicKey};
    
    // Generate random bytes for the private key
    let mut private_key_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut private_key_bytes);
    
    // Create the secret key from random bytes (x25519-dalek handles clamping internally)
    let secret = StaticSecret::from(private_key_bytes);
    
    // Derive the public key from the secret key
    let public = PublicKey::from(&secret);
    
    // Return both keys as byte arrays
    (secret.to_bytes(), public.to_bytes())
}

/// Build an ECHConfigList structure
///
/// The format follows draft-ietf-tls-esni (ECH draft 18):
/// ```
/// ECHConfigList ::= SEQUENCE {
///     configs<1..2^16-1>  -- list of ECHConfig structures
/// }
/// ```
fn build_ech_config_list(public_key: &[u8; 32], public_name: &str) -> Vec<u8> {
    let mut config = Vec::new();
    
    // ECHConfig structure:
    // version (2 bytes)
    config.extend_from_slice(&ECH_VERSION.to_be_bytes());
    
    // length placeholder - we'll fill this in later
    let length_pos = config.len();
    config.extend_from_slice(&[0u8; 2]);
    
    // contents_start marks where we start counting length
    let contents_start = config.len();
    
    // config_id (1 byte) - randomly generated
    config.push(rand::random::<u8>());
    
    // kem_id (2 bytes) - 0x0020 = DHKEM(X25519, HKDF-SHA256)
    config.extend_from_slice(&0x0020u16.to_be_bytes());
    
    // public_key<0..2^16-1>
    config.extend_from_slice(&(public_key.len() as u16).to_be_bytes());
    config.extend_from_slice(public_key);
    
    // cipher_suites<4..2^16-1>
    // Each suite is 4 bytes: kdf_id (2) + aead_id (2)
    let suites: Vec<(u16, u16)> = vec![
        (0x0001, 0x0001), // HKDF-SHA256 + AES-128-GCM
        (0x0001, 0x0003), // HKDF-SHA256 + ChaCha20Poly1305
    ];
    
    config.extend_from_slice(&((suites.len() * 4) as u16).to_be_bytes());
    for (kdf_id, aead_id) in suites {
        config.extend_from_slice(&kdf_id.to_be_bytes());
        config.extend_from_slice(&aead_id.to_be_bytes());
    }
    
    // maximum_name_length (1 byte)
    config.push(64);
    
    // public_name<1..255>
    let public_name_bytes = public_name.as_bytes();
    config.push(public_name_bytes.len() as u8);
    config.extend_from_slice(public_name_bytes);
    
    // extensions<0..2^16-1> - empty for now
    config.extend_from_slice(&0u16.to_be_bytes());
    
    // Now fill in the length
    let contents_len = config.len() - contents_start;
    let len_bytes = (contents_len as u16).to_be_bytes();
    config[length_pos] = len_bytes[0];
    config[length_pos + 1] = len_bytes[1];
    
    // Wrap in ECHConfigList
    let mut config_list = Vec::new();
    config_list.extend_from_slice(&(config.len() as u16).to_be_bytes());
    config_list.extend_from_slice(&config);
    
    config_list
}

fn main() {
    // Generate new X25519 keypair
    let (private_key, public_key) = generate_x25519_keypair();
    
    // Get public name from env or use default
    let public_name = std::env::var("ECH_PUBLIC_NAME")
        .unwrap_or_else(|_| DEFAULT_PUBLIC_NAME.to_string());
    
    // Build ECHConfigList
    let config_list = build_ech_config_list(&public_key, &public_name);
    
    // Output binary config to stdout
    std::io::stdout().write_all(&config_list).unwrap();
    std::io::stdout().flush().unwrap();
    
    // Log info to stderr so it doesn't pollute the binary output
    eprintln!("ECH config generated successfully:");
    eprintln!("  Version: 0x{:04x}", ECH_VERSION);
    eprintln!("  Public name: {}", public_name);
    eprintln!("  Public key (hex): {}", hex::encode(public_key));
    eprintln!("  Config size: {} bytes", config_list.len());
    eprintln!();
    eprintln!("Private key (KEEP SECRET, hex): {}", hex::encode(private_key));
    eprintln!();
    eprintln!("To publish to IPFS:");
    eprintln!("  cargo run --bin ech-keygen --features quic-ech > ech-config.bin");
    eprintln!("  ipfs add -q ech-config.bin");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_keypair() {
        let (private_key, public_key) = generate_x25519_keypair();
        assert_eq!(private_key.len(), 32);
        assert_eq!(public_key.len(), 32);
        
        // Verify private and public keys are different (security check)
        assert_ne!(private_key, public_key, "Private and public keys must be different");
        
        // Verify keys are not all zeros
        assert!(private_key.iter().any(|&b| b != 0), "Private key should not be all zeros");
        assert!(public_key.iter().any(|&b| b != 0), "Public key should not be all zeros");
    }

    #[test]
    fn test_keypair_derivation_is_deterministic() {
        // For the same private key, we should get the same public key
        use x25519_dalek::{StaticSecret, PublicKey};
        
        let private_bytes = [42u8; 32];
        let secret1 = StaticSecret::from(private_bytes);
        let secret2 = StaticSecret::from(private_bytes);
        
        let public1 = PublicKey::from(&secret1);
        let public2 = PublicKey::from(&secret2);
        
        assert_eq!(public1.to_bytes(), public2.to_bytes());
    }

    #[test]
    fn test_build_ech_config_list() {
        let public_key = [0u8; 32];
        let config_list = build_ech_config_list(&public_key, "test.example.com");
        
        // Should have length prefix
        assert!(config_list.len() > 2);
        
        // First two bytes are the length
        let length = u16::from_be_bytes([config_list[0], config_list[1]]) as usize;
        assert_eq!(length, config_list.len() - 2);
        
        // Version should be ECH_VERSION
        let version = u16::from_be_bytes([config_list[2], config_list[3]]);
        assert_eq!(version, ECH_VERSION);
    }

    #[test]
    fn test_config_contains_public_name() {
        let public_key = [0u8; 32];
        let public_name = "test.example.com";
        let config_list = build_ech_config_list(&public_key, public_name);
        
        // Config should contain the public name as bytes
        assert!(config_list.windows(public_name.len())
            .any(|w| w == public_name.as_bytes()));
    }
}
