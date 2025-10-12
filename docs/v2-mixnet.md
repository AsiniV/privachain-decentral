# v2.0 Mixnet by Default

## Quick Start

```bash
# default = mixnet
./privachain-node

# fallback = Tor (requires --features fallback-tor at build time)
./privachain-node --fallback

# v1.0-rc mode = TCP only (build with --no-default-features)
cargo build --release --no-default-features -p privachain_node
./target/release/privachain-node
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PRIVACHAIN_FALLBACK` | Force Tor fallback mode (same as `--fallback` flag) |
| `PRIVACHAIN_MIXNET_GATEWAY` | NYM mixnet gateway address (default: `45.79.1.1:1789`) |

## Build Configurations

### Default Build (Mixnet)
```bash
cargo build --release -p privachain_node
# Features: mixnet-default
# Binary size: ~2.6MB
# Transport: NYM mixnet (default)
```

### Fallback-Tor Build
```bash
cargo build --release --features fallback-tor -p privachain_node
# Features: mixnet-default + fallback-tor
# Binary size: ~5MB
# Transport: NYM mixnet (default), Tor (with --fallback)
```

### v1.0-rc Build (No Features)
```bash
cargo build --release --no-default-features -p privachain_node
# Features: none
# Binary size: ~2.6MB
# Transport: TCP only (legacy behavior)
```

## Feature Flags

- **`mixnet-default`** (enabled by default) - Enables NYM mixnet transport
- **`fallback-tor`** (optional) - Enables Tor fallback with `--fallback` flag

## Zero Regressions

✅ **v2.0 maintains full backward compatibility:**

1. **Same binary compiles without features** - Produces v1.0-rc behavior (TCP only)
2. **Smaller default binary** - 2.6MB (down from 6MB)
3. **No breaking changes** - CLI interface is additive only
4. **Feature-gated** - Dependencies only included when needed

## CLI Examples

### Default (Mixnet)
```bash
# Uses default gateway
./privachain-node

# Custom gateway
./privachain-node --mixnet-gateway 192.168.1.1:1789

# Environment variable
export PRIVACHAIN_MIXNET_GATEWAY=192.168.1.1:1789
./privachain-node
```

### Fallback to Tor
```bash
# Requires build with --features fallback-tor
./privachain-node --fallback

# Or via environment variable
export PRIVACHAIN_FALLBACK=true
./privachain-node
```

## Testing

### Run All Tests
```bash
./scripts/mixnet-smoke.sh
```

### Individual Tests
```bash
# Test mixnet-default (default build)
./scripts/smoke-mixnet-default.sh

# Test fallback-tor
./scripts/smoke-fallback-tor.sh
```

## Migration from v1.0

### Old v1.0 Commands
```bash
# Default (Tor)
./privachain-node

# Mixnet (opt-in)
./privachain-node --mixnet --mixnet-gateway 45.79.1.1:1789
```

### New v2.0 Commands
```bash
# Default (Mixnet)
./privachain-node

# Fallback (Tor)
./privachain-node --fallback
```

## Binary Size Comparison

| Version | Configuration | Size | Transport |
|---------|--------------|------|-----------|
| v1.0 | Default | ~6MB | Tor |
| v1.0 | `--features mixnet` | ~8MB | Tor + Mixnet |
| v2.0 | Default | ~2.6MB | Mixnet |
| v2.0 | `--features fallback-tor` | ~5MB | Mixnet + Tor |
| v2.0 | `--no-default-features` | ~2.6MB | TCP only |

## Implementation Details

### Transport Selection Logic

```rust
if args.fallback {
    // Use Tor (requires fallback-tor feature)
    #[cfg(feature = "fallback-tor")]
    bootstrap_tor_transport()
    
    #[cfg(not(feature = "fallback-tor"))]
    bail!("Binary compiled without --features fallback-tor")
} else {
    // Default: use mixnet
    #[cfg(feature = "mixnet-default")]
    initialize_mixnet_transport()
    
    // Fallback to TCP if no features
    #[cfg(not(feature = "mixnet-default"))]
    build_tcp_transport()
}
```

### Gateway Configuration

The default gateway is `45.79.1.1:1789`. You can override it via:
1. CLI flag: `--mixnet-gateway <addr>`
2. Environment variable: `PRIVACHAIN_MIXNET_GATEWAY=<addr>`

## Troubleshooting

### "Binary compiled without --features fallback-tor"

You tried to use `--fallback` but the binary was built without the `fallback-tor` feature.

**Solution:**
```bash
cargo build --release --features fallback-tor -p privachain_node
./target/release/privachain-node --fallback
```

### Node doesn't print logs

Make sure to set `RUST_LOG=info`:
```bash
RUST_LOG=info ./privachain-node
```

## References

- [NYM Documentation](https://nymtech.net/docs/)
- [Sphinx Packet Format](https://github.com/nymtech/nym/tree/master/common/nymsphinx)
- [Full Implementation Details](../node/MIXNET.md)
