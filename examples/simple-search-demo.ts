/**
 * Simple Search API Demo
 * 
 * This example demonstrates how to use the simple search module
 * for indexing and querying documents in PrivaChain.
 */

import { initSearch, index, query, SearchDoc } from '../src/search/simple-search'

async function demo() {
  console.log('🔍 Simple Search API Demo\n')
  
  try {
    // Step 1: Initialize the search database
    console.log('1️⃣ Initializing search database...')
    await initSearch('demo-search')
    console.log('✅ Search initialized\n')
    
    // Step 2: Index various types of documents
    console.log('2️⃣ Indexing documents...')
    
    const documents: SearchDoc[] = [
      {
        id: 'msg-001',
        type: 'message',
        title: 'Encrypted Communication Setup',
        description: 'Discussion about implementing end-to-end encryption using Signal Protocol',
        keywords: ['encryption', 'signal', 'e2e', 'secure'],
        timestamp: Date.now(),
        source: 'alice@privachain.prv',
        encrypted: true,
        zkProof: 'zk_proof_msg_001'
      },
      {
        id: 'email-001',
        type: 'email',
        title: 'Network Update Notification',
        description: 'Latest updates on TURN server deployment and encryption improvements',
        keywords: ['network', 'update', 'infrastructure'],
        timestamp: Date.now() - 3600000, // 1 hour ago
        source: 'admin@privachain.prv',
        encrypted: true
      },
      {
        id: 'file-001',
        type: 'file',
        title: 'PrivaChain Technical Documentation',
        description: 'Comprehensive guide to the PrivaChain protocol and architecture',
        keywords: ['documentation', 'protocol', 'architecture', 'technical'],
        timestamp: Date.now() - 7200000, // 2 hours ago
        source: 'ipfs://QmHash123',
        cid: 'QmHash123',
        encrypted: false
      },
      {
        id: 'domain-001',
        type: 'domain',
        title: 'whistleblower.prv',
        description: 'Anonymous domain for secure whistleblowing',
        keywords: ['domain', 'whistleblower', 'anonymous'],
        timestamp: Date.now() - 86400000, // 1 day ago
        source: 'dns:whistleblower.prv',
        encrypted: true
      },
      {
        id: 'video-001',
        type: 'video',
        title: 'Encrypted Video Conference Recording',
        description: 'Recording of quarterly security review meeting',
        keywords: ['video', 'conference', 'security', 'meeting'],
        timestamp: Date.now() - 172800000, // 2 days ago
        source: 'meetings@privachain.prv',
        encrypted: true
      }
    ]
    
    for (const doc of documents) {
      await index(doc)
      console.log(`  ✓ Indexed: ${doc.title} (${doc.type})`)
    }
    console.log(`✅ Indexed ${documents.length} documents\n`)
    
    // Step 3: Perform various searches
    console.log('3️⃣ Searching documents...\n')
    
    // Search 1: Simple term search
    console.log('Search: "encryption"')
    const encryptionResults = await query('encryption')
    console.log(`Found ${encryptionResults.length} results:`)
    encryptionResults.forEach(doc => {
      console.log(`  - ${doc.title} (${doc.type})`)
    })
    console.log()
    
    // Search 2: Multi-term search (AND)
    console.log('Search: "encryption secure"')
    const multiTermResults = await query('encryption secure')
    console.log(`Found ${multiTermResults.length} results:`)
    multiTermResults.forEach(doc => {
      console.log(`  - ${doc.title} (${doc.type})`)
    })
    console.log()
    
    // Search 3: Filter by type
    console.log('Search: all messages')
    const messageResults = await query('', { type: 'message' })
    console.log(`Found ${messageResults.length} messages:`)
    messageResults.forEach(doc => {
      console.log(`  - ${doc.title}`)
    })
    console.log()
    
    // Search 4: Filter by encrypted status
    console.log('Search: encrypted documents containing "update"')
    const encryptedResults = await query('update', { encrypted: true })
    console.log(`Found ${encryptedResults.length} encrypted documents:`)
    encryptedResults.forEach(doc => {
      console.log(`  - ${doc.title} (🔒 encrypted)`)
    })
    console.log()
    
    // Search 5: Filter by source
    console.log('Search: documents from IPFS')
    const ipfsResults = await query('', { source: 'ipfs://QmHash123' })
    console.log(`Found ${ipfsResults.length} IPFS documents:`)
    ipfsResults.forEach(doc => {
      console.log(`  - ${doc.title}`)
    })
    console.log()
    
    // Search 6: Combined filters
    console.log('Search: encrypted "video" type documents')
    const filteredResults = await query('video', { 
      type: 'video',
      encrypted: true 
    })
    console.log(`Found ${filteredResults.length} results:`)
    filteredResults.forEach(doc => {
      console.log(`  - ${doc.title}`)
      console.log(`    Source: ${doc.source}`)
      console.log(`    Encrypted: ${doc.encrypted}`)
    })
    console.log()
    
    // Search 7: No matches
    console.log('Search: "nonexistent"')
    const noResults = await query('nonexistent')
    console.log(`Found ${noResults.length} results`)
    console.log()
    
    // Step 4: Demonstrate result ordering
    console.log('4️⃣ Result ordering (newest first)...')
    const allResults = await query('')
    console.log(`All documents (${allResults.length} total):`)
    allResults.forEach((doc, index) => {
      const date = new Date(doc.timestamp).toLocaleString()
      console.log(`  ${index + 1}. ${doc.title} - ${date}`)
    })
    
    console.log('\n✅ Demo completed successfully!')
    
  } catch (error) {
    console.error('❌ Demo failed:', error)
    
    if (error.message.includes('not initialized')) {
      console.log('\n💡 Tip: Make sure OrbitDB is properly configured')
      console.log('   This demo requires Helia and OrbitDB dependencies')
    }
  }
}

// Run the demo
if (require.main === module) {
  demo()
    .then(() => {
      console.log('\n👋 Demo finished')
      process.exit(0)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { demo }
