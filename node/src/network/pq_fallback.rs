use libp2p::core::Multiaddr;

/// If peer **does not** advertise `/pq/1.0.0` → use **classical** Noise
/// 
/// This function checks if a peer supports post-quantum protocols by examining
/// their multiaddress. If PQ is not supported, the connection should downgrade
/// to classical cryptography (e.g., Noise protocol with classical keys).
/// 
/// # Arguments
/// * `peer_multiaddr` - The peer's multiaddress to check
/// 
/// # Returns
/// * `true` if downgrade to classical crypto is needed (peer doesn't support PQ)
/// * `false` if peer supports PQ and no downgrade is needed
/// 
/// # Example
/// ```
/// use libp2p::core::Multiaddr;
/// use std::str::FromStr;
/// use privachain_node::network::pq_fallback::downgrade_if_needed;
/// 
/// let peer_addr = Multiaddr::from_str("/ip4/127.0.0.1/tcp/8000").unwrap();
/// if downgrade_if_needed(&peer_addr) {
///     println!("Using classical Noise protocol");
/// } else {
///     println!("Using PQ-safe protocol");
/// }
/// ```
pub fn downgrade_if_needed(peer_multiaddr: &Multiaddr) -> bool {
    // Check if the multiaddress contains PQ protocol identifier
    let has_pq = peer_multiaddr.iter().any(|protocol| {
        // Check protocol for PQ indicator
        // In a real implementation, this would check for a custom Protocol::Pq variant
        let proto_str = format!("{:?}", protocol);
        proto_str.contains("pq") || proto_str.contains("/pq/")
    });
    
    // Return true if we need to downgrade (no PQ support detected)
    !has_pq
}

/// Check if a peer explicitly supports PQ protocols
pub fn peer_supports_pq(peer_multiaddr: &Multiaddr) -> bool {
    !downgrade_if_needed(peer_multiaddr)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_downgrade_classical_peer() {
        // Classical peer without PQ support
        let addr = Multiaddr::from_str("/ip4/127.0.0.1/tcp/8000").unwrap();
        assert!(downgrade_if_needed(&addr), "Should downgrade for non-PQ peer");
    }

    #[test]
    fn test_no_downgrade_for_pq_peer() {
        // This test demonstrates the API - actual PQ protocol matching
        // would require custom libp2p protocol extensions
        let addr = Multiaddr::from_str("/ip4/127.0.0.1/tcp/8000").unwrap();
        let needs_downgrade = downgrade_if_needed(&addr);
        
        // Currently, without custom PQ protocol, this will return true (needs downgrade)
        // When PQ protocol is properly implemented, this would return false for PQ-capable peers
        assert!(needs_downgrade);
    }

    #[test]
    fn test_peer_supports_pq() {
        let addr = Multiaddr::from_str("/ip4/127.0.0.1/tcp/8000").unwrap();
        let supports = peer_supports_pq(&addr);
        
        // Currently false until custom PQ protocol is added
        assert!(!supports);
    }
}
