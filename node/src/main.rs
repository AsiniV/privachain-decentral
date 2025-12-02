use anyhow::Result;
use clap::Parser;
use futures::StreamExt;
use libp2p::{identity, swarm::SwarmEvent, Swarm, Transport};
use tracing::info;

#[cfg(feature = "mixnet-default")]
use std::net::SocketAddr;

#[cfg(feature = "fallback-tor")]
use libp2p::core::transport::OrTransport;
#[cfg(feature = "fallback-tor")]
use libp2p_community_tor::TorTransport;
#[cfg(feature = "fallback-tor")]
use std::sync::Arc;

mod cli;
#[cfg(feature = "fallback-tor")]
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

    // Handle PQ bandwidth purchase if requested
    #[cfg(feature = "post-quantum")]
    if let Some(mb) = args.buy_pq_bandwidth {
        info!("PQ bandwidth purchase requested: {} MB", mb);
        
        // Get mnemonic from environment
        let mnemonic = std::env::var("NYM_PQ_MNEMONIC")
            .unwrap_or_else(|_| {
                eprintln!("Error: NYM_PQ_MNEMONIC environment variable not set");
                std::process::exit(1);
            });
        
        // Mock Dilithium key for now - in production this would be derived from mnemonic
        let dilithium_sk = vec![0u8; 32];
        
        match privachain_node::mixnet::buy_pq_bandwidth(&mnemonic, mb, &dilithium_sk).await {
            Ok(()) => {
                info!("✅ PQ bandwidth purchase initiated successfully");
                return Ok(());
            }
            Err(e) => {
                eprintln!("❌ Failed to purchase PQ bandwidth: {}", e);
                std::process::exit(1);
            }
        }
    }

    // Generate identity
    let local_key = identity::Keypair::generate_ed25519();
    let local_peer_id = local_key.public().to_peer_id();

    // Transport: Default=Mixnet, Fallback=Tor, or TCP if no features
    // When quic-ech feature is enabled, QUIC is stacked on top of the base transport
    let transport = if args.fallback {
        #[cfg(feature = "fallback-tor")]
        {
            info!("Fallback mode enabled - bootstrapping Tor...");
            let tor = tor_runner::bootstrap_tor().await?; // Fail if can't bootstrap
            
            info!("Building Tor transport...");
            let tor_transport = TorTransport::from_client(
                Arc::new(tor),
                libp2p_community_tor::AddressConversion::IpAndDns,
            );
            
            info!("Building TCP transport...");
            let tcp_transport = libp2p::tcp::tokio::Transport::new(libp2p::tcp::Config::default());
            
            // Combine Tor and TCP transports - Tor will be tried first
            let base_transport = OrTransport::new(tor_transport, tcp_transport)
                .upgrade(libp2p::core::upgrade::Version::V1)
                .authenticate(libp2p::noise::Config::new(&local_key)?)
                .multiplex(libp2p::yamux::Config::default())
                .boxed();
            
            // Add QUIC transport if quic-ech feature is enabled
            #[cfg(feature = "quic-ech")]
            {
                info!("Adding QUIC+ECH transport layer...");
                let quic_transport = network::build_quic_transport(&local_key)?;
                libp2p::core::transport::OrTransport::new(quic_transport, base_transport)
                    .map(|either, _| match either {
                        futures::future::Either::Left(conn) => conn,
                        futures::future::Either::Right(conn) => conn,
                    })
                    .boxed()
            }
            #[cfg(not(feature = "quic-ech"))]
            {
                base_transport
            }
        }
        #[cfg(not(feature = "fallback-tor"))]
        {
            anyhow::bail!("Binary compiled without --features fallback-tor");
        }
    } else {
        #[cfg(feature = "mixnet-default")]
        {
            info!("Mixnet mode enabled - initializing NYM transport...");
            let gateway: SocketAddr = args.mixnet_gateway.parse()?;
            
            // Initialize mixnet transport
            let _mixnet = network::MixnetTransport::new(gateway).await?;
            info!("✅ Mixnet transport initialized via gateway {}", gateway);
            
            // For now, still use TCP transport but log that mixnet is initialized
            // Full libp2p adapter integration would go here
            info!("Building TCP transport with mixnet wrapper...");
            let base_transport = libp2p::tcp::tokio::Transport::new(libp2p::tcp::Config::default())
                .upgrade(libp2p::core::upgrade::Version::V1)
                .authenticate(libp2p::noise::Config::new(&local_key)?)
                .multiplex(libp2p::yamux::Config::default())
                .boxed();
            
            // Add QUIC transport if quic-ech feature is enabled
            #[cfg(feature = "quic-ech")]
            {
                info!("Adding QUIC+ECH transport layer...");
                let quic_transport = network::build_quic_transport(&local_key)?;
                libp2p::core::transport::OrTransport::new(quic_transport, base_transport)
                    .map(|either, _| match either {
                        futures::future::Either::Left(conn) => conn,
                        futures::future::Either::Right(conn) => conn,
                    })
                    .boxed()
            }
            #[cfg(not(feature = "quic-ech"))]
            {
                base_transport
            }
        }
        #[cfg(not(feature = "mixnet-default"))]
        {
            // v1.0-rc behaviour: plain TCP (optionally with QUIC)
            info!("Building TCP transport (no mixnet, no Tor)...");
            let tcp_transport = libp2p::tcp::tokio::Transport::new(libp2p::tcp::Config::default())
                .upgrade(libp2p::core::upgrade::Version::V1)
                .authenticate(libp2p::noise::Config::new(&local_key)?)
                .multiplex(libp2p::yamux::Config::default())
                .boxed();
            
            // Add QUIC transport if quic-ech feature is enabled
            #[cfg(feature = "quic-ech")]
            {
                info!("🚀 Adding QUIC+ECH transport layer for low-latency connections...");
                let quic_transport = network::build_quic_transport(&local_key)?;
                // QUIC is tried first, then falls back to TCP
                libp2p::core::transport::OrTransport::new(quic_transport, tcp_transport)
                    .map(|either, _| match either {
                        futures::future::Either::Left(conn) => conn,
                        futures::future::Either::Right(conn) => conn,
                    })
                    .boxed()
            }
            #[cfg(not(feature = "quic-ech"))]
            {
                tcp_transport
            }
        }
    };

    // Create Swarm
    let behaviour = NodeBehaviour::new();
    let mut swarm = Swarm::new(
        transport,
        behaviour,
        local_peer_id,
        libp2p::swarm::Config::with_tokio_executor(),
    );

    // Listen on TCP
    let listen_addr: libp2p::Multiaddr = args.listen.parse()?;
    swarm.listen_on(listen_addr.clone())?;
    
    // Also listen on QUIC if feature enabled
    #[cfg(feature = "quic-ech")]
    {
        // Parse the listen address to create a QUIC variant
        // e.g., /ip4/0.0.0.0/tcp/4001 -> /ip4/0.0.0.0/udp/4001/quic-v1
        if let Some(quic_addr) = tcp_to_quic_multiaddr(&listen_addr) {
            match swarm.listen_on(quic_addr.clone()) {
                Ok(_) => info!("📡 QUIC+ECH listening on {:?}", quic_addr),
                Err(e) => info!("⚠️ Could not listen on QUIC: {} (TCP still active)", e),
            }
        }
    }

    info!("Node started, Peer ID: {}", local_peer_id);
    if args.fallback {
        info!("🕵️ Running in fallback mode via Tor");
    } else {
        #[cfg(feature = "mixnet-default")]
        info!("🕸️ Running with mixnet (default) via NYM");
        #[cfg(not(feature = "mixnet-default"))]
        {
            #[cfg(feature = "quic-ech")]
            info!("🚀 Running with QUIC+ECH transport enabled");
            #[cfg(not(feature = "quic-ech"))]
            info!("Running in v1.0-rc mode (TCP only)");
        }
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

/// Convert a TCP multiaddr to a QUIC multiaddr
/// e.g., /ip4/0.0.0.0/tcp/4001 -> /ip4/0.0.0.0/udp/4001/quic-v1
#[cfg(feature = "quic-ech")]
fn tcp_to_quic_multiaddr(addr: &libp2p::Multiaddr) -> Option<libp2p::Multiaddr> {
    use libp2p::multiaddr::Protocol;
    
    let mut protocols: Vec<Protocol<'_>> = addr.iter().collect();
    
    // Find TCP protocol and convert to UDP + QUIC
    for i in 0..protocols.len() {
        if let Protocol::Tcp(port) = protocols[i] {
            protocols[i] = Protocol::Udp(port);
            protocols.insert(i + 1, Protocol::QuicV1);
            
            let mut new_addr = libp2p::Multiaddr::empty();
            for p in protocols {
                new_addr.push(p);
            }
            return Some(new_addr);
        }
    }
    
    None
}
