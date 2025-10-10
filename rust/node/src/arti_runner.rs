use arti_client::TorClient;
use tokio::fs;
use tor_rtcompat::tokio::TokioRustlsRuntime;
use tracing::info;

const ARTI_DIR: &str = "arti";
const ARTI_TORRC: &str = "arti.toml";

pub async fn bootstrap_tor() -> anyhow::Result<TorClient<TokioRustlsRuntime>> {
    let arti_home = dirs::config_dir().unwrap().join(ARTI_DIR);
    fs::create_dir_all(&arti_home).await?;
    let cfg_file = arti_home.join(ARTI_TORRC);

    if !cfg_file.exists() {
        // Create a minimal configuration file as a marker
        let minimal_toml = r#"
[application]
nickname = "privachain"

[proxy]
socks_listen = "127.0.0.1:0"  # random port

"#;
        fs::write(&cfg_file, minimal_toml).await?;
        tracing::info!("Generated default {:?}", cfg_file);
    }

    // Get the current tokio runtime
    let runtime = TokioRustlsRuntime::current()
        .expect("Couldn't get the current tokio rustls runtime");
    
    // Create TorClient using TorClient::with_runtime which returns a builder
    let builder = TorClient::with_runtime(runtime);
    let tor = builder.create_unbootstrapped()?;
    
    // Bootstrap the Tor client
    info!("Bootstrapping Tor...");
    tor.bootstrap().await?;
    info!("Tor ready and bootstrapped");
    
    Ok(tor)
}
