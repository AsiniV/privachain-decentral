// Distributed Content Resolution Service for PrivaChain
import { ipfsStorage } from '../storage/ipfs_client'
import { DPIBypassService } from './dpi-bypass'

// Interface for CosmosBlockchain - simplified for content resolution needs
interface CosmosBlockchain {
  queryDomain(domain: string): Promise<DomainRecord | null>
  isConnected: boolean
}

// Domain record structure for blockchain queries
interface DomainRecord {
  domain: string
  contentHash: string
  encryptionKey?: string
  contentType: string
  owner: string
  active: boolean
  expires: number
}

// Resolved content structure
interface ResolvedContent {
  content: ArrayBuffer
  contentType: string
  timestamp: number
  source: 'ipfs' | 'blockchain' | 'traditional'
}

/**
 * Content resolver for decentralized and traditional content
 * Handles IPFS content, blockchain domains, and DPI-bypassed HTTP content
 */
export class ContentResolver {
  private ipfsGateway: string
  private blockchain: CosmosBlockchain | null = null
  private cache: Map<string, ResolvedContent>
  private dpiBypass: DPIBypassService
  private initialized = false

  constructor(ipfsGateway: string = 'https://ipfs.io') {
    this.ipfsGateway = ipfsGateway
    this.cache = new Map()
    this.dpiBypass = new DPIBypassService()
  }

  /**
   * Initialize the content resolver with blockchain connection
   */
  async initialize(blockchain?: CosmosBlockchain): Promise<void> {
    if (this.initialized) return

    try {
      // Initialize IPFS storage
      await ipfsStorage.initialize()
      
      // Set blockchain connection if provided
      if (blockchain) {
        this.blockchain = blockchain
      }

      this.initialized = true
      console.log('🔗 Content Resolver initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Content Resolver:', error)
      throw error
    }
  }

  /**
   * Resolve content from various sources (IPFS, blockchain domains, HTTP)
   */
  async resolveContent(url: string): Promise<ResolvedContent> {
    if (!this.initialized) {
      throw new Error('Content resolver not initialized. Call initialize() first.')
    }

    // Check cache first
    if (this.cache.has(url)) {
      const cached = this.cache.get(url)!
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes
        console.log(`📋 Cache hit for ${url}`)
        return cached
      }
    }

