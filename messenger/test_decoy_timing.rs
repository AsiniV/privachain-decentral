use privachain_messenger::decoy_loop::DecoyLoop;
use std::time::{Duration, Instant};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing decoy traffic timing...");
    
    let mut decoy_loop = DecoyLoop::new();
    let start_time = Instant::now();
    
    // Test initial timing
    let initial_delay = decoy_loop.time_until_next_decoy();
    let initial_delay_secs = initial_delay.as_secs_f64();
    println!("⏰ Initial delay: {initial_delay_secs:.2}s");
    
    // Check that initial delay is within expected range (30s ± 5%)
    let min_delay = Duration::from_millis((30000.0 * 0.95) as u64);
    let max_delay = Duration::from_millis((30000.0 * 1.05) as u64);
    
    if initial_delay < min_delay || initial_delay > max_delay {
        let initial_secs = initial_delay.as_secs_f64();
        let min_secs = min_delay.as_secs_f64();
        let max_secs = max_delay.as_secs_f64();
        eprintln!("❌ Initial timing test failed: {initial_secs:.2}s not in range {min_secs:.2}s - {max_secs:.2}s");
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
        let interval_num = i + 1;
        let delay_secs = delay.as_secs_f64();
        println!("📊 Interval {interval_num}: {delay_secs:.2}s");
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
            let interval_num = i + 1;
            eprintln!("❌ Interval {interval_num} out of range: {interval_s:.2}s");
            std::process::exit(1);
        }
    }
    
    println!("✅ All intervals in range: PASS");
    
    // Test decoy traffic generation
    let decoy_data = decoy_loop.generate_decoy_traffic();
    if decoy_data.len() != 256 * 1024 {
        let got_len = decoy_data.len();
        eprintln!("❌ Decoy data size test failed: expected 262144 bytes, got {got_len}");
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
    println!("   Average: {avg_interval:.2}s");
    let min_secs = *min_interval as f64 / 1000.0;
    let max_secs = *max_interval as f64 / 1000.0;
    println!("   Range: {min_secs:.2}s - {max_secs:.2}s");
    let jitter = ((max_interval - min_interval) as f64 / avg_interval / 10.0);
    println!("   Jitter: {jitter:.1}%");
    
    Ok(())
}
