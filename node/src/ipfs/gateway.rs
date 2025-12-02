//! Standard IPFS Gateway Integration
//!
//! Provides HTTP-based IPFS content fetching via public or local gateways.
//! This is the fallback when QUIC+ECH is not available.

use std::time::Duration;
use thiserror::Error;

/// Errors that can occur when fetching from IPFS
#[derive(Debug, Error)]
pub enum IpfsFetchError {
    /// HTTP request failed
    #[error("HTTP request failed: {0}")]
    HttpError(String),

    /// Gateway returned error status
    #[error("Gateway returned status {status}: {message}")]
    GatewayError { status: u16, message: String },

    /// Content not found
    #[error("Content not found for CID: {0}")]
    NotFound(String),

    /// Request timeout
    #[error("Request timed out after {0:?}")]
    Timeout(Duration),

    /// Invalid CID
    #[error("Invalid CID: {0}")]
    InvalidCid(String),
}

/// IPFS gateway configuration
#[derive(Debug, Clone)]
pub struct GatewayConfig {
    /// Gateway URL (e.g., "https://ipfs.io", "http://localhost:8080")
    pub url: String,
    /// Request timeout
    pub timeout: Duration,
    /// Whether to verify content hash
    pub verify_hash: bool,
}

impl Default for GatewayConfig {
    fn default() -> Self {
        Self {
            url: "https://ipfs.io".to_string(),
            timeout: Duration::from_secs(30),
            verify_hash: true,
        }
    }
}

impl GatewayConfig {
    /// Create configuration for a local IPFS gateway
    pub fn local() -> Self {
        Self {
            url: "http://127.0.0.1:8080".to_string(),
            timeout: Duration::from_secs(10),
            verify_hash: false, // Local gateway already verified
        }
    }

    /// Create configuration with custom URL
    pub fn with_url(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            ..Default::default()
        }
    }

    /// Create configuration with custom timeout
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }
}

/// Fetch content from IPFS via HTTP gateway
///
/// # Arguments
/// * `cid` - The IPFS Content Identifier
/// * `config` - Optional gateway configuration
///
/// # Returns
/// The content bytes, or an error if fetching failed
pub async fn fetch_ipfs(cid: &str, config: Option<GatewayConfig>) -> Result<Vec<u8>, IpfsFetchError> {
    let config = config.unwrap_or_default();

    // Basic CID validation
    if cid.is_empty() {
        return Err(IpfsFetchError::InvalidCid("CID cannot be empty".to_string()));
    }

    let url = format!("{}/ipfs/{}", config.url.trim_end_matches('/'), cid);

    tracing::debug!("Fetching IPFS content: {}", url);

    let client = reqwest::Client::builder()
        .timeout(config.timeout)
        .build()
        .map_err(|e| IpfsFetchError::HttpError(e.to_string()))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                IpfsFetchError::Timeout(config.timeout)
            } else {
                IpfsFetchError::HttpError(e.to_string())
            }
        })?;

    let status = response.status();
    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(IpfsFetchError::NotFound(cid.to_string()));
    }

    if !status.is_success() {
        return Err(IpfsFetchError::GatewayError {
            status: status.as_u16(),
            message: format!("Failed to fetch CID {}", cid),
        });
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| IpfsFetchError::HttpError(e.to_string()))?;

    Ok(bytes.to_vec())
}

/// List of known public IPFS gateways for fallback
pub const PUBLIC_GATEWAYS: &[&str] = &[
    "https://ipfs.io",
    "https://dweb.link",
    "https://gateway.pinata.cloud",
    "https://cloudflare-ipfs.com",
];

/// Fetch content trying multiple gateways until success
pub async fn fetch_with_fallback(cid: &str, timeout: Duration) -> Result<Vec<u8>, IpfsFetchError> {
    let mut last_error = None;

    for gateway_url in PUBLIC_GATEWAYS {
        let config = GatewayConfig {
            url: gateway_url.to_string(),
            timeout,
            verify_hash: true,
        };

        match fetch_ipfs(cid, Some(config)).await {
            Ok(data) => {
                tracing::info!("Successfully fetched from gateway: {}", gateway_url);
                return Ok(data);
            }
            Err(e) => {
                tracing::warn!("Gateway {} failed: {}", gateway_url, e);
                last_error = Some(e);
            }
        }
    }

    Err(last_error.unwrap_or_else(|| {
        IpfsFetchError::HttpError("All gateways failed".to_string())
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gateway_config_default() {
        let config = GatewayConfig::default();
        assert_eq!(config.url, "https://ipfs.io");
        assert_eq!(config.timeout, Duration::from_secs(30));
        assert!(config.verify_hash);
    }

    #[test]
    fn test_gateway_config_local() {
        let config = GatewayConfig::local();
        assert_eq!(config.url, "http://127.0.0.1:8080");
        assert!(!config.verify_hash);
    }

    #[test]
    fn test_gateway_config_custom() {
        let config = GatewayConfig::with_url("https://custom.gateway")
            .with_timeout(Duration::from_secs(60));
        assert_eq!(config.url, "https://custom.gateway");
        assert_eq!(config.timeout, Duration::from_secs(60));
    }

    #[test]
    fn test_public_gateways_not_empty() {
        assert!(!PUBLIC_GATEWAYS.is_empty());
    }

    #[tokio::test]
    async fn test_fetch_invalid_cid() {
        let result = fetch_ipfs("", None).await;
        assert!(matches!(result, Err(IpfsFetchError::InvalidCid(_))));
    }
}
