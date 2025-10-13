// src/media/neteq.rs - NetEQ jitter buffer and FEC for voice/video calls
//
// Provides jitter buffer and Forward Error Correction (FEC) for smooth media playback
// Addresses gaps: no jitter buffer, no FEC, no adaptive bitrate → glitches > 150 ms latency
//
// This is a mock/placeholder implementation. For production, integrate with:
// - webrtc-neteq crate (Rust port of Google NetEQ)
// - Or bind to native WebRTC NetEQ C++ library

use crate::{MessengerError, MessengerResult};
use std::collections::VecDeque;

/// Packet arrival information for jitter buffer
#[derive(Debug, Clone)]
pub struct PacketArrival {
    pub sequence_number: u32,
    pub timestamp: u32,
    pub payload: Vec<u8>,
    pub arrived_at: u64, // Milliseconds since epoch
}

/// Jitter buffer for smooth audio/video playback
#[derive(Debug)]
pub struct JitterBuffer {
    sample_rate: u32,
    target_delay_ms: u32,
    buffer: VecDeque<PacketArrival>,
    next_expected_seq: u32,
    max_buffer_size: usize,
}

impl JitterBuffer {
    /// Create a new jitter buffer
    /// 
    /// # Arguments
    /// * `sample_rate` - Audio sample rate in Hz (e.g., 48000 for Opus)
    /// * `target_delay_ms` - Target buffering delay in milliseconds (e.g., 60)
    ///
    /// # Example
    /// ```
    /// use privachain_messenger::media::neteq::JitterBuffer;
    /// let jb = JitterBuffer::new(48000, 60);
    /// ```
    pub fn new(sample_rate: u32, target_delay_ms: u32) -> Self {
        let max_buffer_size = ((sample_rate as u64 * target_delay_ms as u64) / 1000) as usize;
        Self {
            sample_rate,
            target_delay_ms,
            buffer: VecDeque::new(),
            next_expected_seq: 0,
            max_buffer_size,
        }
    }

    /// Add a packet to the jitter buffer
    pub fn add_packet(&mut self, packet: PacketArrival) -> MessengerResult<()> {
        // Check if buffer is full
        if self.buffer.len() >= self.max_buffer_size {
            return Err(MessengerError::NetworkError("Jitter buffer overflow".to_string()));
        }

        // Insert packet in sequence order
        let insert_pos = self.buffer
            .iter()
            .position(|p| p.sequence_number > packet.sequence_number)
            .unwrap_or(self.buffer.len());

        self.buffer.insert(insert_pos, packet);
        Ok(())
    }

    /// Get the next packet to play
    pub fn get_packet(&mut self) -> Option<PacketArrival> {
        // Check if we have enough buffered data
        if self.buffer.len() < (self.target_delay_ms as usize / 20) {
            // Not enough data buffered yet (assuming 20ms packets)
            return None;
        }

        // Get the next packet in sequence
        if let Some(packet) = self.buffer.front() {
            if packet.sequence_number == self.next_expected_seq {
                let packet = self.buffer.pop_front().unwrap();
                self.next_expected_seq = self.next_expected_seq.wrapping_add(1);
                return Some(packet);
            }
        }

        None
    }

    /// Check if the buffer has packets ready to play
    pub fn has_data(&self) -> bool {
        !self.buffer.is_empty()
    }

    /// Get current buffer size in packets
    pub fn buffer_size(&self) -> usize {
        self.buffer.len()
    }

    /// Get target delay in milliseconds
    pub fn target_delay(&self) -> u32 {
        self.target_delay_ms
    }

    /// Clear the buffer
    pub fn clear(&mut self) {
        self.buffer.clear();
    }
}

/// Forward Error Correction (FEC) encoder/decoder
#[derive(Debug)]
pub struct FecCodec {
    redundancy_level: u8, // 0-100 percentage
}

impl FecCodec {
    /// Create a new FEC codec
    ///
    /// # Arguments
    /// * `redundancy_level` - Percentage of redundancy to add (0-100)
    ///
    /// # Example
    /// ```
    /// use privachain_messenger::media::neteq::FecCodec;
    /// let fec = FecCodec::new(20); // 20% redundancy
    /// ```
    pub fn new(redundancy_level: u8) -> Self {
        Self {
            redundancy_level: redundancy_level.min(100),
        }
    }

    /// Encode a packet with FEC
    pub fn encode(&self, payload: &[u8]) -> MessengerResult<Vec<u8>> {
        // Mock implementation: In production, use real FEC like Reed-Solomon or RED FEC
        // For now, just duplicate some data for redundancy
        let mut encoded = payload.to_vec();
        
        if self.redundancy_level > 0 {
            let redundant_bytes = (payload.len() * self.redundancy_level as usize) / 100;
            // Add simple XOR-based redundancy (in production, use proper FEC)
            for i in 0..redundant_bytes.min(payload.len()) {
                encoded.push(payload[i] ^ 0xFF);
            }
        }

        Ok(encoded)
    }

