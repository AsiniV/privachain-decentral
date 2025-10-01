# Decentralized Messenger - Quick Start Guide

## TL;DR

A fully functional Signal Protocol-based decentralized messenger is now available in this repository. This guide will get you up and running in 5 minutes.

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install @privacyresearch/libsignal-protocol-typescript blockstore-level level
```

## Quick Start

### 1. Import and Initialize

```typescript
import { createMessenger } from './src/messenger/decentralized_messenger';

// Create messenger
const messenger = await createMessenger();

// Bootstrap (generates keys, connects to P2P network)
await messenger.bootstrap();
```

### 2. Handle Incoming Messages

```typescript
messenger.onMessage((msg) => {
  console.log(`📨 From: ${msg.from}`);
  console.log(`💬 Time: ${new Date(msg.timestamp).toLocaleString()}`);
  // msg.ciphertext contains encrypted data
  // Decryption happens automatically before callback
});
```

### 3. Send Encrypted Messages

```typescript
// Establish session with peer
await messenger.ensureSession({ id: 'peer-id' });

// Send encrypted message
const messageId = await messenger.sendText('peer-id', 'Hello!');
console.log(`✅ Sent: ${messageId}`);
```

## Running the Example

### Terminal 1 (First Peer)

```bash
tsx examples/decentralized-messenger-example.ts
```

You'll see output like:
```
🚀 Starting Decentralized E2E Messenger Example...
📦 Bootstrapping messenger...
Your database address: /orbitdb/zdpuA...
✅ Messenger initialized successfully!
💬 Ready to send and receive encrypted messages
⏳ Listening for messages...
```

### Terminal 2 (Second Peer)

Copy the database address from Terminal 1 and run:

```bash
tsx examples/decentralized-messenger-example.ts /orbitdb/zdpuA...
```

Now both peers can communicate with end-to-end encryption!

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                Your Application                      │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│           Decentralized Messenger API               │
│  • bootstrap()    • ensureSession()                 │
│  • sendText()     • onMessage()                     │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Signal  │  │   IPFS   │  │  libp2p  │
│ Protocol │  │  (Helia) │  │ +OrbitDB │
└──────────┘  └──────────┘  └──────────┘
     │             │              │
     ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ LevelDB  │  │LevelBlock│  │ Gossipsub│
│  Store   │  │  store   │  │  PubSub  │
└──────────┘  └──────────┘  └──────────┘
```

## Key Concepts

### Signal Protocol

- **Identity Keys**: Long-term keys identifying each peer
- **PreKeys**: One-time keys for initial session establishment
- **Session Keys**: Ephemeral keys that change with each message
- **Perfect Forward Secrecy**: Past messages remain secure even if current keys are compromised

### PreKey Bundle Exchange

Before sending encrypted messages, peers exchange PreKey bundles via libp2p's gossipsub:

```typescript
// Automatically handled by ensureSession()
await messenger.ensureSession({ id: 'peer-id' });
```

This exchanges:
- Registration ID
- Identity public key
- Signed PreKey (with signature)
- One-time PreKey

### Message Flow

1. **Send**: `messenger.sendText('peer-id', 'Hello')`
   - Encrypts with Signal Protocol
   - Stores in OrbitDB
   - Replicates to peers via gossipsub

2. **Receive**: OrbitDB emits update event
   - Retrieves encrypted message
   - Decrypts with Signal Protocol
   - Calls your `onMessage` callback

## API Reference

### createMessenger()

```typescript
function createMessenger(): Promise<Messenger>
```

Creates a new messenger instance. Each call generates a unique peer ID.

### Messenger.bootstrap()

```typescript
async bootstrap(): Promise<void>
```

Initializes the messenger:
- Generates Signal Protocol keys
- Connects to P2P network
- Opens/joins OrbitDB database
- Sets up message listeners

### Messenger.ensureSession(peer)

```typescript
async ensureSession(peer: Contact): Promise<void>
```

Establishes an encrypted session with a peer. Must be called before sending messages.

