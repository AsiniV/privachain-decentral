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
