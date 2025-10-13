// src/render/gecko_engine/src/lib.rs
//! Gecko (Firefox) engine wrapper for PrivaChain
//! 
//! Provides a thin IPC layer to launch and communicate with a Firefox sidecar
//! using the DevTools remote debugging protocol (compatible with Chrome CDP).

use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

/// GeckoLauncher manages the Firefox sidecar process
pub struct GeckoLauncher {
    port: u16,
    child: Option<Child>,
}

/// Configuration for launching Gecko
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeckoConfig {
    pub profile_path: PathBuf,
    pub binary_path: Option<PathBuf>,
    pub enable_fingerprint_resistance: bool,
    pub safe_mode: bool,
}

impl Default for GeckoConfig {
    fn default() -> Self {
        Self {
            profile_path: PathBuf::from("/tmp/gecko-profile"),
            binary_path: None,
            enable_fingerprint_resistance: true,
            safe_mode: true,
        }
    }
}

impl GeckoLauncher {
    /// Start a new Gecko instance with the given configuration
    pub fn start(config: GeckoConfig) -> Result<Self> {
        let port = portpicker::pick_unused_port()
            .context("Failed to find an unused port for Gecko remote debugging")?;

        // Determine binary path
        let bin = config.binary_path.unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../../src-tauri/binaries/gecko-slim/firefox")
        });

        // Build command arguments
        let mut args = vec![
            "--no-remote".to_string(),
            "--profile".to_string(),
            config.profile_path.to_string_lossy().to_string(),
            "--new-instance".to_string(),
            "--remote-debugging-server".to_string(),
            format!("127.0.0.1:{}", port),
        ];

        // Add privacy hardening flags
        if config.enable_fingerprint_resistance {
            args.push("--resistfingerprinting".to_string());
        }
        
        if config.safe_mode {
            args.push("--safe-mode".to_string());
        }

        // Launch the Firefox process
        let child = Command::new(&bin)
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .context(format!("Failed to launch Gecko from {:?}", bin))?;

        Ok(Self {
            port,
            child: Some(child),
        })
    }

    /// Returns WebSocket URL for DevTools protocol (same format as Chrome CDP)
    pub fn ws_url(&self) -> String {
        format!("ws://127.0.0.1:{}/", self.port)
    }

    /// Get the remote debugging port
    pub fn port(&self) -> u16 {
        self.port
    }

    /// Stop the Gecko process
    pub fn stop(&mut self) -> Result<()> {
        if let Some(mut child) = self.child.take() {
            child.kill().context("Failed to kill Gecko process")?;
            child.wait().context("Failed to wait for Gecko process")?;
        }
        Ok(())
    }
}

impl Drop for GeckoLauncher {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gecko_config_default() {
        let config = GeckoConfig::default();
        assert!(config.enable_fingerprint_resistance);
        assert!(config.safe_mode);
    }

    #[test]
    fn test_ws_url_format() {
        // Create a launcher with a mock port
        let launcher = GeckoLauncher {
            port: 9222,
            child: None,
        };
        
        let url = launcher.ws_url();
        assert_eq!(url, "ws://127.0.0.1:9222/");
    }

    #[test]
    fn test_port_getter() {
        let launcher = GeckoLauncher {
            port: 9223,
            child: None,
        };
        
        assert_eq!(launcher.port(), 9223);
    }
}
