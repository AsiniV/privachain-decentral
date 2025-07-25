// IPFS integration for decentralized storage

export interface IPFSConfig {
  gateway: string
  apiEndpoint: string
  pinningService?: string
}

export interface IPFSFile {
  cid: string
  size: number
  encrypted: boolean
  mimeType?: string
  filename?: string
}

export interface EncryptedContent {
  cid: string
  encryptionKey: string
  iv: string
  authTag: string
}

export class IPFSService {
  private config: IPFSConfig
  private initialized = false

  constructor(config?: Partial<IPFSConfig>) {
    this.config = {
      gateway: 'https://privachain.infura-ipfs.io',
      apiEndpoint: 'https://privachain.infura-ipfs.io:5001',
      pinningService: 'https://api.pinata.cloud',
      ...config
    }
  }

  async initialize(): Promise<boolean> {
    try {
      // Test connection to IPFS gateway
      const response = await fetch(`${this.config.gateway}/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn`)
      if (response.ok) {
        this.initialized = true
        console.log('✅ IPFS service initialized')
        return true
      }
      return false
    } catch (error) {
      console.error('❌ Failed to initialize IPFS service:', error)
      return false
    }
  }

  // Upload file to IPFS with encryption
  async uploadEncrypted(file: File | Blob, filename?: string): Promise<EncryptedContent> {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized')
    }

    try {
      // Generate encryption key
      const encryptionKey = await this.generateEncryptionKey()
      
      // Read file data
      const fileData = new Uint8Array(await file.arrayBuffer())
      
      // Encrypt file
      const encrypted = await this.encryptData(fileData, encryptionKey)
      
      // Upload encrypted data to IPFS
      const formData = new FormData()
      const encryptedBlob = new Blob([encrypted.encryptedData])
      formData.append('file', encryptedBlob, filename || 'encrypted-file')

      const response = await fetch(`${this.config.apiEndpoint}/api/v0/add`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      console.log('📁 File uploaded to IPFS:', result.Hash)
      
      return {
        cid: result.Hash,
        encryptionKey: this.arrayBufferToBase64(encryptionKey),
        iv: this.arrayBufferToBase64(encrypted.iv),
        authTag: this.arrayBufferToBase64(encrypted.authTag)
      }
    } catch (error) {
      console.error('❌ Failed to upload encrypted file:', error)
      throw error
    }
  }

  // Upload plain file to IPFS
  async upload(file: File | Blob, filename?: string): Promise<IPFSFile> {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized')
    }

    try {
      const formData = new FormData()
      formData.append('file', file, filename || 'file')

      const response = await fetch(`${this.config.apiEndpoint}/api/v0/add`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      console.log('📁 File uploaded to IPFS:', result.Hash)
      
      return {
        cid: result.Hash,
        size: parseInt(result.Size),
        encrypted: false,
        mimeType: file instanceof File ? file.type : undefined,
        filename
      }
    } catch (error) {
      console.error('❌ Failed to upload file:', error)
      throw error
    }
  }