    // Parse the URL
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`)
    }

    // Route to appropriate resolution method
    let resolved: ResolvedContent

    if (parsed.protocol === 'ipfs:') {
      resolved = await this.resolveIpfsContent(parsed.hostname || parsed.pathname.slice(1))
    } else if (parsed.hostname.endsWith('.priva')) {
      resolved = await this.resolveDecentralizedDomain(parsed.hostname, parsed.pathname)
    } else {
      resolved = await this.resolveTraditionalContent(url)
    }

    // Cache the result
    this.cache.set(url, resolved)
    console.log(`✅ Resolved content from ${resolved.source}: ${url}`)
    
    return resolved
  }

  /**
   * Resolve IPFS content using ipfs:// protocol
   */
  private async resolveIpfsContent(cid: string): Promise<ResolvedContent> {
    try {
      // First try local IPFS node
      let content: ArrayBuffer
      try {
        const data = await ipfsStorage.retrieveData(cid)
        content = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      } catch (localError) {
        console.warn('Local IPFS failed, trying gateway:', localError)
        // Fallback to IPFS gateway
        const response = await fetch(`${this.ipfsGateway}/ipfs/${cid}`)
        if (!response.ok) {
          throw new Error(`Gateway fetch failed: ${response.status}`)
        }
        content = await response.arrayBuffer()
      }

      return {
        content,
        contentType: this.detectContentType(new Uint8Array(content)),
        timestamp: Date.now(),
        source: 'ipfs'
      }
    } catch (error) {
      throw new Error(`Failed to resolve IPFS content: ${error}`)
    }
  }

  /**
   * Resolve content from decentralized domains (.priva)
   */
  private async resolveDecentralizedDomain(domain: string, path: string): Promise<ResolvedContent> {
    if (!this.blockchain) {
      throw new Error('Blockchain connection required for decentralized domains')
    }

    try {
      // Query blockchain for domain mapping
      const domainRecord = await this.blockchain.queryDomain(domain)
      
      if (!domainRecord) {
        throw new Error(`Domain ${domain} not found on blockchain`)
      }

      if (!domainRecord.active) {
        throw new Error(`Domain ${domain} is inactive`)
      }

      if (domainRecord.expires < Date.now()) {
        throw new Error(`Domain ${domain} has expired`)
      }

      // Get content from IPFS
      const contentHash = domainRecord.contentHash
      let content: ArrayBuffer

      if (domainRecord.encryptionKey) {
        // Decrypt encrypted content
        const encryptionKey = this.parseEncryptionKey(domainRecord.encryptionKey)
        const encryptedData = await ipfsStorage.retrieveData(contentHash)
        const decryptedData = await ipfsStorage.retrieveDecrypted(contentHash, encryptionKey)
        content = decryptedData.buffer.slice(decryptedData.byteOffset, decryptedData.byteOffset + decryptedData.byteLength)
      } else {
        // Plain content
        const data = await ipfsStorage.retrieveData(contentHash)
        content = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      }

      return {
        content,
        contentType: domainRecord.contentType || this.detectContentType(new Uint8Array(content)),
        timestamp: Date.now(),
        source: 'blockchain'
      }
    } catch (error) {
      throw new Error(`Failed to resolve decentralized domain: ${error}`)
    }
  }

  /**
   * Resolve traditional HTTP content with DPI bypass
   */
  private async resolveTraditionalContent(url: string): Promise<ResolvedContent> {
    try {
      console.log(`🌐 Fetching traditional content: ${url}`)
      
      // Use DPI bypass for enhanced privacy
      const response = await this.dpiBypass.fetchWithBypass(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const content = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || this.detectContentType(new Uint8Array(content))

      return {
        content,
        contentType,
        timestamp: Date.now(),
        source: 'traditional'
      }
    } catch (error) {
      throw new Error(`Failed to resolve traditional content: ${error}`)
    }
  }

  /**
   * Parse encryption key from string format
   */
  private parseEncryptionKey(keyString: string): Uint8Array {
    try {
      // Try hex decoding first
      if (keyString.length === 64) {
        const key = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
          key[i] = parseInt(keyString.substr(i * 2, 2), 16)
        }
        return key
      }
      
      // Try base64 decoding
      const decoded = atob(keyString)
      const key = new Uint8Array(decoded.length)
      for (let i = 0; i < decoded.length; i++) {
        key[i] = decoded.charCodeAt(i)
      }
      
      if (key.length !== 32) {
        throw new Error('Key must be 32 bytes')
      }
      
      return key
    } catch (error) {
      throw new Error(`Invalid encryption key format: ${error}`)
    }
  }

  /**
   * Detect content type from binary data
   */
  private detectContentType(data: Uint8Array): string {
    // Check for common file signatures
    if (data.length >= 4) {
      // PNG signature
      if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
        return 'image/png'
      }
      
      // JPEG signature
      if (data[0] === 0xFF && data[1] === 0xD8) {
        return 'image/jpeg'
      }
      
      // PDF signature
      if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
        return 'application/pdf'
      }
      
      // HTML check (look for < character)
      if (data[0] === 0x3C) {
        return 'text/html'
      }
    }

    // Check for text content
    let isText = true
    for (let i = 0; i < Math.min(data.length, 1024); i++) {
      const byte = data[i]
      if (byte < 0x09 || (byte > 0x0D && byte < 0x20) || byte > 0x7E) {
        isText = false
        break
      }
    }

    return isText ? 'text/plain' : 'application/octet-stream'
  }

  /**
   * Clear the content cache
   */
  clearCache(): void {
    this.cache.clear()
    console.log('🗑️ Content cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number, entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }

  /**
   * Set blockchain connection
   */
  setBlockchain(blockchain: CosmosBlockchain): void {
    this.blockchain = blockchain
    console.log('🔗 Blockchain connection set for content resolution')
  }

  /**
   * Stop the resolver and cleanup resources
   */
  async stop(): Promise<void> {
    this.clearCache()
    await ipfsStorage.stop()
    this.initialized = false
    console.log('🛑 Content Resolver stopped')
  }
}

// Export interfaces for use by other modules
export type { ResolvedContent, DomainRecord, CosmosBlockchain }

// Create and export a default instance
export const contentResolver = new ContentResolver()