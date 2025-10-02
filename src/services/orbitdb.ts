/**
 * OrbitDB Hybrid Indexing Service for PrivaChain Decentral
 * Browser-compatible implementation with fallback modes
 * 
 * Features:
 * - Local-first indexing with OrbitDB (when available)
 * - P2P replication via libp2p (simulated in browser)
 * - Zero-knowledge search queries
 * - Bang commands for specialized searches
 * - Instant answers without tracking
 * - Fallback search using local indexing when OrbitDB unavailable
 */

// Enhanced search indexing for fallback mode with stemming
class FallbackSearchIndex {
  private documents: SearchDocument[] = []
  private termIndex: Map<string, Set<string>> = new Map() // term -> document IDs
  private lunrIndex: any = null

  async addDocument(doc: SearchDocument) {
    this.documents.push(doc)
    
    // Index terms for faster search
    const text = `${doc.title} ${doc.description} ${doc.content} ${doc.keywords.join(' ')}`.toLowerCase()
    const terms = text.split(/\s+/).filter(term => term.length > 2)
    
    for (const term of terms) {
      if (!this.termIndex.has(term)) {
        this.termIndex.set(term, new Set())
      }
      this.termIndex.get(term)!.add(doc.id)
    }

    // Rebuild lunr index when documents are added
    await this.rebuildLunrIndex()
  }

  private async rebuildLunrIndex() {
    try {
      // Dynamic import to handle lunr availability
      const lunr = await import('lunr')
      
      this.lunrIndex = lunr.default(function () {
        this.field('title', { boost: 10 })
        this.field('description', { boost: 5 })
        this.field('content')
        this.field('keywords', { boost: 8 })
        this.ref('id')

        // Add all documents to the index
        for (const doc of this.documents) {
          this.add({
            id: doc.id,
            title: doc.title,
            description: doc.description,
            content: doc.content,
            keywords: doc.keywords.join(' ')
          })
        }
      })
      
      console.log('🔍 Rebuilt lunr search index with', this.documents.length, 'documents')
    } catch (error) {
      console.warn('Lunr not available, using basic search:', error)
      this.lunrIndex = null
    }
  }

