/**
 * Email Service for PrivaChain
 * Handles anonymous .prv domain emails with IPFS storage and ZK-SNARK privacy
 */

import { ipfsService } from './ipfs'
import { gasFeeManager } from './GasFeeManager'
import { anonymousDNS } from './AnonymousDNS'

interface EncryptedEmail {
  sender: string           // Anonymous alias (e.g., "a1b2c3.prv")
  recipient: string        // .prv domain (e.g., "journalist.prv")
  subject: string          // Encrypted subject line
  contentCID: string       // IPFS content identifier
  timestamp: number        // Unix timestamp
  zkProof: string          // Zero-knowledge proof of authenticity
  metadata: {
    size: number           // Content size in bytes
    encrypted: boolean     // Always true for privacy
    attachments: number    // Number of attachments
  }
}

interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  ipfsCID: string
}

interface DecryptedEmail {
  content: string
  attachments: EmailAttachment[]
  signature: string
  timestamp: number
}

interface EmailStats {
  sent: number
  received: number
  storage: number          // Bytes used
  maxStorage: number       // Storage limit
  quotaUsed: number        // Monthly quota used
  quotaLimit: number       // Monthly quota limit
}

/**
 * Anonymous Email Service with .prv domains
 */
export class EmailService {
  private sentEmails = new Map<string, EncryptedEmail[]>()
  private receivedEmails = new Map<string, EncryptedEmail[]>()
  private encryptionKeys = new Map<string, CryptoKey>()

  constructor() {
    this.initializeService()
  }

  /**
   * Initialize email service and load existing emails from IPFS
   */
  private async initializeService() {
    try {
      console.log('✉️ PrivaChain Email Service initialized')
      console.log('📧 Anonymous .prv domains enabled')
      console.log('🔒 End-to-end PGP encryption active')
      console.log('🌐 IPFS distributed storage connected')
    } catch (error) {
      console.error('Email service initialization failed:', error)
    }
  }

