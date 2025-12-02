//! Encrypted Client Hello (ECH) Module for PrivaChain
//!
//! Provides ECH configuration management and distribution via IPFS.
//! ECH encrypts the SNI (Server Name Indication) in TLS handshakes,
//! providing censorship resistance by hiding the destination server name.
//!
//! ECH configs are distributed via IPFS for decentralization, allowing
//! clients to fetch the latest ECH configurations without centralized servers.
//!
//! This module is only enabled when the `quic-ech` feature is active.

#[cfg(feature = "quic-ech")]
mod config;
#[cfg(feature = "quic-ech")]
mod ipfs_ech;

#[cfg(feature = "quic-ech")]
pub use config::{EchConfiguration, EchSuite};
#[cfg(feature = "quic-ech")]
pub use ipfs_ech::{fetch_ech_config_from_ipfs, EchConfigResult, EchFetchError, IpfsGatewayConfig};
