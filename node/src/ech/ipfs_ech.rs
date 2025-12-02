//! IPFS-based ECH Configuration Distribution
//!
//! Provides functionality to fetch and distribute ECH configurations via IPFS.
//! This enables decentralized, censorship-resistant distribution of ECH configs.
//!
//! ECH configs can be published to IPFS and clients can fetch them using the CID.
//! For dynamic updates, IPNS can be used to provide a stable name that resolves
//! to the latest ECH config CID.

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
    
    /// Failed to parse ECH config
    #[error("Failed to parse ECH config: {0}")]
    ParseError(String),
    
    /// Request timeout
    #[error("Request timed out after {0:?}")]
    Timeout(Duration),
    
    /// Network error
    #[error("Network error: {0}")]
    NetworkError(String),
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

/// Check if a CID is valid (basic validation)
fn is_valid_cid(cid: &str) -> bool {
    // CIDv0: starts with "Qm" and is 46 chars
    // CIDv1: variable format, typically starts with "b" or "z"
    if cid.is_empty() {
        return false;
    }
    
    // CIDv0 check
    if cid.starts_with("Qm") && cid.len() == 46 {
        return cid.chars().all(|c| c.is_ascii_alphanumeric());
    }
    
    // CIDv1 check (simplified - starts with lowercase letter)
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
}
