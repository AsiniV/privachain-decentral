// chunk_pad.rs - Constant 256 KiB Block Padding
//
// Ensures all message chunks are exactly 256 KiB for traffic analysis resistance

use crate::{MessengerError, MessengerResult};
use rand::Rng;

const CHUNK_SIZE: usize = 256 * 1024; // 256 KiB

// New constant for bit-exact implementation
pub const CHUNK: usize = 262_144; // 256 KiB

/// Pad data to exactly 256 KiB blocks
pub fn pad_to_chunk_size(data: &[u8]) -> Vec<u8> {
    let data_len = data.len();
    
    if data_len >= CHUNK_SIZE {
        // For data larger than chunk size, just return as-is
        // Caller should split into multiple chunks
        return data.to_vec();
    }
    
    let mut padded = vec![0u8; CHUNK_SIZE];
    
    // Copy actual data
    padded[..data_len].copy_from_slice(data);
    
    // Add length prefix at the end
    let len_bytes = (data_len as u32).to_be_bytes();
    padded[CHUNK_SIZE - 4..].copy_from_slice(&len_bytes);
    
    padded
}

/// Remove padding from 256 KiB chunk to get original data
pub fn unpad_chunk(padded_data: &[u8]) -> MessengerResult<Vec<u8>> {
    if padded_data.len() != CHUNK_SIZE {
        return Err(MessengerError::DecryptionFailed(
            format!("Invalid chunk size: {} bytes", padded_data.len())
        ));
    }
    
    // Extract length from last 4 bytes
    let len_bytes = &padded_data[CHUNK_SIZE - 4..];
    let original_len = u32::from_be_bytes([len_bytes[0], len_bytes[1], len_bytes[2], len_bytes[3]]) as usize;
    
    if original_len >= CHUNK_SIZE {
        return Err(MessengerError::DecryptionFailed(
            format!("Invalid original length: {} bytes", original_len)
        ));
    }
    
    Ok(padded_data[..original_len].to_vec())
}

/// Split large data into 256 KiB chunks
pub fn split_into_chunks(data: &[u8]) -> Vec<Vec<u8>> {
    let mut chunks = Vec::new();
    let effective_chunk_size = CHUNK_SIZE - 4; // Reserve 4 bytes for length
    
    for chunk_data in data.chunks(effective_chunk_size) {
        chunks.push(pad_to_chunk_size(chunk_data));
    }
    
    chunks
}

/// Reassemble chunks back into original data
pub fn reassemble_chunks(chunks: &[Vec<u8>]) -> MessengerResult<Vec<u8>> {
    let mut result = Vec::new();
    
    for chunk in chunks {
        let unpacked = unpad_chunk(chunk)?;
        result.extend_from_slice(&unpacked);
    }
    
    Ok(result)
}

/// Bit-exact function: pad data to chunks of exactly 256 KiB
pub fn pad_to_chunks(data: &[u8]) -> Vec<[u8; CHUNK]> {
    let mut out = Vec::new();
    for c in data.chunks(CHUNK - 32) {
        let mut block = [0u8; CHUNK];
        block[0..c.len()].copy_from_slice(c);
        block[CHUNK - 32..CHUNK - 24].copy_from_slice(&(c.len() as u64).to_be_bytes());
        block[CHUNK - 24..CHUNK].copy_from_slice(&rand::thread_rng().gen::<[u8; 24]>());
        out.push(block);
    }
    if out.is_empty() {
        let mut rng = rand::thread_rng();
        let mut decoy_block = [0u8; CHUNK];
        for byte in &mut decoy_block {
            *byte = rng.gen();
        }
        out.push(decoy_block); // 1 decoy block
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_padding() {
        let original = b"Hello, world!";
        let padded = pad_to_chunk_size(original);
        
        assert_eq!(padded.len(), CHUNK_SIZE);
        
        let unpadded = unpad_chunk(&padded).unwrap();
        assert_eq!(original, unpadded.as_slice());
    }

    #[test]
    fn test_split_and_reassemble() {
        let large_data = vec![42u8; 1024 * 1024]; // 1 MB of data
        
        let chunks = split_into_chunks(&large_data);
        assert!(chunks.len() > 1); // Should be split into multiple chunks
        
        for chunk in &chunks {
            assert_eq!(chunk.len(), CHUNK_SIZE);
        }
        
        let reassembled = reassemble_chunks(&chunks).unwrap();
        assert_eq!(large_data, reassembled);
    }

    #[test]
    fn test_bit_exact_pad_to_chunks() {
        // Test with small data
        let data = b"Hello, world!";
        let chunks = pad_to_chunks(data);
        
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].len(), CHUNK);
        
        // Check data is at the beginning
        assert_eq!(&chunks[0][0..data.len()], data);
        
        // Check length is stored at CHUNK - 32..CHUNK - 24
        let stored_len = u64::from_be_bytes([
            chunks[0][CHUNK - 32], chunks[0][CHUNK - 31], chunks[0][CHUNK - 30], chunks[0][CHUNK - 29],
            chunks[0][CHUNK - 28], chunks[0][CHUNK - 27], chunks[0][CHUNK - 26], chunks[0][CHUNK - 25],
        ]);
        assert_eq!(stored_len, data.len() as u64);
    }

    #[test]
    fn test_pad_to_chunks_empty_data() {
        // Test with empty data should create one decoy block
        let data = b"";
        let chunks = pad_to_chunks(data);
        
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].len(), CHUNK);
        
        // For empty data, the decoy block is entirely random (no data or length info)
        // We can't predict the content, just verify the size
    }

    #[test]
    fn test_pad_to_chunks_large_data() {
        // Test with data larger than CHUNK - 32
        let large_data = vec![42u8; CHUNK]; // Larger than CHUNK - 32
        let chunks = pad_to_chunks(&large_data);
        
        assert!(chunks.len() > 1); // Should be split into multiple chunks
        
        for chunk in &chunks {
            assert_eq!(chunk.len(), CHUNK);
        }
    }
}