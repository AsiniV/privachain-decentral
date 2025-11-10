# I2P Integration (v5.0)

This document describes the I2P SAMv3 tunnel integration for PrivaChain node.

## Overview

**PrivaChain v5.0 uses I2P tunnels as the default transport** for all network traffic (browser + messenger + search). This replaces the previous NYM mixnet integration with a lighter, more efficient anonymity layer.

**Key Features:**
- 🔒 **I2P SAMv3 Protocol** - Standard tunnel protocol for anonymous networking
- 📦 **Smaller binary** - ~1.5MB (down from 2.6MB with NYM)
- ⚡ **Lower latency** - Target < 300ms median (vs 500ms+ with NYM)
- 🔑 **Persistent keys** - .i2p base32 addresses for peer identity
- 🌐 **Clearnet fallback** - Use `--tunnel none` for development

## Building

### Default Build (I2P, ~1.5MB)
```bash
cargo build --release -p privachain_node
# Default feature: i2p-default
```

### Clearnet Build (No tunnel, for development)
```bash
cargo build --release --no-default-features -p privachain_node
# Produces clearnet-only binary (TCP only)
```

## Usage

### Start with I2P (default)
```bash
./target/release/privachain-node
# Uses default SAM host: 127.0.0.1:7656
```

### Start with custom SAM host
```bash
./target/release/privachain-node --i2p-sam-host 192.168.1.1:7656
```

Or using environment variables:
```bash
export I2P_SAM_HOST=192.168.1.1:7656
./target/release/privachain-node
```

### Start without tunnel (clearnet dev mode)
```bash
./target/release/privachain-node --tunnel none
```

## CLI Options

- `--listen <ADDR>` - Listen multiaddr (default: /ip4/0.0.0.0/tcp/33333)
- `--tunnel <MODE>` - Tunnel mode: `i2p` (default) or `none` (clearnet)
- `--i2p-sam-host <ADDR>` - I2P SAM bridge address (default: 127.0.0.1:7656)

## Environment Variables

- `PRIVACHAIN_TUNNEL` - Tunnel mode (`i2p` or `none`)
- `I2P_SAM_HOST` - SAM bridge address (default: 127.0.0.1:7656)

## I2P Router Setup

PrivaChain requires an I2P router with SAM bridge enabled.

### i2pd (C++ implementation, recommended)

```bash
# Install i2pd (Debian/Ubuntu)
sudo apt-get install i2pd

# Enable SAM in config
sudo nano /etc/i2pd/i2pd.conf
# Add:
# [sam]
# enabled = true
# address = 127.0.0.1
# port = 7656

# Restart i2pd
sudo systemctl restart i2pd
```

### Docker (i2pd)

```bash
# Run i2pd in Docker
docker run -d \
  --name i2pd \
  -p 7656:7656 \
  purplei2p/i2pd:latest \
  --sam.enabled=true --sam.address=0.0.0.0 --sam.port=7656
```

## Multiaddr Format

I2P destinations are represented in libp2p multiaddr format:

```
/ip4/127.0.0.1/tcp/4001/p2p/12D3KooW.../p2p-circuit/i2p/ABCDEF...XYZ.b32.i2p
```

## API Compatibility

All existing APIs remain compatible:

| API Endpoint | Old (NYM) | New (I2P) | Status |
|--------------|-----------|-----------|--------|
| POST /message | NYM addr | I2P b32 | ✅ Compatible |
| GET /search | same | same | ✅ Unchanged |
| Keplr chain-id | osmo-test-5 | osmo-test-5 | ✅ Unchanged |

## References

- [I2P SAMv3 Protocol](https://geti2p.net/en/docs/api/samv3)
- [i2pd GitHub](https://github.com/PurpleI2P/i2pd)
