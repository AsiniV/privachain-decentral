use clap::Parser;

#[derive(Parser, Debug)]
pub struct Args {
    /// Listen multiaddr (tcp/websocket)
    #[arg(long, default_value = "/ip4/0.0.0.0/tcp/33333")]
    pub listen: String,

    /// Force Tor instead of mixnet (fallback mode)
    #[arg(long, env = "PRIVACHAIN_FALLBACK")]
    pub fallback: bool,

    /// NYM mixnet gateway address (only used if fallback=false)
    #[arg(long, default_value = "45.79.1.1:1789", env = "PRIVACHAIN_MIXNET_GATEWAY")]
    pub mixnet_gateway: String,

    /// Buy PQ-bandwidth (MB) - requires NYM_PQ_MNEMONIC env var
    #[cfg(feature = "post-quantum")]
    #[arg(long, env = "BUY_PQ_BANDWIDTH")]
    pub buy_pq_bandwidth: Option<u64>,

    /// Tunnel mode: auto (default), i2p, or none
    #[arg(long, default_value = "auto", env = "PRIVACHAIN_TUNNEL")]
    pub tunnel: String,
}

impl Args {
    /// Parse tunnel mode from string
    pub fn tunnel_mode(&self) -> crate::network::transport::TunnelMode {
        match self.tunnel.to_lowercase().as_str() {
            "i2p" => crate::network::transport::TunnelMode::I2p,
            "none" | "clear" => crate::network::transport::TunnelMode::Clear,
            _ => crate::network::transport::TunnelMode::Auto,
        }
    }
}
