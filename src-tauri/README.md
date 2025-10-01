# Tauri Backend for PrivaChain Desktop

This directory contains the Tauri backend implementation for the PrivaChain desktop application.

## Structure

```
src-tauri/
├── src/
│   ├── main.rs          # Entry point, registers Tauri commands
│   └── dpi_fetch.rs     # DPI bypass fetch implementation
├── icons/               # Application icons for different platforms
├── Cargo.toml          # Rust dependencies
├── tauri.conf.json     # Tauri configuration
└── build.rs            # Build script
```

## Features

### DPI Fetch Command

The `dpi_fetch` command provides secure HTTP fetching with DPI bypass capabilities:

- **URL validation** - Validates and parses URLs before making requests
- **Tor support** - Routes requests through Tor SOCKS5 proxy when enabled
- **Random User-Agent** - Rotates between multiple user agent strings
- **Redirect limiting** - Prevents redirect loops (max 5 redirects)
- **Timeout protection** - 30-second timeout on requests

#### Usage from TypeScript

```typescript
const { invoke } = window.__TAURI__.tauri
const result = await invoke('dpi_fetch', { 
  url: 'https://example.com', 
  tor: true 
})
// result: { status: number, headers: [string, string][], body: number[] }
```

## Dependencies

Key dependencies:
- `tauri` (v1.6+) - Desktop application framework
- `reqwest` (v0.12) - HTTP client with JSON support
- `fastrand` (v2.1) - Fast random number generation
- `url` (v2.5) - URL parsing and validation
- `serde` (v1.0) - Serialization framework

## Building

To build the Tauri application:

```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# Build the application
npm run tauri build

# Or for development
npm run tauri dev
```

## Environment Variables

- `VITE_TOR_ENABLED` - Set to `'true'` to enable Tor routing in the frontend

## Tor Setup

For Tor functionality, ensure Tor is running locally:

```bash
# Install Tor
sudo apt-get install tor

# Start Tor service
sudo systemctl start tor

# Verify it's running on 127.0.0.1:9050
sudo netstat -tlnp | grep 9050
```

Alternatively, use Arti (Tor implementation in Rust):

```bash
cargo install arti
arti proxy -p 9050
```
