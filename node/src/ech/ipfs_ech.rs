//! IPFS-based ECH Configuration Distribution
//!
//! Provides functionality to fetch and distribute ECH configurations via IPFS.
//! This enables decentralized, censorship-resistant distribution of ECH configs.
//!
//! ECH configs can be published to IPFS and clients can fetch them using the CID.
//! For dynamic updates, IPNS can be used to provide a stable name that resolves
//! to the latest ECH config CID.
//!
//! ## IPNS-based Fetching (Recommended)
//!
//! The preferred method is to use IPNS which provides a stable key that always
//! points to the latest ECH configuration:
//!
//! ```ignore
//! use privachain_node::ech::fetch_ech_config_from_ipns;
//!
//! // The IPNS key never changes - it always resolves to the latest CID
//! let config = fetch_ech_config_from_ipns(
//!     "k51qzi5uqu5dgjso1xnb9go9e1h1v5t1h7m6x3z7rj6q4g3h2n1m8p9w0v2y3x4",
//!     None,
//! ).await?;
//! ```

use super::config::{EchConfiguration, EchSuite};
use std::time::Duration;

/// Result type for ECH config fetching operations
pub type EchConfigResult = Result<EchConfiguration, EchFetchError>;

/// Errors that can occur when fetching ECH configs from IPFS
#[derive(Debug, thiserror::Error)]
pub enum EchFetchError {
    /// Failed to connect to IPFS gateway
    #[error("Failed to connect to IPFS gateway: {0}")]
    GatewayError(String),
    
    /// Invalid CID format
    #[error("Invalid CID format: {0}")]
    InvalidCid(String),
    
    /// Invalid IPNS key format
    #[error("Invalid IPNS key format: {0}")]
    InvalidIpnsKey(String),
    
    /// Failed to parse ECH config
    #[error("Failed to parse ECH config: {0}")]
    ParseError(String),
    
    /// Request timeout
    #[error("Request timed out after {0:?}")]
    Timeout(Duration),
    
    /// Network error
    #[error("Network error: {0}")]
    NetworkError(String),
    
    /// IPNS resolution failed
    #[error("IPNS resolution failed: {0}")]
    IpnsResolutionError(String),
}

/// IPFS gateway configuration
#[derive(Debug, Clone)]
pub struct IpfsGatewayConfig {
    /// Gateway URL (e.g., "https://ipfs.io", "http://localhost:5001")
    pub gateway_url: String,
    /// Request timeout
    pub timeout: Duration,
}

impl Default for IpfsGatewayConfig {
    fn default() -> Self {
        Self {
            gateway_url: "http://127.0.0.1:5001".to_string(),
            timeout: Duration::from_secs(30),
        }
    }
}

impl IpfsGatewayConfig {
    /// Create configuration for a public gateway
    pub fn public_gateway(url: impl Into<String>) -> Self {
        Self {
            gateway_url: url.into(),
            timeout: Duration::from_secs(30),
        }
    }

    /// Create configuration for local IPFS daemon
    pub fn local() -> Self {
        Self::default()
    }
}

/// Fetch ECH configuration from IPFS by CID
///
/// # Arguments
/// * `cid` - The IPFS Content Identifier (CID) of the ECH config
/// * `gateway_config` - Optional gateway configuration (uses local gateway by default)
///
/// # Returns
/// The parsed ECH configuration, or an error if fetching failed
///
/// # Example
/// ```ignore
/// use privachain_node::ech::fetch_ech_config_from_ipfs;
///
/// let config = fetch_ech_config_from_ipfs(
///     "QmExampleCid123",
///     None,
/// ).await?;
/// ```
pub async fn fetch_ech_config_from_ipfs(
    cid: &str,
    gateway_config: Option<IpfsGatewayConfig>,
) -> EchConfigResult {
    // Validate CID format (basic check)
    if !is_valid_cid(cid) {
        return Err(EchFetchError::InvalidCid(cid.to_string()));
    }

    let config = gateway_config.unwrap_or_default();
    
    // Build the IPFS gateway URL
    let url = format!("{}/ipfs/{}", config.gateway_url.trim_end_matches('/'), cid);
    
    tracing::debug!("Fetching ECH config from IPFS: {}", url);

    // Create HTTP client with timeout
    let client = reqwest::Client::builder()
        .timeout(config.timeout)
        .build()
        .map_err(|e| EchFetchError::NetworkError(e.to_string()))?;

    // Fetch the config
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                EchFetchError::Timeout(config.timeout)
            } else {
                EchFetchError::NetworkError(e.to_string())
            }
        })?;

    if !response.status().is_success() {
        return Err(EchFetchError::GatewayError(format!(
            "Gateway returned status {}",
            response.status()
        )));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| EchFetchError::NetworkError(e.to_string()))?;

    // Parse the ECH config
    parse_ech_config(&bytes, cid)
}

