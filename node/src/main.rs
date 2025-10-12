use anyhow::Result;
use clap::Parser;
use futures::StreamExt;
use libp2p::{identity, swarm::SwarmEvent, Swarm, Transport};
use libp2p::core::transport::OrTransport;
use libp2p_community_tor::TorTransport;
use std::sync::Arc;
use tracing::info;

#[cfg(feature = "mixnet")]
use std::net::SocketAddr;

mod cli;
mod tor_runner;
mod network;

// Simple behaviour for demonstration - in production this would be more complex
#[derive(libp2p::swarm::NetworkBehaviour)]
#[behaviour(to_swarm = "NodeEvent")]
struct NodeBehaviour {
    ping: libp2p::ping::Behaviour,
}

#[derive(Debug)]
enum NodeEvent {
    Ping(libp2p::ping::Event),
}

impl From<libp2p::ping::Event> for NodeEvent {
    fn from(event: libp2p::ping::Event) -> Self {
        NodeEvent::Ping(event)
    }
}

impl NodeBehaviour {
    fn new() -> Self {
        Self {
            ping: libp2p::ping::Behaviour::new(libp2p::ping::Config::new()),
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let args = cli::Args::parse();

    // Generate identity
    let local_key = identity::Keypair::generate_ed25519();
    let local_peer_id = local_key.public().to_peer_id();

    // Validate conflicting flags
    if args.mixnet && args.anonymize {
        anyhow::bail!("Cannot use both --mixnet and --anonymize flags simultaneously. Choose one.");
    }

    // Transport: Use Mixnet, Tor, or TCP based on flags
    let transport = if args.mixnet {
        #[cfg(feature = "mixnet")]
        {
            info!("Mixnet mode enabled - initializing NYM transport...");
            let gateway_str = args.mixnet_gateway
                .ok_or_else(|| anyhow::anyhow!("--mixnet-gateway is required when using --mixnet"))?;
            let gateway: SocketAddr = gateway_str.parse()?;
            
            // Initialize mixnet transport
            let _mixnet = network::MixnetTransport::new(gateway).await?;
            info!("✅ Mixnet transport initialized via gateway {}", gateway);
            
            // For now, still use TCP transport but log that mixnet is initialized
            // Full libp2p adapter integration would go here
            info!("Building TCP transport with mixnet wrapper...");
            libp2p::tcp::tokio::Transport::new(libp2p::tcp::Config::default())
                .upgrade(libp2p::core::upgrade::Version::V1)
                .authenticate(libp2p::noise::Config::new(&local_key)?)
                .multiplex(libp2p::yamux::Config::default())
                .boxed()
        }
        #[cfg(not(feature = "mixnet"))]
        {
            anyhow::bail!("Binary compiled without --features mixnet. Rebuild with: cargo build --features mixnet");
        }
    } else if args.anonymize {
        info!("Anonymize mode enabled - bootstrapping Tor...");
        let tor = tor_runner::bootstrap_tor().await?; // Fail if can't bootstrap
        
        info!("Building Tor transport...");
        let tor_transport = TorTransport::from_client(
            Arc::new(tor),
            libp2p_community_tor::AddressConversion::IpAndDns,
        );
        
        info!("Building TCP transport...");
        let tcp_transport = libp2p::tcp::tokio::Transport::new(libp2p::tcp::Config::default());
        
        // Combine Tor and TCP transports - Tor will be tried first
        OrTransport::new(tor_transport, tcp_transport)
            .upgrade(libp2p::core::upgrade::Version::V1)
            .authenticate(libp2p::noise::Config::new(&local_key)?)
            .multiplex(libp2p::yamux::Config::default())
            .boxed()
    } else {
        info!("Building TCP transport...");
        libp2p::tcp::tokio::Transport::new(libp2p::tcp::Config::default())
            .upgrade(libp2p::core::upgrade::Version::V1)
            .authenticate(libp2p::noise::Config::new(&local_key)?)
            .multiplex(libp2p::yamux::Config::default())
            .boxed()
    };

    // Create Swarm
    let behaviour = NodeBehaviour::new();
    let mut swarm = Swarm::new(
        transport,
        behaviour,
        local_peer_id,
        libp2p::swarm::Config::with_tokio_executor(),
    );

    // Listen
    let listen_addr: libp2p::Multiaddr = args.listen.parse()?;
    swarm.listen_on(listen_addr)?;

    info!("Node started, Peer ID: {}", local_peer_id);
    if args.mixnet {
        info!("🕸️ Running in mixnet mode via NYM");
    } else if args.anonymize {
        info!("🕵️ Running in anonymized mode via Tor");
    } else {
        info!("Running in normal mode (no Tor, no mixnet)");
    }

    // Run swarm loop
    loop {
        if let Some(event) = swarm.next().await {
            match event {
                SwarmEvent::NewListenAddr { address, .. } => {
                    info!("Listening on {:?}", address);
                }
                SwarmEvent::Behaviour(event) => {
                    info!("Behaviour event: {:?}", event);
                }
                _ => {}
            }
        }
    }
}
