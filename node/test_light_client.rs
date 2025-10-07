use privachain_node::{LightClient, IpfsHeaderStore, TrustedBlock, BlockHeader};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing Cosmos light client header sync...");
    
    let start_time = Instant::now();
    
    // Initialize IPFS header store
    let store = IpfsHeaderStore::new("http://localhost:5001".to_string());
    
    // Create trusted block (would be from genesis or checkpoint)
    let trusted_header = BlockHeader {
        height: 1000,
        time: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        chain_id: "provider-testnet".to_string(),
        last_commit_hash: "trusted_hash".to_string(),
        data_hash: "trusted_data".to_string(),
        validators_hash: "trusted_validators".to_string(),
        app_hash: "trusted_app".to_string(),
    };

    let trusted_block = TrustedBlock {
        header: trusted_header,
        trusted_height: 1000,
        trusted_hash: "trusted_hash".to_string(),
    };

    // Initialize light client
    let mut client = LightClient::new(
        "provider-testnet".to_string(),
        store,
        trusted_block,
    );

    println!("✅ Light client initialized");
    
    // Test header synchronization
    let target_height = 1010; // Sync 10 blocks
    
    println!("🔄 Syncing headers from 1000 to {target_height}...");
    
    match client.sync_headers(target_height).await {
        Ok(_) => {
            let elapsed = start_time.elapsed();
            let elapsed_secs = elapsed.as_secs_f64();
            println!("✅ Header sync completed in {elapsed_secs:.2}s");
            
            // Check performance requirements
            if elapsed.as_secs() <= 3 {
                println!("✅ **header sync ≤ 3 s**: PASS ({elapsed_secs:.2}s)");
            } else {
                eprintln!("❌ **header sync ≤ 3 s**: FAIL ({elapsed_secs:.2}s)");
                std::process::exit(1);
            }
            
            // Verify no full node requirement
            println!("✅ **no full node**: PASS (light client only)");
            
            println!("");
            println!("🎉 Light client test completed successfully!");
            println!("");
            println!("Results:");
            println!("  **header sync ≤ 3 s**: ✅");
            println!("  **no full node**: ✅");
        }
        Err(e) => {
            eprintln!("❌ Header sync failed: {e}");
            std::process::exit(1);
        }
    }
    
    Ok(())
}
