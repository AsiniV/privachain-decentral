# PrivaChain Arti Node

This module provides direct Arti client integration for bootstrapping Tor connections in PrivaChain.

## Overview

This is an alternative Tor integration approach that uses the Arti client library directly, as opposed to the `libp2p-community-tor` approach used in the main `node` module. It provides a lower-level API for applications that need direct access to the `TorClient` instance.

## Features

- Direct `TorClient` creation and bootstrapping
- Configuration file management in standard directories
- Compatible with the existing workspace dependencies (uses arti-client 0.24)

## Usage

```rust
use privachain_arti_node::bootstrap_tor;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    
    // Bootstrap Tor and get TorClient instance
    let tor_client = bootstrap_tor().await?;
    
    // Now you can use tor_client to make connections through Tor
    // For example: tor_client.connect(addr).await?
    
    Ok(())
}
```

## Configuration

The `bootstrap_tor()` function:
1. Creates a configuration directory at `~/.config/arti/` (or platform equivalent)
2. Generates a minimal `arti.toml` configuration file if it doesn't exist
3. Creates and bootstraps a `TorClient` instance
4. Returns the bootstrapped client for use

## Dependencies

- `arti-client` (0.24) - Core Tor client library
- `tor-rtcompat` (0.24) - Runtime compatibility layer
- `tokio` - Async runtime (with rustls)
- `dirs` - Platform-specific directory paths

## Comparison with node/tor_runner.rs

| Feature | rust/node (this module) | node/tor_runner.rs |
|---------|--------------------------|-------------------|
| Tor Library | Direct arti-client | libp2p-community-tor |
| Returns | `TorClient` instance | `()` (preparation only) |
| Integration | Manual connection handling | Automatic via libp2p transport |
| Use Case | Custom Tor usage | libp2p network transport |
| Bootstrap | Synchronous wait | Handled by libp2p-community-tor |

## When to Use

Use this module when you need:
- Direct access to the `TorClient` API
- Custom connection handling through Tor
- SOCKS proxy setup
- Fine-grained control over Tor operations

Use the main `node` module with `libp2p-community-tor` when you need:
- libp2p networking with Tor transport
- Automatic Tor integration in a P2P network
- Higher-level abstractions

## Example: Integration with libp2p

The returned `TorClient` can be integrated with libp2p using `libp2p-community-tor`'s `TorTransport`:

```rust
use privachain_arti_node::bootstrap_tor;
use libp2p_community_tor::TorTransport;
use libp2p::core::transport::OrTransport;
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Bootstrap Tor and wrap in Arc for shared ownership
    let tor = bootstrap_tor().await?;
    let tor_transport = TorTransport::new(Arc::new(tor));
    
    // Combine with other transports (TCP, QUIC, etc.)
    let other_transports = libp2p::tcp::tokio::Transport::default();
    let transport = OrTransport::new(tor_transport, other_transports)
        .boxed();
    
    // Use transport when building your libp2p Swarm
    // No SOCKS port required - onion addresses are dialed directly
    
    Ok(())
}
```

## Example: SOCKS Proxy

The returned `TorClient` can also be used to create SOCKS proxy connections or direct streams:

```rust
use privachain_arti_node::bootstrap_tor;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let tor = bootstrap_tor().await?;
    
    // Connect to a destination through Tor
    let addr = "example.com:80".parse()?;
    let stream = tor.connect(addr).await?;
    
    // Use the stream...
    
    Ok(())
}
```

## Building

```bash
cd rust/node
cargo build
```

## Testing

```bash
cd rust/node
cargo test
```

Note: Actual Tor bootstrapping requires network access and may take several seconds to complete.

## License

Same as the main PrivaChain project.
