use directories::ProjectDirs;
use std::path::PathBuf;
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

/// Prepares Tor configuration directory.
/// The actual Tor bootstrap is done by libp2p-community-tor when creating the transport.
pub async fn bootstrap_tor() -> anyhow::Result<()> {
    let cfg_dir = config_dir();
    tokio::fs::create_dir_all(&cfg_dir).await?;

    let cfg_path = config_path();
    if !cfg_path.exists() {
        // libp2p-community-tor will use its own Arti configuration
        // We create a minimal config file as a marker
        let minimal_toml = r#"
[application]
nickname = "privachain"

[proxy]
socks_listen = "127.0.0.1:0"  # random port, but we'll use transport

"#;
        tokio::fs::write(&cfg_path, minimal_toml).await?;
        info!("Generated default arti.toml at {:?}", cfg_path);
    }

    info!("Tor configuration directory ready at {:?}", cfg_dir);
    Ok(())
}
