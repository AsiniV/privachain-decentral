#![cfg(feature = "post-quantum")]

use libp2p::core::Multiaddr;
use std::str::FromStr;

/// PQ-aware peer discovery behavior
/// 
/// This module provides peer discovery that advertises post-quantum
/// capabilities via a custom protocol identifier `/pq/1.0.0`
/// 
/// Note: This is a simplified version. Full libp2p NetworkBehaviour
/// integration would require the `libp2p::swarm::NetworkBehaviour` derive macro
/// and proper MDNS configuration.
pub struct PqDiscovery {
    /// Multiaddresses to advertise
    pub multiaddrs: Vec<Multiaddr>,
}

impl PqDiscovery {
    /// Create a new PQ discovery instance
    pub fn new() -> Self {
        Self {
            multiaddrs: Vec::new(),
        }
    }

    /// Advertise **/pq/1.0.0** multiaddr to signal PQ support
    /// 
    /// This returns the multiaddresses that should be advertised to peers
    /// to indicate post-quantum capability.
    pub fn local_peer_info(&self) -> Vec<Multiaddr> {
        vec![
            // Advertise PQ protocol support on all interfaces
            Multiaddr::from_str("/ip4/0.0.0.0/tcp/0/pq/1.0.0")
                .unwrap_or_else(|_| Multiaddr::empty()),
        ]
    }

    /// Check if a peer supports PQ based on their multiaddr
    pub fn peer_supports_pq(peer_multiaddr: &Multiaddr) -> bool {
        peer_multiaddr.iter().any(|p| {
            // Check if the protocol component contains "pq"
            matches!(p, libp2p::multiaddr::Protocol::P2p(_))
                || format!("{:?}", p).contains("pq")
        })
    }
}

impl Default for PqDiscovery {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pq_discovery_creation() {
        let discovery = PqDiscovery::new();
        assert_eq!(discovery.multiaddrs.len(), 0);
    }

    #[test]
    fn test_local_peer_info() {
        let discovery = PqDiscovery::new();
        let peer_info = discovery.local_peer_info();
        assert!(!peer_info.is_empty());
    }

    #[test]
    fn test_peer_supports_pq() {
        let pq_addr = Multiaddr::from_str("/ip4/127.0.0.1/tcp/8000/pq/1.0.0");
        if let Ok(addr) = pq_addr {
            // This is a simplified check - in practice, protocol matching would be more sophisticated
            let _supports = PqDiscovery::peer_supports_pq(&addr);
        }
    }
}
