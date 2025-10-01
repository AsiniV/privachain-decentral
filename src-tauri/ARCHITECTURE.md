# Tauri Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PrivaChain Desktop App                       │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Frontend (TypeScript)                    │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │         src/services/dpiClient.ts                     │  │ │
│  │  │                                                        │  │ │
│  │  │  export async function dpiFetch(url: string)          │  │ │
│  │  │    if (IS_DESKTOP) return tauriFetch(url)             │  │ │
│  │  │                                                        │  │ │
│  │  │  async function tauriFetch(url: string)               │  │ │
│  │  │    const { invoke } = window.__TAURI__.tauri          │  │ │
│  │  │    return invoke('dpi_fetch', { url, tor })           │  │ │
│  │  └────────────────────────┬─────────────────────────────┘  │ │
│  │                            │                                 │ │
│  └────────────────────────────┼─────────────────────────────────┘ │
│                               │                                   │
│                     Tauri IPC Bridge                              │
│                               │                                   │
│  ┌────────────────────────────▼─────────────────────────────────┐ │
│  │                   Backend (Rust)                             │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │         src-tauri/src/main.rs                         │  │ │
│  │  │                                                        │  │ │
│  │  │  fn main() {                                           │  │ │
│  │  │    tauri::Builder::default()                          │  │ │
│  │  │      .invoke_handler(generate_handler![dpi_fetch])    │  │ │
│  │  │      .run(...)                                         │  │ │
│  │  │  }                                                     │  │ │
│  │  └────────────────────────┬─────────────────────────────┘  │ │
│  │                            │                                 │ │
│  │  ┌────────────────────────▼─────────────────────────────┐  │ │
│  │  │         src-tauri/src/dpi_fetch.rs                    │  │ │
│  │  │                                                        │  │ │
│  │  │  #[command]                                            │  │ │
│  │  │  pub async fn dpi_fetch(url: String, tor: bool)       │  │ │
│  │  │    -> Result<FetchResult, String>                     │  │ │
│  │  │                                                        │  │ │
│  │  │    1. Validate URL                                     │  │ │
│  │  │    2. Build HTTP client (with Tor if enabled)         │  │ │
│  │  │    3. Add random User-Agent                           │  │ │
│  │  │    4. Execute request                                  │  │ │
│  │  │    5. Collect headers and body                        │  │ │
│  │  │    6. Return FetchResult                              │  │ │
│  │  └────────────────────────┬─────────────────────────────┘  │ │
│  │                            │                                 │ │
│  └────────────────────────────┼─────────────────────────────────┘ │
│                               │                                   │
└───────────────────────────────┼───────────────────────────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
        ┌────────────────┐          ┌────────────────────┐
        │  Direct HTTP   │          │   Tor SOCKS5       │
        │  Connection    │          │   Proxy (9050)     │
        │                │          │                    │
        │  example.com   │          │  127.0.0.1:9050    │
        └────────────────┘          └─────────┬──────────┘
                                              │
                                              ▼
                                    ┌────────────────────┐
                                    │   Tor Network      │
                                    │   (Onion Routing)  │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                                    ┌────────────────────┐
                                    │  Target Server     │
                                    │  (via Tor exit)    │
                                    └────────────────────┘
```

## Data Flow

### 1. Frontend Request
```typescript
// User calls dpiFetch
const response = await dpiFetch('https://example.com')
```

### 2. Tauri IPC Call
```typescript
// dpiClient.ts detects desktop mode
const result = await invoke('dpi_fetch', { 
  url: 'https://example.com', 
  tor: false 
})
```

### 3. Backend Processing
```rust
// dpi_fetch.rs receives command
#[command]
pub async fn dpi_fetch(url: String, tor: bool) -> Result<FetchResult, String> {
    // 1. Parse URL
    let parsed_url = Url::parse(&url)?;
    
    // 2. Build client
    let client = build_client(tor)?;
    
    // 3. Execute request
    let resp = client.get(parsed_url.as_str())
        .header("User-Agent", random_ua())
        .timeout(Duration::from_secs(30))
        .send()
        .await?;
    
    // 4. Return result
    Ok(FetchResult {
        status: resp.status().as_u16(),
        headers: collect_headers(&resp),
        body: resp.bytes().await?.to_vec()
    })
}
```

### 4. Response Path
```
Rust FetchResult
    ↓ (Serde serialization)
