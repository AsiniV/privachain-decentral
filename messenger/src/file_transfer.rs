// file_transfer.rs - Chunked File Transfer
//
// Handles large file transfers using chunked streaming with 256 KiB blocks

use crate::{MessengerError, MessengerResult, chunk_pad::{split_into_chunks, reassemble_chunks}};
use serde::{Deserialize, Serialize};

/// File transfer metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTransferInfo {
    pub file_id: String,
    pub total_chunks: usize,
    pub file_size: usize,
    pub chunk_hashes: Vec<Vec<u8>>,
}

/// Individual file chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChunk {
    pub file_id: String,
    pub chunk_index: usize,
    pub data: Vec<u8>,
    pub hash: Vec<u8>,
}

/// File transfer manager
pub struct FileTransfer {
    // TODO: Add progress tracking and resumption capabilities
}

impl FileTransfer {
    /// Create new file transfer manager
    pub fn new() -> Self {
        Self {}
    }

    /// Prepare file for transfer by splitting into chunks
    pub fn prepare_file_transfer(&self, file_id: String, file_data: &[u8]) -> MessengerResult<(FileTransferInfo, Vec<FileChunk>)> {
        let chunks = split_into_chunks(file_data);
        let mut chunk_hashes = Vec::new();
        let mut file_chunks = Vec::new();

        for (index, chunk_data) in chunks.into_iter().enumerate() {
            // Calculate hash for integrity checking
            let hash = sha2::Sha256::digest(&chunk_data).to_vec();
            chunk_hashes.push(hash.clone());

            let chunk = FileChunk {
                file_id: file_id.clone(),
                chunk_index: index,
                data: chunk_data,
                hash,
            };
            file_chunks.push(chunk);
        }

        let transfer_info = FileTransferInfo {
            file_id,
            total_chunks: file_chunks.len(),
            file_size: file_data.len(),
            chunk_hashes,
        };

        Ok((transfer_info, file_chunks))
    }

    /// Reassemble file from received chunks
    pub fn reassemble_file(&self, _transfer_info: &FileTransferInfo, chunks: Vec<FileChunk>) -> MessengerResult<Vec<u8>> {
        // Sort chunks by index
        let mut sorted_chunks = chunks;
        sorted_chunks.sort_by_key(|c| c.chunk_index);

        // Extract chunk data
        let chunk_data: Vec<Vec<u8>> = sorted_chunks.into_iter().map(|c| c.data).collect();

        // Reassemble using chunk padding utilities
        reassemble_chunks(&chunk_data)
    }
}

impl Default for FileTransfer {
    fn default() -> Self {
        Self::new()
    }
}

use sha2::Digest;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_transfer_preparation() {
        let transfer = FileTransfer::new();
        let file_data = vec![42u8; 1024 * 1024]; // 1 MB file
        
        let (info, chunks) = transfer.prepare_file_transfer("test_file".to_string(), &file_data).unwrap();
        
        assert_eq!(info.file_size, file_data.len());
        assert!(chunks.len() > 1); // Should be split into multiple chunks
        assert_eq!(info.total_chunks, chunks.len());
        assert_eq!(info.chunk_hashes.len(), chunks.len());
    }

    #[test]
    fn test_file_reassembly() {
        let transfer = FileTransfer::new();
        let original_data = vec![123u8; 500_000]; // 500 KB file
        
        let (info, chunks) = transfer.prepare_file_transfer("test_file".to_string(), &original_data).unwrap();
        let reassembled = transfer.reassemble_file(&info, chunks).unwrap();
        
        assert_eq!(original_data, reassembled);
    }
}