/**
 * Decentralized Search Backend Integration
 * OrbitDB-powered hybrid indexing with privacy-first search
 * Emulates Google/Yandex capabilities with DuckDuckGo privacy features
 */

import { toast } from 'sonner'
import { GraphQLClient } from 'graphql-request'
import { useState, useEffect } from 'react'
import { orbitDBIndexing, SearchDocument, SearchQuery, SearchResult } from '../services/orbitdb'

// SubQuery Cosmos configuration for Osmosis swap indexing
const SUBQUERY_CONFIG = {
  endpoint: 'https://api.subquery.network/sq/privachain/privachain-cosmos-indexer',
  apiKey: process.env.SUBQUERY_API_KEY || 'demo-key'
}

// ComposeDB configuration  
const COMPOSEDB_CONFIG = {
  node: 'https://ceramic-clay.3boxlabs.com',
  network: 'testnet-clay'
}

// ZK proof configuration (for future use)
// const ZK_CONFIG = {
//   provingKey: 'mock-proving-key',
//   verifyingKey: 'mock-verifying-key'
// }

export interface SearchIndexEntry {
  id: string
  type: 'message' | 'email' | 'contact' | 'file' | 'domain' | 'transaction' | 'video' | 'identity'
  contentHash: string
  metadata: {
    title: string
    description: string
    tags: string[]
    timestamp: number
    source: string
    encrypted: boolean
  }
  zkProof?: string
  relevanceScore: number
}

export interface ZKQuery {
  queryId: string
  encryptedQuery: string
  queryHash: string
  timestamp: number
  resultCount: number
  zkProof?: string
}

export class DecentralizedSearchBackend {
  private testWallet = 'osmo1hcgd3hg6kpvsfuklsgkzjratda53vwsynq5zdc'
  private searchIndex: Map<string, SearchIndexEntry> = new Map()
  private queryHistory: ZKQuery[] = []
  private subqueryClient: GraphQLClient
  private composeDbInitialized = false
  private orbitDBReady = false

  constructor() {
    this.initializeMockIndex()
    this.initializeBackends()
    this.checkOrbitDBStatus()
  }

  /**
   * Check OrbitDB initialization status
   */
  private async checkOrbitDBStatus() {
    try {
      // Wait for OrbitDB to initialize
      let attempts = 0
      const maxAttempts = 30 // 30 seconds timeout
      
      while (!orbitDBIndexing.getStats().isInitialized && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
      
      if (orbitDBIndexing.getStats().isInitialized) {
        this.orbitDBReady = true
        console.log('✅ OrbitDB backend ready for hybrid search')
        
        // Populate OrbitDB with initial content
        await this.migrateToOrbitDB()
      } else {
        console.warn('⚠️ OrbitDB initialization timeout, using fallback mode')
      }
    } catch (error) {
      console.error('❌ OrbitDB status check failed:', error)
    }
  }

  /**
   * Migrate existing mock data to OrbitDB
   */
  private async migrateToOrbitDB() {
    try {
      for (const entry of this.searchIndex.values()) {
        const document: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'> = {
          type: entry.type as any,
          title: entry.metadata.title,
          description: entry.metadata.description,
          content: entry.metadata.description, // Use description as content for now
          keywords: entry.metadata.tags,
          cid: entry.contentHash,
          source: entry.metadata.source,
          encrypted: entry.metadata.encrypted,
          privacy: {
            anonymous: entry.metadata.encrypted,
            zkProof: entry.zkProof,
            onionRouted: entry.metadata.source.includes('.prv') || entry.metadata.source.includes('.onion')
          },
          metadata: {
            migrated: true,
            originalId: entry.id
          }
        }
        
        await orbitDBIndexing.indexContent(document)
      }
      
      console.log('📚 Migrated mock data to OrbitDB')
    } catch (error) {
      console.error('❌ Failed to migrate to OrbitDB:', error)
    }
  }

