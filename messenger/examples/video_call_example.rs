// examples/video_call_example.rs - Example demonstrating 1080p@30fps video call setup
//
// This example shows how to use the three main components from the problem statement:
// 1. SRTP master from ratchet
// 2. Onion-UDP ICE candidate
// 3. Bitrate adapter

use privachain_messenger::{
    DoubleRatchet, WebRtcP2p, target_bitrate, VideoQualityOptimizer
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== STEP 5: Video-Call 1080p@30fps (STUN-less) Example ===\n");

    // Initialize components
    let initial_shared_key = b"example_shared_key_for_demo_32b!";
    let ratchet = DoubleRatchet::new(initial_shared_key)?;
    let webrtc = WebRtcP2p::new()?;
    let mut quality_optimizer = VideoQualityOptimizer::new();

    // Action 1: SRTP master from ratchet
    println!("Action 1: SRTP master from ratchet");
    let master_key = ratchet.derive_srtp_material(32)?;
    let _srtp = webrtc.create_srtp_context(&ratchet)?;
    let master_key_len = master_key.len();
    println!("✓ SRTP master key derived: {master_key_len} bytes");
    println!("✓ SRTP context created with master key\n");

    // Action 2: Onion-UDP ICE candidate
    println!("Action 2: Onion-UDP ICE candidate");
    let ice_candidate = webrtc.generate_onion_ice_candidate("onion1.priva", 9001);
    let candidate = &ice_candidate.candidate;
    let sdp_mid = &ice_candidate.sdp_mid;
    let sdp_mline_index = ice_candidate.sdp_mline_index;
    println!("✓ ICE candidate: {candidate}");
    println!("✓ SDP MID: {sdp_mid}");
    println!("✓ SDP MLine Index: {sdp_mline_index}\n");

    // Action 3: Bitrate adapter
    println!("Action 3: Bitrate adapter");
    
    // Test different network conditions
    let scenarios = [
        (50, 1.0, "Excellent conditions"),
        (100, 3.0, "Good conditions"),
        (200, 4.0, "Fair conditions"),
        (80, 6.0, "High loss scenario"),
    ];

    for (rtt_ms, loss_percent, description) in scenarios {
        let bitrate = target_bitrate(rtt_ms, loss_percent);
        let profile = quality_optimizer.update_quality(rtt_ms, loss_percent)?;
        
        let bitrate_mbps = bitrate as f32 / 1_000_000.0;
        println!("Scenario: {description} (RTT: {rtt_ms}ms, Loss: {loss_percent}%)");
        println!("  → Target bitrate: {bitrate} bps ({bitrate_mbps:.1} Mbps)");
        let resolution = &profile.resolution;
        let framerate = profile.framerate;
        let codec = &profile.codec;
        println!("  → Resolution: {resolution}");
        println!("  → Framerate: {framerate}fps");
        println!("  → Codec: {codec}");
        
        if quality_optimizer.supports_1080p_30fps() {
            println!("  ✓ Supports 1080p@30fps target");
        } else {
            println!("  ✗ Falls back from 1080p@30fps");
        }
        println!();
    }

    println!("=== Video Call Setup Complete ===");
    println!("Ready for STUN-less 1080p@30fps video calling!");

    Ok(())
}