# PrivaChain I2P Tunnel Integration

I2P SAMv3 tunnel layer for anonymous networking in PrivaChain.

## Features

- **SAMv3 Protocol**: SESSION_CREATE and STREAM_CREATE commands
- **Persistent Keys**: Automatic .i2p key management with base32 addresses
- **Latency Monitoring**: Tracks connection latency (target < 300ms)
- **Environment Config**: Configurable via `I2P_SAM_HOST` environment variable

## Usage

```rust
use privachain_i2p::{I2pClient, I2pDestination};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create client (loads or generates keypair)
    let mut client = I2pClient::new()?;
    
    // Connect to SAM bridge
    client.connect().await?;
    
    // Get our destination
    println!("Our I2P address: {}", client.destination().to_base32_address());
    
    // Connect to remote destination
    let remote = I2pDestination::from_base32("ABCDEF...XYZ.b32.i2p".to_string())?;
    client.connect_to(&remote).await?;
    
    Ok(())
}
```

## Configuration

### Environment Variables

- `I2P_SAM_HOST`: SAM bridge address (default: `127.0.0.1:7656`)

### Default Paths

Keys are stored in:
- Linux: `~/.local/share/privachain/i2p/priv_key.dat`
- macOS: `~/Library/Application Support/privachain/i2p/priv_key.dat`
- Windows: `%LOCALAPPDATA%\privachain\i2p\priv_key.dat`

## I2P Router Setup

### Java I2P Router

```bash
# Download and install
wget https://geti2p.net/download/i2prouter-installer.jar
java -jar i2prouter-installer.jar

# Enable SAM bridge in config
# Edit ~/.i2p/i2ptunnel.config
# Add: sambridge.port=7656
```

### i2pd (C++ implementation)

```bash
# Install i2pd
sudo apt-get install i2pd

# Enable SAM in config
sudo nano /etc/i2pd/i2pd.conf
# Add:
# [sam]
# enabled = true
# address = 127.0.0.1
# port = 7656
```

## Testing

```bash
# Run tests
cargo test -p privachain_i2p

# Run with I2P feature flag
cargo test -p privachain_i2p --features i2p
```

## Requirements

- Tokio async runtime
- Running I2P router with SAM bridge enabled on port 7656

## Performance Targets

- Connection latency: < 300ms median
- Session creation: < 1s
- Stream establishment: < 500ms

## References

- [SAMv3 Protocol Specification](https://geti2p.net/en/docs/api/samv3)
- [I2P Technical Documentation](https://geti2p.net/spec)
