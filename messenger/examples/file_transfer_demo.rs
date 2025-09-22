// file_transfer_demo.rs - Demonstration of file transfer with encryption and IPFS
//
// Shows how to use the new send_file function with progress tracking

use privachain_messenger::{FileTransfer, Cid};
use std::io::Write;
use std::path::Path;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 PrivaChain File Transfer Demo");
    println!("================================\n");

    // Create a sample file for demonstration
    let temp_dir = std::env::temp_dir();
    let demo_file = temp_dir.join("demo_file.txt");
    
    println!("📝 Creating demo file...");
    {
        let mut file = std::fs::File::create(&demo_file)?;
        let demo_content = format!(
            "This is a demonstration file for PrivaChain encrypted file transfer.\n\
             Created at: {}\n\
             This file will be:\n\
             1. Read in streaming chunks\n\
             2. Encrypted with AES-256-GCM\n\
             3. Uploaded to IPFS\n\
             4. Pinned for persistence\n\
             \n\
             The implementation includes progress tracking every 256 KiB.\n\
             {}",
            chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
            "🔐".repeat(100) // Make it a bit larger
        );
        file.write_all(demo_content.as_bytes())?;
    }
    
    println!("✅ Demo file created: {}", demo_file.display());
    
    // Generate a test encryption key
    let shared_key = [42u8; 32]; // In real usage, this would be derived from key exchange
    println!("🔑 Generated encryption key (32 bytes)");
    
    // Demo 1: Basic file transfer without progress
    println!("\n📤 Demo 1: Basic file transfer");
    println!("------------------------------");
    
    let cid = FileTransfer::send_file(&demo_file, &shared_key).await?;
    println!("✅ File uploaded to IPFS!");
    println!("   CID: {}", cid);
    
    // Demo 2: File transfer with progress tracking
    println!("\n📊 Demo 2: File transfer with progress tracking");
    println!("-----------------------------------------------");
    
    let mut progress_updates = Vec::new();
    let cid_with_progress = FileTransfer::send_file_with_progress(
        &demo_file, 
        &shared_key, 
        |percent| {
            println!("   Progress: {}%", percent);
            progress_updates.push(percent);
        }
    ).await?;
    
    println!("✅ File uploaded with progress tracking!");
    println!("   CID: {}", cid_with_progress);
    println!("   Progress updates: {:?}", progress_updates);
    
    // Demo 3: Show what happens with chunking
    println!("\n🧩 Demo 3: File chunking information");
    println!("-----------------------------------");
    
    let file_data = std::fs::read(&demo_file)?;
    let transfer = FileTransfer::new();
    let (info, chunks) = transfer.prepare_file_transfer("demo".to_string(), &file_data)?;
    
    println!("   Original file size: {} bytes", info.file_size);
    println!("   Number of chunks: {}", info.total_chunks);
    println!("   Chunk hashes: {} integrity checksums", info.chunk_hashes.len());
    
    for (i, chunk) in chunks.iter().enumerate().take(3) {
        println!("   Chunk {}: {} bytes", i, chunk.data.len());
    }
    if chunks.len() > 3 {
        println!("   ... and {} more chunks", chunks.len() - 3);
    }
    
    // Clean up
    println!("\n🧹 Cleaning up...");
    std::fs::remove_file(&demo_file)?;
    println!("✅ Demo file removed");
    
    println!("\n🎉 Demo completed successfully!");
    println!("   Key features demonstrated:");
    println!("   • Streaming file reading with ReaderStream");
    println!("   • AES-256-GCM encryption with random nonces");
    println!("   • Progress tracking every 256 KiB");
    println!("   • IPFS integration with content pinning");
    println!("   • File chunking for large file support");
    
    Ok(())
}