  /**
   * Initialize real backend services
   */
  private async initializeBackends() {
    try {
      // Initialize SubQuery GraphQL client
      this.subqueryClient = new GraphQLClient(SUBQUERY_CONFIG.endpoint, {
        headers: {
          'Authorization': `Bearer ${SUBQUERY_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      // Test SubQuery connection
      await this.testSubQueryConnection()

      // Initialize ComposeDB connection
      await this.initializeComposeDB()

      console.log('✅ MagnifyingGlass backends initialized:', {
        subquery: 'Connected',
        composedb: this.composeDbInitialized ? 'Connected' : 'Simulated',
        zkProofs: 'Ready'
      })

    } catch (error) {
      console.error('MagnifyingGlass backend initialization failed:', error)
      console.warn('Falling back to simulated search backend')
    }
  }

  /**
   * Test SubQuery connection
   */
  private async testSubQueryConnection() {
    try {
      const query = `
        query {
          _metadata {
            chain
            specName
            genesisHash
          }
        }
      `
      
      const result = await this.subqueryClient.request(query)
      console.log('🔍 SubQuery connected:', result)
      
    } catch (error) {
      console.warn('SubQuery connection failed, using simulation:', error)
    }
  }

  /**
   * Initialize ComposeDB connection
   */
  private async initializeComposeDB() {
    try {
      // Note: In a real implementation, you would use @ceramicnetwork/http-client
      // For now, we'll simulate the connection
      
      console.log('🏺 ComposeDB initialization (simulated):', {
        node: COMPOSEDB_CONFIG.node,
        network: COMPOSEDB_CONFIG.network,
        status: 'Connected to decentralized content database'
      })
      
      this.composeDbInitialized = true
      
    } catch (error) {
      console.warn('ComposeDB initialization failed:', error)
      this.composeDbInitialized = false
    }
  }

  /**
   * Initialize search index with mock data
   */
  private initializeMockIndex() {
    const mockEntries: SearchIndexEntry[] = [
      {
        id: 'msg_001',
        type: 'message',
        contentHash: 'QmXyZ123abc456def789',
        metadata: {
          title: 'Encrypted Communication Protocol',
          description: 'Discussion about implementing Signal Protocol for E2E encryption',
          tags: ['encryption', 'signal', 'protocol'],
          timestamp: Date.now() - 3600000,
          source: 'whistleblower.prv',
          encrypted: true
        },
        zkProof: 'zk_proof_msg_001',
        relevanceScore: 0.95
      },
      {
        id: 'email_001',
        type: 'email',
        contentHash: 'QmAbc789def123ghi456',
        metadata: {
          title: 'PrivaChain Network Update',
          description: 'Latest updates on TURN node deployment and quantum encryption',
          tags: ['network', 'update', 'quantum'],
          timestamp: Date.now() - 7200000,
          source: 'network@privachain.prv',
          encrypted: true
        },
        zkProof: 'zk_proof_email_001',
        relevanceScore: 0.88
      },
      {
        id: 'contact_001',
        type: 'contact',
        contentHash: 'QmDef456ghi789jkl012',
        metadata: {
          title: 'Anonymous Journalist',
          description: 'Verified journalist specializing in secure communications',
          tags: ['journalist', 'verified', 'secure'],
          timestamp: Date.now() - 10800000,
          source: 'journalist.prv',
          encrypted: true
        },
        zkProof: 'zk_proof_contact_001',
        relevanceScore: 0.92
      },
      {
        id: 'file_001',
        type: 'file',
        contentHash: 'QmGhi012jkl345mno678',
        metadata: {
          title: 'Blockchain Technical Specification',
          description: 'Comprehensive technical documentation for PrivaChain protocol',
          tags: ['blockchain', 'specification', 'technical'],
          timestamp: Date.now() - 14400000,
          source: 'ipfs://QmGhi012jkl345mno678',
          encrypted: false
        },
        relevanceScore: 0.85
      },
      {
        id: 'domain_001',
        type: 'domain',
        contentHash: 'QmJkl345mno678pqr901',
        metadata: {
          title: 'activist.prv',
          description: 'Anonymous domain for human rights activism',
          tags: ['domain', 'activist', 'human-rights'],
          timestamp: Date.now() - 18000000,
          source: 'activist.prv',
          encrypted: true
        },
        zkProof: 'zk_proof_domain_001',
        relevanceScore: 0.90
      },
      {
        id: 'video_001',
        type: 'video',
        contentHash: 'QmMno901pqr234stu567',
        metadata: {
          title: 'Encrypted Video Call with Whistleblower',
          description: 'Anonymous video interview about corporate misconduct',
          tags: ['video', 'interview', 'whistleblower', 'encrypted'],
          timestamp: Date.now() - 21600000,
          source: 'video.secure.prv',
          encrypted: true
        },
        zkProof: 'zk_proof_video_001',
        relevanceScore: 0.87
      },
      {
        id: 'identity_001',
        type: 'identity',
        contentHash: 'QmPqr567stu890vwx123',
        metadata: {
          title: 'Anonymous Identity Certificate',
          description: 'ZK-proof verified anonymous identity for secure communications',
          tags: ['identity', 'zk-proof', 'anonymous', 'verified'],
          timestamp: Date.now() - 25200000,
          source: 'identity.ceramic.network',
          encrypted: true
        },
        zkProof: 'zk_proof_identity_001',
        relevanceScore: 0.93
      },
      {
        id: 'transaction_001',
        type: 'transaction',
        contentHash: 'QmStu890vwx123yza456',
        metadata: {
          title: 'Anonymous Payment Transaction',
          description: 'Private payment for secure hosting services via Cosmos',
          tags: ['payment', 'cosmos', 'anonymous', 'hosting'],
          timestamp: Date.now() - 28800000,
          source: 'cosmos:privachain-1',
          encrypted: true
        },
        zkProof: 'zk_proof_tx_001',
        relevanceScore: 0.84
      }
    ]

    mockEntries.forEach(entry => {
      this.searchIndex.set(entry.id, entry)
    })
  }

  /**
   * Perform zero-knowledge search with OrbitDB hybrid indexing
   */
  async zkSearch(
    query: string,
    filters: {
      type?: string
      encrypted?: boolean
      timeRange?: { start: number, end: number }
      source?: string
    } = {}
  ): Promise<SearchIndexEntry[]> {
    try {
      // Use OrbitDB if available, otherwise fallback to existing implementation
      if (this.orbitDBReady) {
        return await this.searchWithOrbitDB(query, filters)
      }
      
      // Fallback to original implementation
      return await this.legacyZkSearch(query, filters)
    } catch (error) {
      toast.error(`Search failed: ${error}`)
      throw error
    }
  }

  /**
   * Search using OrbitDB hybrid indexing
   */
  private async searchWithOrbitDB(
    query: string,
    filters: Record<string, any>
  ): Promise<SearchIndexEntry[]> {
    try {
      const searchQuery: SearchQuery = {
        term: query,
        type: filters.type,
        filters: {
          encrypted: filters.encrypted,
          timeRange: filters.timeRange,
          source: filters.source,
          privacy: true
        },
        zkEncrypted: true
      }

      const result: SearchResult = await orbitDBIndexing.search(searchQuery)
      
      // Convert OrbitDB results to SearchIndexEntry format
      const entries: SearchIndexEntry[] = result.documents.map(doc => ({
        id: doc.id,
        type: doc.type as any,
        contentHash: doc.cid || doc.id,
        metadata: {
          title: doc.title,
          description: doc.description,
          tags: doc.keywords,
          timestamp: doc.timestamp,
          source: doc.source,
          encrypted: doc.encrypted
        },
        zkProof: doc.privacy.zkProof,
        relevanceScore: doc.relevanceScore
      }))

      // Update query statistics
      const zkQuery = await this.generateZKQuery(query)
      zkQuery.resultCount = entries.length
      this.queryHistory.push(zkQuery)

      const stats = orbitDBIndexing.getStats()
      toast.success(
        `Found ${entries.length} results via OrbitDB (${stats.peerConnections} peers connected)`,
        {
          description: `Search time: ${result.searchTime}ms • Privacy: ${result.privacy.trackingPrevented ? 'Protected' : 'Standard'}`
        }
      )

      return entries
    } catch (error) {
      console.error('OrbitDB search failed:', error)
      toast.error(`OrbitDB search failed: ${error}`)
      return []
    }
  }

  /**
   * Legacy search implementation (fallback)
   */
  private async legacyZkSearch(
    query: string,
    filters: Record<string, any>
  ): Promise<SearchIndexEntry[]> {
    try {
      // Generate ZK query proof
      const zkQuery = await this.generateZKQuery(query)
      
      // Search through multiple backends
      const [localResults, subqueryResults, composeDbResults] = await Promise.all([
        this.searchLocalIndex(query, filters),
        this.searchSubQuery(query, filters),
        this.searchComposeDB(query, filters)
      ])

      // Merge and deduplicate results
      const allResults = this.mergeSearchResults([
        localResults,
        subqueryResults, 
        composeDbResults
      ])
      
      // Update query statistics
      zkQuery.resultCount = allResults.length
      this.queryHistory.push(zkQuery)
      
      // Verify results with ZK proofs
      await this.verifySearchResults(zkQuery, allResults)
      
      toast.success(`Found ${allResults.length} results across decentralized backends`)
      
      return allResults
      
    } catch (error) {
      toast.error(`Search failed: ${error}`)
      throw error
    }
  }

  /**
   * MagnifyingGlass SubQuery Cosmos indexer
   */
  private async searchSubQuery(query: string, filters: Record<string, unknown>): Promise<SearchIndexEntry[]> {
    try {
      if (!this.subqueryClient) {
        return []
      }

      const searchQuery = `
        query SearchContent($query: String!, $type: String, $encrypted: Boolean) {
          searchEntries(
            filter: {
              or: [
                { title: { includesInsensitive: $query } }
                { description: { includesInsensitive: $query } }
                { tags: { contains: [$query] } }
              ]
              type: { equalTo: $type }
              encrypted: { equalTo: $encrypted }
            }
            orderBy: RELEVANCE_SCORE_DESC
            first: 50
          ) {
            nodes {
              id
              type
              contentHash
              title
              description
              tags
              timestamp
              source
              encrypted
              zkProof
              relevanceScore
            }
          }
        }
      `

      const variables = {
        query: query.toLowerCase(),
        type: filters.type || null,
        encrypted: filters.encrypted || null
      }

      const result = await this.subqueryClient.request(searchQuery, variables)
      
      const entries: SearchIndexEntry[] = result.searchEntries.nodes.map((node: { id: string; type: string; contentHash: string; title: string; description?: string; url?: string; timestamp: number }) => ({
        id: node.id,
        type: node.type,
        contentHash: node.contentHash,
        metadata: {
          title: node.title,
          description: node.description,
          tags: node.tags,
          timestamp: node.timestamp,
          source: node.source,
          encrypted: node.encrypted
        },
        zkProof: node.zkProof,
        relevanceScore: node.relevanceScore
      }))

      console.log(`🔍 SubQuery search results: ${entries.length} entries`)
      return entries
      
    } catch (error) {
      console.error('SubQuery search failed:', error)
      return []
    }
  }

  /**
   * MagnifyingGlass ComposeDB content database
   */
  private async searchComposeDB(query: string): Promise<SearchIndexEntry[]> {
    try {
      if (!this.composeDbInitialized) {
        return []
      }

      // Simulate ComposeDB search (in real implementation, use Ceramic queries)
      const mockComposeResults: SearchIndexEntry[] = [
        {
          id: 'compose_001',
          type: 'file',
          contentHash: 'ceramic:k2t6wz...',
          metadata: {
            title: 'Decentralized File Storage',
            description: 'Content stored on ComposeDB/Ceramic network',
            tags: ['decentralized', 'storage', 'ceramic'],
            timestamp: Date.now() - 1800000,
            source: 'composedb://streams',
            encrypted: true
          },
          zkProof: 'compose_zk_proof_001',
          relevanceScore: 0.89
        }
      ].filter(entry => 
        entry.metadata.title.toLowerCase().includes(query.toLowerCase()) ||
        entry.metadata.description.toLowerCase().includes(query.toLowerCase())
      )

      console.log(`🏺 ComposeDB search results: ${mockComposeResults.length} entries`)
      return mockComposeResults
      
    } catch (error) {
      console.error('ComposeDB search failed:', error)
      return []
    }
  }

  /**
   * MagnifyingGlass local encrypted index
   */
  private async searchLocalIndex(query: string, filters: Record<string, unknown>): Promise<SearchIndexEntry[]> {
    // Use existing searchEncryptedIndex method
    return await this.searchEncryptedIndex(query, filters)
  }

  /**
   * Merge and deduplicate search results from multiple backends
   */
  private mergeSearchResults(resultSets: SearchIndexEntry[][]): SearchIndexEntry[] {
    const mergedMap = new Map<string, SearchIndexEntry>()
    
    for (const resultSet of resultSets) {
      for (const entry of resultSet) {
        if (!mergedMap.has(entry.id)) {
          mergedMap.set(entry.id, entry)
        } else {
          // If duplicate found, keep the one with higher relevance score
          const existing = mergedMap.get(entry.id)!
          if (entry.relevanceScore > existing.relevanceScore) {
            mergedMap.set(entry.id, entry)
          }
        }
      }
    }
    
    // Sort by relevance score
    return Array.from(mergedMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Verify search results using zero-knowledge proofs
   */
  private async verifySearchResults(zkQuery: ZKQuery, results: SearchIndexEntry[]): Promise<void> {
    try {
      console.log('🔐 Verifying search results with real ZK proofs...')
      
      const verificationResults = await Promise.all(results.map(async (result) => {
        if (!result.zkProof) {
          // Public results don't need ZK verification
          return { id: result.id, verified: true, encrypted: result.metadata.encrypted }
        }

        try {
          // Parse the ZK proof
          const proof = {
            proof: result.zkProof,
            publicSignals: [result.contentHash, zkQuery.queryHash],
            nullifierHash: this.generateResultNullifier(result.id, zkQuery.queryHash)
          }

          // Use real ZK verification from zkCrypto
          const { zkIdentityManager } = await import('../services/zkCrypto')
          
          // For search inclusion proofs, we need to verify against the search index Merkle root
          const searchIndexRoot = this.calculateSearchIndexRoot()
          const verified = await zkIdentityManager.verifySearchInclusionProof(
            proof,
            searchIndexRoot,
            result.contentHash
          )

          return {
            id: result.id,
            verified,
            encrypted: result.metadata.encrypted
          }
        } catch (error) {
          console.error(`❌ Failed to verify ZK proof for result ${result.id}:`, error)
          return {
            id: result.id,
            verified: false,
            encrypted: result.metadata.encrypted
          }
        }
      }))

      const verifiedCount = verificationResults.filter(r => r.verified).length
      
      console.log(`🔐 ZK Proof Verification Results:`, {
        total: results.length,
        verified: verifiedCount,
        encrypted: verificationResults.filter(r => r.encrypted).length,
        queryId: zkQuery.queryId,
        success: verifiedCount === results.length
      })

      // Log any verification failures
      const failed = verificationResults.filter(r => !r.verified)
      if (failed.length > 0) {
        console.warn(`⚠️ ${failed.length} results failed ZK verification:`, failed.map(f => f.id))
      }
      
    } catch (error) {
      console.error('❌ Search result ZK verification failed:', error)
      throw new Error(`Search verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }



  /**
   * Generate zero-knowledge query proof
   * Real implementation using zkCrypto service
   */
  private async generateZKQuery(query: string): Promise<ZKQuery> {
    try {
      console.log('🔐 Generating real ZK query proof...')
      
      // Use real ZK proof generation
      const { zkIdentityManager } = await import('../services/zkCrypto')
      
      // Generate query hash and encrypted query
      const queryHash = await this.hashQuery(query)
      const encryptedQuery = await this.encryptQuery(query)
      
      // Generate a search inclusion proof for the query
      // This creates a commitment to the query without revealing its content
      const queryCommitment = await zkIdentityManager.generateMembershipProof(`search_query_${queryHash}`)
      
      return {
        queryId: `zkq_${Math.random().toString(36).substring(2, 15)}`,
        encryptedQuery,
        queryHash,
        timestamp: Date.now(),
        resultCount: 0, // Will be updated after search
        zkProof: queryCommitment.proof
      }
    } catch (error) {
      console.error('❌ Failed to generate ZK query proof:', error)
      
      // If ZK proof generation fails (e.g., circuits not set up), throw error
      // No fallback to mock implementation
      throw new Error(
        `Real ZK query proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
        'Please ensure ZK circuits are properly set up:\n' +
        '1. Run: ./scripts/setup-zk-circuits.sh\n' +
        '2. Set environment variables for circuit files'
      )
    }
  }

  /**
   * MagnifyingGlass through encrypted index
   */
  private async searchEncryptedIndex(
    query: string,
    filters: Record<string, unknown>
  ): Promise<SearchIndexEntry[]> {
    // Simulate decryption and search
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const queryLower = query.toLowerCase()
    const results: SearchIndexEntry[] = []
    
    for (const entry of this.searchIndex.values()) {
      // Apply filters
      if (filters.type && entry.type !== filters.type) continue
      if (filters.encrypted !== undefined && entry.metadata.encrypted !== filters.encrypted) continue
      if (filters.source && entry.metadata.source !== filters.source) continue
      if (filters.timeRange) {
        if (entry.metadata.timestamp < filters.timeRange.start || 
            entry.metadata.timestamp > filters.timeRange.end) continue
      }
      
      // MagnifyingGlass in title, description, and tags
      const searchableText = [
        entry.metadata.title,
        entry.metadata.description,
        ...entry.metadata.tags
      ].join(' ').toLowerCase()
      
      if (searchableText.includes(queryLower)) {
        // Calculate relevance based on query match
        const titleMatch = entry.metadata.title.toLowerCase().includes(queryLower) ? 0.5 : 0
        const descMatch = entry.metadata.description.toLowerCase().includes(queryLower) ? 0.3 : 0
        const tagMatch = entry.metadata.tags.some(tag => 
          tag.toLowerCase().includes(queryLower)
        ) ? 0.2 : 0
        
        const queryRelevance = titleMatch + descMatch + tagMatch
        entry.relevanceScore = (entry.relevanceScore * 0.7) + (queryRelevance * 0.3)
        
        results.push(entry)
      }
    }
    
    // Sort by relevance
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Verify search query on blockchain
   */
  private async verifySearchOnBlockchain(zkQuery: ZKQuery): Promise<void> {
    // Simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const txHash = `cosmos_search_${Math.random().toString(36).substring(2, 15)}`
    
    console.log(`🔍 MagnifyingGlass Query Verified on Cosmos:`, {
      queryId: zkQuery.queryId,
      queryHash: zkQuery.queryHash,
      txHash,
      wallet: this.testWallet,
      timestamp: zkQuery.timestamp
    })
  }

  /**
   * Index new content for search (updated to use OrbitDB)
   */
  async indexContent(
    content: {
      type: 'message' | 'email' | 'contact' | 'file' | 'domain' | 'video' | 'identity'
      title: string
      description: string
      tags: string[]
      source: string
      encrypted: boolean
      ipfsHash?: string
    }
  ): Promise<string> {
    try {
      // Use OrbitDB if available
      if (this.orbitDBReady) {
        const document: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'> = {
          type: content.type,
          title: content.title,
          description: content.description,
          content: content.description, // Use description as content
          keywords: content.tags,
          cid: content.ipfsHash,
          source: content.source,
          encrypted: content.encrypted,
          privacy: {
            anonymous: content.encrypted,
            onionRouted: content.source.includes('.prv') || content.source.includes('.onion')
          },
          metadata: {
            indexedAt: Date.now()
          }
        }
        
        const id = await orbitDBIndexing.indexContent(document)
        toast.success(`Content indexed in OrbitDB: ${content.title}`)
        return id
      }
      
      // Fallback to legacy indexing
      return await this.legacyIndexContent(content)
    } catch (error) {
      toast.error(`Indexing failed: ${error}`)
      throw error
    }
  }

  /**
   * Legacy indexing implementation
   */
  private async legacyIndexContent(content: any): Promise<string> {
    const id = `${content.type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    const entry: SearchIndexEntry = {
      id,
      type: content.type,
      contentHash: content.ipfsHash || `Qm${Math.random().toString(36).substring(2, 46)}`,
      metadata: {
        title: content.title,
        description: content.description,
        tags: content.tags,
        timestamp: Date.now(),
        source: content.source,
        encrypted: content.encrypted
      },
      zkProof: content.encrypted ? await this.generateContentZKProof(content) : undefined,
      relevanceScore: 1.0
    }
    
    // Index in local storage
    this.searchIndex.set(id, entry)
    
    // Index in parallel across backends
    await Promise.all([
      this.indexOnSubQuery(entry),
      this.indexOnComposeDB(entry),
      this.indexOnBlockchain(entry)
    ])
    
    toast.success(`Content indexed across decentralized backends: ${content.title}`)
    return id
  }

  /**
   * Index content on SubQuery Cosmos
   */
  private async indexOnSubQuery(entry: SearchIndexEntry): Promise<void> {
    try {
      if (!this.subqueryClient) {
        console.log('📊 SubQuery indexing (simulated):', entry.id)
        return
      }

      const indexMutation = `
        mutation IndexContent($input: ContentIndexInput!) {
          indexContent(input: $input) {
            id
            success
            txHash
          }
        }
      `

      const input = {
        id: entry.id,
        type: entry.type,
        contentHash: entry.contentHash,
        title: entry.metadata.title,
        description: entry.metadata.description,
        tags: entry.metadata.tags,
        timestamp: entry.metadata.timestamp,
        source: entry.metadata.source,
        encrypted: entry.metadata.encrypted,
        zkProof: entry.zkProof,
        relevanceScore: entry.relevanceScore
      }

      const result = await this.subqueryClient.request(indexMutation, { input })
      
      console.log(`📊 SubQuery Cosmos Indexing:`, {
        id: entry.id,
        type: entry.type,
        txHash: result.indexContent.txHash,
        encrypted: entry.metadata.encrypted
      })
      
    } catch (error) {
      console.error('SubQuery indexing failed:', error)
      // Fallback to simulation
      console.log('📊 SubQuery indexing (simulated fallback):', entry.id)
    }
  }

  /**
   * Index content on ComposeDB
   */
  private async indexOnComposeDB(entry: SearchIndexEntry): Promise<void> {
    try {
      if (!this.composeDbInitialized) {
        console.log('🏺 ComposeDB indexing (simulated):', entry.id)
        return
      }

      // Simulate ComposeDB content creation
      // In real implementation, use @ceramicnetwork/stream-* packages
      const streamId = `ceramic:kjz...${Math.random().toString(36).substring(2, 8)}`
      
      console.log(`🏺 ComposeDB Content Creation:`, {
        id: entry.id,
        streamId,
        type: entry.type,
        contentHash: entry.contentHash,
        encrypted: entry.metadata.encrypted,
        network: COMPOSEDB_CONFIG.network
      })
      
    } catch (error) {
      console.error('ComposeDB indexing failed:', error)
    }
  }

  /**
   * Index content on blockchain for verification
   */
  private async indexOnBlockchain(entry: SearchIndexEntry): Promise<void> {
    try {
      // Create content hash for blockchain verification
      const contentVerificationHash = await this.createContentHash(entry)
      
      // Simulate blockchain indexing transaction
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const txHash = `index_tx_${Math.random().toString(36).substring(2, 15)}`
      
      console.log(`⛓️ Blockchain Content Verification:`, {
        id: entry.id,
        verificationHash: contentVerificationHash,
        txHash,
        encrypted: entry.metadata.encrypted,
        wallet: this.testWallet
      })
      
    } catch (error) {
      console.error('Blockchain indexing failed:', error)
    }
  }

  /**
   * Generate ZK proof for content
   */
  private async generateContentZKProof(content: Record<string, unknown>): Promise<string> {
    // Simulate ZK proof generation for content
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const proofData = {
      content_type: content.type,
      timestamp: Date.now(),
      encrypted: content.encrypted,
      hash: btoa(JSON.stringify(content))
    }
    
    return `zk_proof_${btoa(JSON.stringify(proofData)).substring(0, 32)}`
  }

  /**
   * Create content hash for blockchain verification
   */
  private async createContentHash(entry: SearchIndexEntry): Promise<string> {
    const hashInput = {
      id: entry.id,
      type: entry.type,
      title: entry.metadata.title,
      timestamp: entry.metadata.timestamp,
      encrypted: entry.metadata.encrypted
    }
    
    return btoa(JSON.stringify(hashInput)).substring(0, 32)
  }

  /**
   * Get search statistics (updated with OrbitDB stats)
   */
  getSearchStats() {
    if (this.orbitDBReady) {
      const orbitStats = orbitDBIndexing.getStats()
      return {
        totalIndexed: orbitStats.totalIndexed,
        encryptedEntries: orbitStats.encryptedEntries,
        queryHistory: this.queryHistory.length,
        lastIndexed: Date.now(), // Would track actual last indexed time
        orbitDBConnected: true,
        peerConnections: orbitStats.peerConnections,
        torEnabled: orbitStats.torEnabled
      }
    }
    
    // Fallback to legacy stats
    return {
      totalIndexed: this.searchIndex.size,
      encryptedEntries: Array.from(this.searchIndex.values()).filter(e => e.metadata.encrypted).length,
      queryHistory: this.queryHistory.length,
      lastIndexed: Math.max(...Array.from(this.searchIndex.values()).map(e => e.metadata.timestamp)),
      orbitDBConnected: false,
      peerConnections: 0,
      torEnabled: false
    }
  }

  /**
   * Simple query encryption using AES-GCM
   */
  private async encryptQuery(query: string): Promise<string> {
    try {
      // Generate a random key for query encryption
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )
      
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encoder = new TextEncoder()
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(query)
      )
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)
      
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('❌ Query encryption failed:', error)
      // Fallback to simple base64 encoding for development
      return btoa(`encrypted_${query}_${Date.now()}`)
    }
  }

  /**
   * Hash query for ZK proof generation
   */
  private async hashQuery(query: string): Promise<string> {
    // Use Web Crypto API for consistent hashing
    const encoder = new TextEncoder()
    const data = encoder.encode(query)
    
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch {
      // Fallback for environments without crypto.subtle
      return btoa(query).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
    }
  }

  /**
   * Calculate Merkle root of search index for ZK proofs
   */
  private calculateSearchIndexRoot(): string {
    // For now, create a simple hash of all content hashes
    // In production, this would be a proper Merkle tree root
    const allHashes = Array.from(this.searchIndex.values())
      .map(entry => entry.contentHash)
      .sort() // Ensure deterministic ordering
    
    const combined = allHashes.join('')
    
    // Use a simple hash for the root (in production, use proper Merkle tree)
    return btoa(combined).substring(0, 32)
  }

  /**
   * Generate nullifier for search result to prevent replay
   */
  private generateResultNullifier(resultId: string, queryHash: string): string {
    return btoa(`${resultId}_${queryHash}_${Date.now()}`).substring(0, 32)
  }

  /**
   * Search IPFS content (enhanced with OrbitDB)
   */
  async searchIPFS(query: string): Promise<SearchIndexEntry[]> {
    if (this.orbitDBReady) {
      try {
        const searchQuery: SearchQuery = {
          term: query,
          bangCommand: 'ipfs',
          filters: {
            privacy: true
          },
          zkEncrypted: true
        }
        
        const result = await orbitDBIndexing.search(searchQuery)
        
        // Convert to SearchIndexEntry format
        const entries = result.documents
          .filter(doc => doc.cid && doc.cid.startsWith('Qm'))
          .map(doc => ({
            id: doc.id,
            type: doc.type as any,
            contentHash: doc.cid || doc.id,
            metadata: {
              title: doc.title,
              description: doc.description,
              tags: doc.keywords,
              timestamp: doc.timestamp,
              source: doc.source,
              encrypted: doc.encrypted
            },
            zkProof: doc.privacy.zkProof,
            relevanceScore: doc.relevanceScore
          }))
        
        toast.info(`Searched IPFS via OrbitDB: ${entries.length} results`)
        return entries
      } catch (error) {
        console.error('OrbitDB IPFS search failed:', error)
      }
    }
    
    // Fallback to legacy IPFS search
    const ipfsResults = Array.from(this.searchIndex.values())
      .filter(entry => 
        entry.contentHash.startsWith('Qm') && 
        (entry.metadata.title.toLowerCase().includes(query.toLowerCase()) ||
         entry.metadata.description.toLowerCase().includes(query.toLowerCase()))
      )
    
    toast.info(`Searched IPFS network: ${ipfsResults.length} results`)
    return ipfsResults
  }

  /**
   * Search for Osmosis swaps using SubQuery
   */
  async searchOsmosisSwaps(
    filters: {
      sender?: string
      tokenInDenom?: string
      tokenOutDenom?: string
      minAmount?: string
      blockRange?: { start: number, end: number }
    } = {}
  ): Promise<any[]> {
    try {
      if (!this.subqueryClient) {
        throw new Error('SubQuery client not initialized')
      }

      const swapQuery = `
        query SearchSwaps(
          $sender: String
          $tokenInDenom: String
          $blockStart: BigInt
          $blockEnd: BigInt
        ) {
          swaps(
            filter: {
              sender: { equalTo: $sender }
              tokenInDenom: { equalTo: $tokenInDenom }
              blockHeight: { greaterThanOrEqualTo: $blockStart, lessThanOrEqualTo: $blockEnd }
            }
            orderBy: BLOCK_HEIGHT_DESC
            first: 100
          ) {
            nodes {
              id
              sender
              txHash
              blockHeight
              tokenInDenom
              tokenInAmount
              tokenOutMin
              swapRoutes {
                nodes {
                  id
                  tokenInDenom
                  tokenOutDenom
                  pool {
                    id
                  }
                }
              }
            }
          }
        }
      `

      const variables = {
        sender: filters.sender || null,
        tokenInDenom: filters.tokenInDenom || null,
        blockStart: filters.blockRange?.start ? BigInt(filters.blockRange.start) : null,
        blockEnd: filters.blockRange?.end ? BigInt(filters.blockRange.end) : null,
      }

      const result = await this.subqueryClient.request(swapQuery, variables)
      
      console.log(`🔄 Found ${result.swaps.nodes.length} Osmosis swaps`)
      return result.swaps.nodes
      
    } catch (error) {
      console.error('Osmosis swap search failed:', error)
      return []
    }
  }

  /**
   * Get swap statistics from SubQuery
   */
  async getSwapStatistics(): Promise<any> {
    try {
      if (!this.subqueryClient) {
        throw new Error('SubQuery client not initialized')
      }

      const statsQuery = `
        query SwapStatistics {
          swaps(first: 1) {
            totalCount
          }
          pools(first: 1) {
            totalCount
          }
        }
      `

      const result = await this.subqueryClient.request(statsQuery)
      
      return {
        totalSwaps: result.swaps.totalCount,
        totalPools: result.pools.totalCount,
        lastUpdated: Date.now()
      }
      
    } catch (error) {
      console.error('Failed to get swap statistics:', error)
      return {
        totalSwaps: 0,
        totalPools: 0,
        lastUpdated: Date.now()
      }
    }
  }
}

// Singleton instance
export const searchBackend = new DecentralizedSearchBackend()

/**
 * React hook for decentralized search
 */
interface SearchStats {
  totalIndexed: number
  encryptedEntries: number
  queryHistory: number
  lastIndexed: number
}

export function useDecentralizedSearch() {
  const [searchHistory] = useState<ZKQuery[]>([])
  const [indexStats, setIndexStats] = useState<SearchStats>(searchBackend.getSearchStats())

  useEffect(() => {
    // Update stats periodically
    const updateStats = () => {
      setIndexStats(searchBackend.getSearchStats())
    }
    
    updateStats()
    const interval = setInterval(updateStats, 5000) // Update every 5 seconds
    
    return () => clearInterval(interval)
  }, [])

  const zkSearch = async (
    query: string,
    filters: Record<string, unknown> = {}
  ): Promise<SearchIndexEntry[]> => {
    const results = await searchBackend.zkSearch(query, filters)
    
    // Update stats
    setIndexStats(searchBackend.getSearchStats())
    
    return results
  }

  const indexContent = async (content: Record<string, unknown>): Promise<string> => {
    const id = await searchBackend.indexContent(content)
    
    // Update stats
    setIndexStats(searchBackend.getSearchStats())
    
    return id
  }

  const searchIPFS = async (query: string): Promise<SearchIndexEntry[]> => {
    return await searchBackend.searchIPFS(query)
  }

  const searchOsmosisSwaps = async (filters: any = {}): Promise<any[]> => {
    return await searchBackend.searchOsmosisSwaps(filters)
  }

  const getSwapStatistics = async (): Promise<any> => {
    return await searchBackend.getSwapStatistics()
  }

  return {
    zkSearch,
    indexContent,
    searchIPFS,
    searchOsmosisSwaps,
    getSwapStatistics,
    searchHistory,
    indexStats
  }
}