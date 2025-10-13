# v3.0 Post-Quantum Cryptography

## Overview

PrivaChain v3.0 adds quantum-safe cryptography on top of the existing Mixnet transport layer from v2.0. 

**Important**: Mixnet provides quantum-safe **envelopes** (using Sphinx packets), but you still need quantum-safe **keys and signatures** for:
- Identity and authentication
- End-to-end message encryption
- Cosmos transaction signing
- libp2p handshakes

This is where v3.0's post-quantum features come in, using **Kyber-768** for key exchange and **Dilithium-3** for signatures.

## Quick Start

### Building with Post-Quantum Support

```bash
# Build the messenger with post-quantum features
cargo build --release --features post-quantum -p privachain_messenger

# Run smoke tests
./scripts/smoke-pq.sh
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PQ_MNEMONIC` | Funded NYM wallet for PQ-bandwidth | `word1 word2 ... word24` |
| `RUST_LOG` | Logging level | `info` or `debug` |

## Architecture

### Hybrid Cryptography Approach

v3.0 uses a **hybrid** approach that combines classical and post-quantum algorithms:

1. **Key Exchange**: X25519 + Kyber-768
   - Classical: X25519 (32-byte shared secret)
   - Post-quantum: Kyber-768 (32-byte shared secret)
   - Combined: 64-byte hybrid shared secret

2. **Signatures**: Ed25519 + Dilithium-3
   - Classical: Ed25519 (64-byte signature)
   - Post-quantum: Dilithium-3 (~2420-byte signature)
   - Both signatures verified for maximum security

### Why Hybrid?

- **Backward Compatibility**: Old peers without PQ support can still connect using classical crypto
- **Defense in Depth**: If either algorithm is broken, the other provides protection
- **Migration Path**: Smooth transition without breaking existing deployments

## Features

### 1. Hybrid Key Exchange

**Module**: `messenger/src/crypto/pq_handshake.rs`

```rust
use privachain_messenger::crypto::pq_handshake::{
    generate_hybrid_keypair, 
    hybrid_encapsulate,
    hybrid_decapsulate
};

// Generate keypair
let (classical_pk, pq_pk) = generate_hybrid_keypair();

// Encapsulate (sender side)
let (ciphertext, shared_secret) = hybrid_encapsulate(their_classical_pk, &their_pq_pk)?;

// Decapsulate (receiver side)
let shared_secret = hybrid_decapsulate(their_classical_pk, &ciphertext)?;
```

### 2. Hybrid Signatures

**Module**: `messenger/src/crypto/pq_sign.rs`

```rust
use privachain_messenger::crypto::pq_sign::{hybrid_sign, hybrid_verify};
use ed25519_dalek::SigningKey;

let signing_key = SigningKey::from_bytes(&secret_key_bytes);

// Sign
let signature = hybrid_sign(message, &signing_key)?;

// Verify (both Ed25519 and Dilithium must pass)
hybrid_verify(message, &signature, &ed_verifying_key, &dilithium_public_key)?;
```

### 3. Cosmos Transaction Signing

**Module**: `messenger/src/cosmos/pq_tx.rs`

```rust
use privachain_messenger::cosmos::pq_tx::{sign_pq_tx, verify_pq_tx};

// Sign Cosmos transaction with hybrid PQ signature
let tx = sign_pq_tx(
    &body_bytes,
    &auth_info_bytes,
    &signing_key
)?;

// Verify
verify_pq_tx(&tx, &verifying_key, &dilithium_pk)?;
```

### 4. Flutter/Dart FFI

**Module**: `messenger/src/crypto/pq_ffi.rs`

```dart
import 'package:privachain_messenger/ffi/pq_crypto.dart';

// Generate hybrid keypair
final keys = await PqCrypto.generateKeypair();

// Sign message
final signature = await PqCrypto.hybridSign(
  utf8.encode("hello"), 
  ed25519_secret_key
);
```

## Security Considerations

### NIST Standards Compliance

- **Kyber-768**: NIST FIPS 203 (ML-KEM) - Security Level 3 (~AES-192)
- **Dilithium-3**: NIST FIPS 204 (ML-DSA) - Security Level 3 (~AES-192)

### Threat Model

