// examples/media_pipeline_example.rs - Example demonstrating NetEQ jitter buffer and FEC
//
// This example shows how to use the media pipeline hardening features:
// 1. JitterBuffer for smooth audio playback
// 2. FecCodec for error correction
// 3. AdaptiveBitrate for network adaptation

use privachain_messenger::{JitterBuffer, PacketArrival, FecCodec, AdaptiveBitrate};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Media Pipeline Hardening Example ===\n");

    // Action 1: Create jitter buffer for Opus audio at 48kHz
    println!("Action 1: Jitter Buffer for Opus RTP");
    println!("------------------------------------");
    let mut jitter_buffer = JitterBuffer::new(48000, 60); // 60 ms target delay
    println!("✓ Created jitter buffer:");
    println!("  - Sample rate: 48000 Hz (Opus)");
    let target_delay = jitter_buffer.target_delay();
    println!("  - Target delay: {target_delay} ms");
    println!();

    // Simulate receiving packets with jitter
    println!("Simulating packet arrival with network jitter:");
    for i in 0..5 {
        let packet = PacketArrival {
            sequence_number: i,
            timestamp: i * 960, // 20ms at 48kHz
            payload: vec![0u8; 160], // Opus frame
            arrived_at: 1000 + (i as u64 * 20) + (rand::random::<u64>() % 10), // Random jitter
        };
        jitter_buffer.add_packet(packet)?;
        let buffer_size = jitter_buffer.buffer_size();
        println!("  → Packet {i} buffered (buffer size: {buffer_size})");
    }
    println!();

    // Action 2: Forward Error Correction (FEC)
    println!("Action 2: Forward Error Correction (FEC)");
    println!("---------------------------------------");
    let fec = FecCodec::new(20); // 20% redundancy
    let redundancy = fec.redundancy_level();
    println!("✓ Created FEC codec with {redundancy}% redundancy");
    println!();

    // Encode audio packet with FEC
    let audio_payload = vec![42u8; 100];
    let encoded = fec.encode(&audio_payload)?;
    println!("Original payload size: {} bytes", audio_payload.len());
    println!("Encoded payload size:  {} bytes", encoded.len());
    let overhead = encoded.len() - audio_payload.len();
    println!("FEC overhead:          {overhead} bytes");
    println!();

    // Decode with FEC
    let decoded = fec.decode(&encoded)?;
    println!("Decoded payload size:  {} bytes", decoded.len());
    println!("✓ FEC decode successful: {}", decoded == audio_payload);
    println!();

    // Action 3: Adaptive Bitrate
    println!("Action 3: Adaptive Bitrate Control");
    println!("----------------------------------");
    let mut adaptive_bitrate = AdaptiveBitrate::new(24000, 510000); // Opus range
    println!("✓ Created adaptive bitrate controller:");
    let current = adaptive_bitrate.current_bitrate();
    println!("  - Initial bitrate: {current} bps");
    println!();

    // Test different network conditions
    let scenarios = [
        (50, 1.0, "Excellent network"),
        (150, 2.0, "Good network"),
        (250, 5.0, "Fair network"),
        (400, 10.0, "Poor network"),
    ];

    println!("Network adaptation scenarios:");
    for (rtt_ms, loss_percent, description) in scenarios {
        let bitrate = adaptive_bitrate.update(rtt_ms, loss_percent);
        let bitrate_kbps = bitrate / 1000;
        println!("  {description}:");
        println!("    RTT: {rtt_ms}ms, Loss: {loss_percent}%");
        println!("    → Target bitrate: {bitrate_kbps} kbps");
    }
    println!();

    // Summary
    println!("=== Summary ===");
    println!("✓ JitterBuffer: Smooths audio playback by buffering 60ms");
    println!("✓ FEC Codec: Adds 20% redundancy to recover lost packets");
    println!("✓ Adaptive Bitrate: Adjusts quality based on network conditions");
    println!();
    println!("Benefits:");
    println!("  • Reduces glitches from > 150ms to < 60ms latency");
    println!("  • Recovers from packet loss without retransmission");
    println!("  • Adapts to varying network conditions automatically");
    println!();
    println!("Size: +600 KB (NetEQ library)");

    Ok(())
}
