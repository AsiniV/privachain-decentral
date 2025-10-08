# PrivaChain Double Ratchet FFI

This crate provides FFI (Foreign Function Interface) bindings for the PrivaChain Double Ratchet protocol using UniFFI.

## Building

Build the FFI library:

```bash
cd rust/crypto/ffi
cargo build --release
```

Run the example:

```bash
cargo run --example basic_usage
```

The built libraries will be in `../../../target/release/`:
- `libprivachain_dr_ffi.so` (Linux)
- `libprivachain_dr_ffi.dylib` (macOS)
- `privachain_dr_ffi.dll` (Windows)

## Generating Dart Bindings

To generate Dart bindings for Flutter:

1. Install uniffi-bindgen:
```bash
cargo install uniffi-bindgen
```

2. Generate bindings:
```bash
uniffi-bindgen generate src/privachain_dr.udl --language dart --out-dir ../../../packages/messenger/lib/ffi
```

This will create:
- `packages/messenger/lib/ffi/privachain_dr.dart`
- `packages/messenger/lib/ffi/privachain_dr_ffi.dart`

## Using in Flutter

Add to your Flutter project's `pubspec.yaml`:

```yaml
dependencies:
  flutter_secure_storage: ^9.2.4  # for session persistence
  uuid: ^4.5.1  # for generating message IDs
  ffi: ^2.1.0
```

Example usage:

```dart
import 'package:messenger/ffi/privachain_dr.dart' as dr;

// Generate keys
final idKey = await dr.generateIdentityKey();
final signedPrekey = await dr.generateSignedPrekey(idKey);
final ephemeralKey = await dr.generateEphemeralKey();

// Create session
final session = dr.DrSession();

// Establish outbound connection
await session.establishOutbound(
  dr.RatchetAddress(did: "did:example:alice", deviceId: 1),
  theirIdentityPub,
  theirSignedPrePub,
  theirEphemeralPub,
);

// Encrypt message
final plaintext = utf8.encode("Hello, World!");
final cipherMsg = await session.encrypt(
  dr.RatchetAddress(did: "did:example:alice", deviceId: 1),
  Uint8List.fromList(plaintext),
);

// Decrypt message
final decrypted = await session.decrypt(
  dr.RatchetAddress(did: "did:example:alice", deviceId: 1),
  cipherMsg,
);
final message = utf8.decode(decrypted);
```

## API

### Key Generation

- `generateIdentityKey()` - Generate Ed25519 identity key pair
- `generateSignedPrekey(identity)` - Generate signed pre-key
- `generateEphemeralKey()` - Generate ephemeral key
- `generateOneTimePrekey()` - Generate one-time pre-key

### Session Management

- `DrSession()` - Create new session manager
- `establishOutbound(addr, theirIdentityPub, theirSignedPrePub, theirEphemeralPub)` - Establish outbound session (Alice)
- `establishInbound(addr, identityPub, signedPrePub, ephemeralPub)` - Establish inbound session (Bob)
- `encrypt(addr, plaintext)` - Encrypt message
- `decrypt(addr, cipherMessage)` - Decrypt message
- `serializeSession(addr)` - Serialize session state for persistence
- `loadSession(addr, data)` - Load session from serialized data

## Architecture

The FFI crate wraps the core `privachain_crypto` module, which in turn uses the `privachain_messenger` crate's Double Ratchet implementation. This provides:

- Signal Protocol-compatible Double Ratchet
- Forward secrecy
- Post-compromise security
- Session persistence
- X3DH key agreement (simplified)

## Security Notes

- Sessions are stored in memory using a global `Mutex<HashMap>`
- Session serialization/deserialization is placeholder (needs Serde implementation in core module)
- Key generation uses simplified placeholder implementations
- For production, implement proper key derivation and storage

## Integration with Flutter Service

See `packages/messenger/lib/services/dr_service.dart` for a complete Flutter service that:
- Manages session lifecycle
- Persists sessions using `flutter_secure_storage`
- Handles key bundles for X3DH
- Provides high-level encrypt/decrypt API
