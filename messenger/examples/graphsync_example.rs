// examples/graphsync_example.rs - Example demonstrating GraphSync resumable file transfer
//
// This example shows how to use GraphSync for large file transfers:
// 1. Send file with CAR-split (1 MB chunks)
// 2. Resume interrupted transfers
// 3. Track progress

use privachain_messenger::{GraphSync, TransferState, send_with_graphsync, resume_transfer};
use std::io::Write;
use tempfile::TempDir;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== GraphSync Resumable File Transfer Example ===\n");

    // Setup: Create a test file (10 MB)
    let temp_dir = TempDir::new()?;
    let file_path = temp_dir.path().join("large_file.bin");
    println!("Setup: Creating 10 MB test file...");
    let mut file = std::fs::File::create(&file_path)?;
    let test_data = vec![42u8; 10_000_000]; // 10 MB
    file.write_all(&test_data)?;
    let file_path_display = file_path.display();
    println!("✓ Created test file: {file_path_display}");
    println!();

    // Action 1: Send file with GraphSync (1 MB chunks)
    println!("Action 1: Send file with CAR-split");
    println!("-----------------------------------");
    let chunk_size = 1 << 20; // 1 MB chunks as per problem statement
    let state = send_with_graphsync(&file_path, chunk_size).await?;
    
    let total_chunks = state.total_chunks;
    let file_size = test_data.len();
    println!("✓ File split into CAR chunks:");
    println!("  - Total size: {} bytes ({} MB)", file_size, file_size / (1024 * 1024));
    println!("  - Chunk size: {chunk_size} bytes (1 MB)");
    println!("  - Total chunks: {total_chunks}");
    println!();

    // Display chunk CIDs (roots)
    println!("Chunk CIDs (roots):");
    for (i, cid) in state.chunk_cids.iter().take(3).enumerate() {
        println!("  Chunk {i}: {cid}");
    }
    if state.chunk_cids.len() > 3 {
        let remaining = state.chunk_cids.len() - 3;
        println!("  ... and {remaining} more chunks");
    }
    println!();

    // Action 2: Simulate partial download and resume
    println!("Action 2: Resume interrupted transfer");
    println!("-------------------------------------");
    
    // Simulate partial completion (e.g., receiver went offline after 50%)
    let mut partial_state = state.clone();
    for i in 0..(total_chunks / 2) {
        partial_state.completed_chunks.push(i);
    }
    
    let progress = partial_state.progress_percent();
    println!("Simulated interruption:");
    println!("  - Progress: {progress:.1}%");
    let completed = partial_state.completed_chunks.len();
    println!("  - Completed chunks: {completed}/{total_chunks}");
    let remaining_count = partial_state.remaining_chunks().len();
    println!("  - Remaining chunks: {remaining_count}");
    println!();

    // Resume transfer
    let output_path = temp_dir.path().join("received_file.bin");
    println!("Resuming transfer...");
    let resumed_state = resume_transfer(partial_state, &output_path).await?;
    
    let new_progress = resumed_state.progress_percent();
    let new_completed = resumed_state.completed_chunks.len();
    println!("✓ Transfer resumed:");
    println!("  - New progress: {new_progress:.1}%");
    println!("  - Completed chunks: {new_completed}/{total_chunks}");
    println!();

    // Action 3: Show benefits
    println!("Action 3: Benefits Analysis");
    println!("--------------------------");
    println!("Without GraphSync:");
    println!("  ✗ 100 MB file → single IPFS hash");
    println!("  ✗ Receiver offline → restart from 0");
    println!("  ✗ No progress tracking");
    println!();
    println!("With GraphSync:");
    println!("  ✓ CAR-split into 1 MB chunks");
    println!("  ✓ Resume from last completed chunk");
    println!("  ✓ Progress tracking: {new_progress:.1}%");
    println!("  ✓ Parallel chunk downloads via gossip");
    println!();

    // Example gossip broadcast pattern
    println!("Gossip broadcast pattern:");
    println!("```rust");
    println!("let out = GraphSync::send(path, chunk_size=1<<20).await?;");
    println!("for cid in out.chunk_cids {{");
    println!("    gossip.broadcast(cid).await?;");
    println!("}}");
    println!("```");
    println!();

    // Summary
    println!("=== Summary ===");
    println!("✓ GraphSync: Resumable file transfers with CAR-split");
    println!("✓ Chunk size: 1 MB (configurable)");
    let saved_bandwidth = ((total_chunks / 2) as f32 / total_chunks as f32) * 100.0;
    println!("✓ Bandwidth saved on resume: ~{saved_bandwidth:.0}%");
    println!();
    println!("Size: +400 KB (rust-graphsync library)");

    Ok(())
}
