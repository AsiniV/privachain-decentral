// global_dpi_test.rs - Automated DPI fingerprint testing
//
// Tests for Deep Packet Inspection resistance by generating and analyzing traffic patterns

use crate::{MessengerResult, chunk_pad::pad_to_chunk_size};
use rand::{thread_rng, Rng};

/// DPI test results
#[derive(Debug, Clone)]
pub struct DpiTestResult {
    pub test_name: String,
    pub passed: bool,
    pub entropy: f64,
    pub pattern_detected: bool,
}

/// Global DPI testing framework
pub struct GlobalDpiTest {
    // TODO: Add statistical analysis capabilities
}

impl GlobalDpiTest {
    /// Create new DPI test instance
    pub fn new() -> MessengerResult<Self> {
        Ok(Self {})
    }

    /// Test if traffic appears random (no DPI fingerprints)
    pub fn test_traffic_randomness(&self, traffic_samples: &[Vec<u8>]) -> MessengerResult<DpiTestResult> {
        let mut total_entropy = 0.0;
        let mut pattern_detected = false;

        for sample in traffic_samples {
            let entropy = self.calculate_entropy(sample);
            total_entropy += entropy;

            // Check for patterns (simplified test)
            if self.has_detectable_pattern(sample) {
                pattern_detected = true;
            }
        }

        let avg_entropy = total_entropy / traffic_samples.len() as f64;
        let passed = avg_entropy > 7.5 && !pattern_detected; // High entropy threshold

        Ok(DpiTestResult {
            test_name: "Traffic Randomness".to_string(),
            passed,
            entropy: avg_entropy,
            pattern_detected,
        })
    }

    /// Generate test traffic that should appear random
    pub fn generate_test_traffic(&self, num_samples: usize) -> Vec<Vec<u8>> {
        let mut samples = Vec::new();
        let mut rng = thread_rng();

        for _ in 0..num_samples {
            let data_size = rng.gen_range(1024..65536); // Random size 1-64 KB
            let mut data = vec![0u8; data_size];
            rng.fill(&mut data[..]);
            
            // Pad to standard chunk size
            samples.push(pad_to_chunk_size(&data));
        }

        samples
    }

    /// Calculate Shannon entropy of data
    fn calculate_entropy(&self, data: &[u8]) -> f64 {
        let mut frequency = [0u64; 256];
        
        // Count byte frequencies
        for &byte in data {
            frequency[byte as usize] += 1;
        }

        let len = data.len() as f64;
        let mut entropy = 0.0;

        for &count in &frequency {
            if count > 0 {
                let p = count as f64 / len;
                entropy -= p * p.log2();
            }
        }

        entropy
    }

    /// Simple pattern detection (checks for repeated sequences)
    fn has_detectable_pattern(&self, data: &[u8]) -> bool {
        if data.len() < 8 {
            return false;
        }

        // Look for repeated 4-byte sequences
        for i in 0..data.len() - 7 {
            let pattern = &data[i..i + 4];
            for j in i + 4..data.len() - 3 {
                if &data[j..j + 4] == pattern {
                    return true; // Found repeated pattern
                }
            }
        }

        false
    }

    /// Run comprehensive DPI resistance tests
    pub fn run_comprehensive_test(&self) -> MessengerResult<Vec<DpiTestResult>> {
        let mut results = Vec::new();

        // Test 1: Random traffic generation
        let test_traffic = self.generate_test_traffic(100);
        results.push(self.test_traffic_randomness(&test_traffic)?);

        // TODO: Add more DPI tests
        // - Timing analysis resistance
        // - Size analysis resistance
        // - Protocol fingerprint tests

        Ok(results)
    }
}

impl Default for GlobalDpiTest {
    fn default() -> Self {
        Self::new().expect("Failed to create default GlobalDpiTest")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entropy_calculation() {
        let dpi_test = GlobalDpiTest::new().unwrap();
        
        // High entropy data (random)
        let random_data = vec![1, 2, 3, 4, 5, 6, 7, 8];
        let entropy = dpi_test.calculate_entropy(&random_data);
        assert!(entropy > 2.0); // Should have reasonable entropy

        // Low entropy data (repeated)
        let repeated_data = vec![0; 8];
        let entropy = dpi_test.calculate_entropy(&repeated_data);
        assert_eq!(entropy, 0.0); // Should have zero entropy
    }

    #[test]
    fn test_pattern_detection() {
        let dpi_test = GlobalDpiTest::new().unwrap();
        
        // Data with pattern
        let pattern_data = vec![1, 2, 3, 4, 1, 2, 3, 4];
        assert!(dpi_test.has_detectable_pattern(&pattern_data));

        // Data without pattern
        let no_pattern_data = vec![1, 2, 3, 4, 5, 6, 7, 8];
        assert!(!dpi_test.has_detectable_pattern(&no_pattern_data));
    }

    #[test]
    fn test_traffic_generation() {
        let dpi_test = GlobalDpiTest::new().unwrap();
        let traffic = dpi_test.generate_test_traffic(10);
        
        assert_eq!(traffic.len(), 10);
        for sample in traffic {
            assert_eq!(sample.len(), 256 * 1024); // Should be padded to chunk size
        }
    }
}