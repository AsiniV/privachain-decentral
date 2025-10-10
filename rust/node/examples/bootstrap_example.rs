/// Example demonstrating how to bootstrap Tor using the direct Arti client.
/// 
/// This example shows the basic usage of the bootstrap_tor() function.
/// Note: This requires network access and may take 10-30 seconds to complete.
/// 
/// Usage:
/// ```bash
/// cargo run --example bootstrap_example
/// ```

use privachain_arti_node::bootstrap_tor;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("🚀 Starting Tor bootstrap example...");
    println!("⏳ This may take 10-30 seconds depending on network conditions...");
    println!();

    // Bootstrap Tor and get the TorClient instance
    match bootstrap_tor().await {
        Ok(tor_client) => {
            println!("✅ Tor client successfully bootstrapped!");
            println!();
            println!("The TorClient instance can now be used to:");
            println!("  • Create connections through the Tor network");
            println!("  • Set up SOCKS proxy");
            println!("  • Make anonymous requests");
            println!();
            println!("🎉 Example completed successfully!");
            
            // The TorClient is now available for use
            // For example, you could connect to a destination:
            // let stream = tor_client.connect("example.com:80".parse()?).await?;
            
            drop(tor_client); // Explicitly drop to clean up
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ Failed to bootstrap Tor: {}", e);
            eprintln!();
            eprintln!("This may be due to:");
            eprintln!("  • No network connectivity");
            eprintln!("  • Tor network being blocked");
            eprintln!("  • Firewall restrictions");
            Err(e)
        }
    }
}
