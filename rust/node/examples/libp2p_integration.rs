/// Example demonstrating how to integrate bootstrap_tor() with libp2p.
/// 
/// This example shows how to use the TorClient from bootstrap_tor() with
/// libp2p-community-tor's TorTransport for P2P networking over Tor.
/// 
/// Note: This requires network access and may take 10-30 seconds to complete.
/// 
/// Usage:
/// ```bash
/// cargo run --example libp2p_integration
/// ```

use privachain_arti_node::bootstrap_tor;
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("🚀 libp2p + Tor Integration Example");
    println!("⏳ Bootstrapping Tor client...");
    println!();

    // Step 1: Bootstrap Tor and get TorClient instance
    let tor_client = bootstrap_tor().await?;
    println!("✅ Tor client bootstrapped successfully!");
    println!();

    // Step 2: Wrap in Arc for shared ownership (libp2p-community-tor expects Arc<TorClient>)
    let _tor_arc = Arc::new(tor_client);
    println!("📦 TorClient wrapped in Arc for shared ownership");
    println!();

    println!("🔧 Integration Pattern:");
    println!("   The TorClient can now be used with libp2p-community-tor:");
    println!();
    println!("   ```rust");
    println!("   use libp2p_community_tor::TorTransport;");
    println!("   use libp2p::core::transport::OrTransport;");
    println!();
    println!("   // Create TorTransport from the bootstrapped client");
    println!("   let tor_transport = TorTransport::new(tor_arc);");
    println!();
    println!("   // Combine with other transports (TCP, QUIC, etc.)");
    println!("   let other_transports = libp2p::tcp::tokio::Transport::default();");
    println!("   let transport = OrTransport::new(tor_transport, other_transports)");
    println!("       .boxed();");
    println!();
    println!("   // Use this transport when building your libp2p Swarm");
    println!("   ```");
    println!();
    
    println!("✨ Key Benefits:");
    println!("   • Direct onion address dialing (no SOCKS proxy needed)");
    println!("   • Full control over Tor client lifecycle");
    println!("   • Seamless integration with libp2p transports");
    println!("   • Works with libp2p-community-tor's TorTransport API");
    println!();

    println!("🎉 Example completed successfully!");
    println!();
    println!("📚 For complete libp2p integration, see:");
    println!("   - rust/node/README.md");
    println!("   - node/src/main.rs (existing libp2p setup)");

    Ok(())
}
