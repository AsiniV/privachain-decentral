/**
 * IPFS Service for PrivaChain
 * Handles decentralized storage using Filebase IPFS infrastructure
 */

interface IPFSConfig {
  rpcEndpoint: string
  apiKey: string
  s3Endpoint: string
}

// Production IPFS configuration using Filebase
const IPFS_CONFIG: IPFSConfig = {
  rpcEndpoint: 'https://rpc.filebase.io',
  apiKey: 'MTU3RjA5MzVDMTQ4QThBQjhBNzA6ZkllQjNwVWxwbTI3RlJqaDZub3Z0V1hhNzNURUt3MXpLTE55V0V4ODpwcml2YS1jaGFpbg==',
  s3Endpoint: 'https://s3.filebase.com'
}

interface IPFSUploadResult {
  cid: string
  size: number
  url: string
}

interface EncryptedContent {
  encryptedData: string
  iv: string
  authTag: string
  metadata?: Record<string, any>
}

/**
 * IPFS Service for decentralized content storage
 */
export class IPFSService {
  private config: IPFSConfig

  constructor(config: IPFSConfig = IPFS_CONFIG) {
    this.config = config
  }

  /**
   * Upload encrypted content to IPFS
   */
  async uploadEncrypted(
    content: string | ArrayBuffer, 
    encryptionKey: CryptoKey,
    metadata?: Record<string, any>
  ): Promise<IPFSUploadResult> {
    try {
      // Encrypt content before upload
      const encrypted = await this.encryptContent(content, encryptionKey)
      
      // Create JSON payload with encrypted data
      const payload = {
        ...encrypted,
        metadata,
        timestamp: Date.now(),
        version: '1.0'
      }

      const jsonData = JSON.stringify(payload)
      const blob = new Blob([jsonData], { type: 'application/json' })

      // Upload to IPFS via Filebase
      const formData = new FormData()
      formData.append('file', blob, `encrypted-${Date.now()}.json`)

      const response = await fetch(`${this.config.rpcEndpoint}/api/v0/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      return {
        cid: result.Hash,
        size: result.Size,
        url: `https://ipfs.io/ipfs/${result.Hash}`
      }
    } catch (error) {
      console.error('IPFS upload error:', error)
      throw new Error('Failed to upload to IPFS')
    }
  }

  /**
   * Download and decrypt content from IPFS
   */
  async downloadEncrypted(
    cid: string, 
    decryptionKey: CryptoKey
  ): Promise<{ content: string | ArrayBuffer; metadata?: Record<string, any> }> {
    try {
      // Download from IPFS
      const response = await fetch(`${this.config.rpcEndpoint}/api/v0/cat?arg=${cid}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        }
      })

      if (!response.ok) {
        throw new Error(`IPFS download failed: ${response.statusText}`)
      }

      const encryptedPayload = await response.json() as EncryptedContent
      
      // Decrypt content
      const decryptedContent = await this.decryptContent(encryptedPayload, decryptionKey)
      
      return {
        content: decryptedContent,
        metadata: encryptedPayload.metadata
      }
    } catch (error) {
      console.error('IPFS download error:', error)
      throw new Error('Failed to download from IPFS')
    }
  }

  /**
   * Upload public content (no encryption)
   */
  async uploadPublic(content: string | ArrayBuffer): Promise<IPFSUploadResult> {
    try {
      const blob = content instanceof ArrayBuffer 
        ? new Blob([content])
        : new Blob([content], { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', blob, `public-${Date.now()}`)

      const response = await fetch(`${this.config.rpcEndpoint}/api/v0/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      return {
        cid: result.Hash,
        size: result.Size,
        url: `https://ipfs.io/ipfs/${result.Hash}`
      }
    } catch (error) {
      console.error('IPFS public upload error:', error)
      throw new Error('Failed to upload to IPFS')
    }
  }

  /**
   * Pin content to ensure it stays available
   */
  async pinContent(cid: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.rpcEndpoint}/api/v0/pin/add?arg=${cid}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        }
      })

      if (!response.ok) {
        throw new Error(`IPFS pinning failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('IPFS pinning error:', error)
      throw new Error('Failed to pin content')
    }
  }

  /**
   * Get content information without downloading
   */
  async getContentInfo(cid: string): Promise<{ size: number; type: string }> {
    try {
      const response = await fetch(`${this.config.rpcEndpoint}/api/v0/object/stat?arg=${cid}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        }
      })

      if (!response.ok) {
        throw new Error(`IPFS stat failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      return {
        size: result.CumulativeSize,
        type: result.DataSize > 0 ? 'file' : 'directory'
      }
    } catch (error) {
      console.error('IPFS stat error:', error)
      throw new Error('Failed to get content info')
    }
  }

  /**
   * Encrypt content using AES-GCM
   */
  private async encryptContent(
    content: string | ArrayBuffer, 
    key: CryptoKey
  ): Promise<EncryptedContent> {
    const encoder = new TextEncoder()
    const data = typeof content === 'string' ? encoder.encode(content) : new Uint8Array(content)
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    // Extract auth tag (last 16 bytes)
    const encryptedArray = new Uint8Array(encrypted)
    const authTag = encryptedArray.slice(-16)
    const encryptedData = encryptedArray.slice(0, -16)
    
    return {
      encryptedData: Array.from(encryptedData).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      authTag: Array.from(authTag).map(b => b.toString(16).padStart(2, '0')).join('')
    }
  }

  /**
   * Decrypt content using AES-GCM
   */
  private async decryptContent(
    encrypted: EncryptedContent, 
    key: CryptoKey
  ): Promise<string | ArrayBuffer> {
    // Convert hex strings back to Uint8Arrays
    const encryptedData = new Uint8Array(
      encrypted.encryptedData.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    )
    const iv = new Uint8Array(
      encrypted.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    )
    const authTag = new Uint8Array(
      encrypted.authTag.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    )
    
    // Combine encrypted data and auth tag
    const combined = new Uint8Array(encryptedData.length + authTag.length)
    combined.set(encryptedData)
    combined.set(authTag, encryptedData.length)
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      combined
    )
    
    // Try to decode as text, fall back to ArrayBuffer
    try {
      return new TextDecoder().decode(decrypted)
    } catch {
      return decrypted
    }
  }
}

// Export singleton instance
export const ipfsService = new IPFSService()

// Export types
export type { IPFSUploadResult, EncryptedContent }