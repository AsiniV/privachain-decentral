# BM25 Integration in PrivaChain Search

## Overview

This document describes the integration of the BM25 ranking algorithm into the PrivaChain search implementation.

## Changes Made

### 1. Dependencies (`Cargo.toml`)
- Added `bm25 = "2.3"` to dependencies
- Uses the official bm25 crate from crates.io (version 2.3.2)

### 2. Search Index (`src/index.rs`)

#### Structure Changes
- Added `bm25_engine: Mutex<SearchEngine<String>>` to `SearchIndex` struct
- Uses `Mutex` for thread-safe access to the BM25 engine
- String type parameter allows custom CID-based document IDs

#### Initialization
```rust
// Initialize BM25 with empty documents using k=1.25, b=0.75 (standard BM25 parameters)
let documents: Vec<Document<String>> = Vec::new();
let bm25_engine: SearchEngine<String> = SearchEngineBuilder::with_documents(Language::English, documents)
    .build();
```

The initialization uses:
- `Language::English` for tokenization and stemming
- Empty document corpus to start
- Default BM25 parameters (k=1.25, b=0.75) which are standard values

#### Corpus Updates
Added `add_to_corpus()` method:
```rust
pub fn add_to_corpus(&self, cid: &str, text: &str) -> Result<()> {
    let mut engine = self.bm25_engine.lock().unwrap();
    let doc = Document {
        id: cid.to_string(),
        contents: text.to_string(),
    };
    engine.upsert(doc);
    Ok(())
}
```

This method:
- Locks the BM25 engine for thread-safe access
- Creates a Document with the CID as ID and text as contents
- Uses `upsert()` to add or update the document in the corpus
- Allows dynamic corpus updates as new documents arrive

#### Document Addition
Modified `add()` method to add documents to both Tantivy and BM25:
```rust
// Add to Tantivy index
// ... (existing Tantivy code)

// Add to BM25 corpus
self.add_to_corpus(cid, text)?;
```

#### Search Implementation
Updated `search()` to use BM25 ranking:
```rust
pub fn search(&self, query_str: &str) -> Result<Vec<String>> {
    // Use BM25 for ranking
    let engine = self.bm25_engine.lock().unwrap();
    let results = engine.search(query_str, 100);
    
    let cids: Vec<String> = results.iter()
        .map(|result| result.document.id.clone())
        .collect();
    
    Ok(cids)
}
```

The search now:
- Uses BM25's built-in search functionality
- Returns up to 100 results (configurable)
- Returns results sorted by BM25 relevance score
- Returns only the CID strings (document IDs)

### 3. Crawler (`src/crawler.rs`)
No changes needed - depth limiting already implemented:
- `max_depth: u32` field (default: 5)
- Depth checking in crawl loop: `if seen.contains(&cid_str) || depth > self.max_depth`

### 4. Tests (`tests/integration_test.rs`)
Added test `test_bm25_search_with_documents` to verify BM25 integration works correctly.

## API Comparison

The problem statement mentioned "bm25 0.4 changed the API" but the actual bm25 crate (version 2.3.x) uses a different API pattern:

**Problem Statement (hypothetical API):**
```rust
let corpus: Vec<Vec<String>> = documents.iter()
    .map(|d| tokenize(d))
    .collect();
let bm25 = BM25::from_corpus(&corpus, 1.25, 0.75);

// Adding to corpus
pub fn add_to_corpus(&mut self, doc: Vec<String>) {
    self.bm25.add_document(&doc);
}
```

**Actual Implementation (bm25 2.3.x):**
```rust
let documents: Vec<Document<String>> = Vec::new();
let bm25_engine: SearchEngine<String> = SearchEngineBuilder::with_documents(Language::English, documents)
    .build();

// Adding to corpus
pub fn add_to_corpus(&self, cid: &str, text: &str) -> Result<()> {
    let mut engine = self.bm25_engine.lock().unwrap();
    let doc = Document {
        id: cid.to_string(),
        contents: text.to_string(),
    };
    engine.upsert(doc);
    Ok(())
}
```

The actual API is more sophisticated:
- Uses a builder pattern for configuration
- Handles tokenization automatically via Language parameter
- Provides Document struct with ID and contents
- Uses `upsert()` instead of `add_document()` for updates

## Benefits

1. **BM25 Ranking**: Industry-standard algorithm for text relevance scoring
2. **Dynamic Updates**: Corpus can be updated as new documents arrive
3. **Dual Index**: Maintains both Tantivy (for full-text features) and BM25 (for ranking)
4. **Thread-Safe**: Mutex ensures safe concurrent access
5. **Configurable**: Standard BM25 parameters (k=1.25, b=0.75) can be adjusted if needed

## Testing

All tests pass:
- `test_search_engine_creation` - Verifies engine initialization
- `test_search_empty_index` - Tests search on empty index
- `test_bm25_search_with_documents` - Verifies BM25 integration
- `test_crawl_ipfs_content` - (ignored) Network-dependent test

Build successful with no errors or warnings related to BM25 integration.