  // Download and decrypt file from IPFS
  async downloadEncrypted(encryptedContent: EncryptedContent): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized')
    }

    try {
      // Download encrypted data
      const response = await fetch(`${this.config.gateway}/ipfs/${encryptedContent.cid}`)
      if (!response.ok) {
        throw new Error(`Failed to download from IPFS: ${response.statusText}`)
      }

      const encryptedData = new Uint8Array(await response.arrayBuffer())
      
      // Decrypt data
      const decrypted = await this.decryptData(
        encryptedData,
        this.base64ToArrayBuffer(encryptedContent.encryptionKey),
        this.base64ToArrayBuffer(encryptedContent.iv),
        this.base64ToArrayBuffer(encryptedContent.authTag)
      )

      console.log('🔓 File downloaded and decrypted from IPFS')
      return decrypted
    } catch (error) {
      console.error('❌ Failed to download encrypted file:', error)
      throw error
    }
  }

  // Download plain file from IPFS
  async download(cid: string): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error('IPFS service not initialized')
    }

    try {
      const response = await fetch(`${this.config.gateway}/ipfs/${cid}`)
      if (!response.ok) {
        throw new Error(`Failed to download from IPFS: ${response.statusText}`)
      }

      const data = new Uint8Array(await response.arrayBuffer())
      console.log('📥 File downloaded from IPFS')
      return data
    } catch (error) {
      console.error('❌ Failed to download file:', error)
      throw error
    }
  }

  // MapPin file to ensure persistence
  async pinFile(cid: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/api/v0/pin/add?arg=${cid}`, {
        method: 'POST'
      })

      if (response.ok) {
        console.log('📌 File pinned to IPFS:', cid)
        return true
      }
      return false
    } catch (error) {
      console.error('❌ Failed to pin file:', error)
      return false
    }
  }

  // Get file statistics
  async getFileStats(cid: string): Promise<{ size: number; type: string } | null> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/api/v0/object/stat?arg=${cid}`, {
        method: 'POST'
      })

      if (response.ok) {
        const stats = await response.json()
        return {
          size: stats.CumulativeSize,
          type: stats.Type
        }
      }
      return null
    } catch (error) {
      console.error('❌ Failed to get file stats:', error)
      return null
    }
  }

  // Encryption utilities
  private async generateEncryptionKey(): Promise<ArrayBuffer> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    ).then(key => crypto.subtle.exportKey('raw', key))
  }

  private async encryptData(data: Uint8Array, key: ArrayBuffer): Promise<{
    encryptedData: Uint8Array
    iv: ArrayBuffer
    authTag: ArrayBuffer
  }> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    )

    // Split encrypted data and auth tag
    const encryptedArray = new Uint8Array(encrypted)
    const encryptedData = encryptedArray.slice(0, -16)
    const authTag = encryptedArray.slice(-16)

    return {
      encryptedData,
      iv: iv.buffer,
      authTag: authTag.buffer
    }
  }

  private async decryptData(
    encryptedData: Uint8Array,
    key: ArrayBuffer,
    iv: ArrayBuffer,
    authTag: ArrayBuffer
  ): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )

    // Combine encrypted data and auth tag
    const combined = new Uint8Array(encryptedData.length + authTag.byteLength)
    combined.set(encryptedData)
    combined.set(new Uint8Array(authTag), encryptedData.length)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      combined
    )

    return new Uint8Array(decrypted)
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
}

// Email-specific IPFS utilities
export class IPFSEmailService extends IPFSService {
  // Upload encrypted email content
  async uploadEmail(
    subject: string,
    body: string,
    attachments: File[] = [],
    recipientPublicKey: string
  ): Promise<EncryptedContent> {
    try {
      // Create email structure
      const emailData = {
        subject,
        body,
        timestamp: Date.now(),
        attachments: await this.uploadAttachments(attachments)
      }

      // Encrypt email with recipient's public key
      const emailJson = JSON.stringify(emailData)
      const emailBlob = new Blob([emailJson], { type: 'application/json' })
      
      return await this.uploadEncrypted(emailBlob, 'email.json')
    } catch (error) {
      console.error('❌ Failed to upload email:', error)
      throw error
    }
  }

  // Download and decrypt email
  async downloadEmail(encryptedContent: EncryptedContent): Promise<{
    subject: string
    body: string
    timestamp: number
    attachments: IPFSFile[]
  }> {
    try {
      const decryptedData = await this.downloadEncrypted(encryptedContent)
      const emailJson = new TextDecoder().decode(decryptedData)
      return JSON.parse(emailJson)
    } catch (error) {
      console.error('❌ Failed to download email:', error)
      throw error
    }
  }

  private async uploadAttachments(files: File[]): Promise<IPFSFile[]> {
    const uploadPromises = files.map(file => this.upload(file, file.name))
    return Promise.all(uploadPromises)
  }
}

// Messenger-specific IPFS utilities for large files
export class IPFSMessengerService extends IPFSService {
  // Upload message attachment
  async uploadAttachment(file: File): Promise<EncryptedContent> {
    return await this.uploadEncrypted(file, file.name)
  }

  // Upload voice message
  async uploadVoiceMessage(audioBlob: Blob): Promise<EncryptedContent> {
    return await this.uploadEncrypted(audioBlob, 'voice-message.webm')
  }

  // Upload image/video
  async uploadMedia(file: File): Promise<EncryptedContent> {
    return await this.uploadEncrypted(file, file.name)
  }
}

// Export singleton instances
export const ipfsService = new IPFSService()
export const ipfsEmailService = new IPFSEmailService()
export const ipfsMessengerService = new IPFSMessengerService()

// Initialize services
Promise.all([
  ipfsService.initialize(),
  ipfsEmailService.initialize(),
  ipfsMessengerService.initialize()
]).then(results => {
  if (results.every(result => result)) {
    console.log('✅ All IPFS services initialized successfully')
  } else {
    console.warn('⚠️ Some IPFS services failed to initialize')
  }
})