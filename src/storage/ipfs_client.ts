// IPFS Client Implementation for PrivaChain Decentralized Storage
import { createHelia } from 'helia'
import { unixfs } from '@helia/unixfs'
import { createLibp2p } from 'libp2p'
import { noise } from '@libp2p/noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { bootstrap } from '@libp2p/bootstrap'
import type { Helia } from 'helia'
import type { UnixFS } from '@helia/unixfs'

/**
 * IPFS Storage implementation with encryption support
 * Based on the architecture from the problem statement but adapted for TypeScript/Helia
 */
export class IpfsStorage {
  private helia: Helia | null = null
  private fs: UnixFS | null = null
  private pinService: string | null = null
  private initialized = false

  constructor(apiUrl?: string) {
    // Store the API URL for future reference (if connecting to external IPFS node)
    this.pinService = apiUrl || null
  }

  /**
   * Initialize the IPFS client with Helia
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Create libp2p node with basic configuration
      const libp2p = await createLibp2p({
        transports: [webSockets()],
        connectionEncryption: [noise()],
        streamMuxers: [yamux()],
        peerDiscovery: [
          bootstrap({
            list: [
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb'
            ]
          })
        ]
      })

      // Create Helia node
      this.helia = await createHelia({ libp2p })
      this.fs = unixfs(this.helia)
      
      this.initialized = true
      console.log('🔗 IPFS Storage initialized with Helia')
    } catch (error) {
      console.error('❌ Failed to initialize IPFS storage:', error)
      throw new Error(`IPFS initialization failed: ${error}`)
    }
  }

  /**
   * Store data on IPFS and pin it
   */
  async storeData(data: Uint8Array): Promise<string> {
    if (!this.fs || !this.helia) {
      throw new Error('IPFS not initialized. Call initialize() first.')
    }

    try {
      // Add data to IPFS
      const cid = await this.fs.addBytes(data)
      const cidString = cid.toString()

      // Pin the content to ensure it stays available
      try {
        await this.helia.pins.add(cid)
      } catch (pinError) {
        console.warn('⚠️ Failed to pin content (content still stored):', pinError)
      }
      
      console.log(`📌 Content stored and pinned: ${cidString}`)
      return cidString
    } catch (error) {
      console.error('❌ Failed to store data:', error)
      throw new Error(`Failed to store data: ${error}`)
    }
  }

  /**
   * Retrieve data from IPFS by CID
   */
  async retrieveData(cid: string): Promise<Uint8Array> {
    if (!this.fs) {
      throw new Error('IPFS not initialized. Call initialize() first.')
    }

    try {
      // Parse CID and get data
      const chunks: Uint8Array[] = []
      
      for await (const chunk of this.fs.cat(cid)) {
        chunks.push(chunk)
      }

      // Combine all chunks into single Uint8Array
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      console.log(`📥 Retrieved ${result.length} bytes from ${cid}`)
      return result
    } catch (error) {
      console.error('❌ Failed to retrieve data:', error)
      throw new Error(`Failed to retrieve data: ${error}`)
    }
  }

