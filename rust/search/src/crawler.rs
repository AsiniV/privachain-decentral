use std::collections::{HashMap, HashSet, VecDeque};
use cid::Cid;
use anyhow::Result;
use tracing::info;

pub struct Crawler {
    pub gateway_url: String,
    pub max_depth: u32,
}

impl Crawler {
    pub fn new() -> Result<Self> {
        Ok(Self { 
            gateway_url: "https://ipfs.io".to_string(),
            max_depth: 5 
        })
    }

    /// Returns map CID → text (String)
    pub async fn crawl(&self, root_str: &str) -> Result<HashMap<String, String>> {
        let _root = Cid::try_from(root_str)?;
        let mut seen = HashSet::new();
        let mut queue = VecDeque::from([(root_str.to_string(), 0)]);
        let mut out = HashMap::new();

        let client = reqwest::Client::new();

        while let Some((cid_str, depth)) = queue.pop_front() {
            if seen.contains(&cid_str) || depth > self.max_depth {
                continue;
            }
            seen.insert(cid_str.clone());

            // Fetch from IPFS gateway
            let url = format!("{}/ipfs/{}", self.gateway_url, cid_str);
            let response = client.get(&url).send().await?;
            
            if !response.status().is_success() {
                continue;
            }

            let data = response.bytes().await?;

            // Try as UTF-8 text
            if let Ok(txt) = String::from_utf8(data.to_vec()) {
                out.insert(cid_str.clone(), txt);
                info!("Extracted text from {}", cid_str);
            }

            // If DAG-PB, recurse links
            if let Ok(dag) = libipld::pb::PbNode::from_bytes(data.to_vec().into()) {
                for link in dag.links.iter() {
                    queue.push_back((link.cid.to_string(), depth + 1));
                }
            }
        }
        Ok(out)
    }
}
