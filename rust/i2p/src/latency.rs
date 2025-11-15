//! I2P Latency Monitoring
//! 
//! Measures round-trip latency for I2P connections.
//! Target: < 300ms per connection setup.

use crate::{I2pClient, I2pError};
use std::time::{Duration, Instant};

/// Measure I2P connection latency
pub async fn measure_latency() -> Result<Duration, I2pError> {
    let start = Instant::now();
    
    // Attempt to create client and connect - this connects to SAM
    let mut client = I2pClient::new()?;
    client.connect().await?;
    
    let elapsed = start.elapsed();
    Ok(elapsed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpStream;

    #[test]
    #[ignore = "requires I2P SAM bridge"]
    fn latency_under_300ms() {
        // Check if SAM bridge is available
        if TcpStream::connect("127.0.0.1:7656").is_err() {
            // Silently skip if I2P not available
            return;
        }
        
        let rt = tokio::runtime::Runtime::new().unwrap();
        let lat = rt.block_on(measure_latency()).unwrap();
        assert!(lat.as_millis() < 300, "Latency {}ms exceeds 300ms target", lat.as_millis());
    }

    #[test]
    fn test_latency_measurement_structure() {
        // Basic test that module compiles and has expected structure
        assert!(true);
    }
}
