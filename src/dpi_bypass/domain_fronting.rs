// src/dpi_bypass/domain_fronting.rs
use reqwest::{Client, header::{HeaderMap, HeaderValue, HOST}};
use tokio::time::{timeout, Duration};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct FrontDomain {
    pub domain: String,
    pub host_header: String,
    pub regions: Vec<String>,
    pub priority: u8,
    pub success_rate: f64,
    pub fallback: bool,
}

pub struct DomainFronting {
    client: Client,
    front_domains: Vec<String>,
    configured_domains: Vec<FrontDomain>,
    current_domain_index: usize,
    failure_counts: HashMap<String, u32>,
}

impl DomainFronting {
    pub fn new() -> Self {
        let mut headers = HeaderMap::new();
        headers.insert("User-Agent", HeaderValue::from_static(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ));
        
        let client = Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(30))
            .tcp_keepalive(Duration::from_secs(30))
            .pool_idle_timeout(Duration::from_secs(90))
            .build()
            .unwrap();
        
        // Load configured domains from TOML or use defaults
        let configured_domains = Self::load_front_domains().unwrap_or_else(|_| {
            vec![
                FrontDomain {
                    domain: "cloudfront.net".to_string(),
                    host_header: "d1w6j4x3c2arwk.cloudfront.net".to_string(),
                    regions: vec!["us-east-1".to_string(), "eu-west-1".to_string()],
                    priority: 1,
                    success_rate: 0.95,
                    fallback: false,
                },
                FrontDomain {
                    domain: "azureedge.net".to_string(),
                    host_header: "priva-msedge.azureedge.net".to_string(),
                    regions: vec!["us-west-2".to_string(), "eu-central-1".to_string()],
                    priority: 2,
                    success_rate: 0.92,
                    fallback: false,
                },
                FrontDomain {
                    domain: "googleapis.com".to_string(),
                    host_header: "priva-api.googleapis.com".to_string(),
                    regions: vec!["us-central1".to_string(), "europe-west1".to_string()],
                    priority: 5,
                    success_rate: 0.90,
                    fallback: false,
                },
            ]
        });
            
        Self {
            client,
            front_domains: configured_domains.iter().map(|d| d.domain.clone()).collect(),
            configured_domains,
            current_domain_index: 0,
            failure_counts: HashMap::new(),
        }
    }
    
    fn load_front_domains() -> Result<Vec<FrontDomain>, Box<dyn std::error::Error>> {
        // Try to load from the new configuration file
        // For now, return error to use defaults since TOML parsing needs more dependencies
        Err("Config file not implemented yet".into())
    }
    
    pub async fn bypass_request(&mut self, target: &str, front_domain: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        // Use specified front domain or select one automatically
        let selected_domain = if front_domain.is_empty() {
            self.select_best_domain()
        } else {
            front_domain.to_string()
        };
        
        let url = format!("https://{}/{}", selected_domain, target.trim_start_matches("https://"));
        
        let mut headers = HeaderMap::new();
        headers.insert(HOST, HeaderValue::from_str(target)?);
        
        // Add additional headers for better DPI evasion
        headers.insert("Accept", HeaderValue::from_static(
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        ));
        headers.insert("Accept-Language", HeaderValue::from_static("en-US,en;q=0.5"));
        headers.insert("Accept-Encoding", HeaderValue::from_static("gzip, deflate, br"));
        headers.insert("Cache-Control", HeaderValue::from_static("no-cache"));
        headers.insert("Upgrade-Insecure-Requests", HeaderValue::from_static("1"));
        
        // Add timing jitter to avoid pattern detection
        let jitter = rand::random::<u64>() % 1000 + 100; // 100-1100ms
        tokio::time::sleep(Duration::from_millis(jitter)).await;
        
        let response = timeout(
            Duration::from_secs(30),
            self.client
                .get(&url)
                .headers(headers)
                .send()
        ).await??;
        
        match response.status().as_u16() {
            200..=299 => {
                // Reset failure count on success
                self.failure_counts.insert(selected_domain.clone(), 0);
                Ok(response.bytes().await?.to_vec())
            }
            _ => {
                // Increment failure count
                let failures = self.failure_counts.get(&selected_domain).unwrap_or(&0) + 1;
                self.failure_counts.insert(selected_domain.clone(), failures);
                
                // Rotate to next domain if too many failures
                if failures >= 3 {
                    self.rotate_domain();
                }
                
                Err(format!("Request failed with status: {}", response.status()).into())
            }
        }
    }
    
    fn select_best_domain(&self) -> String {
        // Select domain with lowest failure count and highest success rate
        let mut best_domain = &self.configured_domains[self.current_domain_index];
        let mut best_score = self.calculate_domain_score(best_domain);
        
        for domain in &self.configured_domains {
            let score = self.calculate_domain_score(domain);
            if score > best_score {
                best_domain = domain;
                best_score = score;
            }
        }
        
        best_domain.domain.clone()
    }
    
    fn calculate_domain_score(&self, domain: &FrontDomain) -> f64 {
        let failures = self.failure_counts.get(&domain.domain).unwrap_or(&0);
        let penalty = (*failures as f64) * 0.1;
        domain.success_rate - penalty
    }
    
    fn rotate_domain(&mut self) {
        self.current_domain_index = (self.current_domain_index + 1) % self.configured_domains.len();
    }
    
    /// Get bypass statistics
    pub fn get_stats(&self) -> HashMap<String, u32> {
        self.failure_counts.clone()
    }
}

// Add TOML dependency if not present
// #[cfg(feature = "toml_config")]
// mod toml_config {
//     use super::*;
//     
//     #[derive(Debug)]
//     struct DomainConfig {
//         front: Vec<FrontDomain>,
//     }
// }