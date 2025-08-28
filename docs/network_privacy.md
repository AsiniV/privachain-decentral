# Network Privacy and Onion Routing

This document describes the PrivaChain network privacy implementation, including onion routing protocol, circuit management, and Tor integration.

## Overview

PrivaChain implements a multi-layered privacy protection system that combines:

- **Onion Routing**: Multi-hop encrypted circuits for message anonymity
- **Tor Integration**: Optional routing through the Tor network
- **Traffic Analysis Resistance**: Dummy messages and padding
- **Post-Quantum Cryptography**: Future-proof encryption algorithms

## Onion Routing Architecture

### Circuit Construction

The onion routing implementation creates encrypted circuits through multiple relay nodes:

1. **Entry Guards**: First hop nodes that receive encrypted packets
2. **Middle Relays**: Intermediate nodes that forward encrypted traffic
3. **Exit Nodes**: Final hop nodes that deliver messages to destinations

#### Circuit Selection Policy

Circuits are built according to configurable policies defined in `config/privacy.json`:

```json
{
  "onion_routing": {
    "min_hops": 3,
    "max_hops": 5,
    "relay_selection_policy": {
      "min_reputation_score": 80,
      "geographic_diversity": true,
      "avoid_same_asn": true,
      "bandwidth_threshold_mbps": 100
    }
  }
}
```

### Onion Packet Format

Each onion packet consists of multiple encrypted layers:

```
+------------------+
| Outer Layer      |  ← Encrypted for Entry Guard
| +---------------+|
| | Middle Layer  ||  ← Encrypted for Middle Relay
| | +------------+||
| | | Inner Core |||  ← Encrypted for Exit Node
| | | +--------+ |||
| | | | Payload| |||  ← Original message
| | | +--------+ |||
| | +------------+||
| +---------------+|
+------------------+
```

#### Layer Structure

Each layer contains:

- **Circuit ID**: Unique identifier for the circuit
- **Next Hop**: Address of the next relay node
- **Encrypted Payload**: The inner layers or final message
- **MAC**: Message authentication code for integrity
- **Padding**: Random data for size obfuscation

### Encryption Algorithms

The implementation supports multiple encryption algorithms:

#### Classical Cryptography
- **X25519**: Elliptic curve Diffie-Hellman key exchange
- **ChaCha20-Poly1305**: Authenticated encryption

#### Post-Quantum Cryptography
- **CRYSTALS-Kyber**: Key encapsulation mechanism
- **CRYSTALS-Dilithium**: Digital signatures

### Circuit Lifecycle

#### 1. Circuit Creation

```typescript
// Create a new onion route
const routeId = await networking.createOnionRoute(destination, 3)
```

The circuit creation process:

1. **Relay Selection**: Choose nodes based on reputation and diversity
2. **Key Generation**: Create ephemeral keys for each hop
3. **Circuit Request**: Send CREATE cells to establish the circuit
4. **Confirmation**: Verify successful circuit establishment

#### 2. Message Transmission

```typescript
// Send message through the circuit
await networking.sendThroughOnion(routeId, messageData)
```

Message transmission includes:

1. **Layered Encryption**: Encrypt message for each hop in reverse order
2. **Padding Addition**: Add random padding for size obfuscation
3. **Dummy Mixing**: Insert dummy messages for traffic analysis resistance
4. **Circuit Forwarding**: Send through the established circuit

#### 3. Circuit Rotation

Circuits are automatically rotated based on:

- **Message Count**: After N messages (configurable)
- **Time Limit**: After T seconds (configurable)
- **Circuit Health**: If latency or failure rate exceeds thresholds

#### 4. Circuit Teardown

Circuits are torn down when:

- Rotation policy triggers
- Circuit health checks fail
- Explicit teardown requested
- Node failures detected

## Tor Integration

### SOCKS5 Proxy Support

When Tor integration is enabled, traffic can be routed through the Tor network:

```json
{
  "tor_integration": {
    "enabled": true,
    "socks5_proxy": {
      "host": "127.0.0.1",
      "port": 9050
    },
    "fallback_to_custom_routing": true
  }
}
```

### Tor vs Custom Routing

| Feature | Tor Network | Custom Onion Routing |
|---------|-------------|---------------------|
| Anonymity Set | Large global network | Smaller PrivaChain network |
| Performance | Variable latency | Optimized for PrivaChain |
| Control | Limited | Full control over relays |
| Censorship Resistance | Tor bridges available | Custom bridge protocols |

## Traffic Analysis Resistance

### Dummy Messages

The system injects dummy messages to prevent traffic analysis:

- **Dummy Ratio**: Configurable percentage of dummy traffic
- **Random Timing**: Dummy messages sent at random intervals
- **Indistinguishable**: Dummy messages are cryptographically indistinguishable from real messages

### Padding and Size Obfuscation

- **Fixed Size Buckets**: Messages are padded to fixed sizes
- **Random Padding**: Padding uses cryptographically secure random data
- **Consistent Timing**: All messages take similar processing time

## Configuration

### Privacy Configuration (`config/privacy.json`)

Key configuration parameters:

```json
{
  "onion_routing": {
    "min_hops": 3,
    "max_hops": 5,
    "circuit_rotation_interval": 600,
    "circuit_rebuild_after_messages": 50,
    "ephemeral_key_algorithm": "X25519",
    "post_quantum_kem": "CRYSTALS-Kyber",
    "padding_size_bytes": 1024,
    "dummy_message_ratio": 0.3,
    "circuit_timeout_seconds": 300,
    "max_concurrent_circuits": 10
  },
  "monitoring": {
    "circuit_health_check_interval": 60,
    "failure_rate_threshold": 0.1,
    "latency_threshold_ms": 5000
  }
}
```

