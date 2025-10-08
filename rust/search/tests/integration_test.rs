use privachain_search::SearchEngine;
use std::fs;

#[test]
fn test_search_engine_creation() {
    let temp_dir = "/tmp/privachain_search_test";
    
    // Clean up if exists
    let _ = fs::remove_dir_all(temp_dir);
    
    // Create search engine
    let result = SearchEngine::new(temp_dir.to_string());
    assert!(result.is_ok(), "Failed to create search engine: {:?}", result.err());
    
    // Clean up
    let _ = fs::remove_dir_all(temp_dir);
}

#[test]
fn test_search_empty_index() {
    let temp_dir = "/tmp/privachain_search_test_empty";
    
    // Clean up if exists
    let _ = fs::remove_dir_all(temp_dir);
    
    // Create search engine
    let engine = SearchEngine::new(temp_dir.to_string())
        .expect("Failed to create search engine");
    
    // Search empty index
    let results = engine.search("test query".to_string())
        .expect("Search failed");
    
    assert_eq!(results.len(), 0, "Empty index should return no results");
    
    // Clean up
    let _ = fs::remove_dir_all(temp_dir);
}

// Note: Testing actual crawling requires network access to IPFS gateway
// and is better suited for integration tests in CI/CD
#[test]
#[ignore] // Ignore by default as it requires network access
fn test_crawl_ipfs_content() {
    let temp_dir = "/tmp/privachain_search_test_crawl";
    
    // Clean up if exists
    let _ = fs::remove_dir_all(temp_dir);
    
    // Create search engine
    let engine = SearchEngine::new(temp_dir.to_string())
        .expect("Failed to create search engine");
    
    // Try to crawl a known IPFS CID (this is a simple "hello world" file)
    // This test will fail if network is unavailable or IPFS gateway is down
    let result = engine.crawl("bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku".to_string());
    
    match result {
        Ok(count) => {
            assert!(count > 0, "Should have indexed at least one document");
            
            // Try searching
            let search_results = engine.search("hello".to_string())
                .expect("Search failed");
            println!("Found {} results", search_results.len());
        },
        Err(e) => {
            println!("Warning: Crawl test skipped due to error: {:?}", e);
            // Don't fail the test - network issues are expected in CI
        }
    }
    
    // Clean up
    let _ = fs::remove_dir_all(temp_dir);
}
