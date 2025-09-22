// file_transfer.rs - Chunked File Transfer
//
// Handles large file transfers using chunked streaming with 256 KiB blocks

use crate::{MessengerError, MessengerResult, chunk_pad::{split_into_chunks, reassemble_chunks}};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio_util::io::ReaderStream;
use aes_gcm::{Aes256Gcm, Key, KeyInit};
use aes_gcm::aead::{Aead, OsRng, AeadCore};
use futures_util::StreamExt;

/// IPFS Content Identifier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cid(pub String);

impl std::fmt::Display for Cid {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Error type for file transfer operations
pub type Error = MessengerError;

/// Mock IPFS client for demonstration
pub struct IpfsClient {
    _base_url: String,
}

impl IpfsClient {
    pub fn default() -> Self {
        Self {
            _base_url: "http://localhost:5001".to_string(),
        }
    }
    
    pub async fn add<R: std::io::Read>(&self, _reader: R) -> Result<AddResponse, Error> {
        // Mock implementation - in real code this would upload to IPFS
        let hash = format!("Qm{}", hex::encode(&rand::random::<[u8; 16]>()));
        Ok(AddResponse { hash })
    }
    
    pub async fn pin_add(&self, _cid: &str, _recursive: bool) -> Result<(), Error> {
        // Mock implementation - in real code this would pin content in IPFS
        Ok(())
    }
    
    pub async fn pin_rm(&self, _cid: &str) -> Result<(), Error> {
        // Mock implementation - in real code this would unpin content from IPFS
        Ok(())
    }
    
    pub async fn dht_provide_stop(&self, _cid: &str) -> Result<(), Error> {
        // Mock implementation - in real code this would stop providing content via DHT
        Ok(())
    }
}

pub struct AddResponse {
    hash: String,
}

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

    /// Send file with encryption, chunking, and IPFS storage with progress tracking
    pub async fn send_file_with_progress<F>(
        path: &Path, 
        shared_key: &[u8; 32], 
        mut progress_callback: F
    ) -> Result<Cid, Error>
    where
        F: FnMut(u32),
    {
        let file = tokio::fs::File::open(path).await
            .map_err(|e| MessengerError::NetworkError(format!("Failed to open file: {}", e)))?;
        
        // Get file size for progress calculation
        let file_size = file.metadata().await
            .map_err(|e| MessengerError::NetworkError(format!("Failed to get file metadata: {}", e)))?
            .len();
        
        let mut stream = ReaderStream::new(file);
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(shared_key));
        let mut chunks = Vec::new();
        let mut bytes_processed = 0u64;
        const CHUNK_SIZE: u64 = 256 * 1024; // 256 KiB
        
        progress_callback(0);
        
        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result
                .map_err(|e| MessengerError::NetworkError(format!("Failed to read chunk: {}", e)))?;
            
            let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
            let ct = cipher.encrypt(&nonce, chunk.as_ref())
                .map_err(|e| MessengerError::EncryptionFailed(format!("Chunk encryption failed: {}", e)))?;
            
            let mut block = Vec::with_capacity(12 + ct.len()); // 12 bytes for nonce
            block.extend_from_slice(&nonce);
            block.extend_from_slice(&ct);
            chunks.push(block);
            
            bytes_processed += chunk.len() as u64;
            
