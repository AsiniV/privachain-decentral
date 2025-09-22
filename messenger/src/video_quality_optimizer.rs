// video_quality_optimizer.rs - Adaptive Video Quality Optimization
//
// Provides intelligent bitrate adaptation based on network conditions

use crate::{MessengerError, MessengerResult};

/// Calculate target bitrate based on network conditions
/// 
/// Returns bitrate in bits per second based on RTT and packet loss
pub fn target_bitrate(rtt_ms: u32, loss_percent: f32) -> u32 {
    if loss_percent > 5.0 {
        6_000_000  // 6 Mbps for high loss scenarios - reduce quality significantly
    } else if rtt_ms < 100 {
        3_000_000  // 3 Mbps for low latency - good quality possible
    } else {
        1_000_000  // 1 Mbps for high latency - conservative approach
    }
}

/// Video quality profile for different network conditions
#[derive(Debug, Clone)]
pub struct VideoQualityProfile {
    pub resolution: String,
    pub bitrate: u32,
    pub framerate: u32,
    pub codec: String,
}

impl VideoQualityProfile {
    /// Create 1080p@30fps profile
    pub fn hd_1080p() -> Self {
        Self {
            resolution: "1920x1080".to_string(),
            bitrate: 3_000_000,  // 3 Mbps
            framerate: 30,
            codec: "VP9".to_string(),
        }
    }

    /// Create adaptive profile based on network conditions
    pub fn adaptive(rtt_ms: u32, loss_percent: f32) -> Self {
        let bitrate = target_bitrate(rtt_ms, loss_percent);
        
        if bitrate >= 3_000_000 {
            Self::hd_1080p()
        } else if bitrate >= 1_500_000 {
            Self {
                resolution: "1280x720".to_string(),
                bitrate,
                framerate: 30,
                codec: "VP8".to_string(),
            }
        } else {
            Self {
                resolution: "640x480".to_string(),
                bitrate,
                framerate: 24,
                codec: "VP8".to_string(),
            }
        }
    }
}

/// Network quality analyzer for video optimization
pub struct VideoQualityOptimizer {
    current_profile: Option<VideoQualityProfile>,
    target_fps: u32,
}

impl VideoQualityOptimizer {
    /// Create new video quality optimizer
    pub fn new() -> Self {
        Self {
            current_profile: None,
            target_fps: 30,
        }
    }

    /// Update quality profile based on current network conditions
    pub fn update_quality(&mut self, rtt_ms: u32, loss_percent: f32) -> MessengerResult<&VideoQualityProfile> {
        self.current_profile = Some(VideoQualityProfile::adaptive(rtt_ms, loss_percent));
        
        Ok(self.current_profile.as_ref().unwrap())
    }

    /// Get current quality profile
    pub fn get_current_profile(&self) -> Option<&VideoQualityProfile> {
        self.current_profile.as_ref()
    }

    /// Set target framerate
    pub fn set_target_fps(&mut self, fps: u32) {
        self.target_fps = fps;
        if let Some(ref mut profile) = self.current_profile {
            profile.framerate = fps;
        }
    }

    /// Check if current settings support 1080p@30fps
    pub fn supports_1080p_30fps(&self) -> bool {
        if let Some(profile) = &self.current_profile {
            profile.resolution == "1920x1080" && profile.framerate >= 30
        } else {
            false
        }
    }
}

impl Default for VideoQualityOptimizer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_target_bitrate_high_loss() {
        // High packet loss should result in 6 Mbps
        let bitrate = target_bitrate(50, 6.0);
        assert_eq!(bitrate, 6_000_000);
    }

    #[test]
    fn test_target_bitrate_low_latency() {
        // Low RTT with acceptable loss should result in 3 Mbps
        let bitrate = target_bitrate(80, 2.0);
        assert_eq!(bitrate, 3_000_000);
    }

    #[test]
    fn test_target_bitrate_high_latency() {
        // High RTT should result in 1 Mbps conservative approach
        let bitrate = target_bitrate(200, 3.0);
        assert_eq!(bitrate, 1_000_000);
    }

    #[test]
    fn test_video_quality_optimizer() {
        let mut optimizer = VideoQualityOptimizer::new();
        
        // Test low latency scenario
        let profile = optimizer.update_quality(50, 1.0).unwrap();
        assert_eq!(profile.resolution, "1920x1080");
        assert_eq!(profile.bitrate, 3_000_000);
        assert!(optimizer.supports_1080p_30fps());
        
        // Test high latency scenario
        let profile = optimizer.update_quality(300, 2.0).unwrap();
        assert_eq!(profile.bitrate, 1_000_000);
        assert!(!optimizer.supports_1080p_30fps());
    }

    #[test]
    fn test_adaptive_profile_creation() {
        // Test 1080p conditions
        let profile = VideoQualityProfile::adaptive(50, 1.0);
        assert_eq!(profile.resolution, "1920x1080");
        assert_eq!(profile.bitrate, 3_000_000);
        
        // Test fallback conditions
        let profile = VideoQualityProfile::adaptive(300, 2.0);
        assert_eq!(profile.bitrate, 1_000_000);
    }
}