/// Fetch ECH configuration from IPNS key
///
/// IPNS provides a stable name that always resolves to the latest ECH configuration.
/// This is the preferred method as it doesn't require code changes when ECH configs
/// are rotated.
///
/// # Arguments
/// * `ipns_key` - The IPNS key (e.g., "k51qzi5uqu5dgjso1xnb9go9e1h1v5t1h7m6x3z7rj6q4g3h2n1m8p9w0v2y3x4")
/// * `gateway_config` - Optional gateway configuration (uses local gateway by default)
///
/// # Returns
/// The parsed ECH configuration, or an error if fetching failed
///
/// # Example
/// ```ignore
/// use privachain_node::ech::fetch_ech_config_from_ipns;
///
/// // The IPNS key is constant - it always points to the latest config
/// let config = fetch_ech_config_from_ipns(
///     "k51qzi5uqu5dgjso1xnb9go9e1h1v5t1h7m6x3z7rj6q4g3h2n1m8p9w0v2y3x4",
///     None,
/// ).await?;
/// ```
pub async fn fetch_ech_config_from_ipns(
    ipns_key: &str,
    gateway_config: Option<IpfsGatewayConfig>,
) -> EchConfigResult {
    // Validate IPNS key format
    if !is_valid_ipns_key(ipns_key) {
        return Err(EchFetchError::InvalidIpnsKey(ipns_key.to_string()));
    }

    let config = gateway_config.unwrap_or_default();
    
    // Build the IPNS gateway URL
    // Format: /ipns/{key} resolves to the current CID
    let url = format!("{}/ipns/{}", config.gateway_url.trim_end_matches('/'), ipns_key);
    
    tracing::info!("Fetching ECH config from IPNS: {}", ipns_key);
    tracing::debug!("IPNS URL: {}", url);

    // Create HTTP client with timeout (IPNS resolution can be slower)
    let ipns_timeout = Duration::from_secs(config.timeout.as_secs().saturating_mul(2).max(60));
    let client = reqwest::Client::builder()
        .timeout(ipns_timeout)
        .build()
        .map_err(|e| EchFetchError::NetworkError(e.to_string()))?;

    // Fetch the config via IPNS
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                EchFetchError::Timeout(ipns_timeout)
            } else {
                EchFetchError::IpnsResolutionError(e.to_string())
            }
        })?;

    if !response.status().is_success() {
        return Err(EchFetchError::IpnsResolutionError(format!(
            "IPNS resolution returned status {}",
            response.status()
        )));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| EchFetchError::NetworkError(e.to_string()))?;

    // Parse the ECH config (use IPNS key as identifier since CID changes)
    parse_ech_config(&bytes, ipns_key)
}

/// Check if an IPNS key is valid (basic validation)
///
/// IPNS keys can have several formats depending on the version and encoding:
/// - "k51..." for CIDv1-encoded ed25519 keys (libp2p-key multicodec)
/// - "k2k..." for CIDv1-encoded secp256k1 keys
/// - "Qm..." for legacy peer ID format (CIDv0 base58btc)
/// - "12D3..." for peer ID format (base58btc encoded ed25519)
///
/// These prefixes are based on the IPFS/IPNS specification:
/// https://docs.ipfs.tech/concepts/ipns/
/// https://github.com/multiformats/cid
///
/// Last updated: 2025-01 (IPFS Kubo v0.24.0)
fn is_valid_ipns_key(key: &str) -> bool {
    if key.is_empty() || key.len() < 10 {
        return false;
    }
    
    // Known IPNS key prefixes (may need updates with new IPFS versions)
    // k51: CIDv1 ed25519 keys (most common for IPNS)
    // k2k: CIDv1 secp256k1 keys
    // Qm: Legacy CIDv0 peer IDs
    // 12D3: Base58btc encoded ed25519 peer IDs
    let valid_prefixes = ["k51", "k2k", "Qm", "12D3"];
    if !valid_prefixes.iter().any(|p| key.starts_with(p)) {
        return false;
    }
    
    // Check characters are valid (base32/base58)
    key.chars().all(|c| c.is_ascii_alphanumeric())
}

