mod crawler;
mod index;
mod orbit_store;

use crawler::Crawler;
use index::SearchIndex;
use orbit_store::OrbitStore;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::path::Path;

#[derive(Debug)]
pub enum SearchError {
    Io,
    Ipfs,
    Index,
    Other,
}

impl std::fmt::Display for SearchError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SearchError::Io => write!(f, "IO error"),
            SearchError::Ipfs => write!(f, "IPFS error"),
            SearchError::Index => write!(f, "Index error"),
            SearchError::Other => write!(f, "Other error"),
        }
    }
}

impl std::error::Error for SearchError {}

impl From<anyhow::Error> for SearchError {
    fn from(_err: anyhow::Error) -> Self {
        SearchError::Other
    }
}

impl From<std::io::Error> for SearchError {
    fn from(_err: std::io::Error) -> Self {
        SearchError::Io
    }
}

pub struct SearchEngine {
    store: Arc<Mutex<OrbitStore>>,
    index: Arc<Mutex<SearchIndex>>,
    crawler: Arc<Crawler>,
    path: String,
}

impl SearchEngine {
    pub fn new(path: String) -> Result<Self, SearchError> {
        let crawler = Crawler::new()?;
        let store = OrbitStore::open(&path)?;
        
        let index_path = format!("{}/tantivy", path);
        store.load_index(&index_path)?;
        let index = SearchIndex::new(Path::new(&index_path))?;
        
        Ok(Self {
            store: Arc::new(Mutex::new(store)),
            index: Arc::new(Mutex::new(index)),
            crawler: Arc::new(crawler),
            path,
        })
    }

    pub fn crawl(&self, root_cid: String) -> Result<u64, SearchError> {
        let rt = tokio::runtime::Runtime::new().map_err(|_| SearchError::Other)?;
        
        rt.block_on(async {
            let docs = self.crawler.crawl(&root_cid).await?;
            let mut count = 0u64;
            let idx = self.index.lock().await;
            for (cid, text) in docs {
                idx.add(&cid, &text)?;
                count += 1;
            }
            drop(idx); // Release lock before acquiring store lock
            
            let store = self.store.lock().await;
            let index_path = format!("{}/tantivy", self.path);
            store.save_index(&index_path)?;
            Ok(count)
        })
    }

    pub fn search(&self, query: String) -> Result<Vec<String>, SearchError> {
        let rt = tokio::runtime::Runtime::new().map_err(|_| SearchError::Other)?;
        
        rt.block_on(async {
            let idx = self.index.lock().await;
            let results = idx.search(&query)?;
            Ok(results)
        })
    }
}

uniffi::include_scaffolding!("search");
