# P2P Transport Layer with I2P

This document describes the P2P transport architecture using I2P tunnels for metadata protection.

## Architecture

PrivaChain's P2P layer uses a layered approach:

```
┌─────────────────────────────────────┐
│       Application Layer             │
│   (Messaging, File Transfer, etc)   │
├─────────────────────────────────────┤
│       libp2p Protocols              │
│  (gossipsub, kad-dht, identify)     │
├─────────────────────────────────────┤
│       Transport Layer               │
│    I2P SAMv3 Tunnels (default)      │
│    TCP Direct (--tunnel none)       │
├─────────────────────────────────────┤
│       I2P Network Layer             │
│  (Garlic routing, tunnel building)  │
└─────────────────────────────────────┘
```

## I2P Multiaddr Format

I2P destinations use a custom multiaddr protocol:

### Format
```
/ip4/{sam-host}/tcp/{sam-port}/p2p/{local-peer-id}/p2p-circuit/i2p/{destination}
```

### Examples

**Local peer with I2P destination:**
```
/ip4/127.0.0.1/tcp/7656/p2p/12D3KooWJwfJT7rKLN1qQ6E6vXzz6fG8K9zxPvNbTm2.../p2p-circuit/i2p/ABCDEFGHIJKLMNOPQRSTUVWXYZ234567.b32.i2p
```

**Remote peer I2P destination:**
```
/i2p/XYZ7654321ZYXWVUTSRQPONMLKJIHGFEDCBA.b32.i2p
```

## Connection Flow

### Outbound Connection

1. **Resolve destination**: Convert multiaddr to I2P .b32 address
2. **Create SAM session**: If not exists, establish session with SAM bridge
3. **Stream connect**: Send `STREAM CONNECT` to destination
4. **Establish libp2p**: Negotiate protocols over the I2P stream
5. **Ready**: Connection ready for application data

```rust
use privachain_i2p::{I2pClient, I2pDestination};

// Create I2P client
let mut client = I2pClient::new()?;
client.connect().await?;

// Connect to remote destination
let dest = I2pDestination::from_base32("ABCD...XYZ.b32.i2p".to_string())?;
client.connect_to(&dest).await?;
```

### Inbound Connection

1. **Listen for streams**: SAM session accepts incoming connections
2. **Accept stream**: New I2P stream from remote peer
3. **Establish libp2p**: Negotiate protocols
4. **Ready**: Connection ready for application data

## WebRTC Signaling over I2P

For WebRTC calls, signaling is done through I2P tunnels:

```
Alice                          I2P Network                       Bob
  |                                |                               |
  |--- SDP Offer (via I2P) ------->|                               |
  |                                |--- Encrypted tunnel --------->|
  |                                |                               |
  |                                |<--- SDP Answer (via I2P) -----|
  |<--- Encrypted tunnel ----------|                               |
  |                                |                               |
  |<---------- WebRTC Data Channel (over I2P) ------------------->|
```

### Example

```typescript
// Create WebRTC signaling channel over I2P
const signalingChannel = new I2pSignalingChannel({
  samHost: '127.0.0.1:7656',
  localDestination: ourI2pAddress,
  remoteDestination: peerI2pAddress
});

// Create peer connection
const pc = new RTCPeerConnection({
  iceServers: [] // No STUN/TURN needed with I2P
});

// Send offer through I2P tunnel
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
await signalingChannel.send(offer);

// Receive answer through I2P tunnel
const answer = await signalingChannel.receive();
await pc.setRemoteDescription(answer);
```

## Post-Quantum Handshake

I2P transport can be combined with post-quantum key exchange:

```
┌──────────────────────────────────────┐
│     I2P Tunnel (Metadata hiding)     │
├──────────────────────────────────────┤
│   Noise Protocol (Pre-quantum auth)  │
├──────────────────────────────────────┤
│  Kyber KEM (Post-quantum key exch)   │
├──────────────────────────────────────┤
│  Application Data (Double Ratchet)   │
└──────────────────────────────────────┘
```

### Handshake Flow

1. **I2P stream**: Establish tunnel through I2P
2. **Noise XX**: Initial authentication (pre-quantum)
3. **Kyber upgrade**: Exchange Kyber-1024 public keys
4. **KEM encapsulation**: Derive shared secret (32 bytes)
5. **Ratchet init**: Initialize Double Ratchet with PQ key

