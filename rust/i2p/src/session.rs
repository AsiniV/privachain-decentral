//! I2P SAMv3 session management

use crate::error::{I2pError, I2pResult};
use crate::keys::I2pKeyPair;
use std::time::{Duration, Instant};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tracing::{debug, info, warn};

/// I2P SAMv3 session
pub struct I2pSession {
    /// Session ID
    pub session_id: String,
    /// Session keypair
    pub keypair: I2pKeyPair,
    /// SAM host address
    sam_host: String,
    /// Connection stream
    stream: Option<BufReader<TcpStream>>,
    /// Latency tracking
    last_latency_ms: Option<u64>,
}

impl I2pSession {
    /// Create new session with keypair
    pub fn new(session_id: String, keypair: I2pKeyPair, sam_host: String) -> Self {
        Self {
            session_id,
            keypair,
            sam_host,
            stream: None,
            last_latency_ms: None,
        }
    }

    /// Connect to SAM bridge
    pub async fn connect(&mut self) -> I2pResult<()> {
        let start = Instant::now();
        
        debug!("Connecting to SAM bridge at {}", self.sam_host);
        let stream = TcpStream::connect(&self.sam_host).await
            .map_err(|e| I2pError::ConnectionError(format!("Failed to connect to SAM: {}", e)))?;
        
        let latency = start.elapsed().as_millis() as u64;
        self.last_latency_ms = Some(latency);
        
        info!("Connected to SAM bridge (latency: {}ms)", latency);
        self.stream = Some(BufReader::new(stream));
        
        Ok(())
    }

    /// Send SAM HELLO command
    pub async fn hello(&mut self) -> I2pResult<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| I2pError::SessionError("Not connected".to_string()))?;
        
        debug!("Sending HELLO command");
        stream.write_all(b"HELLO VERSION MIN=3.0 MAX=3.3\n").await?;
        stream.flush().await?;
        
        let mut response = String::new();
        stream.read_line(&mut response).await?;
        
        debug!("HELLO response: {}", response.trim());
        
        if !response.contains("HELLO REPLY RESULT=OK") {
            return Err(I2pError::ProtocolError(format!("HELLO failed: {}", response)));
        }
        
        Ok(())
    }

    /// Create SAM session
    pub async fn create_session(&mut self) -> I2pResult<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| I2pError::SessionError("Not connected".to_string()))?;
        
        let command = format!(
            "SESSION CREATE STYLE=STREAM ID={} DESTINATION=TRANSIENT\n",
            self.session_id
        );
        
        debug!("Creating session: {}", self.session_id);
        stream.write_all(command.as_bytes()).await?;
        stream.flush().await?;
        
        let mut response = String::new();
        stream.read_line(&mut response).await?;
        
        debug!("SESSION CREATE response: {}", response.trim());
        
        if !response.contains("SESSION STATUS RESULT=OK") {
            return Err(I2pError::SessionError(format!("Session creation failed: {}", response)));
        }
        
        // Extract destination from response if present
        if response.contains("DESTINATION=") {
            // Parse and update destination
            info!("Session created successfully");
        }
        
        Ok(())
    }

    /// Create stream connection to destination
    pub async fn stream_connect(&mut self, destination: &str) -> I2pResult<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| I2pError::SessionError("Not connected".to_string()))?;
        
        let command = format!(
            "STREAM CONNECT ID={} DESTINATION={}\n",
            self.session_id, destination
        );
        
        debug!("Connecting stream to: {}", destination);
        let start = Instant::now();
        
        stream.write_all(command.as_bytes()).await?;
        stream.flush().await?;
        
        let mut response = String::new();
        stream.read_line(&mut response).await?;
        
        let latency = start.elapsed().as_millis() as u64;
        self.last_latency_ms = Some(latency);
        
        debug!("STREAM CONNECT response: {} (latency: {}ms)", response.trim(), latency);
        
        if !response.contains("STREAM STATUS RESULT=OK") {
            return Err(I2pError::ProtocolError(format!("Stream connection failed: {}", response)));
        }
        
        if latency > crate::LATENCY_TARGET_MS {
            warn!("Stream connection latency {}ms exceeds target {}ms", 
                  latency, crate::LATENCY_TARGET_MS);
        }
        
        Ok(())
    }

    /// Get last measured latency
    pub fn last_latency(&self) -> Option<Duration> {
        self.last_latency_ms.map(Duration::from_millis)
    }

    /// Close session
    pub async fn close(&mut self) -> I2pResult<()> {
        if let Some(stream) = self.stream.as_mut() {
            // Send session close if implemented by SAM bridge
            let _ = stream.write_all(b"QUIT\n").await;
            let _ = stream.flush().await;
        }
        self.stream = None;
        Ok(())
    }
}

impl Drop for I2pSession {
    fn drop(&mut self) {
        // Note: async drop not available, connection will be closed when stream is dropped
        debug!("I2P session {} dropped", self.session_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_creation() {
        let keypair = I2pKeyPair::generate().unwrap();
        let session = I2pSession::new(
            "test-session".to_string(),
            keypair,
            "127.0.0.1:7656".to_string()
        );
        assert_eq!(session.session_id, "test-session");
        assert!(session.stream.is_none());
    }

    #[test]
    fn test_latency_tracking() {
        let keypair = I2pKeyPair::generate().unwrap();
        let mut session = I2pSession::new(
            "test-session".to_string(),
            keypair,
            "127.0.0.1:7656".to_string()
        );
        
        assert!(session.last_latency().is_none());
        
        session.last_latency_ms = Some(150);
        let latency = session.last_latency().unwrap();
        assert_eq!(latency.as_millis(), 150);
    }
}
