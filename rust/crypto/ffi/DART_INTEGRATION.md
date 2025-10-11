# Dart Integration for dr_session_exists

## Overview

This document describes how to integrate the `dr_session_exists` function into a Flutter/Dart application.

## Generating Dart Bindings

First, generate the Dart bindings using uniffi-bindgen:

```bash
cd rust/crypto/ffi
uniffi-bindgen generate src/privachain_dr.udl --language dart --out-dir ../../../packages/messenger/lib/ffi
```

This will generate:
- `privachain_dr.dart`: Main Dart API
- `privachain_dr_ffi.dart`: FFI glue code

## Dart Wrapper Implementation

Once the bindings are generated, you can create a wrapper for session existence checking:

```dart
import 'package:flutter/foundation.dart';
import 'package:messenger/ffi/privachain_dr.dart' as dr;

class DrSessionManager {
  static final dr.DrSession _session = dr.DrSession();
  
  /// Check if a Double-Ratchet session exists for the given DID
  /// 
  /// This function is fast and synchronous on the Rust side, making it
  /// suitable for UI thread usage via compute isolate.
  static Future<bool> isEstablished(String did) async {
    return await compute(_bindings.drSessionExists, did);
  }
  
  /// Alternative: Direct synchronous call (if performance allows)
  static bool isEstablishedSync(String did) {
    return dr.drSessionExists(did);
  }
}
```

## Usage Example

```dart
import 'package:myapp/dr_session_manager.dart';

// In your widget or business logic
Future<void> checkSession() async {
  final did = "did:example:alice";
  
  // Using async compute isolate (recommended for UI thread)
  final exists = await DrSessionManager.isEstablished(did);
  
  if (exists) {
    print("Session exists for $did");
    // Proceed with encrypted messaging
  } else {
    print("No session found for $did");
    // Initiate session establishment
  }
}

// Or using synchronous call
void checkSessionSync() {
  final did = "did:example:alice";
  final exists = DrSessionManager.isEstablishedSync(did);
  
  if (exists) {
    // Session exists
  } else {
    // No session
  }
}
```

## Benefits

- **Fast Check**: The Rust implementation is a simple HashMap lookup, making it very fast
- **Thread-Safe**: The function uses a Mutex to safely access the session store
- **UI-Friendly**: Can be called via compute isolate to avoid blocking the UI thread
- **Minimal Overhead**: Returns a simple boolean without any complex data serialization

## Integration with Flutter Service

You can integrate this into your existing Flutter service:

```dart
class MessagingService {
  Future<void> sendMessage(String did, String message) async {
    // Check if session exists before attempting to send
    final hasSession = await DrSessionManager.isEstablished(did);
    
    if (!hasSession) {
      // Establish session first
      await establishSession(did);
    }
    
    // Proceed with message encryption and sending
    await encryptAndSend(did, message);
  }
}
```

## Notes

- The function checks for ANY session with the given DID, regardless of device_id
- Returns `false` if there's any error (e.g., mutex lock failure)
- Does not throw exceptions, making it safe to call without error handling
