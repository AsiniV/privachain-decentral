#[cfg(feature = "i2p-default")]
pub mod i2p_transport;

#[cfg(feature = "i2p-default")]
pub use i2p_transport::I2pTransport;

#[cfg(feature = "post-quantum")]
pub mod pq_discovery;

#[cfg(feature = "post-quantum")]
pub mod pq_fallback;

#[cfg(feature = "post-quantum")]
pub use pq_discovery::PqDiscovery;

#[cfg(feature = "post-quantum")]
pub use pq_fallback::{downgrade_if_needed, peer_supports_pq};

pub mod transport;

// QUIC transport for low-latency UDP-based connections
#[cfg(feature = "quic-ech")]
pub mod quic_transport;

#[cfg(feature = "quic-ech")]
pub use quic_transport::{build_quic_transport, QuicConfig};
