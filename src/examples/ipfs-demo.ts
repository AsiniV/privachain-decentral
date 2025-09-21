// Demo/Example usage of IPFS Integration & Decentralized Storage
// This shows how to use the new storage and content resolution features

import { ipfsStorage } from '../storage/ipfs_client'
import { contentResolver } from '../services/content-resolution'

/**
 * Example: Basic IPFS storage operations
 */
export async function demonstrateIPFSStorage() {
  console.log('🚀 Starting IPFS Storage Demonstration')
  
  try {
    // Initialize the storage
    await ipfsStorage.initialize()
    
    // Store some data
    const testData = new TextEncoder().encode('Hello, PrivaChain Decentralized Storage!')
    const cid = await ipfsStorage.storeData(testData)
    console.log(`✅ Stored data with CID: ${cid}`)
    
    // Retrieve the data
    const retrieved = await ipfsStorage.retrieveData(cid)
    const retrievedText = new TextDecoder().decode(retrieved)
    console.log(`✅ Retrieved data: ${retrievedText}`)
    
    // Demonstrate encryption
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32))
    const encryptedCid = await ipfsStorage.storeEncrypted(testData, encryptionKey)
    console.log(`✅ Stored encrypted data with CID: ${encryptedCid}`)
    
    // Decrypt the data
    const decrypted = await ipfsStorage.retrieveDecrypted(encryptedCid, encryptionKey)
    const decryptedText = new TextDecoder().decode(decrypted)
    console.log(`✅ Decrypted data: ${decryptedText}`)
    
    // Get stats
    const stats = await ipfsStorage.getStats()
    console.log(`📊 Storage stats: ${stats.pins} pins, ${stats.peers} peers`)
    
  } catch (error) {
    console.error('❌ IPFS Storage demo failed:', error)
  }
}

/**
 * Example: Content resolution from different sources
 */
export async function demonstrateContentResolution() {
  console.log('🌐 Starting Content Resolution Demonstration')
  
  try {
    // Initialize the content resolver
    await contentResolver.initialize()
    
    // Example 1: Resolve IPFS content
    try {
      const ipfsContent = await contentResolver.resolveContent('ipfs://QmExampleCID123456789')
      console.log(`✅ Resolved IPFS content: ${ipfsContent.content.byteLength} bytes`)
    } catch (error) {
      console.log('⚠️ IPFS content resolution skipped (test CID):', error.message)
    }
    
    // Example 2: Resolve decentralized domain (will use mock data)
    try {
      const domainContent = await contentResolver.resolveContent('https://example.priva/index.html')
      console.log(`✅ Resolved domain content: ${domainContent.content.byteLength} bytes, type: ${domainContent.contentType}`)
    } catch (error) {
      console.log('⚠️ Domain resolution needs blockchain connection:', error.message)
    }
    
    // Example 3: Traditional HTTP content with DPI bypass
    try {
      const httpContent = await contentResolver.resolveContent('https://httpbin.org/json')
      console.log(`✅ Resolved HTTP content: ${httpContent.content.byteLength} bytes, source: ${httpContent.source}`)
    } catch (error) {
      console.log('⚠️ HTTP content resolution may fail in test environment:', error.message)
    }
    
    // Show cache stats
    const cacheStats = contentResolver.getCacheStats()
    console.log(`📋 Cache stats: ${cacheStats.size} entries`)
    
  } catch (error) {
    console.error('❌ Content Resolution demo failed:', error)
  }
}

/**
 * Run all demonstrations
 */
export async function runAllDemonstrations() {
  console.log('🎬 Starting Complete IPFS & Decentralized Storage Demonstration')
  console.log('=' .repeat(80))
  
  await demonstrateIPFSStorage()
  console.log()
  
  await demonstrateContentResolution()
  console.log()
  
  console.log('✅ All demonstrations completed!')
}

// Export for use in other parts of the application
export { ipfsStorage, contentResolver }
export type { DomainRecord } from '../blockchain/CosmosBlockchain'
export type { ResolvedContent } from '../services/content-resolution'