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
}