```rust
use privachain_crypto::pq::{KyberKem, KyberPublicKey};

// After Noise handshake, upgrade to PQ
let (our_pk, our_sk) = KyberKem::keypair()?;

// Exchange public keys over Noise channel
send_kyber_pk(&our_pk).await?;
let their_pk = recv_kyber_pk().await?;

// Encapsulate to get shared secret
let (shared_secret, ciphertext) = KyberKem::encapsulate(&their_pk)?;

// Send ciphertext, other side decapsulates
send_kyber_ct(&ciphertext).await?;

// Initialize Double Ratchet with PQ shared secret
let ratchet = DoubleRatchet::new_alice(&shared_secret)?;
```

## Message Format

Messages sent through I2P tunnels have the following structure:

### Layer 1: I2P Garlic Message
```
+------------------+
|  I2P Garlic      |  (Onion routing headers)
+------------------+
```

### Layer 2: libp2p Frame
```
+------------------+
|  varint length   |  (Message length)
+------------------+
|  protocol ID     |  (e.g., /ipfs/gossipsub/1.1.0)
+------------------+
|  payload         |  (Encrypted message)
+------------------+
```

### Layer 3: Encrypted Payload (for messaging)
```
+------------------+
|  12 B nonce      |  (AES-GCM nonce)
+------------------+
|  32 B wrapped    |  (Kyber-wrapped AES key)
+------------------+
|  variable cipher |  (AES-256-GCM encrypted)
+------------------+
|  16 B GCM tag    |  (Authentication tag)
+------------------+
```

## Performance Considerations

### Latency

- **I2P tunnel building**: 1-5s (one-time per session)
- **Stream connection**: 200-500ms (target: <300ms)
- **Message delivery**: 100-300ms (depends on tunnel length)

### Throughput

- **Single stream**: Up to 2 Mbps
- **Multiple streams**: Parallelizable for higher throughput
- **Recommended**: Use stream pooling for file transfers

### Optimizations

1. **Connection pooling**: Reuse I2P sessions
2. **Message batching**: Combine small messages
3. **Compression**: gzip before encryption
4. **Stream multiplexing**: Multiple virtual streams per I2P tunnel

## Configuration

### Environment Variables

```bash
# I2P SAM bridge address
export I2P_SAM_HOST=127.0.0.1:7656

# Tunnel mode
export PRIVACHAIN_TUNNEL=i2p  # or 'none' for clearnet

# Session ID (optional, auto-generated if not set)
export I2P_SESSION_ID=privachain-main
```

### CLI Options

```bash
# Start with I2P tunnels (default)
privachain-node

# Start with custom SAM host
privachain-node --i2p-sam-host 192.168.1.1:7656

# Start without tunnels (clearnet dev)
privachain-node --tunnel none
```

## Troubleshooting

### Connection Timeouts

**Symptom**: `Error: I2P timeout: Stream connection timeout`

**Solution**: I2P router may be building tunnels. Wait 2-3 minutes and retry.

### SAM Bridge Not Available

**Symptom**: `Error: I2P connection error: Connection refused`

**Solution**: Ensure I2P router is running with SAM enabled on port 7656.

### High Latency

**Symptom**: Latency > 500ms consistently

**Solutions**:
- Check I2P router logs for tunnel issues
- Ensure sufficient bandwidth for I2P participation
- Consider using shorter tunnel lengths (less hops)

## Security Considerations

### Metadata Protection

I2P provides:
- ✅ Hidden sender IP address
- ✅ Hidden receiver IP address
- ✅ Hidden message size (padded)
- ✅ Hidden timing patterns (randomized)

### Attack Resistance

- **Traffic analysis**: Garlic routing makes correlation difficult
- **Sybil attacks**: I2P's floodfill mechanism limits effectiveness
- **Eclipse attacks**: Multiple tunnel paths prevent isolation
- **Intersection attacks**: Tunnel rotation mitigates timing correlation

### Limitations

- ❌ **Not a VPN**: Only routes PrivaChain traffic
- ❌ **No clearnet access**: Stays within I2P network
- ⚠️ **Global passive adversary**: Theoretical risk (like all low-latency networks)

## References

- [I2P Technical Overview](https://geti2p.net/spec/tunnel)
- [SAMv3 Protocol Specification](https://geti2p.net/en/docs/api/samv3)
- [libp2p Transport Interface](https://docs.libp2p.io/concepts/transports/)
- [Kyber-1024 Specification](https://pq-crystals.org/kyber/)
