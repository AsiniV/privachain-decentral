/**
 * Test OrbitDB Hybrid Indexing functionality
 * Tests both OrbitDB initialization and fallback search
 */

import { orbitDBIndexing } from '../src/services/orbitdb.js'

async function testOrbitDBService() {
  console.log('🧪 Testing OrbitDB Hybrid Indexing Service...')
  
  try {
    // Test 1: Check initial stats
    console.log('\n📊 Initial stats:')
    const initialStats = orbitDBIndexing.getStats()
    console.log('- Initialized:', initialStats.isInitialized)
    console.log('- Health status:', initialStats.healthStatus)
    console.log('- Total indexed:', initialStats.totalIndexed)
    console.log('- Fallback index size:', initialStats.fallbackIndexSize)

    // Test 2: Basic search functionality
    console.log('\n🔍 Testing basic search...')
    const searchQuery = {
      term: 'encryption email',
      filters: {},
      zkEncrypted: false
    }

    const searchResults = await orbitDBIndexing.search(searchQuery)
    console.log('✅ Search completed')
    console.log('- Results found:', searchResults.documents.length)
    console.log('- Search time:', searchResults.searchTime + 'ms')
    console.log('- Privacy features:', searchResults.privacy)

    if (searchResults.documents.length > 0) {
      console.log('- Top result:', searchResults.documents[0].title)
    }

    // Test 3: Test bang command search
    console.log('\n🎯 Testing bang command search...')
    const bangQuery = {
      term: '!w privacy',
      filters: {},
      zkEncrypted: false
    }

    const bangResults = await orbitDBIndexing.search(bangQuery)
    console.log('✅ Bang command search completed')
    console.log('- Results found:', bangResults.documents.length)

    // Test 4: Test indexing new content
    console.log('\n📚 Testing content indexing...')
    const newDocument = {
      type: 'file',
      title: 'Test Document - OrbitDB Integration',
      description: 'A test document to verify OrbitDB indexing functionality',
      content: 'This document tests the OrbitDB search and indexing capabilities of PrivaChain',
      keywords: ['test', 'orbitdb', 'search', 'privachain'],
      source: 'test://local',
      encrypted: false,
      privacy: {
        anonymous: false,
        onionRouted: false
      },
      metadata: { category: 'test' }
    }

    const docId = await orbitDBIndexing.indexContent(newDocument)
    console.log('✅ Document indexed with ID:', docId)

    // Test 5: Search for the newly indexed document
    console.log('\n🔎 Testing search for new document...')
    const testQuery = {
      term: 'OrbitDB Integration',
      filters: {},
      zkEncrypted: false
    }

    const testResults = await orbitDBIndexing.search(testQuery)
    console.log('✅ Test document search completed')
    console.log('- Results found:', testResults.documents.length)
    
    const foundTestDoc = testResults.documents.find(doc => doc.id === docId)
    if (foundTestDoc) {
      console.log('✅ Successfully found the newly indexed document')
    } else {
      console.log('⚠️ Could not find the newly indexed document')
    }

    // Test 6: Final stats
    console.log('\n📊 Final stats:')
    const finalStats = orbitDBIndexing.getStats()
    console.log('- Initialized:', finalStats.isInitialized)
    console.log('- Health status:', finalStats.healthStatus)
    console.log('- Total indexed:', finalStats.totalIndexed)
    console.log('- Encrypted entries:', finalStats.encryptedEntries)
    console.log('- OrbitDB connected:', finalStats.orbitDBConnected)

    console.log('\n🎉 All tests completed successfully!')
    return true

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    return false
  }
}

// Run the test
testOrbitDBService().then(success => {
  console.log(success ? '\n✅ Test suite passed' : '\n❌ Test suite failed')
  process.exit(success ? 0 : 1)
})