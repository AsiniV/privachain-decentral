# IPFS Integration & Decentralized Storage Implementation

This document describes the implementation of IPFS (InterPlanetary File System) integration and decentralized storage capabilities for PrivaChain.

## Overview

The implementation provides:

1. **IPFS Client Implementation** (`src/storage/ipfs_client.ts`) - Core IPFS storage with encryption
2. **Distributed Content Resolution** (`src/services/content-resolution.ts`) - Multi-protocol content resolver
3. **Blockchain Integration** - Domain resolution via PrivaChain smart contracts
4. **Content Caching** - Efficient caching for resolved content

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Content Resolver  │    │    IPFS Client      │    │  CosmosBlockchain   │
│                     │    │                     │    │                     │
│ - IPFS Protocol     │◄──►│ - Store/Retrieve    │    │ - Domain Queries    │
│ - .priva Domains    │    │ - Encryption        │    │ - Smart Contracts   │
│ - HTTP with DPI     │    │ - Pinning           │    │ - Mock Implementation│
│ - Caching           │    │ - Helia Integration │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Components

### 1. IPFS Storage Client (`src/storage/ipfs_client.ts`)

**Features:**
- **Helia Integration**: Modern IPFS client using Helia
- **AES-GCM Encryption**: Secure content encryption with Web Crypto API
- **Content Pinning**: Automatic pinning to ensure content availability
- **Statistics**: Storage and peer connection metrics

**Key Methods:**
```typescript
class IpfsStorage {
  async initialize(): Promise<void>
  async storeData(data: Uint8Array): Promise<string>
  async retrieveData(cid: string): Promise<Uint8Array>
  async storeEncrypted(data: Uint8Array, key: Uint8Array): Promise<string>
  async retrieveDecrypted(cid: string, key: Uint8Array): Promise<Uint8Array>
  async getStats(): Promise<{ pins: number, peers: number }>
}
```

**Example Usage:**
```typescript
import { ipfsStorage } from './storage/ipfs_client'

// Initialize
await ipfsStorage.initialize()

// Store data
const data = new TextEncoder().encode('Hello, IPFS!')
const cid = await ipfsStorage.storeData(data)

// Retrieve data
const retrieved = await ipfsStorage.retrieveData(cid)
```

### 2. Content Resolution Service (`src/services/content-resolution.ts`)

**Features:**
- **Multi-Protocol Support**: IPFS, blockchain domains, HTTP
- **Intelligent Caching**: 5-minute cache with configurable TTL
- **DPI Bypass Integration**: Privacy-enhanced HTTP requests
- **Content Type Detection**: Automatic MIME type detection

**Supported URL Schemes:**
- `ipfs://QmHashValue` - Direct IPFS content
- `https://domain.priva/path` - Decentralized domains
- `https://example.com/page` - Traditional HTTP with DPI bypass

**Key Methods:**
```typescript
class ContentResolver {
  async resolveContent(url: string): Promise<ResolvedContent>
  async initialize(blockchain?: CosmosBlockchain): Promise<void>
  clearCache(): void
  getCacheStats(): { size: number, entries: string[] }
}
```

**Example Usage:**
```typescript
import { contentResolver } from './services/content-resolution'

// Initialize
await contentResolver.initialize(blockchainInstance)

// Resolve different types of content
const ipfsContent = await contentResolver.resolveContent('ipfs://QmHash...')
const domainContent = await contentResolver.resolveContent('https://app.priva/')
const httpContent = await contentResolver.resolveContent('https://example.com/')
```

### 3. Blockchain Integration

**Enhanced CosmosBlockchain** with domain resolution:

```typescript
interface DomainRecord {
  domain: string
  contentHash: string
  encryptionKey?: string
  contentType: string
  owner: string
  active: boolean
  expires: number
}

// Added to CosmosBlockchain
async queryDomain(domain: string): Promise<DomainRecord | null>
```

**Mock Implementation:**
- `example.priva` - Unencrypted test domain
- `encrypted.priva` - Encrypted test domain
- Extensible for real smart contract integration

## Security Features

### Encryption
- **AES-GCM**: Authenticated encryption with 256-bit keys
- **Random Nonces**: 12-byte nonces for each encryption operation
- **Key Management**: Secure key derivation and storage

