// src/dpi_bypass/domain_fronting.rs
use reqwest::{Client, header::{HeaderMap, HeaderValue, HOST}};
use tokio::time::{timeout, Duration};

pub struct DomainFronting {
    client: Client,
    front_domains: Vec<String>,
}

impl DomainFronting {
    pub fn new() -> Self {
        let mut headers = HeaderMap::new();
        headers.insert("User-Agent", HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"));
        
        let client = Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap();
            
        Self {
            client,
            front_domains: vec![
                "cloudfront.net".to_string(),
                "azureedge.net".to_string(),
                "googleapis.com".to_string(),
            ],
        }
    }
    
    pub async fn bypass_request(&self, target: &str, front_domain: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let url = format!("https://{}/{}", front_domain, target);
        
        let mut headers = HeaderMap::new();
        headers.insert(HOST, HeaderValue::from_str(target)?);
        
        let response = self.client
            .get(&url)
            .headers(headers)
            .send()
            .await?;
            
        Ok(response.bytes().await?.to_vec())
    }
}