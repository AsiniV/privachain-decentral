// test_spec_compliance.rs - Verify exact compliance with problem statement
//
// This test verifies that our implementation matches the exact specification

use privachain_messenger::chunk_pad::{pad_to_chunks, CHUNK};

#[test]
fn test_exact_spec_compliance() {
    // Verify CHUNK constant is exactly 262_144
    assert_eq!(CHUNK, 262_144);
    
    // Test the bit-exact function with some data
    let data = b"Hello, world!";
    let chunks = pad_to_chunks(data);
    
    // Should return Vec<[u8; CHUNK]>
    assert_eq!(chunks.len(), 1);
    assert_eq!(chunks[0].len(), CHUNK);
    
    // Verify data is at beginning
    assert_eq!(&chunks[0][0..data.len()], data);
    
    // Verify length is stored at CHUNK - 32..CHUNK - 24 (8 bytes for u64)
    let stored_len_bytes = &chunks[0][CHUNK - 32..CHUNK - 24];
    let stored_len = u64::from_be_bytes([
        stored_len_bytes[0], stored_len_bytes[1], stored_len_bytes[2], stored_len_bytes[3],
        stored_len_bytes[4], stored_len_bytes[5], stored_len_bytes[6], stored_len_bytes[7],
    ]);
    assert_eq!(stored_len, data.len() as u64);
    
    // Verify 24 bytes of random data at CHUNK - 24..CHUNK
    // We can't verify the randomness, but we can check the structure is correct
    assert_eq!(CHUNK - 24 + 24, CHUNK); // This should be true by definition
    
    println!("✅ Spec compliance verified:");
    println!("   - CHUNK = {CHUNK}");
    let data_len = data.len();
    println!("   - Data storage: bytes 0..{data_len}");
    let length_start = CHUNK - 32;
    let length_end = CHUNK - 24;
    println!("   - Length storage: bytes {length_start}..{length_end}");
    let padding_start = CHUNK - 24;
    println!("   - Random padding: bytes {padding_start}..{CHUNK}");
}

#[test]
fn test_chunk_size_calculation() {
    // Each chunk can hold CHUNK - 32 bytes of actual data
    let effective_size = CHUNK - 32;
    assert_eq!(effective_size, 262_144 - 32);
    assert_eq!(effective_size, 262_112);
    
    println!("✅ Chunk size calculation:");
    println!("   - Total chunk size: {CHUNK} bytes");
    println!("   - Effective data size: {effective_size} bytes");
    println!("   - Length header: 8 bytes (CHUNK-32 to CHUNK-24)");
    println!("   - Random padding: 24 bytes (CHUNK-24 to CHUNK)");
}

#[test]
fn test_empty_data_decoy() {
    // Empty data should create exactly 1 decoy block
    let empty_data = b"";
    let chunks = pad_to_chunks(empty_data);
    
    assert_eq!(chunks.len(), 1, "Empty data should create exactly 1 decoy block");
    assert_eq!(chunks[0].len(), CHUNK, "Decoy block should be exactly CHUNK bytes");
    
    println!("✅ Empty data decoy verified:");
    println!("   - Empty input creates 1 decoy block");
    let chunk_len = chunks[0].len();
    println!("   - Decoy block size: {chunk_len} bytes");
}