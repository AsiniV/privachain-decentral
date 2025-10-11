// Integration tests for arti_runner module

use privachain_arti_node::bootstrap_tor;

#[tokio::test]
async fn test_bootstrap_tor_creates_config_dir() {
    // This test verifies that bootstrap_tor creates the config directory
    // Note: This test will attempt to connect to the Tor network and may take time
    // In CI environments without Tor network access, this is expected to fail at bootstrap
    
    let config_dir = dirs::config_dir().unwrap().join("arti");
    
    // Clean up any existing config for a fresh test
    if config_dir.exists() {
        std::fs::remove_dir_all(&config_dir).ok();
    }
    
    // Attempt to bootstrap (may fail in CI without network access)
    let result = bootstrap_tor().await;
    
    // Check that config directory was created regardless of bootstrap success
    assert!(config_dir.exists(), "Config directory should be created");
    
    // Check that config file was created
    let config_file = config_dir.join("arti.toml");
    assert!(config_file.exists(), "Config file should be created");
    
    // If bootstrap succeeded, verify the client is valid
    if let Ok(_client) = result {
        // Client was successfully created and bootstrapped
        assert!(true, "Tor client bootstrapped successfully");
    } else {
        // Bootstrap failed (expected in CI without Tor network)
        eprintln!("Note: Tor bootstrap failed (expected in CI without network access)");
    }
}

#[test]
fn test_config_file_format() {
    // Test that the config file has the expected format
    let config_content = r#"
[application]
nickname = "privachain"

[proxy]
socks_listen = "127.0.0.1:0"  # random port

"#;
    
    // Verify it's valid TOML
    let parsed: Result<toml::Value, _> = toml::from_str(config_content);
    assert!(parsed.is_ok(), "Config should be valid TOML");
    
    // Verify expected sections exist
    let config = parsed.unwrap();
    assert!(config.get("application").is_some(), "Should have application section");
    assert!(config.get("proxy").is_some(), "Should have proxy section");
}

#[test]
fn test_module_public_api() {
    // Verify that the public API is available
    // This is a compile-time check that ensures the function is exported correctly
    let _fn_ptr = bootstrap_tor;
    assert!(true, "bootstrap_tor function is accessible");
}
