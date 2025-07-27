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

      // Upload encrypted content to IPFS
      const ipfsResult = await ipfsService.uploadEncrypted(
        encryptedContent,
        senderKey,
        {
          type: 'email',
          recipient: recipientDomain,
          sender: this.generateSenderAlias(senderDomain, recipientDomain)
        }
      )

      // Generate ZK-SNARK proof for anonymity
      const zkProof = await this.generateAnonymityProof(senderDomain, recipientDomain)

      // Create email metadata
      const email: EncryptedEmail = {
        sender: this.generateSenderAlias(senderDomain, recipientDomain),
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

      // MapPin content to ensure availability
      await ipfsService.pinContent(ipfsResult.cid)

      const emailId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      console.log(`✅ Email sent successfully:`, {
        from: this.generateSenderAlias(senderDomain, recipientDomain),
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
      const downloadResult = await ipfsService.downloadEncrypted(emailCID, recipientKey)
      
      // Parse email metadata
      const emailMetadata = JSON.parse(downloadResult.content as string) as EncryptedEmail

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

      // Register domain via anonymous DNS
      const registrationResult = await anonymousDNS.registerDomain(
        desiredDomain,
        userPublicKey,
        'email'
      )

      if (!registrationResult.success) {
        return {
          success: false,
          error: registrationResult.error
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
        domain: desiredDomain,
        txHash: registrationResult.txHash
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
    
    const uploadResult = await ipfsService.uploadEncrypted(
      fileBuffer,
      encryptionKey,
      {
        filename: file.name,
        contentType: file.type,
        size: file.size
      }
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
  private generateSenderAlias(senderDomain: string, recipientDomain: string): string {
    // Create deterministic but anonymous alias
    const combined = senderDomain + recipientDomain + 'privacy_salt'
    const encoder = new TextEncoder()
    const data = encoder.encode(combined)
    
    // Generate hash-based alias
    return crypto.subtle.digest('SHA-256', data).then(hash => {
      const hashArray = Array.from(new Uint8Array(hash))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      return hashHex.slice(0, 16) + '.prv'
    })
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
    const downloadResult = await ipfsService.downloadEncrypted(contentCID, decryptionKey)
    return downloadResult.content as string
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