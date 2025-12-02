//! ECH Configuration Types
//!
//! Defines ECH configuration structures compatible with rustls.
//! Note: rustls ECH support is experimental as of 0.23+.

use serde::{Deserialize, Serialize};

/// Supported HPKE cipher suites for ECH
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EchSuite {
    /// X25519 + HKDF-SHA256 + AES-128-GCM (recommended)
    X25519HkdfSha256Aes128Gcm,
    /// X25519 + HKDF-SHA256 + ChaCha20Poly1305
    X25519HkdfSha256ChaCha20Poly1305,
}

impl Default for EchSuite {
    fn default() -> Self {
        Self::X25519HkdfSha256Aes128Gcm
    }
}

/// ECH configuration for use with rustls TLS connections
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EchConfiguration {
    /// The public name to use in the outer ClientHello (decoy SNI)
    pub public_name: String,
    /// ECH config list bytes (encoded ECHConfigList)
    pub config_bytes: Vec<u8>,
    /// Supported cipher suites
    pub suites: Vec<EchSuite>,
    /// Version identifier for config rotation
    pub version: u32,
    /// IPFS CID of this config (for verification)
    pub ipfs_cid: Option<String>,
}

impl EchConfiguration {
    /// Create a new ECH configuration
    pub fn new(
        public_name: String,
        config_bytes: Vec<u8>,
        suites: Vec<EchSuite>,
        version: u32,
    ) -> Self {
        Self {
            public_name,
            config_bytes,
            suites,
            version,
            ipfs_cid: None,
        }
    }

    /// Create configuration with IPFS CID tracking
    pub fn with_ipfs_cid(mut self, cid: String) -> Self {
        self.ipfs_cid = Some(cid);
        self
    }

    /// Check if the configuration is valid (basic validation)
    pub fn is_valid(&self) -> bool {
        !self.public_name.is_empty() 
            && !self.config_bytes.is_empty() 
            && !self.suites.is_empty()
    }

    /// Get the default suite for this configuration
    pub fn default_suite(&self) -> Option<&EchSuite> {
        self.suites.first()
    }
}

/// Builder for ECH configurations
#[derive(Debug, Default)]
pub struct EchConfigBuilder {
    public_name: Option<String>,
    config_bytes: Option<Vec<u8>>,
    suites: Vec<EchSuite>,
    version: u32,
    ipfs_cid: Option<String>,
}

impl EchConfigBuilder {
    /// Create a new builder
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the public name (outer SNI)
    pub fn public_name(mut self, name: impl Into<String>) -> Self {
        self.public_name = Some(name.into());
        self
    }

    /// Set the config bytes
    pub fn config_bytes(mut self, bytes: Vec<u8>) -> Self {
        self.config_bytes = Some(bytes);
        self
    }

    /// Add a cipher suite
    pub fn add_suite(mut self, suite: EchSuite) -> Self {
        self.suites.push(suite);
        self
    }

    /// Set the version
    pub fn version(mut self, version: u32) -> Self {
        self.version = version;
        self
    }

    /// Set the IPFS CID
    pub fn ipfs_cid(mut self, cid: impl Into<String>) -> Self {
        self.ipfs_cid = Some(cid.into());
        self
    }

    /// Build the configuration
    pub fn build(self) -> Result<EchConfiguration, &'static str> {
        let public_name = self.public_name.ok_or("public_name is required")?;
        let config_bytes = self.config_bytes.ok_or("config_bytes is required")?;
        
        let suites = if self.suites.is_empty() {
            vec![EchSuite::default()]
        } else {
            self.suites
        };

        Ok(EchConfiguration {
            public_name,
            config_bytes,
            suites,
            version: self.version,
            ipfs_cid: self.ipfs_cid,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ech_suite_default() {
        assert_eq!(EchSuite::default(), EchSuite::X25519HkdfSha256Aes128Gcm);
    }

    #[test]
    fn test_ech_configuration_new() {
        let config = EchConfiguration::new(
            "example.com".to_string(),
            vec![1, 2, 3],
            vec![EchSuite::default()],
            1,
        );
        assert_eq!(config.public_name, "example.com");
        assert!(config.is_valid());
    }

    #[test]
    fn test_ech_configuration_invalid() {
        let config = EchConfiguration::new(
            "".to_string(),
            vec![],
            vec![],
            0,
        );
        assert!(!config.is_valid());
    }

    #[test]
    fn test_ech_config_builder() {
        let config = EchConfigBuilder::new()
            .public_name("test.example.com")
            .config_bytes(vec![1, 2, 3, 4])
            .add_suite(EchSuite::X25519HkdfSha256ChaCha20Poly1305)
            .version(2)
            .ipfs_cid("QmTestCid")
            .build()
            .unwrap();

        assert_eq!(config.public_name, "test.example.com");
        assert_eq!(config.version, 2);
        assert_eq!(config.ipfs_cid, Some("QmTestCid".to_string()));
        assert!(config.is_valid());
    }

    #[test]
    fn test_ech_config_builder_missing_public_name() {
        let result = EchConfigBuilder::new()
            .config_bytes(vec![1, 2, 3])
            .build();
        assert!(result.is_err());
    }

    #[test]
    fn test_ech_config_builder_default_suite() {
        let config = EchConfigBuilder::new()
            .public_name("test.com")
            .config_bytes(vec![1])
            .build()
            .unwrap();
        
        // Should have default suite added
        assert_eq!(config.suites.len(), 1);
        assert_eq!(config.suites[0], EchSuite::default());
    }
}
