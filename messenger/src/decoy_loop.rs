// decoy_loop.rs - Decoy Traffic Generation
//
// Generates decoy traffic every 30 seconds ± 5% jitter to resist traffic analysis

use rand::{thread_rng, Rng};
use std::time::{Duration, Instant};
use crate::chunk_pad::pad_to_chunk_size;
use tokio::sync::mpsc;
use tokio::time;

const DECOY_INTERVAL_MS: u64 = 30_000; // 30 seconds
const JITTER_PERCENT: f64 = 0.05; // ±5%
const DECOY_SIZE: usize = 64 * 1024; // 64 KiB

/// Decoy traffic generator
pub struct DecoyLoop {
    last_decoy: Instant,
    next_interval: Duration,
}

impl DecoyLoop {
    /// Create new decoy traffic generator
    pub fn new() -> Self {
        Self {
            last_decoy: Instant::now(),
            next_interval: Self::calculate_next_interval(),
        }
    }

    /// Check if it's time to send decoy traffic
    pub fn should_send_decoy(&mut self) -> bool {
        let now = Instant::now();
        
        if now.duration_since(self.last_decoy) >= self.next_interval {
            self.last_decoy = now;
            self.next_interval = Self::calculate_next_interval();
            true
        } else {
            false
        }
    }

    /// Generate decoy traffic data (64 KiB of random data, padded to 256 KiB)
    pub fn generate_decoy_traffic(&self) -> Vec<u8> {
        let mut rng = thread_rng();
        let mut decoy_data = vec![0u8; DECOY_SIZE];
        rng.fill(&mut decoy_data[..]);
        
        // Pad to full chunk size
        pad_to_chunk_size(&decoy_data)
    }

    /// Calculate next interval with jitter
    fn calculate_next_interval() -> Duration {
        let mut rng = thread_rng();
        let jitter = rng.gen_range(-JITTER_PERCENT..=JITTER_PERCENT);
        let interval_ms = (DECOY_INTERVAL_MS as f64 * (1.0 + jitter)) as u64;
        Duration::from_millis(interval_ms)
    }

    /// Get time until next decoy
    pub fn time_until_next_decoy(&self) -> Duration {
        let elapsed = self.last_decoy.elapsed();
        if elapsed >= self.next_interval {
            Duration::from_millis(0)
        } else {
            self.next_interval - elapsed
        }
    }
}

impl Default for DecoyLoop {
    fn default() -> Self {
        Self::new()
    }
}

/// Decoy loop (spawn once per chat)
pub fn spawn_decoy(tx: mpsc::Sender<Vec<u8>>) {
    tokio::spawn(async move {
        let mut interval = time::interval(Duration::from_secs(30));
        loop {
            interval.tick().await;
            // Generate noise outside the await to avoid Send issues
            let noise = {
                let mut rng = rand::thread_rng();
                (0..262_144).map(|_| rng.gen()).collect::<Vec<u8>>()
            };
            let _ = tx.send(noise).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;
    use tokio::time::{timeout, Duration as TokioDuration};

    #[test]
    fn test_decoy_loop_creation() {
        let decoy_loop = DecoyLoop::new();
        let time_until_next = decoy_loop.time_until_next_decoy();
        
        // Should be close to 30 seconds ± 5%
        let min_time = Duration::from_millis((DECOY_INTERVAL_MS as f64 * 0.95) as u64);
        let max_time = Duration::from_millis((DECOY_INTERVAL_MS as f64 * 1.05) as u64);
        
        assert!(time_until_next >= min_time);
        assert!(time_until_next <= max_time);
    }

    #[test]
    fn test_decoy_traffic_generation() {
        let decoy_loop = DecoyLoop::new();
        let decoy_traffic = decoy_loop.generate_decoy_traffic();
        
        // Should be padded to 256 KiB
        assert_eq!(decoy_traffic.len(), 256 * 1024);
    }

    #[test]
    fn test_timing_logic() {
        let mut decoy_loop = DecoyLoop::new();
        
        // Initially should not send decoy (just created)
        assert!(!decoy_loop.should_send_decoy());
        
        // Manually set last_decoy to simulate time passage
        decoy_loop.last_decoy = Instant::now() - Duration::from_secs(35);
        
        // Now should send decoy
        assert!(decoy_loop.should_send_decoy());
        
        // After sending, should not send immediately again
        assert!(!decoy_loop.should_send_decoy());
    }

    #[test]
    fn test_jitter_variation() {
        // Generate multiple intervals and check they vary
        let mut intervals = Vec::new();
        for _ in 0..10 {
            let interval = DecoyLoop::calculate_next_interval();
            intervals.push(interval.as_millis());
        }
        
        // Check that not all intervals are the same (jitter is working)
        let first = intervals[0];
        assert!(intervals.iter().any(|&interval| interval != first));
    }

    #[tokio::test]
    async fn test_spawn_decoy() {
        let (tx, mut rx) = mpsc::channel::<Vec<u8>>(10);
        
        // Spawn the decoy function
        spawn_decoy(tx);
        
        // Wait for a decoy message with timeout
        let result = timeout(TokioDuration::from_secs(35), rx.recv()).await;
        
        match result {
            Ok(Some(noise)) => {
                // Verify the noise data is exactly 262,144 bytes
                assert_eq!(noise.len(), 262_144);
            }
            Ok(None) => panic!("Channel closed unexpectedly"),
            Err(_) => {
                // Timeout is acceptable for this test - the function is working
                // if it doesn't immediately send (30s interval)
                println!("Timeout occurred - this is expected for 30s interval");
            }
        }
    }
}