JSON over IPC
    ↓ (Tauri bridge)
TypeScript object
    ↓ (dpiClient.ts transform)
Resp interface
    ↓ (return to caller)
Application code
```

## Component Dependencies

### Frontend
```
src/services/dpiClient.ts
    └─→ window.__TAURI__.tauri.invoke()
```

### Backend
```
src-tauri/src/main.rs
    └─→ dpi_fetch module
        └─→ reqwest::Client
            ├─→ HTTP(S) connection
            └─→ [Optional] Tor SOCKS5 proxy
```

### External Dependencies
```
reqwest (HTTP client)
    ├─→ tokio (async runtime)
    ├─→ rustls (TLS)
    └─→ socks proxy (for Tor)

fastrand (random numbers)
url (URL parsing)
serde (serialization)
tauri (IPC framework)
```

## Security Boundaries

```
┌─────────────────────────────────────────────────────┐
│              Trusted Zone                            │
│  ┌──────────────────────────────────────────────┐   │
│  │  Frontend (TypeScript)                       │   │
│  │  - User input received                       │   │
│  │  - Sanitization: none (handled in backend)   │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │ Tauri IPC                      │
│  ┌──────────────────▼───────────────────────────┐   │
│  │  Backend (Rust)                              │   │
│  │  - URL validation (url::Url::parse)          │   │
│  │  - Timeout enforcement (30s)                 │   │
│  │  - Redirect limiting (max 5)                 │   │
│  │  - Error handling (all errors caught)        │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
└─────────────────────┼────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
┌────────▼─────────┐    ┌─────────▼────────┐
│  Untrusted Zone  │    │  Untrusted Zone   │
│  Direct Internet │    │  Tor Network      │
└──────────────────┘    └───────────────────┘
```

## Error Handling Flow

```
User Request
    │
    ▼
URL Validation
    │
    ├─→ Invalid ──→ Return Error("Invalid URL: ...")
    │
    ▼ Valid
Build Client
    │
    ├─→ Failed ──→ Return Error("Failed to build client: ...")
    │
    ▼ Success
Execute Request
    │
    ├─→ Failed ──→ Return Error("Request failed: ...")
    │
    ▼ Success
Read Response
    │
    ├─→ Failed ──→ Return Error("Failed to read body: ...")
    │
    ▼ Success
Return FetchResult
```

## Configuration

### Environment Variables (Frontend)
```
VITE_DPI_ENABLED=true    # Enable DPI bypass features
VITE_TOR_ENABLED=true    # Enable Tor routing
```

### Tauri Configuration (Backend)
```json
{
  "tauri": {
    "allowlist": {
      "all": true
    }
  }
}
```

### Runtime Configuration
- Tor proxy: `127.0.0.1:9050` (hardcoded, can be made configurable)
- Request timeout: 30 seconds
- Max redirects: 5
- User-Agent pool: 5 agents

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| IPC call overhead | ~1-5ms | Negligible |
| URL validation | <1ms | Very fast |
| Client creation | <1ms | Cached after first use |
| User-Agent selection | <1ms | Random index lookup |
| HTTP request (direct) | 50-500ms | Network dependent |
| HTTP request (Tor) | 2-5s | Onion routing overhead |
| Header collection | <1ms | Simple iteration |
| Body read | Variable | Depends on size |
| Serialization | ~1-10ms | Depends on response size |

## Scalability Considerations

1. **Concurrent Requests**: No artificial limit, bounded by system resources
2. **Memory Usage**: ~50KB per active request (approx)
3. **Connection Pooling**: Handled by reqwest (default pool)
4. **Tor Circuits**: Shared SOCKS5 connection, Tor manages circuits

## Future Extensions

Possible enhancements to the architecture:

1. **Custom Headers**: Add `headers` parameter to `dpi_fetch`
2. **Request Body**: Add `body` and `method` parameters for POST/PUT
3. **Certificate Pinning**: Add trusted cert configuration
4. **Multiple Proxies**: Support proxy chains
5. **Caching**: Add HTTP cache layer
6. **Metrics**: Request timing and statistics
7. **Circuit Control**: Direct Tor circuit management via Arti
