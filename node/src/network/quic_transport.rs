//! QUIC Transport Module for PrivaChain
//!
//! Provides QUIC transport integration using libp2p-quic for low-latency,
//! UDP-based P2P connections. QUIC offers multiplexed streams over a single
//! connection with 0-RTT capabilities, improving handshake performance.
//!
//! This module is only enabled when the `quic-ech` feature is active.

#[cfg(feature = "quic-ech")]
use anyhow::Result;
#[cfg(feature = "quic-ech")]
use libp2p::identity::Keypair;
#[cfg(feature = "quic-ech")]
use libp2p::core::muxing::StreamMuxerBox;
#[cfg(feature = "quic-ech")]
use libp2p::core::transport::Boxed;
#[cfg(feature = "quic-ech")]
use libp2p::PeerId;
#[cfg(feature = "quic-ech")]
use libp2p::Transport;
#[cfg(feature = "quic-ech")]
use libp2p_quic as quic;

/// Build a QUIC transport for libp2p.
///
/// Returns a boxed transport that can be combined with other transports
/// (like TCP) using `or_transport` for fallback support.
///
/// # Arguments
/// * `keypair` - The local identity keypair for authentication
///
/// # Returns
/// A boxed QUIC transport implementing the libp2p Transport trait
#[cfg(feature = "quic-ech")]
pub fn build_quic_transport(
    keypair: &Keypair,
) -> Result<Boxed<(PeerId, StreamMuxerBox)>> {
    let config = quic::Config::new(keypair);
    let transport = quic::tokio::Transport::new(config)
        .map(|(peer_id, muxer), _| (peer_id, StreamMuxerBox::new(muxer)))
        .boxed();
    
    tracing::info!("QUIC transport initialized successfully");
    Ok(transport)
}

/// QUIC transport configuration options
#[cfg(feature = "quic-ech")]
#[derive(Debug, Clone)]
pub struct QuicConfig {
    /// Maximum idle timeout in seconds before connection is closed
    pub idle_timeout_secs: u64,
    /// Whether to enable keep-alive pings
    pub keep_alive: bool,
}

#[cfg(feature = "quic-ech")]
impl Default for QuicConfig {
    fn default() -> Self {
        Self {
            idle_timeout_secs: 30,
            keep_alive: true,
        }
    }
}

#[cfg(feature = "quic-ech")]
impl QuicConfig {
    /// Create a new QUIC configuration with custom idle timeout
    pub fn with_idle_timeout(idle_timeout_secs: u64) -> Self {
        Self {
            idle_timeout_secs,
            ..Default::default()
        }
    }
}

/// Helper to check if a peer supports QUIC
#[cfg(feature = "quic-ech")]
pub fn is_quic_multiaddr(addr: &libp2p::Multiaddr) -> bool {
    addr.iter().any(|p| matches!(p, libp2p::multiaddr::Protocol::QuicV1))
}

#[cfg(all(test, feature = "quic-ech"))]
mod tests {
    use super::*;

    #[test]
    fn test_quic_config_default() {
        let config = QuicConfig::default();
        assert_eq!(config.idle_timeout_secs, 30);
        assert!(config.keep_alive);
    }

    #[test]
    fn test_quic_config_custom_timeout() {
        let config = QuicConfig::with_idle_timeout(60);
        assert_eq!(config.idle_timeout_secs, 60);
        assert!(config.keep_alive);
    }

    #[test]
    fn test_is_quic_multiaddr() {
        let quic_addr: libp2p::Multiaddr = "/ip4/127.0.0.1/udp/4001/quic-v1".parse().unwrap();
        assert!(is_quic_multiaddr(&quic_addr));

        let tcp_addr: libp2p::Multiaddr = "/ip4/127.0.0.1/tcp/4001".parse().unwrap();
        assert!(!is_quic_multiaddr(&tcp_addr));
    }

    #[test]
    fn test_build_quic_transport() {
        let keypair = Keypair::generate_ed25519();
        let result = build_quic_transport(&keypair);
        assert!(result.is_ok());
    }
}
