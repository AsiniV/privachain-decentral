# Post-Quantum Features (v3.0)

This document describes the post-quantum cryptography features implemented in Privachain v3.0.

## Overview

Privachain v3.0 introduces hybrid post-quantum cryptography to protect against future quantum computer attacks. The implementation combines classical cryptography with quantum-resistant algorithms.

## Features

### 1. PQ Bandwidth Purchase

**File**: `node/src/mixnet/pq_bandwidth.rs`

Purchase bandwidth on the NYM network using Dilithium-signed transactions for quantum-safe authentication.

```bash
# Set your NYM wallet mnemonic
export NYM_PQ_MNEMONIC="word1 word2 ... word24"

# Purchase 100 MB of bandwidth
./target/release/privachain-node --buy-pq-bandwidth 100
```

**API Usage**:
```rust
use privachain_node::mixnet::buy_pq_bandwidth;

let mnemonic = "abandon abandon abandon ...";
let mb = 100;
let dilithium_sk = vec![0u8; 32]; // Your Dilithium secret key

buy_pq_bandwidth(mnemonic, mb, &dilithium_sk).await?;
```

### 2. PQ Peer Discovery

**File**: `node/src/network/pq_discovery.rs`

Advertise post-quantum capabilities via the `/pq/1.0.0` protocol identifier in libp2p multiaddresses.

```rust
use privachain_node::network::PqDiscovery;

let discovery = PqDiscovery::new();
let peer_info = discovery.local_peer_info();
// Advertises: /ip4/0.0.0.0/tcp/0/pq/1.0.0
```

### 3. PQ Fallback

**File**: `node/src/network/pq_fallback.rs`

Automatically downgrade to classical Noise protocol when connecting to peers that don't support post-quantum cryptography.

```rust
use privachain_node::network::pq_fallback::{downgrade_if_needed, peer_supports_pq};
use libp2p::core::Multiaddr;

let peer_addr: Multiaddr = "/ip4/127.0.0.1/tcp/8000".parse()?;

if downgrade_if_needed(&peer_addr) {
    println!("Using classical Noise protocol");
} else {
    println!("Using PQ-safe protocol");
}
```

### 4. Key Rotation (24 hours)

**File**: `node/src/crypto/pq_rotation.rs`

Automatically rotate post-quantum keys every 24 hours to maintain forward secrecy.

```rust
use privachain_node::crypto::rotate_if_needed;
use std::time::Instant;

let last_rotation = Instant::now();

// Check and rotate if needed
rotate_if_needed(last_rotation).await?;
```

**Configuration**:
- Default rotation interval: 24 hours
- Generates new hybrid keypairs (X25519 + Kyber768)
- Automatically stores in keystore

### 5. Identity Export

**File**: `node/src/crypto/pq_mnemonic.rs`

Export and import identities using BIP-39 compatible mnemonics.

```rust
use privachain_node::crypto::{pq_seed_from_mnemonic, derive_key_material};

// Generate 64-byte PQ seed from mnemonic
let mnemonic = "abandon abandon abandon ...";
let seed = pq_seed_from_mnemonic(mnemonic);

// Derive different keys for different purposes
let signing_key = derive_key_material(mnemonic, "signing");
let encryption_key = derive_key_material(mnemonic, "encryption");
```

### 6. Leak Testing

**File**: `scripts/leak-pq.sh`

Test for classical cryptography leaks when running in PQ mode.

```bash
# Run the leak test
./scripts/leak-pq.sh
```

The script:
1. Builds with post-quantum features
2. Captures network traffic with tcpdump
3. Analyzes for classical ECDSA patterns
4. Fails if classical crypto is detected

## Building and Testing

### Build with Post-Quantum Support

```bash
# Build the node
cargo build --release --features post-quantum -p privachain_node

# Build the messenger
cargo build --release --features post-quantum -p privachain_messenger
```

### Run Tests

```bash
# Run all PQ tests
cargo test -p privachain_node --features post-quantum

# Run specific module tests
cargo test -p privachain_node --features post-quantum crypto::pq_rotation
```

### Deploy All Components

```bash
# Deploy with post-quantum features
./scripts/deploy-all.sh --features post-quantum
```

## Binary Sizes

| Configuration | Size | Budget | Status |
|--------------|------|--------|--------|
| Node (PQ enabled) | 2.6 MB | < 11 MB | ✅ |
| Messenger (PQ enabled) | ~708 KB | < 2 MB | ✅ |

## Architecture

### Hybrid Cryptography

The implementation uses hybrid cryptography, combining:

1. **Classical algorithms**:
   - X25519 (key exchange)
   - Ed25519 (signatures)
   - AES-256-GCM (encryption)

2. **Post-quantum algorithms**:
   - Kyber768 (key encapsulation)
   - Dilithium3 (signatures)

### Key Derivation

```
Mnemonic (12-24 words)
    ↓
SHA-512 Hash
    ↓
64-byte Seed
    ↓
Kyber768 Keypair + X25519 Keypair
```

## Security Considerations

1. **Key Rotation**: Keys are automatically rotated every 24 hours
2. **Forward Secrecy**: Old keys are destroyed after rotation
3. **Hybrid Security**: Provides security if either classical OR PQ crypto is broken
4. **Fallback Safety**: Gracefully downgrades to classical crypto when needed

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NYM_PQ_MNEMONIC` | Funded NYM wallet for PQ bandwidth | `word1 word2 ... word24` |
| `BUY_PQ_BANDWIDTH` | Amount of bandwidth to purchase (MB) | `100` |
| `RUST_LOG` | Logging level | `info` or `debug` |

## CLI Usage

```bash
# Start node with PQ support
./privachain-node --listen /ip4/0.0.0.0/tcp/33333

# Purchase PQ bandwidth
export NYM_PQ_MNEMONIC="your mnemonic here"
./privachain-node --buy-pq-bandwidth 100

# Run with fallback mode (Tor)
./privachain-node --fallback

# Specify mixnet gateway
./privachain-node --mixnet-gateway 45.79.1.1:1789
```

## Testing Strategy

1. **Unit Tests**: All modules have comprehensive unit tests
2. **Integration Tests**: End-to-end testing via smoke tests
3. **Leak Tests**: Network traffic analysis for classical crypto leaks
4. **Regression Tests**: Ensure non-PQ builds still work

## Future Enhancements

- [ ] Full NYM client integration for PQ bandwidth
- [ ] Custom libp2p Protocol::Pq implementation
- [ ] Hardware security module (HSM) integration
- [ ] Key backup and recovery mechanisms
- [ ] Multi-party computation (MPC) for key generation

## References

- [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Kyber Specification](https://pq-crystals.org/kyber/)
- [Dilithium Specification](https://pq-crystals.org/dilithium/)
- [BIP-39 Mnemonic Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)

## Support

For issues or questions about post-quantum features:
1. Check the [GitHub Issues](https://github.com/AsiniV/privachain-decentral/issues)
2. Review the [Implementation Summary](../V3_IMPLEMENTATION_SUMMARY.md)
3. Contact the development team
