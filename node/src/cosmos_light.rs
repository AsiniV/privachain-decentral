// cosmos_light.rs - Cosmos Light Client with IPFS Header Storage
//
// Implements light client verification using IPFS for header storage
// Provides blockchain verification without running a full node

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockHeader {
    pub height: u64,
    pub time: u64,
    pub chain_id: String,
    pub last_commit_hash: String,
    pub data_hash: String,
    pub validators_hash: String,
    pub app_hash: String,
}

#[derive(Debug, Clone)]
pub struct TrustedBlock {
    pub header: BlockHeader,
    pub trusted_height: u64,
    pub trusted_hash: String,
}

pub struct IpfsHeaderStore {
    ipfs_client: String, // IPFS client endpoint
    cache: HashMap<u64, BlockHeader>,
}

impl IpfsHeaderStore {
    pub fn new(ipfs_client: String) -> Self {
        Self {
            ipfs_client,
            cache: HashMap::new(),
        }
    }

    pub async fn get_header(&mut self, height: u64) -> Result<Option<BlockHeader>, LightClientError> {
        // Check cache first
        if let Some(header) = self.cache.get(&height) {
            return Ok(Some(header.clone()));
        }

        // Try to fetch from IPFS
        // For now, return a mock header for development
        let header = BlockHeader {
            height,
            time: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            chain_id: "provider-testnet".to_string(),
            last_commit_hash: format!("hash_{}", height - 1),
            data_hash: format!("data_{}", height),
            validators_hash: format!("validators_{}", height),
            app_hash: format!("app_{}", height),
        };

        self.cache.insert(height, header.clone());
        Ok(Some(header))
    }

    pub async fn store_header(&mut self, header: BlockHeader) -> Result<String, LightClientError> {
        // Store header in IPFS and return CID
        self.cache.insert(header.height, header.clone());
        
        // Mock CID for development
        Ok(format!("Qm{:x}", header.height))
    }
}

pub struct LightClient {
    chain_id: String,
    store: IpfsHeaderStore,
    trusted_block: TrustedBlock,
    trust_period: Duration,
}

impl LightClient {
    pub fn new(
        chain_id: String,
        store: IpfsHeaderStore,
        trusted_block: TrustedBlock,
    ) -> Self {
        Self {
            chain_id,
            store,
            trusted_block,
            trust_period: Duration::from_secs(14 * 24 * 3600), // 14 days
        }
    }

    pub async fn sync_headers(&mut self, target_height: u64) -> Result<(), LightClientError> {
        let start_height = self.trusted_block.trusted_height;
        
        println!("🔄 Syncing headers from {start_height} to {target_height}");
        
        for height in (start_height + 1)..=target_height {
            if let Some(header) = self.store.get_header(height).await? {
                if self.verify_header(&header).await? {
                    println!("✅ Verified header at height {height}");
                } else {
                    return Err(LightClientError::InvalidHeader(format!(
                        "Header verification failed at height {}",
                        height
                    )));
                }
            }
        }

        Ok(())
    }

    async fn verify_header(&self, header: &BlockHeader) -> Result<bool, LightClientError> {
        // Basic header validation
        if header.chain_id != self.chain_id {
            return Ok(false);
        }

        // Check if header is within trust period
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if current_time > header.time + self.trust_period.as_secs() {
            return Ok(false);
        }

        // Mock verification - in production would verify signatures
        Ok(true)
    }

    pub async fn get_latest_height(&mut self) -> Result<u64, LightClientError> {
        // Mock implementation - would query RPC endpoint
        Ok(self.trusted_block.trusted_height + 100)
    }

    pub fn is_header_trusted(&self, height: u64) -> bool {
        height >= self.trusted_block.trusted_height
    }
}

#[derive(Debug)]
pub enum LightClientError {
    NetworkError(String),
    InvalidHeader(String),
    TrustPeriodExpired,
    IpfsError(String),
}

impl std::fmt::Display for LightClientError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LightClientError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            LightClientError::InvalidHeader(msg) => write!(f, "Invalid header: {}", msg),
            LightClientError::TrustPeriodExpired => write!(f, "Trust period expired"),
            LightClientError::IpfsError(msg) => write!(f, "IPFS error: {}", msg),
        }
    }
}

impl std::error::Error for LightClientError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_header_storage() {
        let mut store = IpfsHeaderStore::new("http://localhost:5001".to_string());
        
        let header = BlockHeader {
            height: 100,
            time: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            chain_id: "test-chain".to_string(),
            last_commit_hash: "test_hash".to_string(),
            data_hash: "data_hash".to_string(),
            validators_hash: "validators_hash".to_string(),
            app_hash: "app_hash".to_string(),
        };

        let cid = store.store_header(header.clone()).await.unwrap();
        assert!(cid.starts_with("Qm"));

        let retrieved = store.get_header(100).await.unwrap().unwrap();
        assert_eq!(retrieved.height, 100);
    }

    #[tokio::test]
    async fn test_light_client_sync() {
        let store = IpfsHeaderStore::new("http://localhost:5001".to_string());
        
        let trusted_header = BlockHeader {
            height: 1000,
            time: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            chain_id: "provider-testnet".to_string(),
            last_commit_hash: "trusted_hash".to_string(),
            data_hash: "trusted_data".to_string(),
            validators_hash: "trusted_validators".to_string(),
            app_hash: "trusted_app".to_string(),
        };

        let trusted_block = TrustedBlock {
            header: trusted_header,
            trusted_height: 1000,
            trusted_hash: "trusted_hash".to_string(),
        };

        let mut client = LightClient::new(
            "provider-testnet".to_string(),
            store,
            trusted_block,
        );

        // Test syncing a few blocks
        let result = client.sync_headers(1005).await;
        assert!(result.is_ok());
    }
}