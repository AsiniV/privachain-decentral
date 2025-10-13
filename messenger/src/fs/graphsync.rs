// src/fs/graphsync.rs - GraphSync for resumable file transfers
//
// Provides CAR-split + GraphSync for resuming large file transfers
// Addresses gap: 100 MB file → single IPFS hash → if receiver goes offline → restart from 0
//
// This is a mock/placeholder implementation. For production, integrate with:
// - rust-graphsync crate
// - Or implement IPLD GraphSync protocol

use crate::{MessengerError, MessengerResult, Cid};
use serde::{Deserialize, Serialize};
use std::path::Path;
use sha2::{Sha256, Digest};

/// CAR (Content Addressable aRchive) chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CarChunk {
    pub index: usize,
    pub cid: Cid,
    pub data: Vec<u8>,
    pub size: usize,
}

/// GraphSync transfer state for resumption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferState {
    pub file_path: String,
    pub total_chunks: usize,
    pub completed_chunks: Vec<usize>,
    pub chunk_cids: Vec<Cid>,
    pub chunk_size: usize,
}

impl TransferState {
    /// Check if transfer is complete
    pub fn is_complete(&self) -> bool {
        self.completed_chunks.len() == self.total_chunks
    }

    /// Get progress percentage
    pub fn progress_percent(&self) -> f32 {
        if self.total_chunks == 0 {
            return 0.0;
        }
        (self.completed_chunks.len() as f32 / self.total_chunks as f32) * 100.0
    }

    /// Get remaining chunks to download
    pub fn remaining_chunks(&self) -> Vec<usize> {
        (0..self.total_chunks)
            .filter(|i| !self.completed_chunks.contains(i))
            .collect()
    }
}

/// GraphSync file transfer manager
pub struct GraphSync {
    chunk_size: usize,
}

impl GraphSync {
    /// Create a new GraphSync instance
    ///
    /// # Arguments
    /// * `chunk_size` - Size of each chunk in bytes (default: 1 << 20 = 1 MB)
    ///
    /// # Example
    /// ```
    /// use privachain_messenger::fs::graphsync::GraphSync;
    /// let gs = GraphSync::new(1 << 20); // 1 MB chunks
    /// ```
    pub fn new(chunk_size: usize) -> Self {
        Self { chunk_size }
    }

    /// Send a file with CAR chunking for resumable transfer
    ///
    /// # Arguments
    /// * `path` - Path to the file to send
    ///
    /// # Returns
    /// Transfer state with chunk CIDs for resumption
    pub async fn send(&self, path: &Path) -> MessengerResult<TransferState> {
        let file_data = tokio::fs::read(path).await
            .map_err(|e| MessengerError::NetworkError(format!("Failed to read file: {e}")))?;

        let file_path = path.to_string_lossy().to_string();
        let total_size = file_data.len();
        let total_chunks = (total_size + self.chunk_size - 1) / self.chunk_size;

        let mut chunk_cids = Vec::new();

        // Split into CAR chunks
        for chunk_index in 0..total_chunks {
            let start = chunk_index * self.chunk_size;
            let end = (start + self.chunk_size).min(total_size);
            let chunk_data = &file_data[start..end];

            // Generate CID for chunk (using hash as mock CID)
            let hash = Sha256::digest(chunk_data);
            let cid = Cid(format!("Qm{}", hex::encode(&hash[..16])));
            chunk_cids.push(cid);
        }

        Ok(TransferState {
            file_path,
            total_chunks,
            completed_chunks: vec![], // Initially no chunks completed
            chunk_cids,
            chunk_size: self.chunk_size,
        })
    }

    /// Resume a file transfer from saved state
    ///
    /// # Arguments
    /// * `state` - Previous transfer state
    /// * `output_path` - Path where to save the received file
    ///
    /// # Returns
    /// Updated transfer state
    pub async fn resume(
        &self,
        mut state: TransferState,
        output_path: &Path,
    ) -> MessengerResult<TransferState> {
        let remaining = state.remaining_chunks();

        if remaining.is_empty() {
            return Ok(state); // Already complete
        }

        // Mock: In production, this would fetch chunks from IPFS/GraphSync
        // For now, just mark some chunks as completed
        for &chunk_index in remaining.iter().take(1) {
            if !state.completed_chunks.contains(&chunk_index) {
                state.completed_chunks.push(chunk_index);
            }
        }

        // If all chunks complete, assemble file
        if state.is_complete() {
            self.assemble_file(&state, output_path).await?;
        }

        Ok(state)
    }

    /// Assemble file from completed chunks
    async fn assemble_file(&self, state: &TransferState, output_path: &Path) -> MessengerResult<()> {
        // Mock implementation: In production, would fetch and combine all chunks
        // For now, just create an empty file to indicate completion
        tokio::fs::write(output_path, b"")
            .await
            .map_err(|e| MessengerError::NetworkError(format!("Failed to write file: {e}")))?;
        Ok(())
    }