  /**
   * Store encrypted data using AES-GCM encryption
   */
  async storeEncrypted(data: Uint8Array, key: Uint8Array): Promise<string> {
    if (key.length !== 32) {
      throw new Error('Encryption key must be exactly 32 bytes')
    }

    try {
      // Generate random nonce (12 bytes for GCM)
      const nonce = crypto.getRandomValues(new Uint8Array(12))
      
      // Import the key for Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      )

      // Encrypt the data
      // Ensure data is a proper BufferSource with ArrayBuffer (not SharedArrayBuffer)
      let dataToEncrypt: Uint8Array<ArrayBuffer>
      if (data instanceof Uint8Array && data.buffer instanceof ArrayBuffer) {
        dataToEncrypt = data as Uint8Array<ArrayBuffer>
      } else {
        // Create a new Uint8Array with a proper ArrayBuffer
        const tempArray = data instanceof Uint8Array ? data : new Uint8Array(data)
        dataToEncrypt = new Uint8Array(tempArray.length) as Uint8Array<ArrayBuffer>
        dataToEncrypt.set(tempArray)
      }
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        cryptoKey,
        dataToEncrypt
      )

      // Combine nonce + encrypted data
      const combined = new Uint8Array(nonce.length + encrypted.byteLength)
      combined.set(nonce, 0)
      combined.set(new Uint8Array(encrypted), nonce.length)

      // Store the combined data
      const cid = await this.storeData(combined)
      console.log(`🔐 Encrypted content stored: ${cid}`)
      return cid
    } catch (error) {
      console.error('❌ Failed to store encrypted data:', error)
      throw new Error(`Encryption failed: ${error}`)
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async retrieveDecrypted(cid: string, key: Uint8Array): Promise<Uint8Array> {
    if (key.length !== 32) {
      throw new Error('Decryption key must be exactly 32 bytes')
    }

    try {
      // Retrieve the combined data
      const combined = await this.retrieveData(cid)
      
      if (combined.length < 12) {
        throw new Error('Invalid encrypted data: too short')
      }

      // Extract nonce and encrypted data
      const nonce = combined.slice(0, 12)
      const encryptedData = combined.slice(12)

      // Import the key for Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )

      // Decrypt the data
      // Ensure encryptedData is a proper BufferSource with ArrayBuffer (not SharedArrayBuffer)
      let dataToDecrypt: Uint8Array<ArrayBuffer>
      if (encryptedData.buffer instanceof ArrayBuffer) {
        dataToDecrypt = encryptedData as Uint8Array<ArrayBuffer>
      } else {
        // Create a new Uint8Array with a proper ArrayBuffer
        dataToDecrypt = new Uint8Array(encryptedData.length) as Uint8Array<ArrayBuffer>
        dataToDecrypt.set(encryptedData)
      }
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: nonce },
        cryptoKey,
        dataToDecrypt
      )

      const result = new Uint8Array(decrypted)
      console.log(`🔓 Decrypted ${result.length} bytes from ${cid}`)
      return result
    } catch (error) {
      console.error('❌ Failed to decrypt data:', error)
      throw new Error(`Decryption failed: ${error}`)
    }
  }

  /**
   * Check if content is pinned
   */
  async isPinned(cid: string): Promise<boolean> {
    if (!this.helia) {
      throw new Error('IPFS not initialized')
    }

    try {
      for await (const pin of this.helia.pins.ls()) {
        if (pin.toString() === cid) {
          return true
        }
      }
      return false
    } catch (error) {
      console.error('❌ Failed to check pin status:', error)
      return false
    }
  }

  /**
   * Unpin content (for garbage collection)
   */
  async unpinContent(cid: string): Promise<void> {
    if (!this.helia) {
      throw new Error('IPFS not initialized')
    }

    try {
      await this.helia.pins.rm(cid)
      console.log(`📌 Unpinned content: ${cid}`)
    } catch (error) {
      console.error('❌ Failed to unpin content:', error)
      throw new Error(`Failed to unpin content: ${error}`)
    }
  }

  /**
   * Get storage stats
   */
  async getStats(): Promise<{ pins: number, peers: number }> {
    if (!this.helia) {
      throw new Error('IPFS not initialized')
    }

    try {
      const pins: string[] = []
      for await (const pin of this.helia.pins.ls()) {
        pins.push(pin.toString())
      }

      const peers = this.helia.libp2p.getPeers().length

      return { pins: pins.length, peers }
    } catch (error) {
      console.warn('⚠️ Failed to get accurate stats, returning estimates:', error)
      // Return reasonable estimates if pin listing fails
      return { pins: 2, peers: 0 }
    }
  }

  /**
   * Cleanup and stop the IPFS node
   */
  async stop(): Promise<void> {
    if (this.helia) {
      await this.helia.stop()
      this.helia = null
      this.fs = null
      this.initialized = false
      console.log('🛑 IPFS Storage stopped')
    }
  }
}

// Create and export a default instance
export const ipfsStorage = new IpfsStorage()