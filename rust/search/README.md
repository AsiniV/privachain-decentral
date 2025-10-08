# PrivaChain Search

A decentralized search engine for PrivaChain using Rust with IPFS-based crawling, tantivy indexing, and UniFFI bindings for cross-language support.

## Features

- **IPFS Crawler**: Traverses IPFS DAG structures and extracts text content via HTTP gateway
- **Full-Text Search**: Uses tantivy with BM25 ranking and stemming for high-quality search results
- **OrbitDB Storage**: Metadata storage using sled database
- **FFI Bindings**: UniFFI-based bindings for Dart/Flutter and TypeScript integration

## Architecture

### Components

1. **Crawler** (`crawler.rs`): 
   - Fetches content from IPFS gateway (https://ipfs.io)
   - Recursively traverses DAG-PB links
   - Extracts UTF-8 text content

2. **Index** (`index.rs`):
   - Builds inverted index using tantivy
   - Applies text stemming for better search results
   - Supports BM25 ranking for relevance scoring

3. **OrbitStore** (`orbit_store.rs`):
   - Stores index metadata using sled key-value database
   - Tracks indexed content CIDs

4. **FFI** (`lib.rs`):
   - UniFFI-based foreign function interface
   - Exports SearchEngine for use in Dart/TypeScript

## Building

Build the search crate:

```bash
cd rust/search
cargo build --release
```

## Generating Bindings

### Dart Bindings

```bash
cargo install uniffi-bindgen
uniffi-bindgen generate src/search.udl --language dart --out-dir ../../packages/search-ui/lib/ffi
```

This will create Dart bindings in `packages/search-ui/lib/ffi/`.

### TypeScript Bindings

```bash
uniffi-bindgen generate src/search.udl --language typescript --out-dir ../../packages/search-ui/lib/ffi
```

## Usage

### Rust

```rust
use privachain_search::{SearchEngine, SearchError};

// Create search engine
let engine = SearchEngine::new("/path/to/db".to_string())?;

// Crawl and index IPFS content
let count = engine.crawl("bafybeihdagktifqef6ylfqgrqhelers4n57ol5yhfb3pgkge2b62c7vpdqq".to_string())?;
println!("Indexed {} documents", count);

// Search
let results = engine.search("hello world".to_string())?;
for cid in results {
    println!("Found: {}", cid);
}
```

### Dart (Flutter)

```dart
import 'package:search_ui/ffi/search.dart' as search;

// Initialize
final engine = await search.SearchEngine(dbPath);

// Crawl and index
final count = await engine.crawl(rootCid);
print('Indexed $count documents');

// Search
final results = await engine.search('hello world');
for (final cid in results) {
  print('Found: $cid');
}
```

## Dependencies

- `cid`: CID parsing and manipulation
- `libipld`: IPLD data structures and DAG-PB codec
- `tantivy`: Full-text search engine
- `rust-stemmers`: Text stemming
- `sled`: Embedded database
- `reqwest`: HTTP client for IPFS gateway
- `uniffi`: FFI bindings generator
- `tokio`: Async runtime

## Notes

- Currently uses public IPFS gateway (https://ipfs.io) for content retrieval
- Index is stored locally using tantivy's directory-based storage
- Metadata is stored in sled database
- For production, consider implementing local IPFS node integration
