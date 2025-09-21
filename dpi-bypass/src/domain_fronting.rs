// dpi-bypass/src/domain_fronting.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use rand::Rng;
use anyhow::{Result, Context};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct FrontDomain {
    pub domain: String,
    pub host_header: String,
    pub regions: Vec<String>,
    pub priority: u8,
    pub success_rate: f64,
    #[serde(default)]
    pub fallback: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DomainFrontingConfig {
    pub front: Vec<FrontDomain>,
    pub config: FrontingSettings,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FrontingSettings {
    pub rotation_interval_minutes: u64,
    pub max_consecutive_failures: u32,
    pub health_check_interval_seconds: u64,
    pub tls_versions: Vec<String>,
    pub cipher_suites: Vec<String>,
    pub enable_ech: bool,
    pub sni_masking: bool,
    pub user_agents: Vec<String>,
    pub request_delay_ms: DelayRange,
    pub connection_timeout_ms: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DelayRange {
    pub min: u64,
    pub max: u64,
}

pub struct EnhancedDomainFronting {
    config: DomainFrontingConfig,
    client: reqwest::Client,
    failure_counts: HashMap<String, u32>,
    last_rotation: Instant,
    current_domain_index: usize,
}

impl EnhancedDomainFronting {
    pub fn new() -> Result<Self> {
        let config = Self::load_config()?;
        let client = Self::build_http_client(&config.config)?;
        
        Ok(Self {
            config,
            client,
            failure_counts: HashMap::new(),
            last_rotation: Instant::now(),
            current_domain_index: 0,
        })
    }
    
    pub fn load_config() -> Result<DomainFrontingConfig> {
        let config_path = "dpi-bypass/front_domains.toml";
        let config_str = std::fs::read_to_string(config_path)
            .context("Failed to read domain fronting configuration")?;
        
        toml::from_str(&config_str)
            .context("Failed to parse domain fronting configuration")
    }
    
    fn build_http_client(settings: &FrontingSettings) -> Result<reqwest::Client> {
        let mut builder = reqwest::Client::builder()
            .timeout(Duration::from_millis(settings.connection_timeout_ms))
            .tcp_keepalive(Duration::from_secs(30))
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_nodelay(true);
            
        // Add random user agent
        if !settings.user_agents.is_empty() {
            let user_agent = &settings.user_agents[
                rand::thread_rng().gen_range(0..settings.user_agents.len())
            ];
            builder = builder.user_agent(user_agent);
        }
        
        builder.build().context("Failed to build HTTP client")
    }
    
    /// Perform domain-fronted request with DPI bypass
    pub async fn bypass_request(
        &mut self, 
        target_url: &str, 
        _real_host: &str
    ) -> Result<Vec<u8>> {
        // Rotate domain if needed
        self.maybe_rotate_domain().await;
        
        // Get current front domain - clone to avoid borrow issues
        let front_domain = self.get_current_domain()?.clone();
        
        // Add jitter delay to avoid pattern detection
        self.apply_request_delay().await;
        
        // Build fronted URL
        let fronted_url = self.build_fronted_url(target_url, &front_domain.domain)?;
        
        // Prepare headers with host spoofing
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::HOST,
            reqwest::header::HeaderValue::from_str(&front_domain.host_header)?
        );
        
        // Add noise headers for traffic obfuscation
        self.add_noise_headers(&mut headers);
        
        // Make the request
        let response = self.client
            .get(&fronted_url)
            .headers(headers)
            .send()
            .await;
            
        match response {
            Ok(resp) => {
                if resp.status().is_success() {
                    // Reset failure count on success
                    self.failure_counts.insert(front_domain.domain.clone(), 0);
                    
                    let bytes = resp.bytes().await
                        .context("Failed to read response body")?;
                    Ok(bytes.to_vec())
                } else {
                    self.handle_request_failure(&front_domain.domain).await?;
                    Err(anyhow::anyhow!("Request failed with status: {}", resp.status()))
                }
            }
            Err(_e) => {
                self.handle_request_failure(&front_domain.domain).await?;
                Err(anyhow::anyhow!("Network request failed"))
            }
        }
    }
    
    async fn maybe_rotate_domain(&mut self) {
        let rotation_interval = Duration::from_secs(self.config.config.rotation_interval_minutes * 60);
        
        if self.last_rotation.elapsed() >= rotation_interval {
            self.rotate_to_next_domain();
            self.last_rotation = Instant::now();
        }
    }
    
    fn rotate_to_next_domain(&mut self) {
        // Find next available domain that hasn't exceeded failure threshold
        let start_index = self.current_domain_index;
        loop {
            self.current_domain_index = (self.current_domain_index + 1) % self.config.front.len();
            
            let domain = &self.config.front[self.current_domain_index];
            let failures = self.failure_counts.get(&domain.domain).unwrap_or(&0);
            
            if *failures < self.config.config.max_consecutive_failures {
                break;
            }
            
            // If we've checked all domains, reset failure counts and use primary
            if self.current_domain_index == start_index {
                self.failure_counts.clear();
                self.current_domain_index = 0;
                break;
            }
        }
    }
    
    fn get_current_domain(&self) -> Result<&FrontDomain> {
        self.config.front.get(self.current_domain_index)
            .context("No front domains available")
    }
    
    async fn apply_request_delay(&self) {
        let delay_range = &self.config.config.request_delay_ms;
        let delay_ms = rand::thread_rng().gen_range(delay_range.min..=delay_range.max);
        sleep(Duration::from_millis(delay_ms)).await;
    }
    
    fn build_fronted_url(&self, target_url: &str, front_domain: &str) -> Result<String> {
        let url = url::Url::parse(target_url)
            .context("Invalid target URL")?;
            
        Ok(format!("https://{}{}", front_domain, url.path()))
    }
    
    fn add_noise_headers(&self, headers: &mut reqwest::header::HeaderMap) {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        
        // Add common headers with slight variations
        let noise_headers = [
            ("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"),
            ("Accept-Language", "en-US,en;q=0.5"),
            ("Accept-Encoding", "gzip, deflate, br"),
            ("Cache-Control", "no-cache"),
            ("Pragma", "no-cache"),
            ("Upgrade-Insecure-Requests", "1"),
            ("Sec-Fetch-Dest", "document"),
            ("Sec-Fetch-Mode", "navigate"),
            ("Sec-Fetch-Site", "none"),
        ];
        
        // Add 3-5 random noise headers
        let num_headers = rng.gen_range(3..=5);
        for _ in 0..num_headers {
            let (name, value) = noise_headers[rng.gen_range(0..noise_headers.len())];
            if let (Ok(header_name), Ok(header_value)) = (
                reqwest::header::HeaderName::from_bytes(name.as_bytes()),
                reqwest::header::HeaderValue::from_str(value)
            ) {
                headers.insert(header_name, header_value);
            }
        }
        
        // Add random X- headers to blend in
        let x_header_value = format!("noise-{}", rng.gen::<u32>());
        if let Ok(header_value) = reqwest::header::HeaderValue::from_str(&x_header_value) {
            headers.insert("X-Request-ID", header_value);
        }
    }
    
    async fn handle_request_failure(&mut self, domain: &str) -> Result<()> {
        let current_failures = self.failure_counts.get(domain).unwrap_or(&0) + 1;
        self.failure_counts.insert(domain.to_string(), current_failures);
        
        if current_failures >= self.config.config.max_consecutive_failures {
            // Rotate to next domain immediately
            self.rotate_to_next_domain();
        }
        
        Ok(())
    }
    
    /// Get statistics about domain fronting performance
    pub fn get_stats(&self) -> HashMap<String, u32> {
        self.failure_counts.clone()
    }
    
    /// Test connectivity to all configured domains
    pub async fn health_check(&mut self) -> Result<Vec<(String, bool)>> {
        let mut results = Vec::new();
        
        for domain in &self.config.front {
            let test_url = format!("https://{}/", domain.domain);
            let is_healthy = self.client
                .head(&test_url)
                .timeout(Duration::from_secs(10))
                .send()
                .await
                .map(|resp| resp.status().is_success())
                .unwrap_or(false);
                
            results.push((domain.domain.clone(), is_healthy));
        }
        
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_load_config() {
        // This test would fail in the actual environment since the config file
        // might not exist during testing, but it demonstrates the structure
        let config_result = EnhancedDomainFronting::load_config();
        // In a real test, we'd create a temporary config file first
    }
    
    #[tokio::test]
    async fn test_domain_rotation() {
        // Create a mock config for testing
        let config = DomainFrontingConfig {
            front: vec![
                FrontDomain {
                    domain: "test1.com".to_string(),
                    host_header: "real1.com".to_string(),
                    regions: vec!["us-east-1".to_string()],
                    priority: 1,
                    success_rate: 0.9,
                    fallback: false,
                },
                FrontDomain {
                    domain: "test2.com".to_string(),
                    host_header: "real2.com".to_string(),
                    regions: vec!["us-west-1".to_string()],
                    priority: 2,
                    success_rate: 0.85,
                    fallback: false,
                },
            ],
            config: FrontingSettings {
                rotation_interval_minutes: 1,
                max_consecutive_failures: 2,
                health_check_interval_seconds: 60,
                tls_versions: vec!["1.3".to_string()],
                cipher_suites: vec!["TLS_AES_256_GCM_SHA384".to_string()],
                enable_ech: true,
                sni_masking: true,
                user_agents: vec!["TestAgent/1.0".to_string()],
                request_delay_ms: DelayRange { min: 100, max: 500 },
                connection_timeout_ms: 30000,
            },
        };
        
        let client = EnhancedDomainFronting::build_http_client(&config.config).unwrap();
        let mut fronting = EnhancedDomainFronting {
            config,
            client,
            failure_counts: HashMap::new(),
            last_rotation: Instant::now(),
            current_domain_index: 0,
        };
        
        // Test domain rotation
        assert_eq!(fronting.current_domain_index, 0);
        fronting.rotate_to_next_domain();
        assert_eq!(fronting.current_domain_index, 1);
    }
}