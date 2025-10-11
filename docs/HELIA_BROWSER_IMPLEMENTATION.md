# Helia Browser Implementation

This document describes the new Helia browser implementation for IPFS content resolution in the PrivaChain Decentralized application.

## Overview

The implementation provides a singleton Helia instance that runs natively in the browser with IndexedDB persistence, eliminating the need for public IPFS gateways.

## Files

### 1. `src/services/heliaBrowser.ts`

Light Helia singleton with improved types and error handling.

**Key Features:**
- Singleton pattern to ensure only one Helia instance
- IndexedDB persistence for blocks and datastore
- WebSockets and WebRTC transports for P2P connectivity
- Proper error handling with descriptive messages

**Exported Functions:**
- `getHelia()`: Returns the Helia instance
- `getUnixfs()`: Returns the UnixFS filesystem interface
- `getVerifiedFetch()`: Returns the verified fetch instance for HTTP-like IPFS requests

### 2. `src/services/unifiedResolver.ts`

Updated to use the new heliaBrowser singleton and file-type for better content detection.

**Changes:**
- Removed dependency on `createHelia` and `unixfs` from helia packages
- Now imports `getUnixfs` from `heliaBrowser.ts`
- Uses `concat` from `uint8arrays/concat` instead of custom implementation
- Uses `fileTypeFromBuffer` from `file-type` for better MIME type detection
- Removed fallback to public IPFS gateway

### 3. `src/services/worker.ts`

Optional web-worker implementation for off-thread IPFS resolution.

**Usage:**
```typescript
// In main thread
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

worker.postMessage({ cid: 'QmYourCIDHere' })

worker.onmessage = (e) => {
  if (e.data.error) {
    console.error('Worker error:', e.data.error)
  } else {
    console.log('Received data for CID:', e.data.cid)
    console.log('Buffer:', e.data.buf)
  }
}
```

### 4. `src/main.tsx`

Updated to initialize Helia at app startup.

**Changes:**
- Imports `getHelia` from `heliaBrowser.ts`
- Calls `getHelia().catch(console.error)` before any user interaction
- This ensures IndexedDB is ready before first IPFS request

## Dependencies

The following dependencies are used for this implementation (updated Oct 2025):

- `@helia/verified-fetch@^3.0.0` - For HTTP-like IPFS requests
- `blockstore-idb@^2.0.4` - IndexedDB blockstore (compatible with Helia 5.x)
- `datastore-idb@^3.0.4` - IndexedDB datastore
- `@chainsafe/libp2p-noise@^16.0.0` - Connection encryption
- `@libp2p/mplex@^11.0.0` - Stream multiplexer
- `@libp2p/websockets@^9.0.0` - WebSocket transport
- `@libp2p/webrtc@^5.0.0` - WebRTC transport
- `file-type@^19.0.0` - Better MIME type detection
- `uint8arrays@^5.0.0` - Array utilities (already available)

## Usage

### Basic IPFS Resolution

```typescript
import { resolveUrl } from './services/unifiedResolver'

// Direct IPFS CID
const result = await resolveUrl('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')
console.log('Content:', result.bytes)
console.log('Type:', result.contentType) // e.g., 'image/png'
console.log('Source:', result.source) // 'ipfs'
```

### .prv Domain Resolution

```typescript
// .prv domain (resolves to IPFS via blockchain)
const result = await resolveUrl('https://example.prv/path')
console.log('Content:', result.bytes)
console.log('Type:', result.contentType)
console.log('Source:', result.source) // 'ipfs'
```

### Using Helia Directly

```typescript
import { getUnixfs } from './services/heliaBrowser'
import { CID } from 'multiformats/cid'

const fs = await getUnixfs()
const cid = CID.parse('QmYourCIDHere')

const chunks: Uint8Array[] = []
for await (const chunk of fs.cat(cid)) {
  chunks.push(chunk)
}
```

## Benefits

1. **No Gateway Dependencies**: Content is resolved directly from the IPFS network
2. **Persistent Storage**: IndexedDB caching means content is stored locally
3. **Better Type Detection**: Using file-type library for accurate MIME types
4. **Error Handling**: Descriptive error messages for debugging
5. **Performance**: Optional web-worker support to keep UI thread responsive
6. **Privacy**: No data sent to third-party IPFS gateways

## Testing

The implementation has been tested with:
- ✅ Build process (TypeScript compilation)
- ✅ Unified resolver tests
- ✅ Lint checks

## Future Enhancements

Possible future improvements:
- Pre-connect to known peers for faster initial resolution
- Metrics and monitoring for IPFS performance
- Caching strategies for frequently accessed content
- Additional transport protocols (e.g., WebTransport)
