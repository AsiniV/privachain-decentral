use privachain_messenger::decoy_loop::DecoyLoop;
use std::time::{Duration, Instant};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing decoy traffic timing...");
    
    let mut decoy_loop = DecoyLoop::new();
    let start_time = Instant::now();
    
    // Test initial timing
    let initial_delay = decoy_loop.time_until_next_decoy();
    println!("⏰ Initial delay: {:.2}s", initial_delay.as_secs_f64());
    
    // Check that initial delay is within expected range (30s ± 5%)
    let min_delay = Duration::from_millis((30000.0 * 0.95) as u64);
    let max_delay = Duration::from_millis((30000.0 * 1.05) as u64);
    
    if initial_delay < min_delay || initial_delay > max_delay {
        eprintln!("❌ Initial timing test failed: {:.2}s not in range {:.2}s - {:.2}s", 
                 initial_delay.as_secs_f64(), 
                 min_delay.as_secs_f64(), 
                 max_delay.as_secs_f64());
        std::process::exit(1);
    }
    
    println!("✅ Initial timing: PASS");
    
    // Test multiple intervals for jitter
    let mut intervals = Vec::new();
    for i in 0..10 {
        // Simulate passage of time by manually updating the decoy loop
        decoy_loop = DecoyLoop::new(); // Create fresh instance to get different jitter
        let delay = decoy_loop.time_until_next_decoy();
        intervals.push(delay.as_millis());
        println!("📊 Interval {}: {:.2}s", i + 1, delay.as_secs_f64());
    }
    
    // Check that intervals are not all identical (jitter is working)
    let first_interval = intervals[0];
    let has_variation = intervals.iter().any(|&interval| interval != first_interval);
    
    if !has_variation {
        eprintln!("❌ Jitter test failed: all intervals are identical");
        std::process::exit(1);
    }
    
    println!("✅ Jitter variation: PASS");
    
    // Check all intervals are within valid range
    for (i, &interval_ms) in intervals.iter().enumerate() {
        let interval_s = interval_ms as f64 / 1000.0;
        if interval_s < 28.5 || interval_s > 31.5 {
            eprintln!("❌ Interval {} out of range: {:.2}s", i + 1, interval_s);
            std::process::exit(1);
        }
    }
    
    println!("✅ All intervals in range: PASS");
    
    // Test decoy traffic generation
    let decoy_data = decoy_loop.generate_decoy_traffic();
    if decoy_data.len() != 256 * 1024 {
        eprintln!("❌ Decoy data size test failed: expected 262144 bytes, got {}", decoy_data.len());
        std::process::exit(1);
    }
    
    println!("✅ Decoy traffic generation: PASS");
    
    // Test should_send_decoy logic (simulate time passage)
    let mut test_loop = DecoyLoop::new();
    
    // Initially should not send (just created)
    if test_loop.should_send_decoy() {
        eprintln!("❌ Fresh loop should not send decoy immediately");
        std::process::exit(1);
    }
    
    println!("✅ Fresh loop timing: PASS");
    
    println!("🎉 All decoy timing tests passed!");
    
    // Summary statistics
    let avg_interval: f64 = intervals.iter().map(|&x| x as f64).sum::<f64>() / intervals.len() as f64 / 1000.0;
    let min_interval = intervals.iter().min().unwrap();
    let max_interval = intervals.iter().max().unwrap();
    
    println!("📈 Timing statistics:");
    println!("   Average: {:.2}s", avg_interval);
    println!("   Range: {:.2}s - {:.2}s", *min_interval as f64 / 1000.0, *max_interval as f64 / 1000.0);
    println!("   Jitter: {:.1}%", ((max_interval - min_interval) as f64 / avg_interval / 10.0));
    
    Ok(())
}
