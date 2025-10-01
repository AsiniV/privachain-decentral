# Unified Content Resolver

The Unified Content Resolver is a comprehensive solution for resolving content from multiple sources including IPFS, blockchain domains (.prv), and traditional HTTP(S) endpoints with DPI bypass capabilities.

## Overview

The resolver provides a unified interface for accessing content regardless of its location:
- **IPFS Content**: Direct resolution of `ipfs://` URLs using Helia
- **.prv Domains**: Blockchain-based domain resolution mapped to IPFS content
- **HTTP(S)**: Traditional web content with optional DPI bypass for enhanced privacy

## Architecture

### Components

1. **unifiedResolver.ts** - Main resolver implementation
2. **cosmos/src/prv.ts** - Blockchain domain resolution for .prv domains
3. **dpiClient.ts** - Wrapper for DPI bypass functionality

### Flow

```
URL → resolveUrl() → [Protocol Detection] → [Resolution Method]
                              ↓
                    ┌────────┬────────┬────────┐
                    │        │        │        │
                 ipfs://   .prv    http(s)://
                    │        │        │
                    ↓        ↓        ↓
              resolveIpfs  resolvePrvDomain  resolveHttp
                    │        │        │
                    └────────┴────────┘
                            ↓
                    { bytes, contentType, source }
```

## Usage

### Basic Usage

```typescript
import { initResolver, resolveUrl } from './services/unifiedResolver'

// Initialize once at application startup
await initResolver()

// Resolve any supported URL
const result = await resolveUrl('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')

console.log('Content:', result.bytes)
console.log('Type:', result.contentType)
console.log('Source:', result.source) // 'ipfs' | 'http' | 'blockchain'
```

### IPFS Resolution

```typescript
// Direct IPFS CID
const ipfsResult = await resolveUrl('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')

// IPFS path
const ipfsPathResult = await resolveUrl('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
```

### .prv Domain Resolution

```typescript
// Resolve a .prv domain (blockchain-based)
const prvResult = await resolveUrl('https://example.prv/content')

// Direct domain query
import { resolvePrvDomain } from './cosmos/src/prv'
const domainRecord = await resolvePrvDomain('example.prv')
console.log('CID:', domainRecord?.cid)
console.log('Active:', domainRecord?.active)
console.log('Expires:', new Date(domainRecord?.expires))
```

### HTTP(S) with DPI Bypass

```typescript
// Automatic DPI bypass for enhanced privacy
const httpResult = await resolveUrl('https://example.com/content')

// Direct DPI fetch
import { dpiFetch } from './services/dpiClient'
const response = await dpiFetch('https://example.com/api/data')
const data = await response.json()
```

## Content Type Detection

The resolver automatically detects content types based on:
1. File signatures (magic numbers)
2. Text content analysis
3. HTTP headers (when available)

Supported detections:
- `image/png` - PNG images (89 50 4E 47)
- `image/jpeg` - JPEG images (FF D8)
- `application/pdf` - PDF files (25 50 44 46)
- `text/html` - HTML content
- `text/plain` - Plain text
- `application/octet-stream` - Binary data

## Environment Support

### Web (Browser)
- Full Helia integration for IPFS
- Web Worker-based DPI bypass
- .prv domain resolution via blockchain queries

### Desktop (Tauri)
- Uses Kubo HTTP API for IPFS (future)
- Tauri IPC for HTTP egress
- Native blockchain queries

### Node.js
- Gateway-based IPFS resolution
- Limited DPI bypass (enhanced direct fetch)
- Blockchain queries via CosmJS

## API Reference

### `initResolver()`

Initialize the resolver. Must be called before using `resolveUrl()`.

```typescript
await initResolver()
```

### `resolveUrl(url: string)`

Resolve content from any supported URL.

**Parameters:**
- `url: string` - The URL to resolve (ipfs://, https://*.prv, http(s)://)

**Returns:**
```typescript
{
  bytes: Uint8Array,      // Content data
  contentType: string,     // MIME type
  source: 'ipfs' | 'http' | 'blockchain'  // Content source
}
```

**Throws:**
- Error if URL is invalid
- Error if content cannot be resolved
- Error if domain is inactive/expired

### `resolvePrvDomain(domain: string)`

Query blockchain for .prv domain record.

**Parameters:**
- `domain: string` - Domain name (with or without .prv suffix)

**Returns:**
```typescript
{
  domain: string,   // Full domain name
  cid: string,      // IPFS CID
  owner: string,    // Owner address
  active: boolean,  // Is domain active
  expires: number   // Expiration timestamp
} | null
```

### `dpiFetch(url: string, options?: RequestInit)`

Fetch with DPI bypass enabled.

**Parameters:**
- `url: string` - URL to fetch
- `options?: RequestInit` - Fetch options

**Returns:** `Promise<Response>` - Standard fetch Response

## Configuration

### Environment Variables

- `VITE_COSMOS_RPC` - Cosmos RPC endpoint for blockchain queries
- `VITE_COSMOS_RELAYER_MNEMONIC` - Mnemonic for blockchain queries

### Runtime Detection

The resolver automatically detects the environment:
```typescript
const IS_DESKTOP = typeof window !== 'undefined' && 
                   typeof window.__TAURI__ !== 'undefined'
```

## Error Handling

```typescript
try {
  const result = await resolveUrl('ipfs://QmInvalidCID')
} catch (error) {
  if (error.message.includes('IPFS gateway')) {
    console.error('Gateway unavailable')
  } else if (error.message.includes('Domain inactive')) {
    console.error('Domain registration expired')
  } else {
    console.error('Resolution failed:', error)
  }
}
```

## Testing

Run the test suite:
```bash
npm run test:unit tests/unified-resolver.test.ts
```

Run the demonstration:
```bash
npx tsx src/examples/unified-resolver-demo.ts
```

## Comparison with Legacy Resolver

| Feature | Legacy (content-resolution.ts) | Unified (unifiedResolver.ts) |
|---------|-------------------------------|------------------------------|
| IPFS | Via ipfsStorage wrapper | Direct Helia integration |
| Domains | .priva | .prv |
| Init | Required with blockchain | Optional, auto-detects environment |
| Cache | Built-in Map cache | No cache (simpler) |
| Desktop | Not optimized | Tauri-aware |
| Dependencies | Many wrappers | Direct libraries |

## Future Enhancements

- [ ] Implement actual blockchain contract queries for .prv domains
- [ ] Add caching layer for frequently accessed content
- [ ] Implement Kubo HTTP API for desktop IPFS
- [ ] Add support for IPNS resolution
- [ ] Implement content encryption/decryption
- [ ] Add metrics and monitoring
- [ ] Support for multi-gateway fallback
- [ ] Implement content pinning

## Examples

See `src/examples/unified-resolver-demo.ts` for complete examples:
- Basic resolution
- .prv domain queries
- DPI bypass usage
- Content type detection
- Error handling

## License

Part of the PrivaChain Decentral project.
