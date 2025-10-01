# Decentralized E2E-Encrypted Messenger

## Overview

This implementation provides a fully functional decentralized end-to-end encrypted messenger using industry-standard protocols and libraries.

## Architecture

### Core Components

1. **Signal Protocol** - E2E encryption via `@privacyresearch/libsignal-protocol-typescript`
2. **Helia** - Decentralized storage via IPFS
3. **OrbitDB** - Decentralized database for message inbox
4. **libp2p** - P2P networking with gossipsub for pubsub and peer discovery
5. **LevelDB** - Persistent storage for Signal Protocol keys and sessions

### Key Features

- ✅ **End-to-End Encryption**: Signal Protocol ensures messages are encrypted from sender to recipient
- ✅ **Perfect Forward Secrecy**: Each message uses unique ephemeral keys
- ✅ **Decentralized**: No central server required
- ✅ **Persistent Storage**: Keys and sessions survive application restarts
- ✅ **PreKey Bundle Exchange**: Secure initial key exchange via pubsub
- ✅ **Peer Discovery**: Automatic peer discovery via mDNS

## File Structure

```
src/messenger/
├── decentralized_messenger.ts    # Main implementation
├── signal.ts                      # Legacy simple implementation
└── e2e_encryption.ts             # Alternative E2E implementation

examples/
└── decentralized-messenger-example.ts  # Usage example

tests/
└── decentralized-messenger.test.ts     # Test suite
```

## Installation

The required dependencies are already installed:

```bash
npm install @privacyresearch/libsignal-protocol-typescript blockstore-level level
```

## Usage

### Basic Initialization

```typescript
import { createMessenger } from './src/messenger/decentralized_messenger';

// Create messenger instance
const messenger = await createMessenger();

// Bootstrap with Signal Protocol
await messenger.bootstrap();

// Set up message handler
messenger.onMessage((msg) => {
  console.log(`New message from ${msg.from}`);
});
```

### Establishing a Session

```typescript
// Define contact
const contact = {
  id: 'peer-id-here'
};

// Establish session (exchanges prekey bundles)
await messenger.ensureSession(contact);
```

### Sending Encrypted Messages

```typescript
// Send encrypted text message
const messageId = await messenger.sendText('peer-id-here', 'Hello, World!');
console.log(`Message sent with ID: ${messageId}`);
```

### Running the Example

```bash
# Terminal 1 (first peer)
tsx examples/decentralized-messenger-example.ts

# Terminal 2 (second peer - use DB address from first peer)
tsx examples/decentralized-messenger-example.ts <db_address>
```

## Implementation Details

### Signal Protocol Store

The `LevelSignalStore` class implements the `StorageType` interface required by the Signal Protocol library:

- Identity key pair storage
- Registration ID management
- PreKey storage and rotation
- Signed PreKey management
- Session state persistence

### PreKey Bundle Exchange

PreKey bundles are exchanged via libp2p's gossipsub pubsub on the `prekey-bundles` topic:

1. Peer A requests bundle from Peer B
2. Peer B publishes their bundle
3. Peer A processes the bundle and establishes session
4. Encrypted communication can begin

### Message Flow

1. **Session Establishment**:
   - Exchange prekey bundles via pubsub
   - Process bundles using SessionBuilder
   - Establish encrypted session

2. **Message Sending**:
   - Encrypt plaintext using SessionCipher
   - Store encrypted message in OrbitDB
   - OrbitDB replicates to peers via libp2p

3. **Message Receiving**:
   - OrbitDB triggers update event
   - Decrypt ciphertext using SessionCipher
   - Invoke message callback with decrypted content

## Security Features

### End-to-End Encryption

- All messages encrypted with Signal Protocol
- Only sender and recipient can read messages
- No intermediary can decrypt messages

### Perfect Forward Secrecy

- Session keys derived from ratcheting process
- Compromise of current keys doesn't reveal past messages
- Each message uses unique cryptographic keys

### Persistent Key Storage

- Keys stored in LevelDB database
- Survives application restarts
- Isolated per peer ID

## Network Architecture

### libp2p Configuration

```typescript
{
  peerDiscovery: [mdns()],              // Local peer discovery
  transports: [tcp()],                  // TCP transport
  connectionEncryption: [noise()],      // Noise protocol encryption
  streamMuxers: [yamux()],              // Stream multiplexing
  services: {
    identify: identify(),               // Peer identification
    pubsub: gossipsub({ emitSelf: true }) // Pub/sub messaging
  }
}
```

### Storage Directories

- `./ipfs/{peer_id}` - Helia blockstore
- `./orbitdb/{peer_id}` - OrbitDB data
- `./signal/{peer_id}` - Signal Protocol keys and sessions

## Testing

Run the test suite:

```bash
npm run test:unit -- tests/decentralized-messenger.test.ts
```

The tests verify:
- Type definitions are correct
- Module can be imported
- Required dependencies are documented
- Key features are implemented

## Integration with Existing Codebase

This implementation complements the existing messenger functionality:

- `src/messenger/signal.ts` - Simple mock Signal implementation
- `src/messenger/e2e_encryption.ts` - ECDH-based E2E encryption
- `src/messenger/decentralized_messenger.ts` - Full Signal Protocol implementation (NEW)

Choose the implementation that best fits your use case:

1. **Decentralized Messenger** (NEW): Full Signal Protocol with OrbitDB
2. **E2E Encryption**: ECDH + AES-GCM with IPFS storage
3. **Signal (Mock)**: Simple demonstration implementation

## API Reference

### Interface: Messenger

```typescript
interface Messenger {
  bootstrap(): Promise<void>
  ensureSession(peer: Contact): Promise<void>
  sendText(peerId: string, plaintext: string): Promise<string>
  onMessage(cb: (msg: Message) => void): void
}
```

### Interface: Contact

```typescript
interface Contact {
  id: string
  preKeyBundle?: PreKeyBundle
}
```

### Interface: Message

```typescript
interface Message {
  id: string
  from: string
  to: string
  ciphertext: string
  timestamp: number
  attachments?: {
    cid: string
    mime: string
    size: number
  }[]
}
```

### Interface: PreKeyBundle

```typescript
interface PreKeyBundle {
  registrationId: number
  identityKey: ArrayBuffer
  signedPreKey: {
    keyId: number
    publicKey: ArrayBuffer
    signature: ArrayBuffer
  }
  preKey: {
    keyId: number
    publicKey: ArrayBuffer
  }
}
```

## Future Enhancements

Potential improvements for production use:

1. **PreKey Rotation**: Implement automatic prekey rotation
2. **Multi-Device Support**: Support multiple devices per user
3. **Group Messaging**: Extend to support group chats
4. **Message Queuing**: Queue messages when peer is offline
5. **Read Receipts**: Add delivery and read receipt tracking
6. **File Attachments**: Implement file sharing via IPFS
7. **Identity Verification**: Add safety numbers/fingerprint verification
8. **Key Backup**: Implement secure key backup and recovery

## References

- [Signal Protocol Documentation](https://signal.org/docs/)
- [libsignal-protocol-typescript](https://github.com/privacyresearch/libsignal-protocol-typescript)
- [Helia IPFS](https://github.com/ipfs/helia)
- [OrbitDB v3](https://github.com/orbitdb/orbitdb)
- [libp2p](https://libp2p.io/)
- [LevelDB](https://github.com/Level/level)

## License

This implementation follows the repository license.
