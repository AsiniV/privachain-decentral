# Simple Search API Documentation

A lightweight, OrbitDB-powered search module for PrivaChain that provides basic indexing and querying functionality.

## Overview

The Simple Search API provides three main functions:
- `initSearch()` - Initialize the search database
- `index()` - Add documents to the search index
- `query()` - Search for documents

## Installation

The simple search module is located at `src/search/simple-search.ts` and uses OrbitDB for decentralized indexing.

## API Reference

### `initSearch(dbName?: string): Promise<void>`

Initialize the OrbitDB search database. Must be called before using `index()` or `query()`.

**Parameters:**
- `dbName` (optional): Name of the database. Default: `'privachain.search'`

**Example:**
```typescript
import { initSearch } from './src/search/simple-search'

await initSearch('my-search-db')
```

**Note:** Calling `initSearch()` multiple times is safe - it will return immediately if already initialized.

### `index(doc: SearchDoc): Promise<void>`

Add a document to the search index.

**Parameters:**
- `doc`: A `SearchDoc` object with the following structure:

```typescript
interface SearchDoc {
  id: string                    // Unique document identifier
  type: string                  // Document type (e.g., 'message', 'email', 'file')
  title: string                 // Document title
  description?: string          // Optional description
  keywords?: string[]           // Optional keywords for better search
  timestamp: number             // Unix timestamp
  source: string                // Source identifier
  cid?: string                  // Optional IPFS content ID
  encrypted?: boolean           // Whether the document is encrypted
  zkProof?: string              // Optional zero-knowledge proof
}
```

**Example:**
```typescript
import { index } from './src/search/simple-search'

await index({
  id: 'doc-123',
  type: 'message',
  title: 'Secure Communication',
  description: 'End-to-end encrypted message',
  keywords: ['encryption', 'secure', 'private'],
  timestamp: Date.now(),
  source: 'alice@privachain.prv',
  encrypted: true,
  zkProof: 'zk_proof_data'
})
```

### `query(term: string, filters?: SearchFilters): Promise<SearchDoc[]>`

Search for documents matching the given term and filters.

**Parameters:**
- `term`: Search term(s). Multiple terms are treated as AND (all must match)
- `filters` (optional): Filter criteria:
  ```typescript
  {
    type?: string         // Filter by document type
    encrypted?: boolean   // Filter by encrypted flag
    source?: string       // Filter by source
  }
  ```

**Returns:** Array of `SearchDoc` objects sorted by timestamp (newest first)

**Examples:**

Basic search:
```typescript
import { query } from './src/search/simple-search'

// Find all documents containing "encryption"
const results = await query('encryption')
```

Multi-term search (AND logic):
```typescript
// Find documents containing both "encryption" AND "protocol"
const results = await query('encryption protocol')
```

Filtered search:
```typescript
// Find encrypted messages
const results = await query('secure', {
  type: 'message',
  encrypted: true
})
```

Filter without search term:
```typescript
// Get all files from a specific source
const results = await query('', {
  type: 'file',
  source: 'ipfs://QmHash'
})
```

## Complete Usage Example

```typescript
import { initSearch, index, query } from './src/search/simple-search'

async function main() {
  // 1. Initialize the search database
  await initSearch('privachain.search')
  
  // 2. Index some documents
  await index({
    id: 'msg-001',
    type: 'message',
    title: 'Encrypted Message',
    description: 'Secure communication using Signal Protocol',
    keywords: ['encryption', 'signal', 'secure'],
    timestamp: Date.now(),
    source: 'alice@privachain.prv',
    encrypted: true
  })
  
  await index({
    id: 'file-001',
    type: 'file',
    title: 'Public Document',
    description: 'Publicly available information',
    keywords: ['public', 'document'],
    timestamp: Date.now(),
    source: 'public.example.com',
    encrypted: false
  })
  
  // 3. Search for documents
  const encryptedDocs = await query('encryption', { encrypted: true })
  console.log(`Found ${encryptedDocs.length} encrypted documents`)
  
  // 4. Search by type
  const messages = await query('', { type: 'message' })
  console.log(`Found ${messages.length} messages`)
}

main().catch(console.error)
```

## Search Features

### Case Insensitive Search
All searches are case-insensitive:
```typescript
query('ENCRYPTION') === query('encryption') === query('EnCrYpTiOn')
```

### Multi-term AND Search
Multiple terms are combined with AND logic:
```typescript
// Both terms must be present
query('encryption protocol')
```

### Field Search
The search looks in the following fields:
- `title`
- `description`
- `keywords` (array joined as text)

### Result Sorting
Results are always sorted by timestamp in descending order (newest first).

## Error Handling

The API throws meaningful errors:

```typescript
try {
  await index(doc)
} catch (error) {
  if (error.message.includes('not initialized')) {
    console.error('Call initSearch() first!')
  } else {
    console.error('Failed to index:', error.message)
  }
}
```

## Compatibility

### Node.js Version
The module includes a polyfill for `Promise.withResolvers` which is required for Node.js versions < 22.

### OrbitDB Requirements
- Requires a working OrbitDB installation
- Requires IPFS/Helia for peer-to-peer networking
- Works in both Node.js and browser environments (with proper setup)

## Integration with Existing Code

This simple search module can be used alongside the existing `OrbitDBHybridIndexing` service in `src/services/orbitdb.ts`:

```typescript
// Simple search for basic use cases
import { initSearch, index, query } from './src/search/simple-search'

// Advanced search with privacy features
import { orbitDBIndexing } from './src/services/orbitdb'
```

## Testing

Run the test suite:
```bash
npm run test:unit -- tests/simple-search.test.ts
```

The tests are designed to gracefully handle OrbitDB initialization failures in CI/test environments.

## Limitations

1. **No Stemming**: The search is exact substring matching, not linguistic stemming
2. **No Ranking**: Results are sorted by timestamp only, not relevance score
3. **No Fuzzy Search**: Terms must match exactly (case-insensitive)
4. **Single Database**: Only one database can be active at a time per process

For advanced features like stemming, relevance scoring, and privacy features, use the `OrbitDBHybridIndexing` service instead.

## Security Considerations

- Documents marked as `encrypted: true` should have their actual content encrypted separately
- The `zkProof` field is for attaching zero-knowledge proofs but is not validated by this module
- Source identifiers should be validated to prevent injection attacks
- Consider rate limiting in production to prevent index flooding

## Future Enhancements

Potential improvements:
- [ ] Relevance scoring
- [ ] Full-text search with stemming
- [ ] Fuzzy matching
- [ ] Field-specific search (e.g., `title:encryption`)
- [ ] Date range queries
- [ ] Aggregation and faceted search
- [ ] Bulk indexing API

## Support

For issues or questions:
- Check the existing tests in `tests/simple-search.test.ts`
- Review the OrbitDB documentation at https://orbitdb.org
- See the main PrivaChain documentation in `docs/`
