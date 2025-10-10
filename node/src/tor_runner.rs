use arti_client::TorClient;
use directories::ProjectDirs;
use std::path::PathBuf;
use tor_rtcompat::tokio::TokioRustlsRuntime;
use tracing::info;

const APP_NAME: &str = "privachain";

fn config_dir() -> PathBuf {
    ProjectDirs::from("org", "privachain", APP_NAME)
        .expect("No home directory")
        .config_dir()
        .to_path_buf()
}

fn config_path() -> PathBuf {
    config_dir().join("arti.toml")
}

/// Bootstraps Tor and returns a TorClient instance.
/// This client can be used with libp2p-community-tor's TorTransport.
pub async fn bootstrap_tor() -> anyhow::Result<TorClient<TokioRustlsRuntime>> {
    let cfg_dir = config_dir();
    tokio::fs::create_dir_all(&cfg_dir).await?;

    let cfg_path = config_path();
    if !cfg_path.exists() {
        // Create a minimal config file as a marker
        let minimal_toml = r#"
[application]
nickname = "privachain"

[proxy]
socks_listen = "127.0.0.1:0"  # random port

"#;
        tokio::fs::write(&cfg_path, minimal_toml).await?;
        info!("Generated default arti.toml at {:?}", cfg_path);
    }

    info!("Tor configuration directory ready at {:?}", cfg_dir);
    
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