/// Fetch ECH config with fallback from IPNS to CID
///
/// Tries IPNS first (for latest config), falls back to static CID if IPNS fails.
/// This provides resilience while still preferring dynamic updates.
///
/// # Arguments
/// * `ipns_key` - The IPNS key for dynamic resolution (preferred)
/// * `fallback_cid` - Optional static CID to use if IPNS fails
/// * `gateway_config` - Optional gateway configuration
///
/// # Returns
/// The parsed ECH configuration from either IPNS or fallback CID
pub async fn fetch_ech_config_with_fallback(
    ipns_key: &str,
    fallback_cid: Option<&str>,
    gateway_config: Option<IpfsGatewayConfig>,
) -> EchConfigResult {
    // Try IPNS first
    match fetch_ech_config_from_ipns(ipns_key, gateway_config.clone()).await {
        Ok(config) => {
            tracing::info!("ECH config fetched from IPNS successfully");
            Ok(config)
        }
        Err(ipns_err) => {
            tracing::warn!("IPNS fetch failed: {}, trying fallback CID", ipns_err);
            
            // Try fallback CID if provided
            if let Some(cid) = fallback_cid {
                if !cid.is_empty() {
                    match fetch_ech_config_from_ipfs(cid, gateway_config).await {
                        Ok(config) => {
                            tracing::info!("ECH config fetched from fallback CID");
                            Ok(config)
                        }
                        Err(cid_err) => {
                            tracing::error!("Both IPNS and fallback CID failed");
                            Err(cid_err)
                        }
                    }
                } else {
                    Err(ipns_err)
                }
            } else {
                Err(ipns_err)
            }
        }
    }
}

/// Check if a CID is valid (basic validation)
fn is_valid_cid(cid: &str) -> bool {
    // CIDv0: starts with "Qm" and is 46 chars, uses base58 encoding
    // CIDv1: variable format, typically starts with "b" or "z"
    if cid.is_empty() {
        return false;
    }
    
    // Base58 alphabet (excludes 0, O, I, l for readability)
    const BASE58_CHARS: &str = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    
    // CIDv0 check
    if cid.starts_with("Qm") && cid.len() == 46 {
        return cid.chars().all(|c| BASE58_CHARS.contains(c));
    }
    
    // CIDv1 check (simplified - starts with lowercase letter, uses base32/base36/base58)
    if cid.starts_with(|c: char| c.is_ascii_lowercase()) && cid.len() >= 10 {
        return cid.chars().all(|c| c.is_ascii_alphanumeric());
    }
    
    false
}

/// Parse ECH config from bytes
fn parse_ech_config(bytes: &[u8], cid: &str) -> EchConfigResult {
    // Try to parse as JSON first (common format for config distribution)
    if let Ok(config) = serde_json::from_slice::<EchConfiguration>(bytes) {
        return Ok(config.with_ipfs_cid(cid.to_string()));
    }

    // If not JSON, treat as raw ECHConfigList bytes
    // This is the standard wire format for ECH configs
    if bytes.len() >= 4 {
        // Create a configuration from raw bytes
        let config = EchConfiguration::new(
            "ech-config.example".to_string(), // Default public name
            bytes.to_vec(),
            vec![EchSuite::default()],
            1,
        ).with_ipfs_cid(cid.to_string());
        
        return Ok(config);
    }

    Err(EchFetchError::ParseError(
        "Unable to parse ECH config from bytes".to_string(),
    ))
}