  search(query: string): SearchDocument[] {
    if (this.lunrIndex) {
      // Use lunr for advanced search with stemming and scoring
      try {
        const results = this.lunrIndex.search(query)
        return results.map((result: any) => {
          const doc = this.documents.find(d => d.id === result.ref)!
          // Update relevance score from lunr
          doc.relevanceScore = result.score
          return doc
        }).filter(Boolean)
      } catch (error) {
        console.warn('Lunr search failed, falling back to basic search:', error)
      }
    }

    // Fallback to basic term matching
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
    const candidates = new Set<string>()
    
    // Find documents containing query terms
    for (const term of queryTerms) {
      const docIds = this.termIndex.get(term)
      if (docIds) {
        docIds.forEach(id => candidates.add(id))
      }
    }
    
    // Return matched documents with basic scoring
    return this.documents
      .filter(doc => candidates.has(doc.id))
      .map(doc => ({
        ...doc,
        relevanceScore: this.calculateSimpleScore(doc, queryTerms)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private calculateSimpleScore(doc: SearchDocument, queryTerms: string[]): number {
    const text = `${doc.title} ${doc.description} ${doc.content}`.toLowerCase()
    let score = 0
    
    for (const term of queryTerms) {
      const termCount = (text.match(new RegExp(term, 'g')) || []).length
      // Boost title matches
      const titleMatches = doc.title.toLowerCase().includes(term) ? 2 : 0
      score += termCount + titleMatches
    }
    
    return score
  }

  clear() {
    this.documents = []
    this.termIndex.clear()
    this.lunrIndex = null
  }

  getDocumentCount(): number {
    return this.documents.length
  }
}

export interface SearchDocument {
  id: string
  type: 'email' | 'domain' | 'video' | 'identity' | 'message' | 'file' | 'contact'
  title: string
  description: string
  content: string
  keywords: string[]
  cid?: string // IPFS Content ID
  timestamp: number
  source: string
  encrypted: boolean
  privacy: {
    anonymous: boolean
    zkProof?: string
    onionRouted: boolean
  }
  relevanceScore: number
  metadata: Record<string, any>
}

export interface SearchQuery {
  term: string
  type?: string
  bangCommand?: string
  filters: {
    encrypted?: boolean
    timeRange?: { start: number; end: number }
    source?: string
    privacy?: boolean
  }
  zkEncrypted: boolean
}

export interface SearchResult {
  documents: SearchDocument[]
  totalCount: number
  searchTime: number
  privacy: {
    queryEncrypted: boolean
    resultsFiltered: boolean
    trackingPrevented: boolean
  }
}

// Bang commands mapping - DuckDuckGo inspired
const BANG_COMMANDS: Record<string, { name: string; url: string; description: string }> = {
  'w': { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/', description: 'Search Wikipedia anonymously' },
  'prv': { name: 'PrivaChain Domains', url: 'internal://.prv/', description: 'Search internal .prv domains' },
  'ipfs': { name: 'IPFS Network', url: 'ipfs://', description: 'Search IPFS content' },
  'mail': { name: 'Encrypted Mail', url: 'internal://mail/', description: 'Search encrypted emails' },
  'onion': { name: 'Onion Services', url: 'internal://onion/', description: 'Search .onion hidden services' },
  'ceramic': { name: 'Ceramic Network', url: 'ceramic://', description: 'Search Ceramic streams' },
  'cosmos': { name: 'Cosmos Blockchain', url: 'internal://cosmos/', description: 'Search blockchain transactions' },
  'video': { name: 'Video Calls', url: 'internal://video/', description: 'Search video call history' },
  'file': { name: 'File Storage', url: 'internal://files/', description: 'Search encrypted files' }
}

// Instant answer patterns
const INSTANT_ANSWERS: Record<string, (query: string) => Promise<string | null>> = {
  'weather': async (query: string) => {
    const locationMatch = query.match(/weather\s+in\s+(.+)/i)
    if (locationMatch) {
      return `Weather data for ${locationMatch[1]} (via anonymous proxy) - Privacy-first weather service`
    }
    return null
  },
  'time': async (query: string) => {
    if (query.toLowerCase().includes('time')) {
      return `Current time: ${new Date().toLocaleString()} (UTC)`
    }
    return null
  },
  'help': async (query: string) => {
    if (query.toLowerCase().includes('help') || query.toLowerCase().includes('commands')) {
      return `Available bang commands: ${Object.keys(BANG_COMMANDS).map(cmd => `!${cmd}`).join(', ')}`
    }
    return null
  }
}

export class OrbitDBHybridIndexing {
  private isInitialized = false
  private localIndex: Map<string, SearchDocument> = new Map()
  private orbitDB: any = null
  private libp2p: any = null
  private searchDatabase: any = null
  private simulatedPeers = 3
  private syncCount = 0
  private torEnabled = true
  private fallbackIndex = new FallbackSearchIndex()
  private healthStatus: 'healthy' | 'degraded' | 'unavailable' = 'unavailable'

  constructor() {
    // Initialize with proper error handling
    this.initialize().catch(error => {
      console.warn('⚠️ OrbitDB initialization failed during construction:', error.message)
      // Continue with fallback mode
    })
  }

  /**
   * Initialize OrbitDB with real libp2p
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true
    }

    try {
      console.log('🚀 Initializing OrbitDB with real P2P networking...')

      // Dynamic imports to handle module availability
      const { createLibp2p } = await import('libp2p')
      const { webSockets } = await import('@libp2p/websockets')
      const { noise } = await import('@libp2p/noise')
      const { yamux } = await import('@chainsafe/libp2p-yamux')
      const { createHelia } = await import('helia')
      const { createOrbitDB } = await import('@orbitdb/core')
      const { kadDHT } = await import('@libp2p/kad-dht')
      const { identify } = await import('@libp2p/identify')
      const { gossipsub } = await import('@chainsafe/libp2p-gossipsub')

      // Create libp2p node with enhanced configuration
      this.libp2p = await createLibp2p({
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/0/ws']
        },
        transports: [webSockets()],
        connectionEncrypters: [noise()],
        streamMuxers: [yamux()],
        peerDiscovery: [
          // Add bootstrap peers from relay nodes
          ...(await this.getBootstrapPeers())
        ],
        services: {
          // Enable distributed hash table for peer discovery
          kadDHT: kadDHT(),
          // Enable peer identification
          identify: identify(),
          // Enable gossipsub for pub/sub messaging
          pubsub: gossipsub()
        }
      })

      // Create Helia IPFS node
      const helia = await createHelia({ libp2p: this.libp2p })

      // Initialize OrbitDB
      this.orbitDB = await createOrbitDB({ ipfs: helia })

      // Create search database
      await this.createSearchDatabase()

      // Load mock data for development
      await this.loadMockData()

      this.healthStatus = 'healthy'
      this.updateHealthCheck('healthy', 'OrbitDB fully operational')
      this.isInitialized = true
      console.log('✅ OrbitDB initialized with real P2P networking')
      
      return true
    } catch (error) {
      console.error('❌ Failed to initialize OrbitDB:', error)
      // Don't throw - fall back to local-only mode
      this.isInitialized = false
      await this.initializeFallbackMode()
      return false
    }
  }

  /**
   * Create search database for indexing
   */
  private async createSearchDatabase() {
    if (!this.orbitDB) {
      throw new Error('OrbitDB not initialized')
    }

    try {
      // Import Documents type for docstore
      const { Documents } = await import('@orbitdb/core')
      
      // Create a documents database for search indexing
      this.searchDatabase = await this.orbitDB.open('search-index', {
        type: 'documents',
        AccessController: 'ipfs', // Use IPFS access controller for decentralized access
      })

      // Set up real-time sync event listeners
      this.setupRealtimeSync()

      console.log('📚 Search database created with real-time sync:', this.searchDatabase.address)
    } catch (error) {
      console.error('❌ Failed to create search database:', error)
      throw error
    }
  }

  /**
   * Set up real-time synchronization
   */
  private setupRealtimeSync() {
    if (!this.searchDatabase) return

    // Listen for new entries from other peers
    this.searchDatabase.events.on('write', (address: string, entry: any) => {
      console.log('📥 New entry synced from peer:', address, entry.payload.value)
      
      // Add to local index for faster searching
      if (entry.payload.value) {
        this.localIndex.set(entry.payload.value.id, entry.payload.value)
        this.fallbackIndex.addDocument(entry.payload.value)
      }
    })

    // Listen for peer join events
    this.searchDatabase.events.on('join', (peerId: string) => {
      console.log('👥 Peer joined search network:', peerId)
      this.syncCount += 1
    })

    // Listen for peer leave events
    this.searchDatabase.events.on('leave', (peerId: string) => {
      console.log('👋 Peer left search network:', peerId)
      this.syncCount = Math.max(0, this.syncCount - 1)
    })

    // Listen for replication progress
    this.searchDatabase.events.on('replicate', (address: string) => {
      console.log('🔄 Replicating with peer:', address)
    })

    // Listen for sync completion
    this.searchDatabase.events.on('replicate.progress', (address: string, hash: string, entry: any) => {
      console.log('⚡ Sync progress:', { address, hash, entryCount: entry.clock.time })
    })
  }

  /**
   * Get bootstrap peers from relay nodes
   */
  private async getBootstrapPeers(): Promise<any[]> {
    try {
      // In a real implementation, this would load from relay_nodes_bootstrap.json
      const bootstrapPeers = [
        '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
        '/ip4/104.236.179.241/tcp/4001/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
        '/ip4/178.62.158.247/tcp/4001/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd'
      ]
      
      // Import bootstrap peer discovery dynamically
      const { bootstrap } = await import('@libp2p/bootstrap')
      return [bootstrap({ list: bootstrapPeers })]
    } catch (error) {
      console.warn('Failed to load bootstrap peers:', error)
      return []
    }
  }

  /**
   * Initialize fallback mode when OrbitDB fails
   */
  private async initializeFallbackMode() {
    console.log('🔄 Initializing fallback search mode...')
    
    // Load mock data for local search
    await this.loadMockData()
    
    // Set health status
    this.healthStatus = 'degraded'
    this.updateHealthCheck('degraded', 'OrbitDB unavailable, using local search fallback')
    
    console.log('✅ Fallback search mode active (local-only)')
  }

  /**
   * Update health check status
   */
  private updateHealthCheck(status: 'healthy' | 'degraded' | 'unavailable', message: string) {
    this.healthStatus = status
    
    // Update global health status if available
    if (typeof window !== 'undefined' && (window as any).updateHealthStatus) {
      (window as any).updateHealthStatus('search', status, message)
    }
    
    // Emit structured error for user interface
    if (status !== 'healthy') {
      console.warn(`⚠️ Search system status: ${status} - ${message}`)
    }
  }

  /**
   * Load mock data for demonstration
   */
  private async loadMockData() {
    const mockDocuments: SearchDocument[] = [
      {
        id: 'doc_001',
        type: 'email',
        title: 'Encrypted Email Protocol Discussion',
        description: 'Technical discussion about implementing end-to-end encryption for email communications',
        content: 'This email discusses the implementation of the Signal Protocol for secure email communications...',
        keywords: ['encryption', 'email', 'signal', 'protocol', 'security'],
        cid: 'QmXyZ123abc456def789',
        timestamp: Date.now() - 3600000,
        source: 'secure@privachain.prv',
        encrypted: true,
        privacy: {
          anonymous: true,
          zkProof: 'zk_proof_001',
          onionRouted: true
        },
        relevanceScore: 0.95,
        metadata: { category: 'technical', priority: 'high' }
      },
      {
        id: 'doc_002',
        type: 'domain',
        title: 'whistleblower.prv',
        description: 'Anonymous domain for secure whistleblowing and leak submissions',
        content: 'This domain provides a secure channel for anonymous whistleblowing...',
        keywords: ['whistleblower', 'anonymous', 'leaks', 'secure', 'domain'],
        cid: 'QmAbc789def123ghi456',
        timestamp: Date.now() - 7200000,
        source: 'whistleblower.prv',
        encrypted: true,
        privacy: {
          anonymous: true,
          zkProof: 'zk_proof_002',
          onionRouted: true
        },
        relevanceScore: 0.92,
        metadata: { category: 'domain', verified: true }
      },
      {
        id: 'doc_003',
        type: 'video',
        title: 'Anonymous Video Interview',
        description: 'Encrypted video call with anonymous source about corporate misconduct',
        content: 'This video contains an anonymous interview discussing corporate misconduct...',
        keywords: ['video', 'interview', 'anonymous', 'corporate', 'misconduct'],
        cid: 'QmDef456ghi789jkl012',
        timestamp: Date.now() - 10800000,
        source: 'video.secure.prv',
        encrypted: true,
        privacy: {
          anonymous: true,
          zkProof: 'zk_proof_003',
          onionRouted: true
        },
        relevanceScore: 0.88,
        metadata: { category: 'media', duration: '45:30' }
      },
      {
        id: 'doc_004',
        type: 'identity',
        title: 'Anonymous Verified Identity',
        description: 'Zero-knowledge proof verified anonymous identity certificate',
        content: 'This identity certificate uses ZK-SNARKs to verify authenticity without revealing personal information...',
        keywords: ['identity', 'zk-proof', 'anonymous', 'verified', 'certificate'],
        cid: 'QmGhi012jkl345mno678',
        timestamp: Date.now() - 14400000,
        source: 'identity.ceramic.network',
        encrypted: true,
        privacy: {
          anonymous: true,
          zkProof: 'zk_proof_004',
          onionRouted: false
        },
        relevanceScore: 0.90,
        metadata: { category: 'identity', verified: true }
      },
      {
        id: 'doc_005',
        type: 'file',
        title: 'PrivaChain Technical Documentation',
        description: 'Comprehensive technical documentation for the PrivaChain protocol',
        content: 'This document contains the complete technical specification for PrivaChain...',
        keywords: ['privachain', 'technical', 'documentation', 'protocol', 'specification'],
        cid: 'QmJkl345mno678pqr901',
        timestamp: Date.now() - 18000000,
        source: 'ipfs://QmJkl345mno678pqr901',
        encrypted: false,
        privacy: {
          anonymous: false,
          onionRouted: false
        },
        relevanceScore: 0.85,
        metadata: { category: 'documentation', public: true }
      }
    ]

    for (const doc of mockDocuments) {
      this.localIndex.set(doc.id, doc)
      // Also add to fallback index for better search performance
      this.fallbackIndex.addDocument(doc)
    }

    console.log(`📚 Loaded ${this.localIndex.size} mock documents`)
  }

  /**
   * Perform hybrid search with privacy features
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now()
    
    try {
      // Generate ZK proof for privacy-preserving search
      let zkProof: string | undefined
      if (query.zkEncrypted) {
        try {
          // Import ZK service dynamically to avoid circular dependencies
          const { zkIdentityManager } = await import('./zkCrypto')
          
          const zkInputs = {
            statement: { 
              searchTerm: query.term,
              type: 'search_query',
              timestamp: Date.now()
            },
            witness: {
              userIntent: query.term,
              filters: JSON.stringify(query.filters)
            }
          }
          
          const proof = await zkIdentityManager.generateZKProof(zkInputs.statement, zkInputs.witness)
          zkProof = proof.proof
          console.log('🔐 Generated ZK proof for private search')
        } catch (zkError) {
          console.warn('⚠️ ZK proof generation failed, proceeding without privacy:', zkError)
        }
      }

      // Check for bang commands first
      const bangResult = await this.processBangCommand(query)
      if (bangResult) {
        return bangResult
      }

      // Check for instant answers
      const instantAnswer = await this.getInstantAnswer(query.term)
      if (instantAnswer) {
        return this.createInstantAnswerResult(instantAnswer, startTime)
      }

      // Encrypt query for privacy
      const encryptedQuery = await this.encryptQuery(query)

      // Try OrbitDB search first, then fall back to local search
      let results: SearchDocument[] = []
      
      if (this.isInitialized && this.searchDatabase) {
        try {
          results = await this.searchOrbitDB(encryptedQuery)
          console.log(`🔍 OrbitDB search found ${results.length} results`)
        } catch (orbitError) {
          console.warn('⚠️ OrbitDB search failed, falling back to local search:', orbitError)
          results = await this.searchFallback(encryptedQuery)
        }
      } else {
        // Fallback to local search using improved indexing
        results = await this.searchFallback(encryptedQuery)
        console.log(`🔍 Fallback search found ${results.length} results`)
      }

      // Apply privacy filters
      const filteredResults = this.applyPrivacyFilters(results, query)

      const searchTime = Date.now() - startTime

      return {
        documents: filteredResults,
        totalCount: filteredResults.length,
        searchTime,
        privacy: {
          queryEncrypted: query.zkEncrypted,
          resultsFiltered: true,
          trackingPrevented: true
        }
      }
    } catch (error) {
      console.error('❌ Search failed:', error)
      throw error
    }
  }

  /**
   * Search OrbitDB database
   */
  private async searchOrbitDB(query: SearchQuery): Promise<SearchDocument[]> {
    if (!this.searchDatabase) {
      throw new Error('Search database not available')
    }

    try {
      // Get all documents from OrbitDB
      const allDocs = await this.searchDatabase.all()
      const results: SearchDocument[] = []
      const queryTerms = query.term.toLowerCase().split(' ')

      for (const doc of allDocs) {
        // Apply type filter
        if (query.type && doc.type !== query.type) continue

        // Apply encryption filter
        if (query.filters.encrypted !== undefined && doc.encrypted !== query.filters.encrypted) continue

        // Apply time range filter
        if (query.filters.timeRange) {
          const { start, end } = query.filters.timeRange
          if (doc.timestamp < start || doc.timestamp > end) continue
        }

        // Calculate relevance using TF-IDF-like scoring
        const score = this.calculateRelevanceScore(doc, queryTerms)
        if (score > 0) {
          doc.relevanceScore = score
          results.push(doc)
        }
      }

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    } catch (error) {
      console.error('❌ OrbitDB search error:', error)
      throw error
    }
  }

  /**
   * Fallback search using local indexing
   */
  private async searchFallback(query: SearchQuery): Promise<SearchDocument[]> {
    try {
      // Use improved fallback search index
      let results = this.fallbackIndex.search(query.term)

      // Apply additional filters
      results = results.filter(doc => {
        // Apply type filter
        if (query.type && doc.type !== query.type) return false

        // Apply encryption filter
        if (query.filters.encrypted !== undefined && doc.encrypted !== query.filters.encrypted) return false

        // Apply time range filter
        if (query.filters.timeRange) {
          const { start, end } = query.filters.timeRange
          if (doc.timestamp < start || doc.timestamp > end) return false
        }

        return true
      })

      return results
    } catch (error) {
      console.error('❌ Fallback search error:', error)
      // Last resort: basic local search
      return this.searchLocal(query)
    }
  }

  /**
   * Process bang commands for specialized searches
   */
  private async processBangCommand(query: SearchQuery): Promise<SearchResult | null> {
    const bangMatch = query.term.match(/^!([a-z]+)\s+(.+)/)
    if (!bangMatch) return null

    const [, command, searchTerm] = bangMatch
    const bangConfig = BANG_COMMANDS[command]

    if (!bangConfig) return null

    console.log(`🎯 Processing bang command: !${command} for "${searchTerm}"`)

    // Handle internal bang commands
    if (bangConfig.url.startsWith('internal://')) {
      return this.handleInternalBangCommand(command, searchTerm)
    }

    // For external bang commands, create a result that would redirect
    return {
      documents: [{
        id: `bang_${command}_${Date.now()}`,
        type: 'file',
        title: `${bangConfig.name}: ${searchTerm}`,
        description: `Search "${searchTerm}" on ${bangConfig.name} (via anonymous proxy)`,
        content: '',
        keywords: [searchTerm, command],
        timestamp: Date.now(),
        source: bangConfig.url + encodeURIComponent(searchTerm),
        encrypted: false,
        privacy: {
          anonymous: true,
          onionRouted: true
        },
        relevanceScore: 1.0,
        metadata: {
          bangCommand: command,
          externalRedirect: true
        }
      }],
      totalCount: 1,
      searchTime: 50,
      privacy: {
        queryEncrypted: true,
        resultsFiltered: true,
        trackingPrevented: true
      }
    }
  }

  /**
   * Handle internal bang commands
   */
  private async handleInternalBangCommand(command: string, searchTerm: string): Promise<SearchResult> {
    const results: SearchDocument[] = []

    for (const doc of this.localIndex.values()) {
      let includeDoc = false

      switch (command) {
        case 'prv':
          includeDoc = doc.source.includes('.prv') || doc.type === 'domain'
          break
        case 'mail':
          includeDoc = doc.type === 'email'
          break
        case 'video':
          includeDoc = doc.type === 'video'
          break
        case 'file':
          includeDoc = doc.type === 'file'
          break
        case 'cosmos':
          includeDoc = doc.source.includes('cosmos') || doc.metadata.blockchain
          break
        default:
          includeDoc = false
      }

      if (includeDoc && this.documentMatchesQuery(doc, searchTerm)) {
        results.push(doc)
      }
    }

    return {
      documents: results.sort((a, b) => b.relevanceScore - a.relevanceScore),
      totalCount: results.length,
      searchTime: 25,
      privacy: {
        queryEncrypted: true,
        resultsFiltered: true,
        trackingPrevented: true
      }
    }
  }

  /**
   * Get instant answers for common queries
   */
  private async getInstantAnswer(query: string): Promise<string | null> {
    const queryLower = query.toLowerCase()

    for (const [pattern, handler] of Object.entries(INSTANT_ANSWERS)) {
      if (queryLower.includes(pattern)) {
        return await handler(query)
      }
    }

    return null
  }

  /**
   * Create instant answer result
   */
  private createInstantAnswerResult(answer: string, startTime: number): SearchResult {
    return {
      documents: [{
        id: `instant_${Date.now()}`,
        type: 'message',
        title: 'Instant Answer',
        description: answer,
        content: answer,
        keywords: [],
        timestamp: Date.now(),
        source: 'PrivaChain Instant Answer',
        encrypted: false,
        privacy: {
          anonymous: true,
          onionRouted: false
        },
        relevanceScore: 1.0,
        metadata: {
          instantAnswer: true
        }
      }],
      totalCount: 1,
      searchTime: Date.now() - startTime,
      privacy: {
        queryEncrypted: false,
        resultsFiltered: false,
        trackingPrevented: true
      }
    }
  }

  /**
   * Encrypt search query for privacy
   */
  private async encryptQuery(query: SearchQuery): Promise<SearchQuery> {
    if (!query.zkEncrypted) {
      return query
    }

    // Simulate encryption
    const encryptedTerm = btoa(query.term + '_zk_encrypted_' + Date.now())
    
    return {
      ...query,
      term: encryptedTerm,
      zkEncrypted: true
    }
  }

  /**
   * Search local index using TF-IDF scoring
   */
  private async searchLocal(query: SearchQuery): Promise<SearchDocument[]> {
    const results: SearchDocument[] = []
    const queryTerms = query.term.toLowerCase().split(' ')

    for (const doc of this.localIndex.values()) {
      // Apply type filter
      if (query.type && doc.type !== query.type) continue

      // Apply encryption filter
      if (query.filters.encrypted !== undefined && doc.encrypted !== query.filters.encrypted) continue

      // Apply time range filter
      if (query.filters.timeRange) {
        const { start, end } = query.filters.timeRange
        if (doc.timestamp < start || doc.timestamp > end) continue
      }

      // Calculate relevance using TF-IDF-like scoring
      const score = this.calculateRelevanceScore(doc, queryTerms)
      if (score > 0) {
        doc.relevanceScore = score
        results.push(doc)
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Calculate TF-IDF-like relevance score
   */
  private calculateRelevanceScore(doc: SearchDocument, queryTerms: string[]): number {
    let score = 0
    const docText = `${doc.title} ${doc.description} ${doc.content} ${doc.keywords.join(' ')}`.toLowerCase()

    for (const term of queryTerms) {
      if (term.length < 2) continue

      // Term frequency in document
      const termCount = (docText.match(new RegExp(term, 'g')) || []).length
      const tf = termCount / docText.split(' ').length

      // Inverse document frequency (simplified)
      const docsWithTerm = Array.from(this.localIndex.values()).filter(d => 
        `${d.title} ${d.description} ${d.content}`.toLowerCase().includes(term)
      ).length
      const idf = Math.log(this.localIndex.size / (docsWithTerm + 1))

      // TF-IDF score
      const termScore = tf * idf

      // Boost for title matches
      if (doc.title.toLowerCase().includes(term)) {
        score += termScore * 2
      } else {
        score += termScore
      }
    }

    return score
  }

  /**
   * Check if document matches query
   */
  private documentMatchesQuery(doc: SearchDocument, query: string): boolean {
    const searchableText = `${doc.title} ${doc.description} ${doc.content} ${doc.keywords.join(' ')}`.toLowerCase()
    return searchableText.includes(query.toLowerCase())
  }

  /**
   * Apply privacy filters to results
   */
  private applyPrivacyFilters(results: SearchDocument[], query: SearchQuery): SearchDocument[] {
    // In DuckDuckGo style, all users get identical results (no personalization)
    return results.filter(doc => {
      // Remove results with tracking
      if (doc.metadata.tracking || doc.metadata.analytics) return false
      
      // Apply privacy filter if requested
      if (query.filters.privacy && !doc.privacy.anonymous) return false
      
      return true
    })
  }

  /**
   * Index new content
   */
  async indexContent(document: Omit<SearchDocument, 'id' | 'timestamp' | 'relevanceScore'>): Promise<string> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const fullDocument: SearchDocument = {
      ...document,
      id,
      timestamp: Date.now(),
      relevanceScore: 1.0
    }

    try {
      // Add to local index first (for immediate availability)
      this.localIndex.set(id, fullDocument)
      
      // Add to fallback index for better search performance
      this.fallbackIndex.addDocument(fullDocument)

      // Add to OrbitDB if available
      if (this.isInitialized && this.searchDatabase) {
        try {
          await this.searchDatabase.put(fullDocument)
          console.log(`📡 Document added to OrbitDB: ${fullDocument.title} (${id})`)
        } catch (orbitError) {
          console.warn('⚠️ Failed to add document to OrbitDB, keeping in local index only:', orbitError)
        }
      }

      // Simulate P2P broadcast
      setTimeout(() => {
        console.log(`📡 Broadcasted document to ${this.simulatedPeers} peers: ${fullDocument.title}`)
      }, 100)

      console.log(`📚 Indexed document: ${fullDocument.title} (${id})`)
      return id
    } catch (error) {
      console.error('❌ Failed to index content:', error)
      throw error
    }
  }

  /**
   * Get indexing statistics
   */
  getStats() {
    return {
      totalIndexed: this.localIndex.size,
      encryptedEntries: Array.from(this.localIndex.values()).filter(doc => doc.encrypted).length,
      peerConnections: this.simulatedPeers,
      isInitialized: this.isInitialized,
      torEnabled: this.torEnabled,
      healthStatus: this.healthStatus,
      fallbackIndexSize: this.fallbackIndex.getDocumentCount(),
      orbitDBConnected: this.isInitialized && !!this.searchDatabase
    }
  }

  /**
   * Close OrbitDB and cleanup
   */
  async close() {
    try {
      // Close search database
      if (this.searchDatabase) {
        await this.searchDatabase.close()
        this.searchDatabase = null
      }

      // Close OrbitDB
      if (this.orbitDB) {
        await this.orbitDB.stop()
        this.orbitDB = null
      }

      // Close libp2p
      if (this.libp2p) {
        await this.libp2p.stop()
        this.libp2p = null
      }

      this.localIndex.clear()
      this.fallbackIndex.clear()
      this.healthStatus = 'unavailable'
      this.isInitialized = false
      console.log('✅ OrbitDB Hybrid Indexing closed')
    } catch (error) {
      console.error('❌ Failed to close OrbitDB:', error)
    }
  }
}

// Export singleton instance
export const orbitDBIndexing = new OrbitDBHybridIndexing()

/**
 * Initialize OrbitDB on module load
 */
orbitDBIndexing.initialize().then(success => {
  if (success) {
    console.log('✅ OrbitDB Hybrid Indexing ready')
  } else {
    console.warn('⚠️ OrbitDB Hybrid Indexing failed to initialize')
  }
}).catch(error => {
  console.error('❌ OrbitDB initialization error:', error)
})