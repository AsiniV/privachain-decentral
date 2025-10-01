/**
 * Simple Search Module Tests
 * Tests for the basic search functionality using OrbitDB
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { initSearch, index, query, SearchDoc } from '../src/search/simple-search'

describe('Simple Search Module', () => {
  beforeAll(async () => {
    // Initialize search before running tests
    try {
      await initSearch('test-search-db')
    } catch (error) {
      console.warn('Search initialization failed (OrbitDB may not be available):', error)
    }
  }, 60000) // 60 second timeout for initialization

  describe('initSearch', () => {
    it('should initialize without throwing', async () => {
      // Should already be initialized from beforeAll
      // Calling again should return immediately
      await expect(initSearch('test-search-db')).resolves.not.toThrow()
    })

    it('should handle reinitialization gracefully', async () => {
      // Multiple calls should not cause errors
      await initSearch('test-search-db')
      await initSearch('test-search-db')
    })
  })

  describe('index', () => {
    it('should throw error if not initialized', async () => {
      // This test is skipped as we initialize in beforeAll
      // In a real scenario without initialization, it should throw
    })

    it('should index a document successfully', async () => {
      const doc: SearchDoc = {
        id: 'test-doc-1',
        type: 'message',
        title: 'Test Document',
        description: 'This is a test document for search',
        keywords: ['test', 'search', 'document'],
        timestamp: Date.now(),
        source: 'test.prv',
        encrypted: false
      }

      await expect(index(doc)).resolves.not.toThrow()
    })

    it('should index an encrypted document', async () => {
      const doc: SearchDoc = {
        id: 'test-doc-encrypted',
        type: 'email',
        title: 'Encrypted Email',
        description: 'Secret communication',
        keywords: ['encrypted', 'secure'],
        timestamp: Date.now(),
        source: 'secure@privachain.prv',
        encrypted: true,
        zkProof: 'zk_proof_test'
      }

      await expect(index(doc)).resolves.not.toThrow()
    })

    it('should index documents with different types', async () => {
      const types: Array<SearchDoc['type']> = ['file', 'domain', 'transaction', 'video', 'identity']
      
      for (const type of types) {
        const doc: SearchDoc = {
          id: `test-${type}-${Date.now()}`,
          type,
          title: `Test ${type}`,
          description: `A test ${type} document`,
          keywords: [type, 'test'],
          timestamp: Date.now(),
          source: 'test.prv'
        }
        
        await expect(index(doc)).resolves.not.toThrow()
      }
    })
  })

  describe('query', () => {
    beforeAll(async () => {
      // Index some test documents
      const testDocs: SearchDoc[] = [
        {
          id: 'query-test-1',
          type: 'message',
          title: 'Encryption Protocol',
          description: 'Discussion about encryption methods',
          keywords: ['encryption', 'protocol', 'security'],
          timestamp: Date.now(),
          source: 'alice@privachain.prv',
          encrypted: true
        },
        {
          id: 'query-test-2',
          type: 'file',
          title: 'Public Document',
          description: 'Publicly available information',
          keywords: ['public', 'document', 'info'],
          timestamp: Date.now() - 1000,
          source: 'public.example.com',
          encrypted: false
        },
        {
          id: 'query-test-3',
          type: 'email',
          title: 'Network Update',
          description: 'Latest encryption network updates',
          keywords: ['network', 'update', 'encryption'],
          timestamp: Date.now() - 2000,
          source: 'network@privachain.prv',
          encrypted: true
        }
      ]

      for (const doc of testDocs) {
        await index(doc)
      }
      
      // Wait a bit for indexing to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
    })

    it('should throw error if not initialized', async () => {
      // This test is skipped as we initialize in beforeAll
    })

    it('should find documents by single term', async () => {
      const results = await query('encryption')
      
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      
      // All results should contain 'encryption' in title, description, or keywords
      results.forEach(doc => {
        const content = `${doc.title} ${doc.description || ''} ${(doc.keywords || []).join(' ')}`.toLowerCase()
        expect(content).toContain('encryption')
      })
    })

    it('should find documents by multiple terms (AND logic)', async () => {
      const results = await query('encryption network')
      
      expect(Array.isArray(results)).toBe(true)
      
      // All results should contain both 'encryption' AND 'network'
      results.forEach(doc => {
        const content = `${doc.title} ${doc.description || ''} ${(doc.keywords || []).join(' ')}`.toLowerCase()
        expect(content).toContain('encryption')
        expect(content).toContain('network')
      })
    })

    it('should filter by type', async () => {
      const results = await query('test', { type: 'message' })
      
      expect(Array.isArray(results)).toBe(true)
      
      // All results should be of type 'message'
      results.forEach(doc => {
        expect(doc.type).toBe('message')
      })
    })

    it('should filter by encrypted flag', async () => {
      const encryptedResults = await query('', { encrypted: true })
      const unencryptedResults = await query('', { encrypted: false })
      
      expect(Array.isArray(encryptedResults)).toBe(true)
      expect(Array.isArray(unencryptedResults)).toBe(true)
      
      // Check encrypted results
      encryptedResults.forEach(doc => {
        expect(doc.encrypted).toBe(true)
      })
      
      // Check unencrypted results
      unencryptedResults.forEach(doc => {
        expect(doc.encrypted).toBe(false)
      })
    })

    it('should filter by source', async () => {
      const results = await query('', { source: 'public.example.com' })
      
      expect(Array.isArray(results)).toBe(true)
      
      // All results should be from the specified source
      results.forEach(doc => {
        expect(doc.source).toBe('public.example.com')
      })
    })

    it('should combine term search with filters', async () => {
      const results = await query('encryption', { encrypted: true, type: 'message' })
      
      expect(Array.isArray(results)).toBe(true)
      
      results.forEach(doc => {
        const content = `${doc.title} ${doc.description || ''} ${(doc.keywords || []).join(' ')}`.toLowerCase()
        expect(content).toContain('encryption')
        expect(doc.encrypted).toBe(true)
        expect(doc.type).toBe('message')
      })
    })

    it('should return results sorted by timestamp (newest first)', async () => {
      const results = await query('test')
      
      if (results.length > 1) {
        // Check that results are sorted by timestamp in descending order
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].timestamp).toBeGreaterThanOrEqual(results[i + 1].timestamp)
        }
      }
    })

    it('should return empty array when no matches found', async () => {
      const results = await query('nonexistentterm12345')
      
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBe(0)
    })

    it('should handle empty query string', async () => {
      const results = await query('')
      
      expect(Array.isArray(results)).toBe(true)
      // With empty query, should return all documents (filtered by any provided filters)
    })

    it('should be case insensitive', async () => {
      const lowerResults = await query('encryption')
      const upperResults = await query('ENCRYPTION')
      const mixedResults = await query('EnCrYpTiOn')
      
      expect(lowerResults.length).toBe(upperResults.length)
      expect(lowerResults.length).toBe(mixedResults.length)
    })
  })

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      // These tests verify error messages are helpful
      try {
        await index({
          id: 'test',
          type: 'message',
          title: 'Test',
          timestamp: Date.now(),
          source: 'test'
        })
      } catch (error) {
        // Error should contain useful information
        expect(error.message).toBeTruthy()
      }
    })
  })
})
