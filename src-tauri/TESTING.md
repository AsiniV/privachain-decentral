# Testing the Tauri DPI Fetch Implementation

This guide explains how to test the `dpi_fetch` Tauri command.

## Prerequisites

Before testing, ensure you have:

1. **System Dependencies** (Ubuntu/Debian):
   ```bash
   sudo apt-get update
   sudo apt-get install libwebkit2gtk-4.1-dev \
       build-essential \
       curl \
       wget \
       libssl-dev \
       libgtk-3-dev \
       libayatana-appindicator3-dev \
       librsvg2-dev \
       libjavascriptcoregtk-4.1-dev
   
   # Create pkg-config symlinks for webkit2gtk 4.0 compatibility
   sudo ln -sf /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.1.pc \
       /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.0.pc
   sudo ln -sf /usr/lib/x86_64-linux-gnu/pkgconfig/javascriptcoregtk-4.1.pc \
       /usr/lib/x86_64-linux-gnu/pkgconfig/javascriptcoregtk-4.0.pc
   
   # Create library symlinks for webkit2gtk 4.0 compatibility
   sudo ln -sf /usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.1.so \
       /usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.0.so
   sudo ln -sf /usr/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.1.so \
       /usr/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.0.so
   ```

2. **Node.js and npm** (v18 or later recommended)

3. **Rust** (installed via rustup)

4. **Tauri CLI**:
   ```bash
   npm install --save-dev @tauri-apps/cli
   ```

## Building the Application

### Development Build

```bash
# From the project root
npm install
npm run tauri dev
```

This will:
1. Build the Rust backend
2. Start the Vite development server
3. Launch the Tauri desktop application

### Production Build

```bash
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Testing Without Tor

### Test 1: Basic HTTP Fetch

In the Tauri application console (DevTools), run:

```javascript
const { invoke } = window.__TAURI__.tauri

const result = await invoke('dpi_fetch', {
  url: 'https://httpbin.org/get',
  tor: false
})

console.log('Status:', result.status)
console.log('Headers:', result.headers)

// Decode body
const body = new TextDecoder().decode(new Uint8Array(result.body))
console.log('Body:', JSON.parse(body))
```

**Expected Result:**
- Status: 200
- Headers include content-type, etc.
- Body contains JSON with your request details

### Test 2: User-Agent Rotation

Run the fetch multiple times and check the User-Agent in the response:

```javascript
for (let i = 0; i < 5; i++) {
  const result = await invoke('dpi_fetch', {
    url: 'https://httpbin.org/headers',
    tor: false
  })
  const body = JSON.parse(new TextDecoder().decode(new Uint8Array(result.body)))
  console.log(`Request ${i + 1} User-Agent:`, body.headers['User-Agent'])
}
```

**Expected Result:**
- Different User-Agent strings across requests
- All User-Agents should be from the predefined list

### Test 3: Error Handling

```javascript
// Test invalid URL
try {
  await invoke('dpi_fetch', { url: 'not-a-valid-url', tor: false })
} catch (e) {
  console.log('✓ Invalid URL caught:', e)
}

// Test 404
const result404 = await invoke('dpi_fetch', {
  url: 'https://httpbin.org/status/404',
  tor: false
})
console.log('✓ 404 Status:', result404.status) // Should be 404

// Test timeout
try {
  await invoke('dpi_fetch', {
    url: 'https://httpbin.org/delay/35', // 35 seconds, exceeds 30s timeout
    tor: false
  })
} catch (e) {
  console.log('✓ Timeout caught:', e)
}
```

### Test 4: Redirect Handling

```javascript
const result = await invoke('dpi_fetch', {
  url: 'https://httpbin.org/redirect/3', // 3 redirects
  tor: false
})
console.log('✓ Handled 3 redirects, status:', result.status)