/// Store ECH configuration to IPFS (for publishing updates)
///
/// # Arguments
/// * `config` - The ECH configuration to publish
/// * `gateway_config` - Optional gateway configuration
///
/// # Returns
/// The CID of the published configuration
pub async fn publish_ech_config_to_ipfs(
    config: &EchConfiguration,
    gateway_config: Option<IpfsGatewayConfig>,
) -> Result<String, EchFetchError> {
    let gw_config = gateway_config.unwrap_or_default();
    
    // Serialize config to JSON
    let config_json = serde_json::to_vec(config)
        .map_err(|e| EchFetchError::ParseError(e.to_string()))?;
    
    let url = format!("{}/api/v0/add", gw_config.gateway_url.trim_end_matches('/'));
    
    tracing::debug!("Publishing ECH config to IPFS: {}", url);

    let client = reqwest::Client::builder()
        .timeout(gw_config.timeout)
        .build()
        .map_err(|e| EchFetchError::NetworkError(e.to_string()))?;

    // Create multipart form with the config data
    let form = reqwest::multipart::Form::new()
        .part("file", reqwest::multipart::Part::bytes(config_json)
            .file_name("ech-config.json"));

    let response = client
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                EchFetchError::Timeout(gw_config.timeout)
            } else {
                EchFetchError::NetworkError(e.to_string())
            }
        })?;

    if !response.status().is_success() {
        return Err(EchFetchError::GatewayError(format!(
            "IPFS add returned status {}",
            response.status()
        )));
    }

    // Parse the response to get the CID
    #[derive(serde::Deserialize)]
    struct AddResponse {
        #[serde(rename = "Hash")]
        hash: String,
    }

    let add_response: AddResponse = response
        .json()
        .await
        .map_err(|e| EchFetchError::ParseError(e.to_string()))?;

    Ok(add_response.hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_cid_v0() {
        // Valid CIDv0 (46 chars starting with Qm)
        assert!(is_valid_cid("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"));
        
        // Invalid CIDv0
        assert!(!is_valid_cid("Qm")); // Too short
        assert!(!is_valid_cid("QmInvalidCid")); // Wrong length
    }

    #[test]
    fn test_is_valid_cid_v1() {
        // Valid CIDv1-like
        assert!(is_valid_cid("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"));
        
        // Invalid CIDv1
        assert!(!is_valid_cid("invalid")); // Too short
    }

    #[test]
    fn test_is_valid_cid_empty() {
        assert!(!is_valid_cid(""));
    }

    #[test]
    fn test_is_valid_ipns_key() {
        // Valid IPNS keys
        assert!(is_valid_ipns_key("k51qzi5uqu5dgjso1xnb9go9e1h1v5t1h7m6x3z7rj6q4g3h2n1m8p9w0v2y3x4"));
        assert!(is_valid_ipns_key("k2k4r8k9fh4g7d8s9a0f3g5h2j4k6l8m0n2p4q6r8s0t2v4w6x8y0z2"));
        assert!(is_valid_ipns_key("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"));
        assert!(is_valid_ipns_key("12D3KooWDpJ7As7BWAwRMfu1VU2WCqNjvq387JEYKDBj4kx6nXTN"));
        
        // Invalid IPNS keys
        assert!(!is_valid_ipns_key("")); // Empty
        assert!(!is_valid_ipns_key("short")); // Too short
        assert!(!is_valid_ipns_key("invalid-key-format")); // Contains invalid chars
        assert!(!is_valid_ipns_key("xyz123456789")); // Wrong prefix
    }

    #[test]
    fn test_gateway_config_default() {
        let config = IpfsGatewayConfig::default();
        assert_eq!(config.gateway_url, "http://127.0.0.1:5001");
        assert_eq!(config.timeout, Duration::from_secs(30));
    }

    #[test]
    fn test_gateway_config_public() {
        let config = IpfsGatewayConfig::public_gateway("https://ipfs.io");
        assert_eq!(config.gateway_url, "https://ipfs.io");
    }

    #[test]
    fn test_parse_ech_config_json() {
        let config = EchConfiguration::new(
            "test.example.com".to_string(),
            vec![1, 2, 3],
            vec![EchSuite::default()],
            1,
        );
        let json = serde_json::to_vec(&config).unwrap();
        
        let parsed = parse_ech_config(&json, "QmTestCid123456789012345678901234567890").unwrap();
        assert_eq!(parsed.public_name, "test.example.com");
        assert_eq!(parsed.ipfs_cid, Some("QmTestCid123456789012345678901234567890".to_string()));
    }

    #[test]
    fn test_parse_ech_config_raw_bytes() {
        let raw_bytes = vec![0x00, 0x01, 0x02, 0x03, 0x04, 0x05];
        let parsed = parse_ech_config(&raw_bytes, "QmRawBytes12345678901234567890123456789012").unwrap();
        assert_eq!(parsed.config_bytes, raw_bytes);
    }

    #[test]
    fn test_parse_ech_config_too_short() {
        let short_bytes = vec![0x00, 0x01];
        let result = parse_ech_config(&short_bytes, "QmShort");
        assert!(result.is_err());
    }

    #[test]
    fn test_ipns_key_validation_edge_cases() {
        // Boundary cases
        assert!(!is_valid_ipns_key("k51234567")); // Exactly 9 chars (< 10)
        assert!(is_valid_ipns_key("k512345678")); // Exactly 10 chars (>= 10)
    }
}
