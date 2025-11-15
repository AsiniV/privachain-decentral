//! Network transport layer
//! 
//! Supports I2P, clearnet, and auto-fallback modes

pub mod webrtc;

use anyhow::Result;
use std::net::TcpStream;

#[derive(Debug, Clone, Copy)]
pub enum TunnelMode {
    I2p,
    Clear,
    Auto,
}

pub struct Transport {
    mode: TunnelMode,
}

impl Transport {
    pub async fn new(mode: TunnelMode) -> Result<Self> {
        match mode {
            TunnelMode::I2p => Transport::i2p().await,
            TunnelMode::Clear => Transport::clear().await,
            TunnelMode::Auto => {
                // Probe SAM port
                if tokio::task::spawn_blocking(|| {
                    TcpStream::connect("127.0.0.1:7656").is_ok()
                }).await.unwrap_or(false) {
                    Transport::i2p().await
                } else {
                    tracing::warn!("I2P unreachable – falling back to clearnet TCP");
                    Transport::clear().await
                }
            }
        }
    }

    async fn i2p() -> Result<Self> {
        #[cfg(feature = "i2p-default")]
        {
            // Ensure I2P router is available (embedded or external)
            privachain_i2p::launcher::ensure_router()?;
        }
        
        Ok(Transport { mode: TunnelMode::I2p })
    }

    async fn clear() -> Result<Self> {
        Ok(Transport { mode: TunnelMode::Clear })
    }

    pub fn mode(&self) -> TunnelMode {
        self.mode
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tunnel_mode_enum() {
        let mode = TunnelMode::Auto;
        assert!(matches!(mode, TunnelMode::Auto));
    }

    #[tokio::test]
    async fn test_clear_transport() {
        let transport = Transport::clear().await.unwrap();
        assert!(matches!(transport.mode(), TunnelMode::Clear));
    }

    #[tokio::test]
    async fn test_auto_fallback() {
        // Should not panic, will fall back to Clear if I2P not available
        let _transport = Transport::new(TunnelMode::Auto).await.unwrap();
    }
}
