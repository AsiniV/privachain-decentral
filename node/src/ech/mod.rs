//! Encrypted Client Hello (ECH) Module for PrivaChain
//!
//! Provides ECH configuration management and distribution via IPFS.
//! ECH encrypts the SNI (Server Name Indication) in TLS handshakes,
//! providing censorship resistance by hiding the destination server name.
//!
//! ECH configs are distributed via IPFS for decentralization, allowing
//! clients to fetch the latest ECH configurations without centralized servers.
//!
//! ## IPNS-based Dynamic Configuration
//!
//! The preferred method for fetching ECH configs is via IPNS, which provides
//! a stable key that always resolves to the latest configuration:
//!
//! ```ignore
//! use privachain_node::ech::fetch_ech_config_from_ipns;
//!
//! // This IPNS key never changes - it always points to the latest ECH config
//! let config = fetch_ech_config_from_ipns(
//!     "k51qzi5uqu5dgjso1xnb9go9e1h1v5t1h7m6x3z7rj6q4g3h2n1m8p9w0v2y3x4",
//!     None,
//! ).await?;
//! ```
//!
//! This module is only enabled when the `quic-ech` feature is active.

#[cfg(feature = "quic-ech")]
mod config;
#[cfg(feature = "quic-ech")]
mod ipfs_ech;

#[cfg(feature = "quic-ech")]
pub use config::{EchConfiguration, EchSuite};
#[cfg(feature = "quic-ech")]
pub use ipfs_ech::{
    fetch_ech_config_from_ipfs,
    fetch_ech_config_from_ipns,
    fetch_ech_config_with_fallback,
    EchConfigResult,
    EchFetchError,
    IpfsGatewayConfig,
};
