/**
 * Production IPFS Integration with Filecoin incentives
 * Real decentralized storage for PrivaChain
 */

import { create, IPFSHTTPClient } from 'ipfs-http-client'

export interface FilecoinDeal {
  dealId: string
  miner: string
  price: string
  duration: number
  verified: boolean
}

export interface StorageMetrics {
  totalStored: number
  totalPinned: number
  activeDemos: number
  networkedPeers: number
  filecoinDeals: FilecoinDeal[]
}

export interface PinningResult {
  cid: string
  status: 'pinned' | 'pinning' | 'failed'
  nodes: string[]
  redundancy: number
}

export class ProductionIPFS {
  private client: IPFSHTTPClient | null = null
  private initialized = false
  private pinningNodes: string[] = [
    'https://privachain-ipfs-1.herokuapp.com',
    'https://privachain-ipfs-2.herokuapp.com', 
    'https://privachain-ipfs-3.herokuapp.com'
  ]
  
  async initialize(): Promise<boolean> {
    try {
      // Initialize IPFS client with production endpoints
      const projectId = process.env.INFURA_PROJECT_ID || process.env.VITE_INFURA_PROJECT_ID
      const projectSecret = process.env.INFURA_SECRET || process.env.VITE_INFURA_SECRET
      
      if (!projectId || !projectSecret) {
        throw new Error('INFURA_PROJECT_ID and INFURA_SECRET environment variables are required')
      }

      this.client = create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: `Basic ${btoa(projectId + ':' + projectSecret)}`
        }
      })

      // Test connection
      const version = await this.client.version()
      console.log('🌐 Connected to IPFS network:', version.version)
      
      this.initialized = true
      return true
    } catch (error) {
      console.error('❌ Failed to initialize IPFS:', error)
      throw error
    }
  }

  /**
   * Upload and pin content with redundancy across multiple nodes
   */
  async uploadWithRedundancy(
    content: Uint8Array | File,
    options: {
      filename?: string
      encrypt?: boolean
      pin?: boolean
      redundancy?: number
    } = {}
  ): Promise<PinningResult> {
    if (!this.client || !this.initialized) {
      throw new Error('IPFS not initialized')
    }

    try {
      const { encrypt = true, pin = true, redundancy = 3 } = options

      let finalContent: Uint8Array
      if (content instanceof File) {
        finalContent = new Uint8Array(await content.arrayBuffer())
      } else {
        finalContent = content
      }

      // Encrypt if requested
      if (encrypt) {
        finalContent = await this.encryptContent(finalContent)
      }

      // Add to IPFS
      const addResult = await this.client.add(finalContent, {
        pin: false, // We'll pin manually for redundancy
        cidVersion: 1,
        hashAlg: 'sha2-256'
      })

      const cid = addResult.cid.toString()
      console.log('📁 Content added to IPFS:', cid)

      if (pin) {
        // Pin across multiple nodes for redundancy
        const pinnedNodes = await this.pinAcrossNodes(cid, redundancy)
        
        return {
          cid,
          status: pinnedNodes.length >= redundancy ? 'pinned' : 'pinning',
          nodes: pinnedNodes,
          redundancy: pinnedNodes.length
        }
      }

      return {
        cid,
        status: 'pinned',
        nodes: ['local'],
        redundancy: 1
      }
    } catch (error) {
      console.error('❌ Failed to upload content:', error)
      throw error
    }
  }

  /**
   * Pin content across multiple IPFS nodes for redundancy
   */
  private async pinAcrossNodes(cid: string, targetRedundancy: number): Promise<string[]> {
    const pinnedNodes: string[] = []
    
    // Pin on primary node first
    try {
      await this.client!.pin.add(cid)
      pinnedNodes.push('primary')
    } catch (error) {
      console.error('Failed to pin on primary node:', error)
    }

    // Pin on additional nodes
    const pinPromises = this.pinningNodes.slice(0, targetRedundancy - 1).map(async (nodeUrl) => {
      try {
        const response = await fetch(`${nodeUrl}/api/v0/pin/add?arg=${cid}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PRIVACHAIN_PIN_TOKEN}`
          }
        })
        
        if (response.ok) {
          pinnedNodes.push(nodeUrl)
          return nodeUrl
        }
        return null
      } catch (error) {
        console.error(`Failed to pin on ${nodeUrl}:`, error)
        return null
      }
    })

    await Promise.allSettled(pinPromises)
    return pinnedNodes
  }

  /**
   * Create Filecoin storage deals for long-term preservation
   */
  async createFilecoinDeal(
    cid: string,
    options: {
      duration: number // in days
      verified?: boolean
      maxPrice?: string
      minReplication?: number
    }
  ): Promise<FilecoinDeal[]> {
    try {
      // Integrate with real Filecoin storage providers via Lotus API
      const lotusEndpoint = process.env.LOTUS_API_ENDPOINT || process.env.VITE_LOTUS_API_ENDPOINT
      const powergateEndpoint = process.env.POWERGATE_API_ENDPOINT || process.env.VITE_POWERGATE_API_ENDPOINT
      
      if (!lotusEndpoint && !powergateEndpoint) {
        throw new Error('Either LOTUS_API_ENDPOINT or POWERGATE_API_ENDPOINT must be configured')
      }

      const deals: FilecoinDeal[] = []
      
      // Query available storage providers
      const providersResponse = await fetch(`${lotusEndpoint || powergateEndpoint}/api/v1/storage/providers`)
      if (!providersResponse.ok) {
        throw new Error('Failed to fetch storage providers')
      }
      
      const providers = await providersResponse.json()
      const selectedProviders = providers.slice(0, options.minReplication || 2)

      for (const provider of selectedProviders) {
        // Create storage deal proposal
        const dealProposal = {
          cid,
          duration: options.duration * 24 * 60 * 60, // Convert days to seconds
          verified: options.verified || false,
          maxPrice: options.maxPrice || '0.000001',
          provider: provider.id
        }

        const dealResponse = await fetch(`${lotusEndpoint || powergateEndpoint}/api/v1/storage/deals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FILECOIN_API_TOKEN || process.env.VITE_FILECOIN_API_TOKEN}`
          },
          body: JSON.stringify(dealProposal)
        })

        if (dealResponse.ok) {
          const dealResult = await dealResponse.json()
          deals.push({
            dealId: dealResult.dealId,
            miner: provider.id,
            price: dealProposal.maxPrice,
            duration: options.duration,
            verified: options.verified || false
          })
        }
      }

      console.log(`💾 Created ${deals.length} Filecoin deals for CID: ${cid}`)
      return deals
    } catch (error) {
      console.error('❌ Failed to create Filecoin deals:', error)
      throw error
    }
  }

  /**
   * Get storage metrics and network statistics
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    if (!this.client || !this.initialized) {
      throw new Error('IPFS not initialized')
    }

    try {
      // Get repository stats
      const repoStat = await this.client.repo.stat()
      
      // Get connected peers
      const peers = await this.client.swarm.peers()
      
      // Get pinned content
      const pins = []
      for await (const pin of this.client.pin.ls()) {
        pins.push(pin)
      }

      return {
        totalStored: repoStat.repoSize,
        totalPinned: pins.length,
        activeDemos: 0, // TODO: Track from blockchain
        networkedPeers: peers.length,
        filecoinDeals: [] // TODO: Query from Filecoin network
      }
    } catch (error) {
      console.error('❌ Failed to get storage metrics:', error)
      throw error
    }
  }

  /**
   * Retrieve content with automatic failover across nodes
   */
  async retrieveWithFailover(cid: string, decrypt = true): Promise<Uint8Array> {
    if (!this.client || !this.initialized) {
      throw new Error('IPFS not initialized')
    }

    const allNodes = ['primary', ...this.pinningNodes]
    
    for (const node of allNodes) {
      try {
        let content: Uint8Array
        
        if (node === 'primary') {
          // Use main client
          const chunks: Uint8Array[] = []
          for await (const chunk of this.client.cat(cid)) {
            chunks.push(chunk)
          }
          content = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
          let offset = 0
          for (const chunk of chunks) {
            content.set(chunk, offset)
            offset += chunk.length
          }
        } else {
          // Use backup node
          const response = await fetch(`${node}/ipfs/${cid}`)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          content = new Uint8Array(await response.arrayBuffer())
        }

        // Decrypt if needed
        if (decrypt) {
          content = await this.decryptContent(content)
        }

        console.log(`📥 Retrieved content from ${node}:`, cid)
        return content
      } catch (error) {
        console.warn(`Failed to retrieve from ${node}:`, error)
        continue
      }
    }

    throw new Error(`Failed to retrieve content from all nodes: ${cid}`)
  }

  /**
   * Encrypt content using AES-GCM
   */
  private async encryptContent(content: Uint8Array): Promise<Uint8Array> {
    try {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )

      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        content
      )

      // Export key for storage
      const exportedKey = await crypto.subtle.exportKey('raw', key)

      // Combine key, iv, and encrypted data
      const result = new Uint8Array(32 + 12 + encrypted.byteLength)
      result.set(new Uint8Array(exportedKey), 0)
      result.set(iv, 32)
      result.set(new Uint8Array(encrypted), 44)

      return result
    } catch (error) {
      console.error('❌ Encryption failed:', error)
      throw error
    }
  }

  /**
   * Decrypt content using AES-GCM
   */
  private async decryptContent(encryptedContent: Uint8Array): Promise<Uint8Array> {
    try {
      // Extract key, iv, and encrypted data
      const keyData = encryptedContent.slice(0, 32)
      const iv = encryptedContent.slice(32, 44)
      const encrypted = encryptedContent.slice(44)

      // Import key
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      )

      return new Uint8Array(decrypted)
    } catch (error) {
      console.error('❌ Decryption failed:', error)
      throw error
    }
  }

  /**
   * Garbage collection - remove unpinned content
   */
  async garbageCollect(): Promise<{ removed: string[], freedSpace: number }> {
    if (!this.client || !this.initialized) {
      throw new Error('IPFS not initialized')
    }

    try {
      const beforeStat = await this.client.repo.stat()
      
      // Run garbage collection
      const removed: string[] = []
      for await (const result of this.client.repo.gc()) {
        if (result.cid) {
          removed.push(result.cid.toString())
        }
      }

      const afterStat = await this.client.repo.stat()
      const freedSpace = beforeStat.repoSize - afterStat.repoSize

      console.log(`🧹 Garbage collection completed: ${removed.length} items removed, ${freedSpace} bytes freed`)
      
      return { removed, freedSpace }
    } catch (error) {
      console.error('❌ Garbage collection failed:', error)
      throw error
    }
  }
}

// Singleton instance
export const productionIPFS = new ProductionIPFS()

// Auto-initialize in production environment only with proper configuration
if (process.env.NODE_ENV === 'production' && 
    process.env.INFURA_PROJECT_ID && 
    process.env.INFURA_SECRET) {
  productionIPFS.initialize().catch(error => {
    console.error('❌ Failed to auto-initialize ProductionIPFS in production:', error)
  })
} else {
  console.log('⚠️ ProductionIPFS not auto-initialized - missing required environment variables')
}