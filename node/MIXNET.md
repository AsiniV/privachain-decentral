# NYM Mixnet Integration

This document describes the NYM mixnet integration for PrivaChain node.

## Overview

PrivaChain supports optional NYM mixnet transport as an alternative to Tor for anonymous networking. The mixnet functionality is behind a feature flag to keep the default binary size small.

## Building

### Default Build (Tor only, 6MB)
```bash
cargo build --release -p privachain_node
```

### Mixnet Build (~8MB)
```bash
cargo build --release --features mixnet -p privachain_node
```

## Usage

### Start with Tor (default)
```bash
./target/release/privachain-node
```

### Start with Tor (explicit)
```bash
./target/release/privachain-node --anonymize
```

### Start with NYM Mixnet
```bash
./target/release/privachain-node --mixnet --mixnet-gateway 45.79.1.1:1789
```

Or using environment variables:
```bash
export PRIVACHAIN_MIXNET=true
export PRIVACHAIN_MIXNET_GATEWAY=45.79.1.1:1789
./target/release/privachain-node
```

## CLI Options

- `--listen <ADDR>` - Listen multiaddr (default: /ip4/0.0.0.0/tcp/33333)
- `--anonymize` - Force all traffic through Tor
- `--mixnet` - Use NYM mixnet instead of Tor
- `--mixnet-gateway <ADDR>` - NYM mixnet gateway address (required if --mixnet is enabled)

**Note:** `--mixnet` and `--anonymize` are mutually exclusive.

## Environment Variables

- `PRIVACHAIN_MIXNET` - Enable mixnet mode (same as --mixnet)
- `PRIVACHAIN_MIXNET_GATEWAY` - Set mixnet gateway address

## Architecture

The mixnet integration consists of:

1. **Feature Gate** - `mixnet` feature in Cargo.toml controls compilation
2. **CLI Integration** - New flags for mixnet mode
3. **MixnetTransport** - Core transport abstraction in `src/network/mixnet_transport.rs`
4. **libp2p Integration** - Conditional transport selection in main.rs

## Current Status

- ✅ Structural implementation complete
- ✅ CLI flags and validation working
- ✅ Feature-gated build working
- ⚠️ NYM client integration pending (awaiting nym-sphinx 0.27+ on crates.io)
- ⚠️ Full libp2p adapter pending

The current implementation provides the framework for mixnet integration. Full NYM client integration will be added when the required dependencies become available on crates.io.

## Testing

Run the mixnet smoke test:
```bash
./scripts/mixnet-smoke.sh
```

This tests:
- Mixnet build succeeds
- Binary size within budget
- CLI flag validation
- Conflicting flags protection
- Node startup with mixnet

## Binary Size Budget

- Default build (Tor only): ~6MB ✅
- Mixnet build: ~8MB ✅
- Maximum allowed: 11MB

## Zero Regressions Checklist

- ✅ Tor still default – `--mixnet` is opt-in
- ✅ Same binary size – default build unchanged at 6MB
- ✅ Same smoke test – passes without `--mixnet`
- ✅ No breaking changes – existing functionality unchanged
- ✅ Feature-gated – mixnet dependencies only when feature enabled

## Future Work

1. Integrate actual NYM client when dependencies available
2. Implement full libp2p transport adapter
3. Add bandwidth credentials support
4. Add SURB (Single Use Reply Block) support
5. Implement cover traffic generation

## References

- [NYM Documentation](https://nymtech.net/docs/)
- [Sphinx Packet Format](https://github.com/nymtech/nym/tree/master/common/nymsphinx)
- [libp2p Transports](https://docs.libp2p.io/concepts/transports/)
