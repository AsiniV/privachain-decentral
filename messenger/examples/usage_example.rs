// usage_example.rs - Demonstrates complete STEP 2 implementation
//
// This example shows all three actions from the problem statement in use

use privachain_messenger::chunk_pad::{pad_to_chunks, CHUNK};
use privachain_messenger::decoy_loop::spawn_decoy;
use privachain_messenger::onion_integration::send_with_decoy_example;
use tokio::sync::mpsc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 STEP 2: Constant-Size 256 KiB Blocks + Decoy - Usage Example");
    println!("================================================================");
    
    // Action 1: Bit-exact function demonstration
    println!("\n📦 Action 1: Bit-exact pad_to_chunks function");
    println!("   CHUNK constant: {CHUNK} bytes (256 KiB)");
    
    let test_data = b"Hello, this is a test message for the onion router!";
    let chunks = pad_to_chunks(test_data);
    
    let test_data_len = test_data.len();
    println!("   Input data: {test_data_len} bytes");
    let chunks_len = chunks.len();
    println!("   Output chunks: {chunks_len} chunks of {CHUNK} bytes each");
    println!("   ✅ Data chunked with length header and random padding");
    
    // Action 2: Decoy loop demonstration
    println!("\n🎭 Action 2: spawn_decoy function");
    let (tx, mut rx) = mpsc::channel::<Vec<u8>>(10);
    spawn_decoy(tx.clone());
    println!("   ✅ Decoy loop spawned - sends 262,144 bytes every 30 seconds");
    
    // Action 3: Integration example
    println!("\n🧅 Action 3: Onion routing integration");
    let plaintext = b"Secret message for onion routing with traffic analysis resistance";
    
    // This demonstrates the integration pattern from Action 3
    send_with_decoy_example(plaintext, tx.clone()).await?;
    println!("   ✅ Message sent through onion routing with decoy traffic");
    
    // Show receiving a few chunks
    println!("\n📡 Receiving chunks (first few):");
    let mut count = 0;
    while count < 3 {
        match tokio::time::timeout(std::time::Duration::from_millis(100), rx.recv()).await {
            Ok(Some(chunk)) => {
                let chunk_num = count + 1;
                let chunk_len = chunk.len();
                println!("   Received chunk {chunk_num}: {chunk_len} bytes");
                count += 1;
            }
            _ => break,
        }
    }
    
    println!("\n✅ STEP 2 implementation complete and functional!");
    println!("   - Constant 256 KiB blocks with exact specification");
    println!("   - Async decoy traffic every 30 seconds");
    println!("   - Integration with onion routing");
    
    Ok(())
}