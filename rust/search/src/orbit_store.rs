use sled::Db;
use serde::{Serialize, Deserialize};
use bincode;
use anyhow::Result;
use tracing::info;
use std::path::Path;

#[derive(Serialize, Deserialize)]
struct IndexRecord {
    cid: String,
    index_data: Vec<u8>, // metadata only
}

pub struct OrbitStore {
    db: Db,
}

impl OrbitStore {
    pub fn open(path: &str) -> Result<Self> {
        let db = sled::open(path)?;
        Ok(Self { db })
    }

    /// Save index metadata (simplified without actual IPFS pinning)
    pub fn save_index(&self, _index_path: &str) -> Result<String> {
        // Placeholder CID for saved index
        let cid = format!("bafybeisaved{}", chrono::Utc::now().timestamp());
        let rec = IndexRecord { cid: cid.clone(), index_data: vec![] };
        self.db.insert(b"index", bincode::serialize(&rec)?)?;
        self.db.flush()?;
        info!("Saved index metadata with CID {}", cid);
        Ok(cid)
    }

    /// Load local index or create directory
    pub fn load_index(&self, index_path: &str) -> Result<()> {
        if self.db.get(b"index")?.is_some() {
            // Index metadata exists
            if !Path::new(index_path).exists() {
                std::fs::create_dir_all(index_path)?;
            }
            return Ok(());
        }
        // Empty – create dir
        std::fs::create_dir_all(index_path)?;
        Ok(())
    }
}
