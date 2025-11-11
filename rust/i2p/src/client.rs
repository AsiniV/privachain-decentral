//! I2P SAMv3 client implementation

use crate::error::{I2pError, I2pResult};
use crate::keys::{I2pKeyPair, I2pDestination};
use crate::session::I2pSession;
use std::env;
use std::path::PathBuf;
use tracing::{debug, info};

/// I2P client configuration
#[derive(Debug, Clone)]
pub struct I2pConfig {
    /// SAM host address
    pub sam_host: String,
    /// Path to persistent key file
    pub key_file: PathBuf,
    /// Session ID
    pub session_id: String,
}

impl Default for I2pConfig {
    fn default() -> Self {
        Self {
            sam_host: env::var("I2P_SAM_HOST")
                .unwrap_or_else(|_| crate::DEFAULT_SAM_HOST.to_string()),
            key_file: I2pKeyPair::default_key_path(),
            session_id: "privachain-default".to_string(),
        }
    }
}

/// I2P SAMv3 client
pub struct I2pClient {
    config: I2pConfig,
    keypair: I2pKeyPair,
    session: Option<I2pSession>,
}

impl I2pClient {
    /// Create new client with default config
    pub fn new() -> I2pResult<Self> {
        Self::with_config(I2pConfig::default())
    }

    /// Create new client with custom config
    pub fn with_config(config: I2pConfig) -> I2pResult<Self> {
        debug!("Initializing I2P client with config: {:?}", config);
        
        // Try to load existing keypair, or generate new one
        let keypair = if config.key_file.exists() {
            info!("Loading existing I2P keypair from {:?}", config.key_file);
            I2pKeyPair::load_from_file(&config.key_file)?
        } else {
            info!("Generating new I2P keypair");
            let keypair = I2pKeyPair::generate()?;
            keypair.save_to_file(&config.key_file)?;
            info!("Saved new keypair to {:?}", config.key_file);
            keypair
        };

        info!("I2P destination: {}", keypair.destination.to_base32_address());

        Ok(Self {
            config,
            keypair,
            session: None,
        })
    }

    /// Get client's I2P destination
    pub fn destination(&self) -> &I2pDestination {
        &self.keypair.destination
    }

    /// Connect and create session
    pub async fn connect(&mut self) -> I2pResult<()> {
        let mut session = I2pSession::new(
            self.config.session_id.clone(),
            self.keypair.clone(),
            self.config.sam_host.clone(),
        );

        session.connect().await?;
        session.hello().await?;
        session.create_session().await?;

        self.session = Some(session);
        Ok(())
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        self.session.is_some()
    }

    /// Connect to remote I2P destination
    pub async fn connect_to(&mut self, destination: &I2pDestination) -> I2pResult<()> {
        let session = self.session.as_mut()
            .ok_or_else(|| I2pError::SessionError("Not connected to SAM bridge".to_string()))?;
        
        session.stream_connect(&destination.to_base32_address()).await
    }

    /// Get session reference
    pub fn session(&self) -> Option<&I2pSession> {
        self.session.as_ref()
    }

    /// Close connection
    pub async fn close(&mut self) -> I2pResult<()> {
        if let Some(mut session) = self.session.take() {
            session.close().await?;
        }
        Ok(())
    }
}

impl Default for I2pClient {
    fn default() -> Self {
        Self::new().expect("Failed to create default I2P client")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = I2pConfig::default();
        assert_eq!(config.sam_host, "127.0.0.1:7656");
        assert_eq!(config.session_id, "privachain-default");
    }

    #[test]
    fn test_config_from_env() {
        env::set_var("I2P_SAM_HOST", "192.168.1.1:7656");
        let config = I2pConfig::default();
        assert_eq!(config.sam_host, "192.168.1.1:7656");
        env::remove_var("I2P_SAM_HOST");
    }

    #[test]
    fn test_client_creation() {
        // Use temporary directory for test
        let mut config = I2pConfig::default();
        config.key_file = PathBuf::from("/tmp/test_i2p_key.dat");
        
        let client = I2pClient::with_config(config).unwrap();
        assert!(!client.is_connected());
        assert!(!client.destination().address.is_empty());
        
        // Cleanup
        let _ = std::fs::remove_file("/tmp/test_i2p_key.dat");
    }
}