    /// Broadcast chunk CIDs via gossip network
    pub async fn broadcast_chunks(&self, cids: &[Cid]) -> MessengerResult<()> {
        // Mock implementation: In production, would broadcast via libp2p gossipsub
        for cid in cids {
            // Simulate broadcast
            let _ = cid;
        }
        Ok(())
    }

    /// Fetch a specific chunk by CID
    pub async fn fetch_chunk(&self, cid: &Cid) -> MessengerResult<CarChunk> {
        // Mock implementation: In production, would fetch from IPFS
        Ok(CarChunk {
            index: 0,
            cid: cid.clone(),
            data: vec![],
            size: 0,
        })
    }

    /// Get chunk size
    pub fn chunk_size(&self) -> usize {
        self.chunk_size
    }
}

impl Default for GraphSync {
    fn default() -> Self {
        Self::new(1 << 20) // 1 MB default chunk size
    }
}

/// Helper function to send file with GraphSync (convenience wrapper)
///
/// # Example from problem statement:
/// ```ignore
/// let out = GraphSync::send(path, chunk_size=1<<20).await?;
/// for cid in out.roots() { gossip.broadcast(cid).await?; }
/// ```
pub async fn send_with_graphsync(
    path: &Path,
    chunk_size: usize,
) -> MessengerResult<TransferState> {
    let gs = GraphSync::new(chunk_size);
    gs.send(path).await
}

/// Helper to resume a file transfer
pub async fn resume_transfer(
    state: TransferState,
    output_path: &Path,
) -> MessengerResult<TransferState> {
    let gs = GraphSync::new(state.chunk_size);
    gs.resume(state, output_path).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_graphsync_creation() {
        let gs = GraphSync::new(1 << 20);
        assert_eq!(gs.chunk_size(), 1 << 20);
    }

    #[tokio::test]
    async fn test_graphsync_send() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test_file.bin");
        
        // Create a test file (2.5 MB)
        let test_data = vec![42u8; 2_500_000];
        tokio::fs::write(&file_path, &test_data).await.unwrap();

        let gs = GraphSync::new(1 << 20); // 1 MB chunks
        let state = gs.send(&file_path).await.unwrap();

        assert_eq!(state.total_chunks, 3); // 2.5 MB / 1 MB = 3 chunks
        assert_eq!(state.chunk_cids.len(), 3);
        assert_eq!(state.completed_chunks.len(), 0);
        assert!(!state.is_complete());
    }

    #[tokio::test]
    async fn test_transfer_state_progress() {
        let state = TransferState {
            file_path: "test.bin".to_string(),
            total_chunks: 10,
            completed_chunks: vec![0, 1, 2, 3, 4],
            chunk_cids: vec![],
            chunk_size: 1 << 20,
        };

        assert_eq!(state.progress_percent(), 50.0);
        assert!(!state.is_complete());

        let remaining = state.remaining_chunks();
        assert_eq!(remaining.len(), 5);
        assert_eq!(remaining, vec![5, 6, 7, 8, 9]);
    }

    #[tokio::test]
    async fn test_transfer_state_complete() {
        let state = TransferState {
            file_path: "test.bin".to_string(),
            total_chunks: 5,
            completed_chunks: vec![0, 1, 2, 3, 4],
            chunk_cids: vec![],
            chunk_size: 1 << 20,
        };

        assert!(state.is_complete());
        assert_eq!(state.progress_percent(), 100.0);
    }

    #[tokio::test]
    async fn test_graphsync_resume() {
        let temp_dir = TempDir::new().unwrap();
        let output_path = temp_dir.path().join("output.bin");

        let state = TransferState {
            file_path: "test.bin".to_string(),
            total_chunks: 5,
            completed_chunks: vec![0, 1, 2],
            chunk_cids: vec![
                Cid("Qmabc1".to_string()),
                Cid("Qmabc2".to_string()),
                Cid("Qmabc3".to_string()),
                Cid("Qmabc4".to_string()),
                Cid("Qmabc5".to_string()),
            ],
            chunk_size: 1 << 20,
        };

        let gs = GraphSync::new(1 << 20);
        let new_state = gs.resume(state.clone(), &output_path).await.unwrap();

        // Should have made progress
        assert!(new_state.completed_chunks.len() > state.completed_chunks.len());
    }

    #[tokio::test]
    async fn test_send_with_graphsync_helper() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test_file.bin");
        
        let test_data = vec![42u8; 1_500_000];
        tokio::fs::write(&file_path, &test_data).await.unwrap();

        let state = send_with_graphsync(&file_path, 1 << 20).await.unwrap();
        assert_eq!(state.total_chunks, 2);
    }
}