    /// Decode a packet with FEC error recovery
    pub fn decode(&self, encoded: &[u8]) -> MessengerResult<Vec<u8>> {
        // Mock implementation: In production, use real FEC decoding
        // For now, just extract the original payload
        if self.redundancy_level == 0 {
            return Ok(encoded.to_vec());
        }

        let original_len = (encoded.len() * 100) / (100 + self.redundancy_level as usize);
        Ok(encoded[..original_len].to_vec())
    }

    /// Get the redundancy level
    pub fn redundancy_level(&self) -> u8 {
        self.redundancy_level
    }

    /// Set the redundancy level (0-100)
    pub fn set_redundancy_level(&mut self, level: u8) {
        self.redundancy_level = level.min(100);
    }
}

/// Adaptive bitrate controller for voice/video
#[derive(Debug)]
pub struct AdaptiveBitrate {
    current_bitrate: u32,
    min_bitrate: u32,
    max_bitrate: u32,
    target_bitrate: u32,
}

impl AdaptiveBitrate {
    /// Create a new adaptive bitrate controller
    pub fn new(min_bitrate: u32, max_bitrate: u32) -> Self {
        let target_bitrate = (min_bitrate + max_bitrate) / 2;
        Self {
            current_bitrate: target_bitrate,
            min_bitrate,
            max_bitrate,
            target_bitrate,
        }
    }

    /// Update bitrate based on network conditions
    ///
    /// # Arguments
    /// * `rtt_ms` - Round-trip time in milliseconds
    /// * `packet_loss_percent` - Packet loss percentage (0-100)
    pub fn update(&mut self, rtt_ms: u32, packet_loss_percent: f32) -> u32 {
        // Simple adaptive algorithm: decrease bitrate on poor conditions
        if rtt_ms > 200 || packet_loss_percent > 5.0 {
            // Poor network conditions
            self.current_bitrate = (self.current_bitrate * 80) / 100; // Reduce by 20%
        } else if rtt_ms < 100 && packet_loss_percent < 2.0 {
            // Good network conditions
            self.current_bitrate = (self.current_bitrate * 110) / 100; // Increase by 10%
        }

        // Clamp to min/max
        self.current_bitrate = self.current_bitrate.max(self.min_bitrate).min(self.max_bitrate);
        self.target_bitrate = self.current_bitrate;
        self.current_bitrate
    }

    /// Get current target bitrate
    pub fn current_bitrate(&self) -> u32 {
        self.current_bitrate
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jitter_buffer_creation() {
        let jb = JitterBuffer::new(48000, 60);
        assert_eq!(jb.sample_rate, 48000);
        assert_eq!(jb.target_delay_ms, 60);
        assert_eq!(jb.buffer_size(), 0);
    }

    #[test]
    fn test_jitter_buffer_add_packet() {
        let mut jb = JitterBuffer::new(48000, 60);
        
        let packet = PacketArrival {
            sequence_number: 0,
            timestamp: 0,
            payload: vec![1, 2, 3, 4],
            arrived_at: 1000,
        };

        assert!(jb.add_packet(packet).is_ok());
        assert_eq!(jb.buffer_size(), 1);
    }

    #[test]
    fn test_jitter_buffer_ordering() {
        let mut jb = JitterBuffer::new(48000, 60);
        
        // Add packets out of order
        let packet2 = PacketArrival {
            sequence_number: 2,
            timestamp: 40,
            payload: vec![5, 6, 7, 8],
            arrived_at: 1020,
        };
        jb.add_packet(packet2).unwrap();

        let packet0 = PacketArrival {
            sequence_number: 0,
            timestamp: 0,
            payload: vec![1, 2, 3, 4],
            arrived_at: 1000,
        };
        jb.add_packet(packet0).unwrap();

        let packet1 = PacketArrival {
            sequence_number: 1,
            timestamp: 20,
            payload: vec![9, 10, 11, 12],
            arrived_at: 1010,
        };
        jb.add_packet(packet1).unwrap();

        // Should be in order now
        assert_eq!(jb.buffer.len(), 3);
        assert_eq!(jb.buffer[0].sequence_number, 0);
        assert_eq!(jb.buffer[1].sequence_number, 1);
        assert_eq!(jb.buffer[2].sequence_number, 2);
    }

    #[test]
    fn test_fec_codec_creation() {
        let fec = FecCodec::new(20);
        assert_eq!(fec.redundancy_level(), 20);
    }

    #[test]
    fn test_fec_encode_decode() {
        let fec = FecCodec::new(20);
        let payload = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        
        let encoded = fec.encode(&payload).unwrap();
        assert!(encoded.len() > payload.len()); // Should have redundancy

        let decoded = fec.decode(&encoded).unwrap();
        assert_eq!(decoded, payload);
    }

    #[test]
    fn test_adaptive_bitrate() {
        let mut abr = AdaptiveBitrate::new(64000, 512000);
        
        // Good conditions should increase bitrate
        let initial = abr.current_bitrate();
        abr.update(50, 1.0);
        assert!(abr.current_bitrate() > initial);

        // Poor conditions should decrease bitrate
        let before_decrease = abr.current_bitrate();
        abr.update(300, 10.0);
        assert!(abr.current_bitrate() < before_decrease);
    }
}