// Test redirect loop prevention (should fail with max 5 redirects)
try {
  await invoke('dpi_fetch', {
    url: 'https://httpbin.org/redirect/10', // 10 redirects, exceeds limit
    tor: false
  })
} catch (e) {
  console.log('✓ Redirect loop prevented:', e)
}
```

## Testing With Tor

### Setup Tor

**Option 1: System Tor**
```bash
sudo apt-get install tor
sudo systemctl start tor
sudo systemctl status tor
```

**Option 2: Arti (Tor in Rust)**
```bash
cargo install arti
arti proxy -p 9050
```

Verify Tor is running:
```bash
curl --socks5-hostname localhost:9050 https://check.torproject.org/api/ip
```

### Test 5: Tor Connectivity

```javascript
const result = await invoke('dpi_fetch', {
  url: 'https://check.torproject.org/',
  tor: true
})

const body = new TextDecoder().decode(new Uint8Array(result.body))
console.log('Status:', result.status)
console.log('Using Tor:', body.includes('Congratulations'))
```

**Expected Result:**
- Status: 200
- Body contains "Congratulations" if Tor is working

### Test 6: Tor IP Check

```javascript
// Without Tor
const normalResult = await invoke('dpi_fetch', {
  url: 'https://api.ipify.org?format=json',
  tor: false
})
const normalIP = JSON.parse(
  new TextDecoder().decode(new Uint8Array(normalResult.body))
).ip

// With Tor
const torResult = await invoke('dpi_fetch', {
  url: 'https://api.ipify.org?format=json',
  tor: true
})
const torIP = JSON.parse(
  new TextDecoder().decode(new Uint8Array(torResult.body))
).ip

console.log('Normal IP:', normalIP)
console.log('Tor IP:', torIP)
console.log('IPs are different:', normalIP !== torIP)
```

**Expected Result:**
- Two different IP addresses
- Tor IP should be a Tor exit node

## Integration with Frontend

The frontend code in `src/services/dpiClient.ts` automatically uses the Tauri backend:

```typescript
import { dpiFetch } from '@/services/dpiClient'

// This will automatically use Tauri if in desktop mode
const response = await dpiFetch('https://example.com')
console.log(response.status)
const arrayBuffer = await response.arrayBuffer()
```

To test in the actual application:
1. Launch the Tauri app: `npm run tauri dev`
2. Navigate to a page that uses `dpiFetch`
3. Check browser DevTools for network activity (should go through Tauri, not browser)

## Troubleshooting

### Build Fails with Missing Dependencies

**Error:** `glib-sys` or `gobject-sys` not found

**Solution:**
```bash
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev
```

### Tor Connection Fails

**Error:** `Failed to build client` or proxy connection error

**Checks:**
1. Verify Tor is running: `sudo systemctl status tor`
2. Check Tor port: `sudo netstat -tlnp | grep 9050`
3. Test Tor directly: `curl --socks5-hostname localhost:9050 https://check.torproject.org/api/ip`

### Tauri Command Not Found

**Error:** `Command dpi_fetch not found`

**Checks:**
1. Verify `main.rs` registers the command
2. Check `tauri.conf.json` allowlist is not blocking
3. Rebuild the Tauri app

## Performance Testing

### Measure Request Latency

```javascript
async function measureLatency(url, tor = false, iterations = 10) {
  const times = []
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await invoke('dpi_fetch', { url, tor })
    const end = performance.now()
    times.push(end - start)
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length
  console.log(`Average latency (${tor ? 'Tor' : 'Direct'}):`, avg.toFixed(2), 'ms')
  console.log('Min:', Math.min(...times).toFixed(2), 'ms')
  console.log('Max:', Math.max(...times).toFixed(2), 'ms')
}

await measureLatency('https://httpbin.org/get', false)
await measureLatency('https://httpbin.org/get', true)
```

**Expected Results:**
- Direct: ~100-500ms (depending on connection)
- Tor: ~2000-5000ms (due to onion routing)

## Automated Testing

To add automated tests, create unit tests in Rust:

```rust
// src-tauri/src/dpi_fetch.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_valid_url() {
        let result = dpi_fetch(
            "https://httpbin.org/get".to_string(),
            false
        ).await;
        assert!(result.is_ok());
        let fetch_result = result.unwrap();
        assert_eq!(fetch_result.status, 200);
    }

    #[tokio::test]
    async fn test_invalid_url() {
        let result = dpi_fetch(
            "not-a-url".to_string(),
            false
        ).await;
        assert!(result.is_err());
    }
}
```

Run tests:
```bash
cd src-tauri
cargo test
```
