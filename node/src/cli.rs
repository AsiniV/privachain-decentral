use clap::Parser;

#[derive(Parser, Debug)]
pub struct Args {
    /// Listen multiaddr (tcp/websocket)
    #[arg(long, default_value = "/ip4/0.0.0.0/tcp/33333")]
    pub listen: String,

    /// Force all traffic through Tor
    #[arg(long)]
    pub anonymize: bool,
}
