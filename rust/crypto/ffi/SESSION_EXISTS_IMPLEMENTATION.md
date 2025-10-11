# Session Existence Check Implementation

## Summary

This implementation adds a thin FFI helper function `dr_session_exists` to check if a Double-Ratchet session exists for a given DID (Decentralized Identifier).

## Changes Made

### 1. Rust FFI Function (`rust/crypto/ffi/src/lib.rs`)

Added the `dr_session_exists` function:

```rust
pub fn dr_session_exists(did: String) -> bool {
    let map = match SESSIONS.lock() {
        Ok(m) => m,
        Err(_) => return false,
    };
    
    // Check if any session exists for the given DID (regardless of device_id)
    map.keys().any(|addr| addr.did == did)
}
```

**Key Features:**
- Thread-safe: Uses Mutex to safely access the SESSIONS HashMap
- Fast: Simple key iteration with early return
- Fail-safe: Returns `false` if mutex lock fails
- Device-agnostic: Checks for ANY session with the given DID, regardless of device_id

### 2. UniFFI Definition Update (`rust/crypto/ffi/src/privachain_dr.udl`)

Added function declaration:
```udl
namespace privachain_dr {
    // ... existing functions
    boolean dr_session_exists(string did);
};
```

### 3. Supporting Changes

- Derived `Clone` trait for `KeyPair` struct to enable testing
- Added comprehensive unit tests:
  - `test_dr_session_exists_empty`: Verifies function returns false for non-existent sessions
  - `test_dr_session_exists_after_establishment`: Verifies function returns true after session creation
  - `test_dr_session_exists_different_device_ids`: Verifies DID-based checking (device_id agnostic)

## Usage

### From Rust

```rust
use privachain_dr_ffi::dr_session_exists;

fn check_session() {
    let did = "did:example:alice".to_string();
    if dr_session_exists(did) {
        println!("Session exists!");
    } else {
        println!("No session found");
    }
}
```

### From Dart/Flutter

See `DART_INTEGRATION.md` for detailed integration instructions.

Quick example:
```dart
// Using async compute isolate (recommended)
final exists = await DrSessionManager.isEstablished("did:example:alice");

// Or direct synchronous call
final exists = DrSessionManager.isEstablishedSync("did:example:alice");
```

## Testing

All tests pass successfully:

```bash
cd rust/crypto/ffi
cargo test

running 3 tests
test tests::test_dr_session_exists_empty ... ok
test tests::test_dr_session_exists_after_establishment ... ok
test tests::test_dr_session_exists_different_device_ids ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## Building

Build the FFI library:
```bash
cd rust/crypto/ffi
cargo build --release
```

Generated artifacts:
- Linux: `target/release/libprivachain_dr_ffi.so`
- macOS: `target/release/libprivachain_dr_ffi.dylib`
- Windows: `target/release/privachain_dr_ffi.dll`

## Performance Considerations

The function is designed to be fast and lightweight:
- **O(n) complexity**: Iterates through all session keys (n = number of sessions)
- **Early return**: Stops at first matching DID
- **Minimal allocation**: No heap allocations during check
- **Thread-safe**: Mutex overhead is minimal for read operations

Expected performance: < 1ms for typical session counts (< 1000 sessions)

## Integration Checklist

- [x] Rust FFI function implemented
- [x] UniFFI definition updated
- [x] Unit tests added and passing
- [x] Build verified (debug and release)
- [x] Documentation created
- [ ] Generate Dart bindings (requires `uniffi-bindgen` tool)
- [ ] Integrate into Flutter application
- [ ] Add to Flutter service layer

## Next Steps

1. Install uniffi-bindgen if not already installed:
   ```bash
   cargo install uniffi-bindgen
   ```

2. Generate Dart bindings:
   ```bash
   cd rust/crypto/ffi
   uniffi-bindgen generate src/privachain_dr.udl --language dart --out-dir ../../../packages/messenger/lib/ffi
   ```

3. Implement Dart wrapper as described in `DART_INTEGRATION.md`

4. Integrate into your Flutter application's messaging service

## References

- Problem Statement: Issue #5 - Double-Ratchet Rust-side session check
- Implementation: `rust/crypto/ffi/src/lib.rs` (lines 200-208)
- Tests: `rust/crypto/ffi/src/lib.rs` (lines 212-287)
- Documentation: `rust/crypto/ffi/DART_INTEGRATION.md`
