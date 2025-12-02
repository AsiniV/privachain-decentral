//! IPFS Integration Module for PrivaChain
//!
//! Provides IPFS content fetching with optional QUIC+ECH transport.
//! When the `quic-ech` feature is enabled, IPFS fetches can use QUIC
//! transport with ECH to provide both improved performance and privacy.
//!
//! This module supports:
//! - Standard IPFS gateway fetches (fallback)
//! - QUIC+ECH enabled fetches (when feature active)
//! - ECH config distribution via IPFS
//! - Content caching for improved hit rates

#[cfg(feature = "quic-ech")]
mod quic_ech_fetch;

mod gateway;

#[cfg(feature = "quic-ech")]
pub use quic_ech_fetch::{fetch_ipfs_quic_ech, QuicEchFetchConfig};

pub use gateway::{fetch_ipfs, GatewayConfig, IpfsFetchError};

/// Unified IPFS fetch function that uses QUIC+ECH when available
///
/// This is the primary entry point for IPFS content fetching.
/// When the `quic-ech` feature is enabled, it will attempt to use
/// QUIC transport with ECH. Otherwise, falls back to standard HTTPS.
///
/// # Arguments
/// * `cid` - The IPFS Content Identifier
/// * `gateway` - Optional gateway configuration
///
/// # Returns
/// The content bytes, or an error if fetching failed
pub async fn fetch(cid: &str, gateway: Option<GatewayConfig>) -> Result<Vec<u8>, IpfsFetchError> {
    #[cfg(feature = "quic-ech")]
    {
        // Try QUIC+ECH first, fall back to standard gateway on failure
        match quic_ech_fetch::fetch_ipfs_quic_ech(cid, None).await {
            Ok(data) => return Ok(data),
            Err(e) => {
                tracing::warn!("QUIC+ECH fetch failed, falling back to gateway: {}", e);
                // Fall through to gateway fetch
            }
        }
    }

    // Standard gateway fetch (always available)
    gateway::fetch_ipfs(cid, gateway).await
}
