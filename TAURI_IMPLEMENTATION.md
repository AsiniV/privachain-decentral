# Tauri Backend Implementation Summary

## Overview

This document summarizes the implementation of the Tauri backend for the PrivaChain desktop application, specifically the `dpi_fetch` command for DPI bypass functionality.

## Files Created

### Core Implementation
1. **`src-tauri/src/main.rs`**
   - Tauri application entry point
   - Registers the `dpi_fetch` command
   - Configures the Tauri runtime

2. **`src-tauri/src/dpi_fetch.rs`**
   - Core implementation of the DPI fetch functionality
   - Implements URL validation, HTTP client creation, and request execution
   - Includes Tor SOCKS5 proxy support
   - Random User-Agent rotation
   - Comprehensive unit tests

3. **`src-tauri/Cargo.toml`**
   - Rust dependencies configuration
   - Key dependencies: tauri 2.0, reqwest 0.12, fastrand 2.1, url 2.5
   - **Note:** Upgraded to Tauri v2.0 to use libsoup3 instead of libsoup2, resolving runtime conflicts

4. **`src-tauri/build.rs`**
   - Tauri build script

5. **`src-tauri/tauri.conf.json`**
   - Tauri application configuration
   - Window settings, allowlist, and bundle configuration

### Documentation
6. **`src-tauri/README.md`**
   - Architecture overview
   - Feature documentation
   - Build instructions
   - Tor setup guide

7. **`src-tauri/TESTING.md`**
   - Comprehensive testing guide
   - Test cases for all functionality
   - Troubleshooting section
   - Performance testing examples

8. **`src-tauri/icons/README.md`**
   - Icon requirements and generation instructions

9. **`examples/tauri-dpi-fetch-example.ts`**
   - TypeScript usage examples
   - Integration examples
   - Error handling patterns

## Implementation Details

### Command Signature

```rust
#[command]
pub async fn dpi_fetch(url: String, tor: bool) -> Result<FetchResult, String>
```

### Return Type

```rust
pub struct FetchResult {
    status: u16,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}
```

This serializes to JSON as:
```json
{
  "status": 200,
  "headers": [["content-type", "text/html"], ...],
  "body": [72, 101, 108, 108, 111, ...]
}
```

### Features Implemented

1. **URL Validation**
   - Uses `url::Url::parse()` to validate URLs before making requests
   - Returns clear error messages for invalid URLs

2. **HTTP Client**
   - Built using `reqwest::Client`
   - Configurable redirect limit (max 5 redirects)
   - 30-second timeout on all requests

3. **Tor Support**
   - Optional SOCKS5 proxy routing
   - Connects to `127.0.0.1:9050` by default
   - Uses `socks5h://` protocol for DNS over SOCKS

4. **User-Agent Rotation**
   - 5 different realistic User-Agent strings
   - Random selection using `fastrand`
   - Covers Windows, macOS, Linux, and mobile platforms

5. **Header Collection**
   - All response headers preserved
   - Returned as array of tuples for TypeScript compatibility

6. **Binary Body Handling**
   - Body returned as `Vec<u8>` (byte array)
   - Compatible with any content type (text, JSON, images, etc.)

### Integration with Frontend

The TypeScript code in `src/services/dpiClient.ts` detects the Tauri environment and automatically uses the backend:

```typescript
async function tauriFetch(url: string): Promise<Resp> {
  const { invoke } = window.__TAURI__.tauri
  const res = await invoke<{ 
    status: number; 
    headers: [string, string][]; 
    body: number[] 
  }>('dpi_fetch', { url, tor: TOR_ENABLED })
  
  const headers = new Headers(res.headers)
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    headers,
    arrayBuffer: async () => new Uint8Array(res.body).buffer
  }
}
```

## Testing

### Unit Tests

Located in `src-tauri/src/dpi_fetch.rs`:

1. **`test_random_ua_returns_valid_string`** - Validates User-Agent format
2. **`test_random_ua_varies`** - Ensures User-Agent rotation works
3. **`test_rand_index_bounds`** - Verifies random index stays in bounds
4. **`test_build_client_without_tor`** - Tests HTTP client creation
5. **`test_dpi_fetch_invalid_url`** - Tests URL validation error handling
6. **`test_dpi_fetch_example_dot_com`** - Integration test with real HTTP request

Run tests:
```bash
cd src-tauri
cargo test
```

### Integration Testing

See `src-tauri/TESTING.md` for comprehensive integration testing guide, including:
- Basic HTTP fetching
- User-Agent rotation verification
- Error handling
- Redirect handling
- Tor connectivity testing
- Performance benchmarking

## Building and Running

### Prerequisites

- Rust (1.70+)
- Node.js (18+)
- System dependencies (see `src-tauri/README.md`)

### Development

```bash
# Install dependencies
npm install

# Install Tauri CLI
npm install --save-dev @tauri-apps/cli

# Run in development mode
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

Output will be in `target/release/bundle/`.

## Security Considerations

1. **URL Validation** - All URLs are validated before requests
2. **Redirect Limits** - Maximum 5 redirects to prevent loops
3. **Timeout Protection** - 30-second timeout prevents hanging
4. **Error Handling** - All errors are caught and returned as strings
5. **Tor Privacy** - Optional Tor routing for enhanced privacy

## Performance

- **Direct requests**: ~100-500ms (network dependent)
- **Tor requests**: ~2000-5000ms (onion routing overhead)
- **User-Agent overhead**: Negligible (<1ms)

## Future Enhancements

Potential improvements:
1. Configurable timeout values
2. Custom headers support
3. Proxy authentication
4. Certificate pinning
5. Request/response logging
6. Rate limiting
7. Cookie jar support
8. HTTP/2 and HTTP/3 support

## Troubleshooting

### Common Issues

1. **Build fails with missing system dependencies**
   - Solution: Install WebKit2GTK and GTK3 development packages
   - See `src-tauri/README.md` for specific commands

2. **Tor connection fails**
   - Check if Tor is running: `sudo systemctl status tor`
   - Verify port 9050 is listening: `sudo netstat -tlnp | grep 9050`
   - Test Tor directly: `curl --socks5-hostname localhost:9050 https://check.torproject.org/api/ip`

3. **Command not found in frontend**
   - Verify `main.rs` registers the command
   - Check `tauri.conf.json` allowlist
   - Rebuild the Tauri application

## References

- [Tauri Documentation](https://tauri.app/)
- [reqwest Documentation](https://docs.rs/reqwest/)
- [Tor Project](https://www.torproject.org/)
- [Arti (Tor in Rust)](https://gitlab.torproject.org/tpo/core/arti)

## License

Same as the main PrivaChain project.