### Relay Node Configuration (`config/relay_nodes_bootstrap.json`)

Relay nodes must provide:

- **Onion Routing Support**: Capability to handle onion circuits
- **Key Material**: X25519 and Kyber public keys
- **Geographic Information**: For diversity selection
- **Performance Metrics**: Bandwidth and latency characteristics

## API Reference

### Core Methods

#### `createOnionRoute(destination: string, layers?: number): Promise<string>`

Creates a new onion circuit with the specified number of layers.

**Parameters:**
- `destination`: Target destination for the circuit
- `layers`: Number of relay hops (default: 3)

**Returns:** Circuit ID for future message transmission

#### `sendThroughOnion(routeId: string, message: Uint8Array): Promise<void>`

Sends a message through an established onion circuit.

**Parameters:**
- `routeId`: Circuit ID from `createOnionRoute`
- `message`: Binary message data to transmit

#### `getNetworkMetrics(): NetworkMetrics`

Returns comprehensive network statistics including:
- Active circuit count
- Circuit failure rates
- Dummy message ratios
- Performance metrics

### Health Monitoring

#### `isOnionRoutingHealthy(): boolean`

Checks if the onion routing system is operational.

#### `getCircuitHealthReport(): Record<string, CircuitHealthMetrics>`

Returns detailed health information for all active circuits.

## Security Considerations

### Threat Model

The onion routing implementation protects against:

- **Traffic Analysis**: Prevents correlation of input/output traffic
- **Metadata Leakage**: Hides communication patterns
- **Node Compromise**: Maintains security with honest majority
- **Timing Attacks**: Uses dummy traffic and padding

### Known Limitations

- **End-to-End Correlation**: Powerful adversaries may correlate traffic patterns
- **Exit Node Trust**: Exit nodes can observe final message destinations
- **Performance Overhead**: Multiple encryption layers add latency

### Best Practices

1. **Regular Circuit Rotation**: Rotate circuits frequently
2. **Diverse Relay Selection**: Use geographically distributed relays
3. **Dummy Traffic**: Maintain consistent dummy traffic levels
4. **Monitoring**: Continuously monitor circuit health
5. **Tor Integration**: Use Tor as an additional layer when available

## Troubleshooting

### Common Issues

#### Circuit Creation Failures

**Symptom**: `createOnionRoute` throws errors
**Causes:**
- Insufficient relay nodes available
- Network connectivity issues
- Relay selection policy too restrictive

**Solutions:**
- Check relay node availability
- Verify network connectivity
- Relax selection policy constraints

#### High Latency

**Symptom**: Messages take excessive time to transmit
**Causes:**
- Too many circuit hops
- Poor relay node performance
- Network congestion

**Solutions:**
- Reduce circuit hop count
- Update relay selection policy
- Monitor relay node performance

#### Circuit Health Failures

**Symptom**: Circuits marked as unhealthy
**Causes:**
- Relay node failures
- Network instability
- Aggressive health check thresholds

**Solutions:**
- Update relay node list
- Adjust health check parameters
- Implement relay node monitoring

### Debugging

Enable debug logging by setting:

```bash
DEBUG=privachain:networking:onion
```

This provides detailed information about:
- Circuit construction process
- Message encryption/routing
- Health check results
- Performance metrics

## Performance Optimization

### Circuit Pool Management

Maintain a pool of pre-built circuits to reduce latency:

```json
{
  "onion_routing": {
    "max_concurrent_circuits": 10,
    "prebuilt_circuit_pool": 3
  }
}
```

### Relay Selection Optimization

Use performance-based relay selection:

```json
{
  "relay_selection_policy": {
    "bandwidth_threshold_mbps": 500,
    "latency_threshold_ms": 100,
    "reliability_threshold": 0.95
  }
}
```

### Caching and Optimization

- **Relay Information Caching**: Cache relay node information
- **Circuit Reuse**: Reuse circuits for multiple messages
- **Batch Processing**: Process multiple messages together

## Future Enhancements

### Planned Features

1. **Advanced Traffic Analysis Resistance**
   - Sophisticated dummy traffic patterns
   - Adaptive padding algorithms
   - Cover traffic coordination

2. **Enhanced Relay Selection**
   - Machine learning-based selection
   - Real-time performance monitoring
   - Automatic relay discovery

3. **Post-Quantum Migration**
   - Full post-quantum cryptography support
   - Hybrid classical/post-quantum modes
   - Algorithm agility framework

4. **Protocol Improvements**
   - Onion service support
   - Directory service integration
   - Advanced circuit types

### Research Directions

- **Mix Networks**: Integration with Nym or similar mix networks
- **Payment Channels**: Micropayments for relay services
- **Decentralized Governance**: Community-driven relay selection
- **Quantum Resistance**: Preparation for quantum computing threats

## References

- [Tor Specification](https://spec.torproject.org/)
- [The Second-Generation Onion Router](https://svn.torproject.org/svn/projects/design-paper/tor-design.pdf)
- [CRYSTALS-Kyber](https://pq-crystals.org/kyber/)
- [CRYSTALS-Dilithium](https://pq-crystals.org/dilithium/)
- [Nym Whitepaper](https://nymtech.net/nym-whitepaper.pdf)