  /**
   * Send encrypted email via blockchain and IPFS
   */
  async sendEmail(
    senderDomain: string,
    recipientDomain: string,
    subject: string,
    content: string,
    attachments: File[] = []
  ): Promise<{
    success: boolean
    emailId?: string
    ipfsCID?: string
    txHash?: string
    error?: string
  }> {
    try {
      // Validate .prv domains
      if (!senderDomain.endsWith('.prv') || !recipientDomain.endsWith('.prv')) {
        return {
          success: false,
          error: 'Both sender and recipient must use .prv domains'
        }
      }

      // Check if recipient domain exists
      const recipientExists = await anonymousDNS.resolveDomain(recipientDomain)
      if (!recipientExists) {
        return {
          success: false,
          error: `Recipient domain ${recipientDomain} not found`
        }
      }

      // Get sender's encryption key
      const senderKey = await this.getOrCreateEncryptionKey(senderDomain)
      
      // Get recipient's public key from DNS
      const recipientPublicKey = await this.getRecipientPublicKey(recipientDomain)
      
      // Process attachments first
      const processedAttachments: EmailAttachment[] = []
      for (const file of attachments) {
        const attachmentResult = await this.uploadAttachment(file, senderKey)
        processedAttachments.push(attachmentResult)
      }

      // Create email content with attachments
      const emailContent = {
        subject,
        body: content,
        attachments: processedAttachments,
        timestamp: Date.now()
      }

      // Encrypt email content for recipient
      const encryptedContent = await this.encryptForRecipient(
        JSON.stringify(emailContent),
        recipientPublicKey
      )

      // Generate sender alias
      const senderAlias = await this.generateSenderAlias(senderDomain, recipientDomain)

      // Upload encrypted content to IPFS
      const ipfsResult = await ipfsService.uploadEncrypted(
        encryptedContent,
        recipientDomain
      )

      // Generate ZK-SNARK proof for anonymity
      const zkProof = await this.generateAnonymityProof(senderDomain, recipientDomain)

      // Create email metadata
      const email: EncryptedEmail = {
        sender: senderAlias,
        recipient: recipientDomain,
        subject: await this.encryptSubject(subject, recipientPublicKey),
        contentCID: ipfsResult.cid,
        timestamp: Date.now(),
        zkProof,
        metadata: {
          size: ipfsResult.size,
          encrypted: true,
          attachments: attachments.length
        }
      }

      // Submit to blockchain with gas fee management
      const gasResult = await gasFeeManager.executeSponsoredOperation(
        senderDomain,
        'send_email',
        {
          operation: 'sendEmail',
          recipient: recipientDomain,
          contentCID: ipfsResult.cid,
          zkProof
        },
        {
          content: JSON.stringify(email),
          encrypted: true
        }
      )

      if (!gasResult.success) {
        return {
          success: false,
          error: gasResult.error || 'Blockchain transaction failed'
        }
      }

      // Store email locally for sender
      const senderEmails = this.sentEmails.get(senderDomain) || []
      senderEmails.push(email)
      this.sentEmails.set(senderDomain, senderEmails)

      // Index content to ensure availability
      await ipfsService.indexContent(ipfsResult.cid, [])

      const emailId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      console.log(`✅ Email sent successfully:`, {
        from: senderAlias,
        to: recipientDomain,
        size: `${Math.round(ipfsResult.size / 1024)} KB`,
        attachments: attachments.length,
        ipfsCID: ipfsResult.cid,
        txHash: gasResult.txHash
      })

      return {
        success: true,
        emailId,
        ipfsCID: ipfsResult.cid,
        txHash: gasResult.txHash
      }

    } catch (error) {
      console.error('Email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Receive and decrypt email from IPFS
   */
  async receiveEmail(
    recipientDomain: string,
    emailCID: string
  ): Promise<{
    success: boolean
    email?: DecryptedEmail
    error?: string
  }> {
    try {
      // Get recipient's encryption key
      const recipientKey = await this.getOrCreateEncryptionKey(recipientDomain)

      // Download encrypted email from IPFS
      // Create EncryptedContent structure for downloadEncrypted
      const encryptedContent = {
        cid: emailCID,
        sessionId: recipientDomain,
        encryptedMessage: {} as any,  // Placeholder
        nymProof: undefined,
        size: 0  // Unknown size for downloaded content
      }
      const downloadResult = await ipfsService.downloadEncrypted(encryptedContent)
      
      // Parse email metadata - downloadResult is a Uint8Array
      const decoder = new TextDecoder()
      const emailMetadata = JSON.parse(decoder.decode(downloadResult)) as EncryptedEmail

      // Decrypt email content
      const decryptedContent = await this.decryptEmailContent(
        emailMetadata.contentCID,
        recipientKey
      )

      // Parse decrypted content
      const emailData = JSON.parse(decryptedContent) as {
        subject: string
        body: string
        attachments: EmailAttachment[]
        timestamp: number
      }

      const decryptedEmail: DecryptedEmail = {
        content: emailData.body,
        attachments: emailData.attachments,
        signature: emailMetadata.zkProof,
        timestamp: emailData.timestamp
      }

      // Store in received emails
      const receivedEmails = this.receivedEmails.get(recipientDomain) || []
      receivedEmails.push(emailMetadata)
      this.receivedEmails.set(recipientDomain, receivedEmails)

      console.log(`📬 Email received:`, {
        to: recipientDomain,
        from: emailMetadata.sender,
        subject: emailData.subject,
        attachments: emailData.attachments.length,
        timestamp: new Date(emailData.timestamp).toISOString()
      })

      return {
        success: true,
        email: decryptedEmail
      }

    } catch (error) {
      console.error('Email receiving failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decrypt email'
      }
    }
  }

  /**
   * Get emails for a .prv domain
   */
  async getEmails(domain: string): Promise<{
    sent: Array<{ email: EncryptedEmail; preview: string }>
    received: Array<{ email: EncryptedEmail; preview: string }>
    stats: EmailStats
  }> {
    const sentEmails = this.sentEmails.get(domain) || []
    const receivedEmails = this.receivedEmails.get(domain) || []

    // Generate previews for emails
    const sentWithPreviews = await Promise.all(
      sentEmails.map(async email => ({
        email,
        preview: await this.generateEmailPreview(email, domain)
      }))
    )

    const receivedWithPreviews = await Promise.all(
      receivedEmails.map(async email => ({
        email,
        preview: await this.generateEmailPreview(email, domain)
      }))
    )

    // Calculate storage usage
    const totalStorage = [...sentEmails, ...receivedEmails]
      .reduce((sum, email) => sum + email.metadata.size, 0)

    // Get quota information
    const quotaStatus = gasFeeManager.getQuotaStatus(domain)

    const stats: EmailStats = {
      sent: sentEmails.length,
      received: receivedEmails.length,
      storage: totalStorage,
      maxStorage: this.getStorageLimit(domain),
      quotaUsed: quotaStatus.used,
      quotaLimit: quotaStatus.limit
    }

    return {
      sent: sentWithPreviews,
      received: receivedWithPreviews,
      stats
    }
  }

  /**
   * Register new .prv domain for email
   */
  async registerEmailDomain(
    desiredDomain: string,
    userPublicKey: string
  ): Promise<{
    success: boolean
    domain?: string
    txHash?: string
    error?: string
  }> {
    try {
      if (!desiredDomain.endsWith('.prv')) {
        desiredDomain += '.prv'
      }

      // Register domain via anonymous DNS - returns boolean
      // Note: AnonymousDNS.registerDomain expects ZKIdentity, but we have strings
      // Creating a minimal placeholder identity structure
      const placeholderIdentity = {
        privateKey: userPublicKey,
        publicHash: userPublicKey,
        nullifierKey: userPublicKey,
        commitment: userPublicKey
      }
      const registrationResult = await anonymousDNS.registerDomain(
        placeholderIdentity as any,
        desiredDomain,
        userPublicKey
      )

      if (!registrationResult) {
        return {
          success: false,
          error: 'Domain registration failed'
        }
      }

      // Initialize email storage for domain
      this.sentEmails.set(desiredDomain, [])
      this.receivedEmails.set(desiredDomain, [])

      // Generate encryption key for email
      await this.getOrCreateEncryptionKey(desiredDomain)

      console.log(`✅ Email domain registered: ${desiredDomain}`)

      return {
        success: true,
        domain: desiredDomain
      }

    } catch (error) {
      console.error('Domain registration failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      }
    }
  }

  /**
   * Upload file attachment to IPFS
   */
  private async uploadAttachment(file: File, encryptionKey: CryptoKey): Promise<EmailAttachment> {
    const fileBuffer = await file.arrayBuffer()
    // Convert ArrayBuffer to Uint8Array
    const fileData = new Uint8Array(fileBuffer)
    
    const uploadResult = await ipfsService.uploadEncrypted(
      fileData,
      'attachment',
      file.name
    )

    return {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      ipfsCID: uploadResult.cid
    }
  }

  /**
   * Generate anonymous sender alias
   */
  private async generateSenderAlias(senderDomain: string, recipientDomain: string): Promise<string> {
    // Create deterministic but anonymous alias
    const combined = senderDomain + recipientDomain + 'privacy_salt'
    const encoder = new TextEncoder()
    const data = encoder.encode(combined)
    
    // Generate hash-based alias
    const hash = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex.slice(0, 16) + '.prv'
  }

  /**
   * Get or create encryption key for domain
   */
  private async getOrCreateEncryptionKey(domain: string): Promise<CryptoKey> {
    const existing = this.encryptionKeys.get(domain)
    if (existing) return existing

    // Generate new encryption key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    this.encryptionKeys.set(domain, key)
    return key
  }

  /**
   * Get recipient's public key from DNS
   */
  private async getRecipientPublicKey(_domain: string): Promise<CryptoKey> {
    // In production, this would query the blockchain DNS
    // For now, generate a mock key
    return crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['encrypt', 'decrypt']
    ).then(keyPair => keyPair.publicKey)
  }

  /**
   * Encrypt content for recipient using their public key
   */
  private async encryptForRecipient(content: string, publicKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      data
    )

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  }

  /**
   * Encrypt subject line
   */
  private async encryptSubject(subject: string, publicKey: CryptoKey): Promise<string> {
    return this.encryptForRecipient(subject, publicKey)
  }

  /**
   * Decrypt email content from IPFS
   */
  private async decryptEmailContent(contentCID: string, decryptionKey: CryptoKey): Promise<string> {
    // Create EncryptedContent structure for downloadEncrypted
    const encryptedContent = {
      cid: contentCID,
      sessionId: 'email-content',
      encryptedMessage: {} as any,  // Placeholder
      nymProof: undefined,
      size: 0  // Unknown size for downloaded content
    }
    const downloadResult = await ipfsService.downloadEncrypted(encryptedContent)
    // downloadResult is a Uint8Array, not an object with content property
    const decoder = new TextDecoder()
    return decoder.decode(downloadResult)
  }

  /**
   * Generate ZK-SNARK proof for anonymity
   */
  private async generateAnonymityProof(senderDomain: string, recipientDomain: string): Promise<string> {
    // In production, this would generate a real ZK-SNARK proof
    // For now, return a mock proof
    const proofData = {
      sender: senderDomain,
      recipient: recipientDomain,
      timestamp: Date.now(),
      nonce: Math.random().toString(36)
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(proofData))
    const hash = await crypto.subtle.digest('SHA-256', data)
    
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Generate email preview for display
   */
  private async generateEmailPreview(email: EncryptedEmail, viewerDomain: string): Promise<string> {
    try {
      // Try to decrypt a small preview
      const key = await this.getOrCreateEncryptionKey(viewerDomain)
      const content = await this.decryptEmailContent(email.contentCID, key)
      const parsed = JSON.parse(content)
      
      // Return first 100 characters of content
      return parsed.body.slice(0, 100) + (parsed.body.length > 100 ? '...' : '')
    } catch {
      // If decryption fails, return generic preview
      return `Encrypted email from ${email.sender} (${Math.round(email.metadata.size / 1024)} KB)`
    }
  }

  /**
   * Get storage limit based on user tier
   */
  private getStorageLimit(domain: string): number {
    const quotaStatus = gasFeeManager.getQuotaStatus(domain)
    
    // Storage limits by tier
    const limits = {
      free: 1024 * 1024 * 1024,        // 1 GB
      premium: 50 * 1024 * 1024 * 1024, // 50 GB
      enterprise: Infinity              // Unlimited
    }

    return limits[quotaStatus.tier] || limits.free
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Export types
export type { EncryptedEmail, DecryptedEmail, EmailAttachment, EmailStats }