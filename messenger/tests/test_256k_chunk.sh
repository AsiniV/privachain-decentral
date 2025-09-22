#!/bin/bash
# test_256k_chunk.sh - Test bit-exact 256 KiB chunk padding

set -e

echo "🧪 Testing 256 KiB chunk padding..."

MESSENGER_DIR="$(dirname "$0")/.."
cd "$MESSENGER_DIR"

# Build the messenger library first
echo "🔨 Building messenger library..."
cargo build --release

echo "🔍 Testing chunk padding functionality..."

# Create a test runner that calls Rust chunk padding functions
cat > test_chunk_padding.rs << 'EOF'
use privachain_messenger::chunk_pad::{pad_to_chunk_size, unpad_chunk, split_into_chunks, reassemble_chunks};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing 256 KiB chunk padding...");
    
    // Test 1: Small message padding
    let small_message = b"Hello, world!";
    let padded = pad_to_chunk_size(small_message);
    
    if padded.len() != 256 * 1024 {
        eprintln!("❌ Chunk size test failed: expected 262144 bytes, got {}", padded.len());
        std::process::exit(1);
    }
    
    let unpadded = unpad_chunk(&padded)?;
    if unpadded != small_message {
        eprintln!("❌ Unpadding test failed: data mismatch");
        std::process::exit(1);
    }
    
    println!("✅ Small message padding: PASS");
    
    // Test 2: Large data splitting
    let large_data = vec![42u8; 1024 * 1024]; // 1 MB
    let chunks = split_into_chunks(&large_data);
    
    println!("📦 Split {} bytes into {} chunks", large_data.len(), chunks.len());
    
    for (i, chunk) in chunks.iter().enumerate() {
        if chunk.len() != 256 * 1024 {
            eprintln!("❌ Chunk {} size test failed: expected 262144 bytes, got {}", i, chunk.len());
            std::process::exit(1);
        }
    }
    
    let reassembled = reassemble_chunks(&chunks)?;
    if reassembled != large_data {
        eprintln!("❌ Reassembly test failed: data mismatch");
        std::process::exit(1);
    }
    
    println!("✅ Large data splitting: PASS");
    
    // Test 3: Exact 256 KiB boundary
    let boundary_data = vec![123u8; 256 * 1024 - 4]; // Max size that fits in one chunk
    let padded_boundary = pad_to_chunk_size(&boundary_data);
    
    if padded_boundary.len() != 256 * 1024 {
        eprintln!("❌ Boundary test failed: expected 262144 bytes, got {}", padded_boundary.len());
        std::process::exit(1);
    }
    
    let unpadded_boundary = unpad_chunk(&padded_boundary)?;
    if unpadded_boundary != boundary_data {
        eprintln!("❌ Boundary unpadding test failed");
        std::process::exit(1);
    }
    
    println!("✅ Boundary size test: PASS");
    
    println!("🎉 All chunk padding tests passed!");
    Ok(())
}
EOF

# Compile and run the test
rustc test_chunk_padding.rs --extern privachain_messenger=target/release/libprivachain_messenger.rlib -L target/release/deps
./test_chunk_padding

# Clean up
rm -f test_chunk_padding.rs test_chunk_padding

echo "✅ 256 KiB chunk padding tests completed successfully!"