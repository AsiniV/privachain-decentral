use clap::Parser;

#[derive(Parser, Debug)]
pub struct Args {
    /// Listen multiaddr (tcp/websocket)
    #[arg(long, default_value = "/ip4/0.0.0.0/tcp/33333")]
    pub listen: String,

    /// Force all traffic through Tor
    #[arg(long)]
    pub anonymize: bool,

    /// Use NYM mixnet instead of Tor
    #[arg(long, env = "PRIVACHAIN_MIXNET")]
    pub mixnet: bool,

    /// NYM mixnet gateway address (required if --mixnet is enabled)
    #[arg(long, env = "PRIVACHAIN_MIXNET_GATEWAY")]
    pub mixnet_gateway: Option<String>,
}
