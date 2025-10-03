/**
 * Production IPFS Integration with Filecoin incentives
 * Real decentralized storage for PrivaChain using Helia
 */

import { createHelia } from 'helia'
import { unixfs } from '@helia/unixfs'
import type { Helia } from 'helia'
import type { UnixFS } from '@helia/unixfs'
import { CID } from 'multiformats/cid'

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
  private helia: Helia | null = null
  private fs: UnixFS | null = null
  private initialized = false
  private pinningNodes: string[] = [
    'https://privachain-ipfs-1.herokuapp.com',
    'https://privachain-ipfs-2.herokuapp.com', 
    'https://privachain-ipfs-3.herokuapp.com'
  ]
  private filebaseGateway = 'https://ipfs.filebase.io/ipfs/'
  private s3ApiEndpoint = 'https://s3.filebase.com'
  private rpcApiEndpoint = 'https://rpc.filebase.io'
  
  async initialize(): Promise<boolean> {
    try {
      // Initialize Helia node for IPFS operations
      this.helia = await createHelia()
      this.fs = unixfs(this.helia)
      
      // Log connection info
      console.log('🌐 Connected to IPFS network via Helia')
      console.log('🌐 Filebase.com RPC API:', this.rpcApiEndpoint)
      console.log('🌐 Filebase.com S3 API:', this.s3ApiEndpoint)
      
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
    if (!this.fs || !this.initialized) {
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

      // Add to IPFS using Helia
      const cid = await this.fs.addBytes(finalContent)
      console.log('📁 Content added to IPFS:', cid.toString())

      if (pin) {
        // Pin the content
        await this.helia!.pins.add(cid)
        
        // Pin across multiple nodes for redundancy using Filebase API
        const pinnedNodes = await this.pinAcrossNodes(cid.toString(), redundancy)
        
        return {
          cid: cid.toString(),
          status: pinnedNodes.length >= redundancy ? 'pinned' : 'pinning',
          nodes: pinnedNodes,
          redundancy: pinnedNodes.length
        }
      }

      return {
        cid: cid.toString(),
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
   * Pin content across multiple IPFS nodes for redundancy using Filebase API
   */
  private async pinAcrossNodes(cid: string, targetRedundancy: number): Promise<string[]> {
    const pinnedNodes: string[] = []
    
    // Already pinned locally
    pinnedNodes.push('local')

    // Pin using Filebase RPC API
    try {
      const filebaseAccessKey = process.env.FILEBASE_ACCESS_KEY || process.env.VITE_FILEBASE_ACCESS_KEY
      const filebaseSecretKey = process.env.FILEBASE_SECRET_KEY || process.env.VITE_FILEBASE_SECRET_KEY
      
      if (filebaseAccessKey && filebaseSecretKey) {
        const authHeader = `Basic ${btoa(filebaseAccessKey + ':' + filebaseSecretKey)}`
        
        // Pin using Filebase RPC API
        const response = await fetch(`${this.rpcApiEndpoint}/api/v0/pin/add?arg=${cid}`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader
          }
        })
        
        if (response.ok) {
          pinnedNodes.push('filebase-rpc')
          console.log('📌 Content pinned to Filebase:', cid)
        } else {
          console.warn('Failed to pin to Filebase RPC:', await response.text())
        }
      }
    } catch (error) {
      console.error('Failed to pin to Filebase RPC:', error)
    }

    // Pin on additional nodes if configured
    const additionalPins = Math.min(this.pinningNodes.length, targetRedundancy - pinnedNodes.length)
    const pinPromises = this.pinningNodes.slice(0, additionalPins).map(async (nodeUrl) => {
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
    if (!this.helia || !this.initialized) {
      throw new Error('IPFS not initialized')
    }

    try {
      // Get connected peers
      const peers = this.helia.libp2p.getPeers()
      
      // Get pinned content
      const pins = []
      for await (const pin of this.helia.pins.ls()) {
        pins.push(pin)
      }

      return {
        totalStored: 0, // TODO: Get repo stats from Helia
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
  async retrieveWithFailover(cidString: string, decrypt = true): Promise<Uint8Array> {
    if (!this.fs || !this.initialized) {
      throw new Error('IPFS not initialized')
    }

    const allNodes = ['local', 'filebase-gateway', ...this.pinningNodes]
    
    for (const node of allNodes) {
      try {
        let content: Uint8Array
        
        if (node === 'local') {
          // Use local Helia node
          const cid = CID.parse(cidString)
          const chunks: Uint8Array[] = []
          for await (const chunk of this.fs.cat(cid)) {
            chunks.push(chunk)
          }
          content = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
          let offset = 0
          for (const chunk of chunks) {
            content.set(chunk, offset)
            offset += chunk.length
          }
        } else if (node === 'filebase-gateway') {
          // Use Filebase gateway
          const response = await fetch(`${this.filebaseGateway}${cidString}`)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          content = new Uint8Array(await response.arrayBuffer())
        } else {
          // Use backup node
          const response = await fetch(`${node}/ipfs/${cidString}`)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          content = new Uint8Array(await response.arrayBuffer())
        }

        // Decrypt if needed
        if (decrypt) {
          content = await this.decryptContent(content)
        }

        console.log(`📥 Retrieved content from ${node}:`, cidString)
        return content
      } catch (error) {
        console.warn(`Failed to retrieve from ${node}:`, error)
        continue
      }
    }

    throw new Error(`Failed to retrieve content from all nodes: ${cidString}`)
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
      
      // Ensure content is BufferSource compatible - use Uint8Array directly
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        content as BufferSource
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
   * Get Filebase S3 API configuration for direct S3 operations
   */
  getFilebaseS3Config(): {
    endpoint: string;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    region: string;
  } {
    return {
      endpoint: this.s3ApiEndpoint,
      accessKeyId: process.env.FILEBASE_ACCESS_KEY || process.env.VITE_FILEBASE_ACCESS_KEY,
      secretAccessKey: process.env.FILEBASE_SECRET_KEY || process.env.VITE_FILEBASE_SECRET_KEY,
      region: 'us-east-1' // Filebase uses us-east-1 region
    }
  }

  /**
   * Garbage collection - remove unpinned content
   */
  async garbageCollect(): Promise<{ removed: string[], freedSpace: number }> {
    if (!this.helia || !this.initialized) {
      throw new Error('IPFS not initialized')
    }

    try {
      // Run garbage collection on local node
      const removed: string[] = []
      
      // In Helia, garbage collection is typically handled automatically
      // This is a placeholder for future implementation
      console.log('🧹 Garbage collection not yet implemented in Helia, automatic cleanup enabled')
      
      return { removed, freedSpace: 0 }
    } catch (error) {
      console.error('❌ Garbage collection failed:', error)
      throw error
    }
  }
}

// Singleton instance
export const productionIPFS = new ProductionIPFS()

// Auto-initialize in production environment
if (process.env.NODE_ENV === 'production') {
  productionIPFS.initialize().catch(error => {
    console.error('❌ Failed to auto-initialize ProductionIPFS in production:', error)
  })
} else {
  console.log('⚠️ ProductionIPFS not auto-initialized - development environment')
}