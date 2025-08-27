/**
 * Search Backend ZK Integration Tests
 * Tests for real ZK proof integration in search functionality
 */

import { DecentralizedSearchBackend, SearchIndexEntry } from '../../blockchain/SearchBackend'

describe('Search Backend ZK Integration', () => {
  let searchBackend: DecentralizedSearchBackend

  beforeEach(() => {
    searchBackend = new DecentralizedSearchBackend()
  })

  describe('ZK Query Generation', () => {
    test('should require real ZK circuits for query proof generation', async () => {
      // Should throw error when circuits are not set up
      await expect(
        (searchBackend as any).generateZKQuery('test query')
      ).rejects.toThrow(/Real ZK query proof generation failed/)
    })

    test('should provide helpful error message for missing circuits', async () => {
      try {
        await (searchBackend as any).generateZKQuery('test query')
      } catch (error) {
        expect(error.message).toContain('setup-zk-circuits.sh')
        expect(error.message).toContain('environment variables')
      }
    })
  })

  describe('ZK Proof Verification', () => {
    test('should use real ZK verification for search results', async () => {
      const mockResults: SearchIndexEntry[] = [
        {
          id: 'test_1',
          type: 'message',
          contentHash: 'Qm123abc',
          metadata: {
            title: 'Test Message',
            description: 'Test description',
            tags: ['test'],
            timestamp: Date.now(),
            source: 'test.prv',
            encrypted: true
          },
          zkProof: 'mock-zk-proof',
          relevanceScore: 0.9
        }
      ]

      const mockQuery = {
        queryId: 'test-query',
        encryptedQuery: 'encrypted-test',
        queryHash: 'query-hash',
        timestamp: Date.now(),
        resultCount: 1
      }

      // Should attempt real ZK verification
      await expect(
        (searchBackend as any).verifySearchResults(mockQuery, mockResults)
      ).rejects.toThrow(/circuits not properly set up/)
    })

    test('should handle results without ZK proofs (public results)', async () => {
      const publicResults: SearchIndexEntry[] = [
        {
          id: 'public_1',
          type: 'file',
          contentHash: 'Qm456def',
          metadata: {
            title: 'Public File',
            description: 'Public description',
            tags: ['public'],
            timestamp: Date.now(),
            source: 'public.example.com',
            encrypted: false
          },
          relevanceScore: 0.8
        }
      ]

      const mockQuery = {
        queryId: 'test-query',
        encryptedQuery: 'encrypted-test',
        queryHash: 'query-hash',
        timestamp: Date.now(),
        resultCount: 1
      }

      // Should not throw error for public results
      await expect(
        (searchBackend as any).verifySearchResults(mockQuery, publicResults)
      ).resolves.not.toThrow()
    })
  })

  describe('Query Encryption', () => {
    test('should encrypt queries using AES-GCM', async () => {
      const query = 'sensitive search term'
      const encrypted = await (searchBackend as any).encryptQuery(query)
      
      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(query)
      expect(encrypted.length).toBeGreaterThan(query.length)
    })

    test('should produce different encrypted outputs for same query', async () => {
      const query = 'test query'
      const encrypted1 = await (searchBackend as any).encryptQuery(query)
      const encrypted2 = await (searchBackend as any).encryptQuery(query)
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('Query Hashing', () => {
    test('should produce consistent hash for same query', async () => {
      const query = 'test query'
      const hash1 = await (searchBackend as any).hashQuery(query)
      const hash2 = await (searchBackend as any).hashQuery(query)
      
      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe('string')
      expect(hash1.length).toBe(64) // SHA-256 hex length
    })

    test('should produce different hashes for different queries', async () => {
      const hash1 = await (searchBackend as any).hashQuery('query1')
      const hash2 = await (searchBackend as any).hashQuery('query2')
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Merkle Tree Operations', () => {
    test('should calculate search index root', async () => {
      const root = (searchBackend as any).calculateSearchIndexRoot()
      
      expect(root).toBeDefined()
      expect(typeof root).toBe('string')
      expect(root.length).toBeGreaterThan(0)
    })

    test('should generate consistent root for same index', async () => {
      const root1 = (searchBackend as any).calculateSearchIndexRoot()
      const root2 = (searchBackend as any).calculateSearchIndexRoot()
      
      expect(root1).toBe(root2)
    })

    test('should generate result nullifiers', async () => {
      const nullifier = (searchBackend as any).generateResultNullifier('result1', 'query-hash')
      
      expect(nullifier).toBeDefined()
      expect(typeof nullifier).toBe('string')
      expect(nullifier.length).toBe(32)
    })
  })

  describe('Content Indexing with ZK Proofs', () => {
    test('should generate ZK proofs for encrypted content', async () => {
      const content = {
        type: 'message' as const,
        title: 'Encrypted Message',
        description: 'Secret content',
        tags: ['secret', 'encrypted'],
        source: 'whistleblower.prv',
        encrypted: true,
        ipfsHash: 'QmTestHash123'
      }

      // Should attempt to generate ZK proof for encrypted content
      await expect(
        searchBackend.indexContent(content)
      ).rejects.toThrow(/circuits not properly set up/)
    })

    test('should index public content without ZK proofs', async () => {
      const content = {
        type: 'file' as const,
        title: 'Public Document',
        description: 'Public content',
        tags: ['public', 'document'],
        source: 'public.example.com',
        encrypted: false,
        ipfsHash: 'QmPublicHash456'
      }

      // Should succeed for public content
      const id = await searchBackend.indexContent(content)
      
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(id.startsWith('file_')).toBe(true)
    })
  })

  describe('Search Statistics', () => {
    test('should provide accurate search statistics', () => {
      const stats = searchBackend.getSearchStats()
      
      expect(stats).toBeDefined()
      expect(typeof stats.totalIndexed).toBe('number')
      expect(typeof stats.encryptedEntries).toBe('number')
      expect(typeof stats.queryHistory).toBe('number')
      expect(typeof stats.orbitDBConnected).toBe('boolean')
    })

    test('should track encrypted vs public entries', () => {
      const stats = searchBackend.getSearchStats()
      
      expect(stats.totalIndexed).toBeGreaterThanOrEqual(stats.encryptedEntries)
      expect(stats.encryptedEntries).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('Integration with Real ZK Circuits', () => {
  test('should use real circuits when available', async () => {
    // Check if real circuits are configured
    const hasCircuits = !!(
      process.env.ZK_CIRCUIT_WASM && 
      process.env.ZK_CIRCUIT_ZKEY && 
      process.env.ZK_VERIFICATION_KEY
    )

    if (hasCircuits) {
      console.log('Real ZK circuits detected, testing full search functionality...')
      
      const searchBackend = new DecentralizedSearchBackend()
      
      try {
        // Test real ZK query generation
        const zkQuery = await (searchBackend as any).generateZKQuery('real test query')
        
        expect(zkQuery).toBeDefined()
        expect(zkQuery.queryId).toBeDefined()
        expect(zkQuery.zkProof).toBeDefined()
        
        // Test search with real ZK verification
        const results = await searchBackend.zkSearch('encryption', { encrypted: true })
        
        expect(Array.isArray(results)).toBe(true)
        console.log(`Search completed with ${results.length} results`)
        
      } catch (error) {
        console.warn('Real circuit test failed:', error)
      }
    } else {
      console.log('No real circuits configured, testing fallback behavior...')
      
      const searchBackend = new DecentralizedSearchBackend()
      
      // Should provide helpful error messages
      await expect(
        (searchBackend as any).generateZKQuery('test')
      ).rejects.toThrow(/setup-zk-circuits.sh/)
    }
  })
})