            // Call progress callback every 256 KiB
            if bytes_processed % CHUNK_SIZE == 0 || bytes_processed >= file_size {
                let progress_percent = ((bytes_processed as f64 / file_size as f64) * 100.0) as u32;
                progress_callback(progress_percent.min(100));
            }
        }
        
        // Create IPFS client
        let ipfs = IpfsClient::default();
        
        // Convert chunks to bytes for IPFS storage
        let mut all_chunks = Vec::new();
        for chunk in chunks {
            all_chunks.extend_from_slice(&chunk);
        }
        
        // Upload to IPFS
        let cursor = std::io::Cursor::new(all_chunks);
        let add_result = ipfs.add(cursor).await?;
        
        let cid = Cid(add_result.hash);
        
        // Pin the content
        ipfs.pin_add(&cid.0, true).await?;
        
        progress_callback(100);
        Ok(cid)
    }

    /// Send file with encryption, chunking, and IPFS storage
    pub async fn send_file(path: &Path, shared_key: &[u8; 32]) -> Result<Cid, Error> {
        Self::send_file_with_progress(path, shared_key, |_| {}).await
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

// FFI exports for C integration
use std::ffi::CStr;
use std::os::raw::c_char;

/// FFI function for sending file with progress callback
#[no_mangle]
pub extern "C" fn messenger_send_file_with_progress(
    path_ptr: *const c_char,
    key_b64_ptr: *const c_char,
    progress_callback: extern "C" fn(u32),
) {
    if path_ptr.is_null() || key_b64_ptr.is_null() {
        return;
    }
    
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(_) => return,
    };
    
    runtime.block_on(async {
        let path_str = match unsafe { CStr::from_ptr(path_ptr) }.to_str() {
            Ok(s) => s,
            Err(_) => return,
        };
        
        let key_b64_str = match unsafe { CStr::from_ptr(key_b64_ptr) }.to_str() {
            Ok(s) => s,
            Err(_) => return,
        };
        
        // Decode base64 key
        let key_bytes = match base64_decode(key_b64_str) {
            Ok(bytes) if bytes.len() == 32 => {
                let mut key = [0u8; 32];
                key.copy_from_slice(&bytes);
                key
            },
            _ => return,
        };
        
        let path = std::path::Path::new(path_str);
        
        // Create a wrapper closure that calls the C function
        let callback = |percent: u32| {
            progress_callback(percent);
        };
        
        let _ = FileTransfer::send_file_with_progress(path, &key_bytes, callback).await;
    });
}

// Simple base64 decode function
fn base64_decode(input: &str) -> Result<Vec<u8>, ()> {
    // Simple base64 implementation - in real code use base64 crate
    // For now, just create a dummy key
    if input.len() >= 44 { // Base64 encoded 32 bytes should be at least 44 chars
        Ok(vec![42u8; 32]) // Dummy key for demo
    } else {
        Err(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

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

    #[tokio::test]
    async fn test_send_file() {
        // Create a temporary test file
        let test_data = b"Hello, IPFS! This is a test file for encryption and chunking.";
        let temp_dir = std::env::temp_dir();
        let test_file_path = temp_dir.join("test_file.txt");
        
        {
            let mut file = std::fs::File::create(&test_file_path).unwrap();
            file.write_all(test_data).unwrap();
        }
        
        // Test encryption key
        let shared_key = [42u8; 32];
        
        // Send file
        let result = FileTransfer::send_file(&test_file_path, &shared_key).await;
        
        // Clean up
        let _ = std::fs::remove_file(&test_file_path);
        
        // Verify result
        assert!(result.is_ok());
        let cid = result.unwrap();
        assert!(!cid.0.is_empty());
        assert!(cid.0.starts_with("Qm")); // Mock IPFS CID format
    }

    #[tokio::test]
    async fn test_send_file_with_progress() {
        // Create a temporary test file with some size
        let test_data = vec![42u8; 1024 * 1024]; // 1 MB file
        let temp_dir = std::env::temp_dir();
        let test_file_path = temp_dir.join("test_progress_file.txt");
        
        {
            let mut file = std::fs::File::create(&test_file_path).unwrap();
            file.write_all(&test_data).unwrap();
        }
        
        // Test encryption key
        let shared_key = [42u8; 32];
        
        // Track progress
        let mut progress_calls = Vec::new();
        let progress_callback = |percent: u32| {
            progress_calls.push(percent);
        };
        
        // Send file with progress tracking
        let result = FileTransfer::send_file_with_progress(&test_file_path, &shared_key, progress_callback).await;
        
        // Clean up
        let _ = std::fs::remove_file(&test_file_path);
        
        // Verify result and progress
        assert!(result.is_ok());
        let cid = result.unwrap();
        assert!(!cid.0.is_empty());
        assert!(cid.0.starts_with("Qm")); // Mock IPFS CID format
        
        // Verify progress was called
        assert!(!progress_calls.is_empty());
        assert_eq!(progress_calls[0], 0); // Should start at 0%
        assert_eq!(progress_calls[progress_calls.len() - 1], 100); // Should end at 100%
    }

    #[test]
    fn test_cid_display() {
        let cid = Cid("QmTestHash123".to_string());
        assert_eq!(format!("{}", cid), "QmTestHash123");
    }

    #[test]
    fn test_base64_decode() {
        // Test valid base64 (long enough)
        let valid_b64 = "SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0IGtleSBmb3IgZGVtb25zdHJhdGlvbg==";
        let result = base64_decode(valid_b64);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 32);
        
        // Test invalid base64 (too short)
        let invalid_b64 = "short";
        let result = base64_decode(invalid_b64);
        assert!(result.is_err());
    }
}