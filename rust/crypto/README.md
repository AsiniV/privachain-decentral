# PrivaChain Crypto Module

This module provides cryptographic primitives for the PrivaChain decentralized messaging system, wrapping the core `privachain_messenger` Double Ratchet implementation.

## Structure

```
rust/crypto/
├── Cargo.toml          # Main crypto module
├── src/
│   └── lib.rs          # Crypto API exports
├── ffi/                # FFI bindings
│   ├── Cargo.toml
│   ├── build.rs        # UniFFI scaffolding generator
│   ├── src/
│   │   ├── lib.rs      # FFI implementation
│   │   └── privachain_dr.udl  # UniFFI interface definition
│   └── README.md
└── README.md
```

## Features

- **Double Ratchet Protocol**: Signal-compatible end-to-end encryption
- **X3DH Key Agreement**: Extended Triple Diffie-Hellman for initial key exchange
- **Key Types**: Identity, Signed Pre-Key, Ephemeral, One-Time Pre-Keys
- **Session Management**: Establish, encrypt, decrypt, persist sessions
- **FFI Bindings**: UniFFI-based bindings for Flutter/Dart

## Building

```bash
cargo build --release
```

## Components

### Key Types

- **IdentityKey**: Long-term identity key (Ed25519)
- **SignedPreKey**: Medium-term pre-key signed by identity key
- **EphemeralKey**: Short-term key for each session
- **Session**: Double Ratchet session state

### Functions

- `establish_outbound_session()`: Create outbound session (Alice initiates)
- `establish_inbound_session()`: Create inbound session (Bob responds)

## Usage Example

```rust
use privachain_crypto::dr::{
    IdentityKey, SignedPreKey, EphemeralKey,
    establish_outbound_session, establish_inbound_session
};

// Generate keys
let identity = IdentityKey::generate()?;
let signed_pre = SignedPreKey::generate(&identity)?;
let ephemeral = EphemeralKey::generate()?;

// Establish session
let session = establish_outbound_session(
    their_identity,
    their_signed_pre,
    their_ephemeral,
)?;

// Encrypt/decrypt
let cipher_msg = session.encrypt(b"Hello")?;
let plaintext = session.decrypt(&cipher_msg)?;
```

## Integration

This module is designed to be used by:

1. **FFI Layer** (`rust/crypto/ffi`): UniFFI bindings for Flutter/Dart
2. **Native Rust**: Direct integration in Rust applications
3. **WASM**: Future WebAssembly bindings for web applications

## Dependencies

- `privachain_messenger`: Core messenger implementation with Double Ratchet
- `serde`: Serialization support
- `anyhow`: Error handling

## Security Considerations

- Key generation currently uses placeholder implementations
- Session serialization needs proper Serde implementation
- X3DH key agreement is simplified
- Production deployment requires proper key management and secure storage

## Future Work

- [ ] Real Ed25519 key generation
- [ ] Complete X3DH implementation
- [ ] Session serialization with Serde
- [ ] Key rotation support
- [ ] Multi-device support
- [ ] Group messaging support
- [ ] Post-quantum key exchange (Kyber integration)
