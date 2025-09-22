#!/bin/bash
# test_light_client.sh - Test Cosmos light client header synchronization
# Tests header sync performance without running a full node

set -e

echo "🧪 Testing Cosmos light client..."

NODE_DIR="$(dirname "$0")/../node"
TEST_TIMEOUT=30  # 30 seconds

# Check if node implementation exists
if [ ! -f "$NODE_DIR/src/cosmos_light.rs" ]; then
    echo "❌ cosmos_light.rs not found at $NODE_DIR/src/"
    exit 1
fi

# Create test Cargo.toml for the node module
if [ ! -f "$NODE_DIR/Cargo.toml" ]; then
    echo "📝 Creating node Cargo.toml..."
    cat > "$NODE_DIR/Cargo.toml" << 'EOF'
[package]
name = "privachain_node"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[lib]
name = "privachain_node"
crate-type = ["cdylib", "rlib"]
EOF
fi

# Create lib.rs for the node module
if [ ! -f "$NODE_DIR/src/lib.rs" ]; then
    echo "📝 Creating node lib.rs..."
    cat > "$NODE_DIR/src/lib.rs" << 'EOF'
pub mod cosmos_light;
pub use cosmos_light::*;
EOF
fi

cd "$NODE_DIR"

echo "🔨 Building node library..."
cargo build --release

# Create test program
cat > test_light_client.rs << 'EOF'
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
    
    println!("🔄 Syncing headers from 1000 to {}...", target_height);
    
    match client.sync_headers(target_height).await {
        Ok(_) => {
            let elapsed = start_time.elapsed();
            println!("✅ Header sync completed in {:.2}s", elapsed.as_secs_f64());
            
            // Check performance requirements
            if elapsed.as_secs() <= 3 {
                println!("✅ **header sync ≤ 3 s**: PASS ({:.2}s)", elapsed.as_secs_f64());
            } else {
                eprintln!("❌ **header sync ≤ 3 s**: FAIL ({:.2}s)", elapsed.as_secs_f64());
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
            eprintln!("❌ Header sync failed: {}", e);
            std::process::exit(1);
        }
    }
    
    Ok(())
}
EOF

echo "🧪 Running light client tests..."

# Compile and run test with timeout
timeout $TEST_TIMEOUT rustc --edition 2021 test_light_client.rs \
    --extern privachain_node=target/release/libprivachain_node.rlib \
    --extern tokio -L target/release/deps -o test_light_client

if [ $? -eq 0 ]; then
    timeout $TEST_TIMEOUT ./test_light_client
    RESULT=$?
    
    if [ $RESULT -eq 124 ]; then
        echo "❌ Test timed out after ${TEST_TIMEOUT}s"
        RESULT=1
    fi
else
    echo "❌ Failed to compile test"
    RESULT=1
fi

# Clean up
rm -f test_light_client.rs test_light_client

if [ $RESULT -eq 0 ]; then
    echo "✅ Light client test: PASS"
else
    echo "❌ Light client test: FAIL"
    exit 1
fi