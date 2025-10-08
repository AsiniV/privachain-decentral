# FFI Crate Implementation Summary

## Overview

This implementation adds a Foreign Function Interface (FFI) layer for the PrivaChain Double Ratchet protocol, enabling Flutter/Dart applications to use the encrypted messaging functionality.

## Architecture

```
rust/crypto/
├── Cargo.toml                  # Main crypto module definition
├── src/
│   └── lib.rs                  # Crypto API with key types (IdentityKey, SignedPreKey, EphemeralKey)
│                               # and session establishment functions
├── ffi/                        # FFI bindings layer
│   ├── Cargo.toml              # FFI crate with UniFFI dependencies
│   ├── build.rs                # UniFFI scaffolding generator
│   ├── src/
│   │   ├── lib.rs              # FFI implementation with session management
│   │   └── privachain_dr.udl   # UniFFI interface definition (API contract)
│   ├── examples/
│   │   └── basic_usage.rs      # Demonstrates key generation and session usage
│   └── README.md               # FFI-specific documentation
├── README.md                   # Main crypto module documentation
└── IMPLEMENTATION.md           # This file
```

## Components

### 1. Core Crypto Module (`rust/crypto`)

**Purpose**: Wraps the existing `privachain_messenger` Double Ratchet implementation with a clean API.

**Key Types**:
- `IdentityKey`: Ed25519 long-term identity key
- `SignedPreKey`: Medium-term pre-key signed by identity
- `EphemeralKey`: Short-term session keys

**Functions**:
- `establish_outbound_session()`: Alice initiates connection
- `establish_inbound_session()`: Bob responds to connection

**Dependencies**:
- `privachain_messenger`: Core messenger with Double Ratchet
- `serde`: Serialization support
- `anyhow`: Error handling

### 2. FFI Layer (`rust/crypto/ffi`)

**Purpose**: Provides UniFFI-based bindings for Flutter/Dart integration.

**API Functions** (defined in `privachain_dr.udl`):
- `generate_identity_key()`: Generate Ed25519 identity key pair
- `generate_signed_prekey(identity)`: Generate signed pre-key
- `generate_ephemeral_key()`: Generate ephemeral key
- `generate_one_time_prekey()`: Generate one-time pre-key
- `DrSession::new()`: Create session manager
- `DrSession::establish_outbound()`: Establish outbound session (Alice)
- `DrSession::establish_inbound()`: Establish inbound session (Bob)
- `DrSession::encrypt()`: Encrypt message
- `DrSession::decrypt()`: Decrypt message
- `DrSession::serialize_session()`: Serialize session state
- `DrSession::load_session()`: Load session from state

**Data Types**:
- `KeyPair`: Public/private key pair
- `RatchetAddress`: DID + device ID identifier
- `CipherMessage`: Encrypted message with header
- `DrError`: Error enumeration (NoSession, Crypto, Serialize)

**Implementation Details**:
- Session storage: Global `Mutex<HashMap<RatchetAddress, Session>>`
- Session lifecycle: Create → Establish → Encrypt/Decrypt → Serialize/Load
- Thread-safe: Uses mutex for concurrent access

**Dependencies**:
- `privachain_crypto`: Core crypto module
- `uniffi`: FFI bindings generator (v0.28)
- `bincode`: Session serialization
- `lazy_static`: Static session storage

### 3. CI Integration

**Updated Workflows**:
- `.github/workflows/ci.yml`: Added FFI build step
- `.github/workflows/full.yml`: Added FFI build to rust job

**CI Steps**:
```bash
cargo build -p privachain_dr_ffi --release
```

**Build Artifacts**:
- `libprivachain_dr_ffi.so` (1.2M): Linux shared library
- `libprivachain_dr_ffi.a` (34M): Static library
- `privachain_dr_ffi.dll`: Windows DLL (when built on Windows)
- `libprivachain_dr_ffi.dylib`: macOS library (when built on macOS)

## Usage Flow

### 1. Generate Dart Bindings

```bash
cargo install uniffi-bindgen
cd rust/crypto/ffi
uniffi-bindgen generate src/privachain_dr.udl --language dart --out-dir ../../../packages/messenger/lib/ffi
```

Generates:
- `privachain_dr.dart`: Dart API
- `privachain_dr_ffi.dart`: FFI glue code

### 2. Flutter Integration

```dart
import 'package:messenger/ffi/privachain_dr.dart' as dr;

// Generate keys
final idKey = await dr.generateIdentityKey();
final signedPrekey = await dr.generateSignedPrekey(idKey);

// Create session
final session = dr.DrSession();

// Establish connection
await session.establishOutbound(
  dr.RatchetAddress(did: "did:example:bob", deviceId: 1),
  theirIdentityPub,
  theirSignedPrePub,
  theirEphemeralPub,
);

// Encrypt/Decrypt
final cipher = await session.encrypt(addr, plaintext);
final decrypted = await session.decrypt(addr, cipher);
```

### 3. Session Persistence

```dart
// Save session
final sessionData = await session.serializeSession(addr);
await secureStorage.write(key: 'session_${addr.did}', value: base64.encode(sessionData));

// Load session
final data = await secureStorage.read(key: 'session_${addr.did}');
await session.loadSession(addr, base64.decode(data!));
```

## Security Considerations

### Current Implementation

1. **Key Generation**: Uses placeholder implementations
   - TODO: Implement real Ed25519 key generation
   - TODO: Add proper key derivation

2. **Session Storage**: In-memory HashMap
   - Thread-safe via Mutex
   - Cleared on app restart
   - TODO: Implement persistent secure storage

3. **Serialization**: Placeholder implementation
   - TODO: Implement proper Serde for Session type
   - TODO: Add encryption for serialized sessions

4. **X3DH**: Simplified key agreement
   - TODO: Implement full X3DH protocol
   - TODO: Add signature verification

### Production Requirements

- [ ] Real cryptographic key generation
- [ ] Secure key storage (HSM, Keychain, etc.)
- [ ] Session state encryption before persistence
- [ ] Key rotation and forward secrecy
- [ ] Multi-device synchronization
- [ ] Proper X3DH with signature verification
- [ ] Post-quantum key exchange (Kyber)

## Testing

### Build Test
```bash
cd rust/crypto/ffi
cargo build --release
```

### Run Example
```bash
cargo run --example basic_usage
```

Expected output:
- Key generation successful
- Session establishment successful
- Message encryption successful
- Demonstrates 32-byte keys for all types

### CI Test
GitHub Actions automatically builds FFI on:
- Push to main/develop branches
- Pull requests to main/develop
- Scheduled security scans

## Future Enhancements

1. **Multi-device Support**
   - Device key management
   - Session synchronization across devices
   - Device-specific pre-keys

2. **Group Messaging**
   - Sender keys for efficient group encryption
   - Member addition/removal protocols

3. **Post-Quantum Cryptography**
   - Kyber key exchange integration
   - Hybrid classical + PQ schemes

4. **WebAssembly Support**
   - WASM bindings for web applications
   - Browser-based encrypted messaging

5. **Performance Optimizations**
   - Batch message processing
   - Parallel encryption/decryption
   - Message queue optimization

## References

- [UniFFI Documentation](https://mozilla.github.io/uniffi-rs/)
- [Signal Protocol Specification](https://signal.org/docs/)
- [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [X3DH Key Agreement](https://signal.org/docs/specifications/x3dh/)

## Changelog

### v0.1.0 (2024-10-08)
- Initial FFI implementation
- UniFFI bindings for Dart/Flutter
- Key generation functions
- Session management with encrypt/decrypt
- CI integration
- Documentation and examples
