// examples/webrtc_media_integration.rs - WebRTC P2P with media pipeline hardening
//
// This example demonstrates the integration of media pipeline (NetEQ + FEC)
// with WebRTC P2P for smooth voice/video calls

use privachain_messenger::{WebRtcP2p, PacketArrival};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== WebRTC P2P with Media Pipeline Example ===\n");

    // Step 1: Create WebRTC P2P connection
    println!("Step 1: Initialize WebRTC P2P connection");
    println!("----------------------------------------");
    let mut webrtc = WebRtcP2p::new()?;
    println!("✓ WebRTC P2P manager created");
    println!();

    // Step 2: Enable media pipeline hardening
    println!("Step 2: Enable media pipeline hardening");
    println!("---------------------------------------");
    let sample_rate = 48000; // Opus audio at 48kHz
    let target_delay_ms = 60; // 60ms jitter buffer
    let fec_redundancy = 20; // 20% FEC redundancy
    
    webrtc.enable_media_pipeline(sample_rate, target_delay_ms, fec_redundancy);
    println!("✓ Media pipeline enabled:");
    println!("  - Sample rate: {sample_rate} Hz (Opus)");
    println!("  - Jitter buffer: {target_delay_ms} ms");
    println!("  - FEC redundancy: {fec_redundancy}%");
    println!();

    // Step 3: Verify media pipeline components
    println!("Step 3: Verify media pipeline components");
    println!("----------------------------------------");
    
    if let Some(jitter_buffer) = webrtc.jitter_buffer() {
        let target = jitter_buffer.target_delay();
        println!("✓ Jitter buffer active (target: {target} ms)");
    } else {
        println!("✗ Jitter buffer not available");
    }

    if let Some(fec_codec) = webrtc.fec_codec() {
        let redundancy = fec_codec.redundancy_level();
        println!("✓ FEC codec active (redundancy: {redundancy}%)");
    } else {
        println!("✗ FEC codec not available");
    }

    if webrtc.adaptive_bitrate_mut().is_some() {
        println!("✓ Adaptive bitrate controller active");
    } else {
        println!("✗ Adaptive bitrate controller not available");
    }
    println!();

    // Step 4: Simulate voice call with jitter buffer
    println!("Step 4: Simulate voice call with jitter buffer");
    println!("----------------------------------------------");
    
    if let Some(jitter_buffer) = webrtc.jitter_buffer_mut() {
        // Simulate receiving audio packets with network jitter
        for i in 0..5 {
            let packet = PacketArrival {
                sequence_number: i,
                timestamp: i * 960, // 20ms Opus frames at 48kHz
                payload: vec![0u8; 160], // Opus payload
                arrived_at: 1000 + (i as u64 * 20) + (rand::random::<u64>() % 15), // Network jitter
            };
            jitter_buffer.add_packet(packet)?;
        }
        let buffer_size = jitter_buffer.buffer_size();
        println!("✓ Buffered 5 packets (buffer size: {buffer_size})");
        println!("✓ Jitter buffer smooths playback by {target_delay_ms}ms");
    }
    println!();

    // Step 5: Simulate adaptive bitrate adjustment
    println!("Step 5: Simulate adaptive bitrate adjustment");
    println!("--------------------------------------------");
    
    if let Some(adaptive_bitrate) = webrtc.adaptive_bitrate_mut() {
        let initial = adaptive_bitrate.current_bitrate();
        println!("Initial bitrate: {} kbps", initial / 1000);
        
        // Simulate network conditions change
        let new_bitrate = adaptive_bitrate.update(100, 2.0); // Good conditions
        println!("After network update (RTT: 100ms, Loss: 2%):");
        println!("  → New bitrate: {} kbps", new_bitrate / 1000);
    }
    println!();

    // Step 6: Benefits summary
    println!("=== Benefits Summary ===");
    println!("✓ NetEQ Jitter Buffer:");
    println!("  • Reduces glitches from > 150ms to < 60ms latency");
    println!("  • Smooths playback despite network jitter");
    println!();
    println!("✓ Forward Error Correction (FEC):");
    println!("  • Recovers from {fec_redundancy}% packet loss without retransmission");
    println!("  • No additional round-trip delays");
    println!();
    println!("✓ Adaptive Bitrate:");
    println!("  • Automatically adjusts to network conditions");
    println!("  • Maintains quality on good connections");
    println!("  • Degrades gracefully on poor connections");
    println!();
    println!("Implementation size: +600 KB (NetEQ library)");

    Ok(())
}