**Parameters:**
- `peer.id`: Peer identifier
- `peer.preKeyBundle`: (Optional) If not provided, will be fetched via pubsub

### Messenger.sendText(peerId, plaintext)

```typescript
async sendText(peerId: string, plaintext: string): Promise<string>
```

Sends an encrypted text message to a peer.

**Parameters:**
- `peerId`: Recipient's peer ID
- `plaintext`: Message to encrypt and send

**Returns:** Message ID (UUID)

### Messenger.onMessage(callback)

```typescript
onMessage(callback: (msg: Message) => void): void
```

Registers a callback for incoming messages.

**Message object:**
```typescript
interface Message {
  id: string        // UUID
  from: string      // Sender peer ID
  to: string        // Recipient peer ID
  ciphertext: string // Encrypted message
  timestamp: number  // Unix timestamp
}
```

## Storage Locations

The messenger creates these directories:

- `./signal/{peer_id}/` - Signal Protocol keys and sessions (LevelDB)
- `./ipfs/{peer_id}/` - IPFS blocks (LevelBlockstore)
- `./orbitdb/{peer_id}/` - OrbitDB data (OrbitDB)

## Security Features

✅ **End-to-End Encryption**: Only sender and recipient can read messages  
✅ **Perfect Forward Secrecy**: Each message uses unique keys  
✅ **No Central Server**: Fully peer-to-peer  
✅ **Persistent Sessions**: Sessions survive restarts  
✅ **Authenticated Encryption**: Messages can't be tampered with  
✅ **Future Secrecy**: Compromise of session keys doesn't reveal past messages  

## Common Patterns

### Basic Chat Application

```typescript
const messenger = await createMessenger();
await messenger.bootstrap();

// Set up handler
messenger.onMessage(async (msg) => {
  console.log(`${msg.from}: [encrypted message received]`);
});

// Connect to peer
const peerId = 'other-peer-id';
await messenger.ensureSession({ id: peerId });

// Send messages
await messenger.sendText(peerId, 'Hello!');
await messenger.sendText(peerId, 'How are you?');
```

### Multi-Peer Communication

```typescript
const peers = ['peer-1', 'peer-2', 'peer-3'];

// Establish sessions with all peers
await Promise.all(
  peers.map(id => messenger.ensureSession({ id }))
);

// Broadcast to all
for (const peerId of peers) {
  await messenger.sendText(peerId, 'Hello everyone!');
}
```

### Message History

Messages are stored in OrbitDB and automatically replicate to all peers in the database. To access history, query the OrbitDB database directly.

## Troubleshooting

### "No peer found" error

- Ensure both peers are on the same network
- Check mDNS is not blocked by firewall
- Try using explicit peer addresses

### "Session not established" error

- Call `ensureSession()` before `sendText()`
- Ensure PreKey bundles were exchanged successfully
- Check network connectivity

### Messages not decrypting

- Verify both peers have compatible Signal Protocol versions
- Check session was properly established
- Look for errors in console output

## Next Steps

1. **Read Full Documentation**: See `docs/DECENTRALIZED_MESSENGER.md`
2. **Explore Example**: Check `examples/decentralized-messenger-example.ts`
3. **Run Tests**: `npm run test:unit -- tests/decentralized-messenger.test.ts`
4. **Integrate**: Add the messenger to your application

## Performance Tips

- Reuse messenger instances (don't recreate frequently)
- Establish sessions once and keep them alive
- Batch messages when possible
- Monitor OrbitDB replication status

## Advanced Usage

For advanced features like file attachments, group messaging, or multi-device support, see the full documentation at `docs/DECENTRALIZED_MESSENGER.md`.

## Support

- 📖 Full Documentation: `docs/DECENTRALIZED_MESSENGER.md`
- 🧪 Test Suite: `tests/decentralized-messenger.test.ts`
- 📝 Example Code: `examples/decentralized-messenger-example.ts`
- 📊 Implementation Details: `MESSENGER_IMPLEMENTATION.md`

## License

This implementation follows the repository license.
