# Arti Runner Implementation

This document describes the implementation of direct Arti client integration in the `rust/node` module.

## Overview

This module provides a `bootstrap_tor()` function that creates and bootstraps a Tor client using the Arti library directly. This is an alternative approach to the `libp2p-community-tor` integration used in the main `node` module.

## Architecture

### Module Structure

```
rust/node/
├── Cargo.toml              # Dependencies and package configuration
├── README.md               # User-facing documentation
├── IMPLEMENTATION.md       # This file - technical details
├── src/
│   ├── lib.rs             # Module exports
│   └── arti_runner.rs     # Core implementation
└── examples/
    └── bootstrap_example.rs # Usage example
```

### Key Components

#### 1. Configuration Management

The `bootstrap_tor()` function manages configuration in a platform-specific directory:

- **Linux**: `~/.config/arti/`
- **macOS**: `~/Library/Application Support/arti/`
- **Windows**: `%APPDATA%\arti\`

A minimal `arti.toml` configuration file is created if it doesn't exist:

```toml
[application]
nickname = "privachain"

[proxy]
socks_listen = "127.0.0.1:0"  # random port
```

#### 2. Runtime Setup

The implementation uses `TokioRustlsRuntime` for async operations:

```rust
let runtime = TokioRustlsRuntime::current()
    .expect("Couldn't get the current tokio rustls runtime");
```

This requires:
- An active Tokio runtime
- The `rustls` feature enabled in `tor-rtcompat`

#### 3. Client Creation and Bootstrap

```rust
// Create builder with runtime
let builder = TorClient::with_runtime(runtime);

// Create unbootstrapped client
let tor = builder.create_unbootstrapped()?;

// Bootstrap into Tor network
tor.bootstrap().await?;
```

The `bootstrap()` method:
- Downloads network consensus
- Builds circuits to Tor relays
- Verifies connectivity
- Returns when fully bootstrapped

## API Design

### Function Signature

```rust
pub async fn bootstrap_tor() -> anyhow::Result<TorClient<TokioRustlsRuntime>>
```

**Returns**: A fully bootstrapped `TorClient` instance ready for use.

**Errors**: 
- Configuration directory creation failures
- Runtime initialization errors
- Tor bootstrap failures (network issues, timeouts, etc.)

### Usage Pattern

```rust
use privachain_arti_node::bootstrap_tor;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let tor = bootstrap_tor().await?;
    
    // Use tor client for connections
    let stream = tor.connect(addr).await?;
    
    Ok(())
}
```

## Dependency Compatibility

### Version Selection

The module uses `arti-client` 0.24 to maintain compatibility with the existing workspace:

- The main `node` module uses `libp2p-community-tor` 0.4
- `libp2p-community-tor` depends on `arti-client` 0.24
- Using the same version prevents dependency conflicts

### rusqlite Conflict Resolution

Initial attempts to use newer versions (0.34, 0.35) failed due to conflicting `rusqlite` versions:

- `messenger` module: rusqlite 0.32
- `arti-client` 0.35: rusqlite 0.37
- Rust allows only one version of native libraries

Solution: Use `arti-client` 0.24 which is compatible with rusqlite 0.32.

## Differences from Problem Statement

The original problem statement proposed using these APIs:

```rust
// Problem statement (doesn't work with current versions)
use arti_config::{CfgPath, TorClientConfigBuilder};

let cfg = TorClientConfig::load(&CfgPath::new(path))?;
let tor = TorClient::create_bootstrapped(cfg).await?;
```

The actual implementation uses:

```rust
// Actual working implementation
let runtime = TokioRustlsRuntime::current()?;
let builder = TorClient::with_runtime(runtime);
let tor = builder.create_unbootstrapped()?;
tor.bootstrap().await?;
```

**Reasons**:
1. `arti-config` crate was removed in newer versions
2. `TorClientConfig` no longer implements `DeserializeOwned`
3. The builder pattern with explicit runtime is the current API
4. Manual bootstrap call provides better error handling

## Comparison with libp2p-community-tor

| Aspect | rust/node (this) | node/tor_runner.rs |
|--------|------------------|-------------------|
| **Integration** | Direct arti-client | Via libp2p-community-tor |
| **Return Type** | `TorClient` instance | `()` (setup only) |
| **Transport** | Manual (connect API) | Automatic (libp2p) |
| **Complexity** | Lower-level, more control | Higher-level, less control |
| **Use Case** | Custom Tor usage | P2P networking |
| **Bootstrap** | Explicit `await` | Handled by transport |

## Performance Characteristics

### Bootstrap Time

- **Initial bootstrap**: 10-30 seconds (network dependent)
- **Subsequent runs**: ~5-15 seconds (uses cached consensus)

### Resource Usage

- **Memory**: ~50-100 MB for bootstrapped client
- **CPU**: Minimal after bootstrap (circuit maintenance)
- **Network**: Ongoing connection to Tor relays

## Error Handling

The implementation uses `anyhow::Result` for error propagation. Common errors:

1. **Runtime Error**: No Tokio runtime available
   ```
   Couldn't get the current tokio rustls runtime
   ```

2. **Network Error**: Cannot reach Tor network
   ```
   Failed to bootstrap Tor: Network unreachable
   ```

3. **Configuration Error**: Cannot create config directory
   ```
   Failed to create directory: Permission denied
   ```

## Future Enhancements

Potential improvements for future versions:

1. **Configurable Paths**: Allow custom configuration directories
2. **SOCKS Proxy**: Expose SOCKS proxy functionality
3. **Circuit Control**: Provide circuit management APIs
4. **Onion Services**: Support for hosting onion services
5. **Connection Pooling**: Reuse connections for efficiency
6. **Graceful Shutdown**: Proper cleanup on exit

## Testing Considerations

### Why No Unit Tests?

1. **Network Dependency**: Bootstrap requires actual Tor network access
2. **Time Intensive**: Each test would take 10-30 seconds
3. **CI Limitations**: GitHub Actions may block Tor
4. **No Test Infrastructure**: The workspace doesn't have integration test patterns

### Manual Testing

To manually test the implementation:

```bash
# Build the example
cargo build --example bootstrap_example

# Run it (requires network access)
cargo run --example bootstrap_example
```

Expected output:
```
🚀 Starting Tor bootstrap example...
⏳ This may take 10-30 seconds depending on network conditions...

✅ Tor client successfully bootstrapped!
...
🎉 Example completed successfully!
```

## Security Considerations

1. **Trust on First Use**: Initial consensus download is not authenticated
2. **Directory Permissions**: Config files should be user-readable only
3. **Memory Safety**: Uses Rust's memory safety guarantees
4. **Dependency Audit**: Regularly audit arti-client for security updates

## Maintenance

### Version Updates

When updating `arti-client`:

1. Check compatibility with `rusqlite` version used by `messenger`
2. Verify API changes in `TorClient` and `TorClientBuilder`
3. Update feature flags if necessary
4. Test bootstrap functionality
5. Update documentation

### Monitoring Dependencies

Watch for:
- Security advisories in arti-client
- Breaking changes in tor-rtcompat
- API deprecations in Tokio

## References

- [Arti Project](https://gitlab.torproject.org/tpo/core/arti)
- [arti-client Documentation](https://docs.rs/arti-client/)
- [tor-rtcompat Documentation](https://docs.rs/tor-rtcompat/)
- [libp2p-community-tor](https://github.com/umgefahren/libp2p-tor)

## License

Same as the main PrivaChain project.
