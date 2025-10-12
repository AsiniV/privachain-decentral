# PrivaChain Node

A libp2p-based P2P node with optional Tor anonymization for the PrivaChain network.

## Features

- **libp2p networking**: Uses libp2p for peer-to-peer communication
- **Tor integration**: Optional anonymization of all network traffic through Tor
- **NYM Mixnet support**: Optional mixnet transport (feature-gated, see [MIXNET.md](./MIXNET.md))
- **Configurable listening address**: Specify TCP/IP addresses to listen on
- **Lightweight**: Minimal implementation suitable for various deployment scenarios

## Building

```bash
# Build in debug mode
cargo build --bin privachain-node

# Build in release mode
cargo build --bin privachain-node --release
```

## Usage

### Normal Mode (No Tor)

Run the node with standard TCP transport:

```bash
./target/release/privachain-node
```

By default, the node listens on `/ip4/0.0.0.0/tcp/33333`.

### Anonymized Mode (With Tor)

Run the node with all traffic routed through Tor:

```bash
./target/release/privachain-node --anonymize
```

This will:
1. Bootstrap the Tor network using Arti (Tor implementation in Rust)
2. Create a libp2p transport using Tor
3. Route all network traffic through the Tor network

**Note**: Tor bootstrap can take 30-60 seconds on first run. The node will fail to start if Tor cannot be bootstrapped.

### Custom Listen Address

Specify a custom multiaddr to listen on:

```bash
./target/release/privachain-node --listen /ip4/127.0.0.1/tcp/9000
```

## Command-Line Options

```
Usage: privachain-node [OPTIONS]

Options:
      --listen <LISTEN>                      Listen multiaddr (tcp/websocket) [default: /ip4/0.0.0.0/tcp/33333]
      --anonymize                            Force all traffic through Tor
      --mixnet                               Use NYM mixnet instead of Tor [env: PRIVACHAIN_MIXNET=]
      --mixnet-gateway <MIXNET_GATEWAY>      NYM mixnet gateway address (required if --mixnet is enabled) [env: PRIVACHAIN_MIXNET_GATEWAY=]
  -h, --help                                 Print help
```

**Note**: For mixnet support, build with `--features mixnet`. See [MIXNET.md](./MIXNET.md) for details.

## Architecture

### Components

- **main.rs**: Entry point, creates libp2p swarm with appropriate transport
- **cli.rs**: Command-line argument parsing
- **tor_runner.rs**: Tor configuration and bootstrap logic
- **cosmos_light.rs**: Light client functionality (existing module)

### Tor Integration

The Tor integration uses:
- **libp2p-community-tor**: Provides Tor transport for libp2p
- **Arti**: Tor implementation in Rust (embedded in libp2p-community-tor)

When `--anonymize` is enabled:
1. Tor configuration directory is prepared at `~/.config/privachain/arti.toml`
2. `libp2p_community_tor::TorTransport` is used instead of TCP transport
3. All peer connections are established through Tor circuits

### libp2p Behaviour

The node uses a simple ping behaviour for demonstration. In production, this would be replaced with:
- Custom blockchain sync protocols
- Gossip protocols for transaction and block propagation
- Request/response protocols for peer discovery

## Web/WASM Limitations

**Important**: Tor integration is NOT supported on web/WASM targets.

The Arti Tor client and libp2p-community-tor do not compile to WASM due to:
- Native networking requirements
- System-level socket APIs
- Cryptographic implementations that require platform features

### Recommendations for Web Deployments

For web-based anonymization:
1. **Use Tor Browser**: Users should access the web application through Tor Browser
2. **External Tor Proxy**: Set up a separate Tor proxy that the web application connects to
3. **VPN/Proxy Services**: Use compatible anonymization services designed for web environments
4. **Onion Services**: Deploy the web application as a Tor hidden service

Do not attempt to use the `--anonymize` flag when compiling for WASM targets.

## Configuration

### Arti Configuration

The Tor client configuration is stored at:
- Linux: `~/.config/privachain/arti.toml`
- macOS: `~/Library/Application Support/privachain/arti.toml`
- Windows: `%APPDATA%\privachain\arti.toml`

A minimal configuration is auto-generated on first run. Advanced users can customize this file to:
- Configure Tor bridges for censored networks
- Set specific exit nodes
- Adjust circuit parameters
- Configure SOCKS proxy settings

## Testing

### Test Normal Mode

```bash
# Run node for 10 seconds
timeout 10 ./target/release/privachain-node
```

Expected output:
```
INFO privachain_node: Building TCP transport...
INFO privachain_node: Node started, Peer ID: <peer_id>
INFO privachain_node: Running in normal mode (no Tor)
INFO privachain_node: Listening on /ip4/127.0.0.1/tcp/33333
```

### Test Tor Mode

**Note**: Requires network access and may take 30-60 seconds for initial bootstrap.

```bash
# Run node with Tor
./target/release/privachain-node --anonymize
```

Expected output:
```
INFO privachain_node: Anonymize mode enabled - bootstrapping Tor...
INFO tor_runner: Tor configuration directory ready at ...
INFO privachain_node: Building Tor transport...
INFO privachain_node: Node started, Peer ID: <peer_id>
INFO privachain_node: Running in anonymized mode via Tor
```

### Automated Testing

Run the test script:

```bash
bash ../scripts/check_tor.sh
```

## Dependencies

Key dependencies:
- `libp2p` (v0.53): P2P networking framework
- `libp2p-community-tor` (v0.4): Tor transport for libp2p
- `tokio`: Async runtime
- `clap`: CLI argument parsing
- `tracing`: Logging and diagnostics
- `directories`: Cross-platform config directory management
- `futures`: Async utilities
- `anyhow`: Error handling

## Security Considerations

### Tor Anonymization

When using `--anonymize`:
- ✅ All libp2p connections are routed through Tor
- ✅ Your real IP address is hidden from peers
- ✅ Traffic is encrypted through Tor circuits
- ⚠️ Performance is reduced due to Tor routing overhead
- ⚠️ Latency is significantly increased (2-5 seconds per request)

### Without Tor

When running in normal mode:
- ❌ Your real IP address is visible to peers
- ❌ No additional anonymization beyond libp2p encryption
- ✅ Better performance and lower latency
- ✅ Suitable for trusted networks or when anonymity is not required

### Recommendations

- Use `--anonymize` when connecting to untrusted networks
- Use `--anonymize` when privacy is critical
- Consider VPN + normal mode for balance of speed and privacy
- Regular mode is sufficient for local testing and development

## Troubleshooting

### Tor Bootstrap Fails

**Error**: `Failed to bootstrap Tor` or node exits immediately with `--anonymize`

**Causes**:
1. No network connectivity
2. Tor network is blocked by firewall/ISP
3. System time is incorrect

**Solutions**:
1. Check internet connection
2. Try using Tor bridges (configure in `arti.toml`)
3. Verify system clock is accurate
4. Check firewall settings

### Port Already in Use

**Error**: `Address already in use`

**Solution**: Use a different port with `--listen /ip4/0.0.0.0/tcp/PORT`

### Slow Performance with Tor

**Expected behavior**: Tor adds 2-5 seconds latency per connection.

**Mitigations**:
- Use long-lived connections
- Implement connection pooling
- Cache peer information
- Consider hybrid approach (Tor for sensitive operations only)

## License

Same as the main PrivaChain project.