✅ **Protected Against**:
- Quantum computer attacks (Shor's algorithm)
- Harvest-now-decrypt-later attacks
- Classical cryptanalysis

⚠️ **Still Vulnerable To**:
- Side-channel attacks (use constant-time implementations)
- Implementation bugs (keep dependencies updated)
- Key compromise (use hardware security modules when possible)

### Performance Impact

| Operation | Classical Only | Hybrid (v3.0) | Overhead |
|-----------|---------------|---------------|----------|
| Key Generation | ~50μs | ~200μs | 4x |
| Encapsulation | ~60μs | ~180μs | 3x |
| Signature | ~70μs | ~500μs | 7x |
| Verification | ~90μs | ~400μs | 4.5x |

**Note**: These are approximate values. Actual performance depends on hardware and optimization flags.

## Binary Size Budget

| Configuration | Size | Budget | Status |
|--------------|------|--------|--------|
| v2.0 (Mixnet only) | 2.6 MB | < 11 MB | ✅ |
| v3.0 (Mixnet + PQ) | ~8.6 MB | < 45 MB | ✅ |

The post-quantum libraries add approximately 6 MB to the binary size, which is within the acceptable budget for v3.0.

## Testing

### Unit Tests

```bash
# Run all PQ tests
cargo test -p privachain_messenger --features post-quantum

# Run specific test module
cargo test -p privachain_messenger --features post-quantum pq_handshake
```

### Integration Testing

```bash
# Full smoke test
./scripts/smoke-pq.sh

# Manual testing
cargo build --release --features post-quantum
./target/release/examples/pq_demo
```

## Compatibility Matrix

| Version | Mixnet | PQ Crypto | Compatible With |
|---------|--------|-----------|-----------------|
| v1.0 | ❌ | ❌ | v1.0 |
| v2.0 | ✅ | ❌ | v1.0, v2.0 |
| v3.0 | ✅ | ✅ (hybrid) | v1.0, v2.0, v3.0 |

The hybrid approach ensures that v3.0 nodes can communicate with v2.0 and v1.0 nodes using classical cryptography, while using PQ crypto when both peers support it.

## Migration Guide

### From v2.0 to v3.0

1. **Update Dependencies**:
   ```toml
   [dependencies]
   privachain_messenger = { version = "0.1", features = ["post-quantum"] }
   ```

2. **Update Key Generation**:
   ```rust
   // Old (v2.0)
   let handshake = PqHandshake::new()?;  // Returns placeholder keys
   
   // New (v3.0)
   use privachain_messenger::crypto::pq_handshake::generate_hybrid_keypair;
   let (classical_pk, pq_pk) = generate_hybrid_keypair();
   ```

3. **Update Signature Verification**:
   ```rust
   // Old (v2.0)
   verify_signature(msg, sig, pk)?;  // Only classical
   
   // New (v3.0)
   use privachain_messenger::crypto::pq_sign::hybrid_verify;
   hybrid_verify(msg, &hybrid_sig, &ed_pk, &dil_pk)?;  // Hybrid
   ```

## Roadmap

### v3.0-rc (Current)
- ✅ Hybrid key exchange (X25519 + Kyber-768)
- ✅ Hybrid signatures (Ed25519 + Dilithium-3)
- ✅ Cosmos transaction signing
- ✅ Flutter FFI exports
- ✅ Feature-gated (off by default)

### v3.1 (Future)
- [ ] Hardware acceleration (AVX2 support)
- [ ] Batch signature verification
- [ ] Key rotation and migration tools
- [ ] Performance benchmarks and optimization

### v4.0 (Future)
- [ ] Post-quantum by default
- [ ] libp2p Noise protocol integration
- [ ] Threshold signatures with PQ
- [ ] MLS (Messaging Layer Security) with PQ

## References

- [NIST Post-Quantum Cryptography Standards](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Kyber Specification (FIPS 203)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf)
- [Dilithium Specification (FIPS 204)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf)
- [pqc_kyber Rust Crate](https://docs.rs/pqc_kyber/)
- [pqc_dilithium Rust Crate](https://docs.rs/pqc_dilithium/)

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/AsiniV/privachain-decentral/issues
- Documentation: https://github.com/AsiniV/privachain-decentral/tree/main/docs

## License

Copyright (c) 2025 Aleksandr Orlov. All rights reserved.

This software is proprietary and confidential. No permission is granted to copy, modify, distribute, or use this software in any form without explicit written consent from the copyright holder.