### Privacy
- **DPI Bypass**: Traffic obfuscation for HTTP requests
- **Anonymous Routing**: IPFS provides natural content addressing
- **No Metadata Leakage**: Content types detected locally

### Content Integrity
- **IPFS CIDs**: Content-addressed storage ensures integrity
- **Pin Verification**: Content availability guarantees
- **Blockchain Verification**: Domain ownership verification

## Integration Points

### Existing Services
The implementation integrates with:
- **Existing IPFS Service** (`src/services/ipfs.ts`) - Can use new storage backend
- **DPI Bypass Service** (`src/services/dpi-bypass.ts`) - HTTP privacy
- **CosmosBlockchain** (`src/blockchain/CosmosBlockchain.tsx`) - Domain queries

### React Components
```typescript
import { useCosmos } from './blockchain/CosmosBlockchain'
import { contentResolver } from './services/content-resolution'

export function DecentralizedBrowser() {
  const { isConnected, queryDomain } = useCosmos()
  
  useEffect(() => {
    if (isConnected) {
      contentResolver.setBlockchain({ queryDomain, isConnected })
    }
  }, [isConnected])
  
  // Use contentResolver.resolveContent() for any URL
}
```

## Configuration

### Environment Variables
```bash
# IPFS Gateway (optional, defaults to IPFS.io)
IPFS_GATEWAY=https://ipfs.io

# Blockchain RPC (for domain queries)
COSMOS_RPC=https://rpc.privachain.network

# DPI Bypass settings (optional)
DPI_BYPASS_ENABLED=true
```

### Initialization
```typescript
// Initialize all services
await Promise.all([
  ipfsStorage.initialize(),
  contentResolver.initialize(blockchainInstance)
])
```

## Testing

Tests are included in `src/test/ipfs-storage.test.ts`:

```bash
npm run test:unit -- src/test/ipfs-storage.test.ts
```

**Test Coverage:**
- Basic storage operations
- Encryption/decryption
- Error handling
- Edge cases

## Performance Considerations

### Caching
- **5-minute TTL** for resolved content
- **Memory-based cache** with LRU eviction
- **Cache statistics** for monitoring

### IPFS Optimization
- **Automatic pinning** for important content
- **Peer connection management** via libp2p
- **Content deduplication** via IPFS hashing

### Network Efficiency
- **Parallel resolution** for multiple protocols
- **Fallback mechanisms** for network failures
- **Compression** support for large content

## Future Enhancements

1. **Smart Contract Integration**: Real domain registry on PrivaChain
2. **Content Publishing**: Web interface for domain management
3. **Advanced Caching**: Persistent cache with IndexedDB
4. **Bandwidth Optimization**: Delta sync and compression
5. **Content Discovery**: Search and indexing capabilities

## Example Applications

### Decentralized Website Hosting
```typescript
// Publish website to IPFS
const websiteFiles = await bundleWebsite()
const cid = await ipfsStorage.storeData(websiteFiles)

// Register domain on blockchain
await blockchain.registerDomain('mysite.priva', cid)

// Users can now access: https://mysite.priva/
```

### Private Document Sharing
```typescript
// Encrypt and store document
const key = crypto.getRandomValues(new Uint8Array(32))
const cid = await ipfsStorage.storeEncrypted(document, key)

// Share CID and key securely
// Recipients can decrypt with: ipfsStorage.retrieveDecrypted(cid, key)
```

### Content Mirroring
```typescript
// Mirror HTTP content to IPFS for censorship resistance
const content = await contentResolver.resolveContent('https://blocked-site.com/')
const cid = await ipfsStorage.storeData(new Uint8Array(content.content))
// Now accessible via: ipfs://{{cid}}
```

## Compatibility

- **Browser**: Full support with Web Crypto API
- **Node.js**: Compatible with crypto module
- **React**: Integrated with existing blockchain hooks
- **TypeScript**: Full type safety and intellisense

## Support

For issues or questions:
1. Check the test files for usage examples
2. Review the demo in `src/examples/ipfs-demo.ts`
3. Consult existing IPFS service documentation
4. Open issues in the repository

---

*This implementation provides a solid foundation for decentralized storage and content resolution in PrivaChain, enabling censorship-resistant, privacy-focused web applications.*