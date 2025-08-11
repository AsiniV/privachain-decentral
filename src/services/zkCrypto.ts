// Zero-Knowledge Proof implementation for PrivaChain identity
// Enhanced with SnarkJS for production-ready ZK-SNARKs

import { sha256 } from '@noble/hashes/sha256'
import { randomBytes } from '@noble/hashes/utils'
import * as snarkjs from 'snarkjs'

/**
 * Custom error class for ZK operations
 */
export class ZKError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'ZKError'
  }
}

export interface ZKIdentity {
  privateKey: Uint8Array
  publicHash: string
  commitment: string
}

export interface ZKProof {
  proof: string
  publicSignals: string[]
  nullifierHash: string
}

export class ZKIdentityManager {
  private identity: ZKIdentity | null = null
  private circuitWasm: string | null = null
  private circuitZkey: string | null = null
  private verificationKey: any = null

  constructor() {
    // Initialize with placeholder circuit paths - in production these would be real circuit files
    this.circuitWasm = process.env.ZK_CIRCUIT_WASM || null
    this.circuitZkey = process.env.ZK_CIRCUIT_ZKEY || null
  }

  /**
   * Initialize ZK circuits for production use
   * @throws {ZKError} If circuit initialization fails
   */
  async initializeCircuits(wasmPath?: string, zkeyPath?: string, vkeyPath?: string): Promise<void> {
    try {
      // Require circuit paths for production
      this.circuitWasm = wasmPath || process.env.ZK_CIRCUIT_WASM || process.env.VITE_ZK_CIRCUIT_WASM
      this.circuitZkey = zkeyPath || process.env.ZK_CIRCUIT_ZKEY || process.env.VITE_ZK_CIRCUIT_ZKEY
      const vkeyPathFinal = vkeyPath || process.env.ZK_VERIFICATION_KEY || process.env.VITE_ZK_VERIFICATION_KEY
      
      if (!this.circuitWasm || !this.circuitZkey || !vkeyPathFinal) {
        throw new ZKError('ZK circuit files are required: ZK_CIRCUIT_WASM, ZK_CIRCUIT_ZKEY, ZK_VERIFICATION_KEY')
      }
      
      console.log('📋 Loading ZK verification key...')
      const vkeyResponse = await fetch(vkeyPathFinal)
      if (!vkeyResponse.ok) {
        throw new ZKError(`Failed to load verification key from ${vkeyPathFinal}`)
      }
      this.verificationKey = await vkeyResponse.json()
      
      console.log('✅ ZK circuits initialized with real snarkjs support')
    } catch (error) {
      console.error('❌ Failed to initialize ZK circuits:', error)
      throw new ZKError(`Failed to initialize circuits: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a new anonymous identity with enhanced ZK capabilities
   * @throws {ZKError} If identity generation fails
   */
  async generateIdentity(): Promise<ZKIdentity> {
    try {
      // Generate cryptographically secure random private key
      const privateKey = randomBytes(32)
      
      // Create public commitment using secure hash
      const publicHash = this.bytesToHex(sha256(privateKey))
      
      // Create blinded commitment for ZK proofs
      const blindingFactor = randomBytes(32)
      const combined = new Uint8Array(privateKey.length + blindingFactor.length)
      combined.set(privateKey, 0)
      combined.set(blindingFactor, privateKey.length)
      const commitment = this.bytesToHex(sha256(combined))
      
      this.identity = {
        privateKey,
        publicHash,
        commitment
      }

      console.log('🔐 Enhanced ZK Identity generated:', {
        publicHash: this.identity.publicHash.substring(0, 16) + '...',
        commitment: this.identity.commitment.substring(0, 16) + '...'
      })

      return this.identity
    } catch (error) {
      console.error('❌ Failed to generate ZK identity:', error)
      throw new ZKError(`Failed to generate identity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a real ZK-SNARK proof using snarkjs
   * @throws {ZKError} If proof generation fails
   */
  async generateZKProof(statement: any, privateWitness: any): Promise<ZKProof> {
    if (!this.identity) {
      throw new ZKError('Identity not initialized')
    }

    try {
      // Require real circuits for production
      if (!this.circuitWasm || !this.circuitZkey) {
        throw new ZKError('ZK circuits not properly initialized. Call initializeCircuits() first.')
      }

      console.log('🔬 Generating ZK-SNARK proof with real circuits...')
      
      // Generate real ZK-SNARK proof using snarkjs
      const input = {
        ...privateWitness,
        secret: this.bytesToHex(this.identity.privateKey)
      }

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        this.circuitWasm,
        this.circuitZkey
      )
      
      return {
        proof: JSON.stringify(proof),
        publicSignals,
        nullifierHash: this.generateNullifier(statement)
      }
    } catch (error) {
      console.error('❌ Failed to generate ZK proof:', error)
      throw new ZKError(`Failed to generate proof: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify a ZK-SNARK proof
   * @throws {ZKError} If verification fails
   */
  async verifyZKProof(proof: ZKProof, statement: any): Promise<boolean> {
    try {
      if (!this.verificationKey) {
        throw new ZKError('Verification key not loaded. Call initializeCircuits() first.')
      }

      console.log('🔍 Verifying ZK-SNARK proof with real verification...')
      
      const parsedProof = JSON.parse(proof.proof)
      const isValid = await snarkjs.groth16.verify(
        this.verificationKey,
        proof.publicSignals,
        parsedProof
      )

      console.log('✅ ZK proof verification completed:', isValid)
      return isValid
    } catch (error) {
      console.error('❌ Failed to verify ZK proof:', error)
      throw new ZKError(`Failed to verify proof: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate nullifier hash for double-spending prevention
   */
  private generateNullifier(statement: any): string {
    if (!this.identity) {
      throw new ZKError('Identity not initialized')
    }

    const secret = this.identity.privateKey
    const statementBytes = this.stringToBytes(JSON.stringify(statement))
    const combined = new Uint8Array(secret.length + statementBytes.length)
    combined.set(secret, 0)
    combined.set(statementBytes, secret.length)
    
    return this.bytesToHex(sha256(combined))
  }



  /**
   * Load identity from stored private key
   * @throws {ZKError} If identity loading fails
   */
  async loadIdentity(privateKeyHex: string): Promise<ZKIdentity> {
    try {
      const privateKey = this.hexToBytes(privateKeyHex)
      const publicHash = this.bytesToHex(sha256(privateKey))
      const blindingFactor = randomBytes(32)
      const combined = new Uint8Array(privateKey.length + blindingFactor.length)
      combined.set(privateKey, 0)
      combined.set(blindingFactor, privateKey.length)
      const commitment = this.bytesToHex(sha256(combined))
      
      this.identity = {
        privateKey,
        publicHash,
        commitment
      }

      console.log('🔓 ZK Identity loaded successfully')
      return this.identity
    } catch (error) {
      console.error('❌ Failed to load ZK identity:', error)
      throw new ZKError(`Failed to load identity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate enhanced membership proof using ZK-SNARKs
   * @throws {ZKError} If proof generation fails
   */
  async generateMembershipProof(groupId: string): Promise<ZKProof> {
    if (!this.identity) {
      throw new ZKError('Identity not initialized')
    }

    try {
      const statement = { groupId, type: 'membership' }
      const privateWitness = { 
        secret: this.bytesToHex(this.identity.privateKey),
        commitment: this.identity.commitment
      }
      
      return await this.generateZKProof(statement, privateWitness)
    } catch (error) {
      console.error('❌ Failed to generate membership proof:', error)
      throw new ZKError(`Failed to generate membership proof: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate enhanced domain ownership proof using ZK-SNARKs
   * @throws {ZKError} If proof generation fails
   */
  async generateDomainOwnershipProof(domain: string): Promise<ZKProof> {
    if (!this.identity) {
      throw new ZKError('Identity not initialized')
    }

    try {
      const statement = { 
        domain, 
        type: 'domain_ownership',
        publicHash: this.identity.publicHash
      }
      const privateWitness = {
        secret: this.bytesToHex(this.identity.privateKey),
        commitment: this.identity.commitment
      }
      
      console.log(`🏠 Generating domain ownership proof for: ${domain}`)
      return await this.generateZKProof(statement, privateWitness)
    } catch (error) {
      console.error('❌ Failed to generate domain ownership proof:', error)
      throw new ZKError(`Failed to generate domain ownership proof: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate anonymous credential for service access
   * @throws {ZKError} If credential generation fails
   */
  async generateAnonymousCredential(service: string, attributes: Record<string, any>): Promise<ZKProof> {
    if (!this.identity) {
      throw new ZKError('Identity not initialized')
    }

    try {
      const statement = {
        service,
        attributes,
        type: 'credential',
        timestamp: Date.now()
      }
      const privateWitness = {
        secret: this.bytesToHex(this.identity.privateKey),
        commitment: this.identity.commitment
      }
      
      console.log(`🎫 Generating anonymous credential for: ${service}`)
      return await this.generateZKProof(statement, privateWitness)
    } catch (error) {
      console.error('❌ Failed to generate anonymous credential:', error)
      throw new ZKError(`Failed to generate credential: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate key pair for public key cryptography
   * @throws {ZKError} If key generation fails
   */
  async generateKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
    try {
      // Generate ECDSA key pair using Web Crypto API
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['sign', 'verify']
      )

      // Export keys
      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
      const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

      const publicKey = this.arrayBufferToBase64(publicKeyBuffer)
      const privateKey = this.arrayBufferToBase64(privateKeyBuffer)

      console.log('🔑 ECDSA key pair generated successfully')
      
      return { publicKey, privateKey }
    } catch (error) {
      console.error('❌ Failed to generate key pair:', error)
      throw new ZKError(`Failed to generate key pair: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Encrypt data using the identity's private key
   * @throws {ZKError} If encryption fails
   */
  async encrypt(data: string, recipientPublicKey?: string): Promise<string> {
    if (!this.identity) {
      throw new ZKError('Identity not initialized')
    }

    try {
      // Use AES-GCM for symmetric encryption
      const key = await crypto.subtle.importKey(
        'raw',
        this.identity.privateKey.slice(0, 32), // Use first 32 bytes as AES key
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      )

      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encoder = new TextEncoder()
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      return this.bytesToHex(combined)
    } catch (error) {
      console.error('❌ Failed to encrypt data:', error)
      throw new ZKError(`Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Decrypt data using the identity's private key
   * @throws {ZKError} If decryption fails
   */
  async decrypt(encryptedHex: string): Promise<string> {
    if (!this.identity) {
      throw new ZKError('Identity not initialized')
    }

    try {
      const combined = this.hexToBytes(encryptedHex)
      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)

      const key = await crypto.subtle.importKey(
        'raw',
        this.identity.privateKey.slice(0, 32),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('❌ Failed to decrypt data:', error)
      throw new ZKError(`Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get current identity (without exposing private key)
   */
  getPublicIdentity(): { publicHash: string, commitment: string } | null {
    if (!this.identity) {
      return null
    }
    
    return {
      publicHash: this.identity.publicHash,
      commitment: this.identity.commitment
    }
  }

  /**
   * Export identity for secure storage
   */
  exportIdentity(): string | null {
    if (!this.identity) {
      return null
    }
    
    // In production, this would be encrypted with user's master password
    const identityData = {
      privateKey: this.bytesToHex(this.identity.privateKey),
      publicHash: this.identity.publicHash,
      commitment: this.identity.commitment,
      version: '1.0'
    }
    
    return btoa(JSON.stringify(identityData))
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
  }

  // Generate anonymous reputation proof
  async generateReputationProof(minReputation: number): Promise<ZKProof> {
    if (!this.identity) {
      throw new Error('Identity not initialized')
    }

    try {
      // In practice, reputation would be stored on-chain with ZK proofs
      const currentReputation = await this.getCurrentReputation()
      
      if (currentReputation < minReputation) {
        throw new Error('Insufficient reputation')
      }
      
      const secret = this.identity.privateKey
      const reputationBytes = this.stringToBytes('reputation')
      const combined = new Uint8Array(secret.length + reputationBytes.length)
      combined.set(secret, 0)
      combined.set(reputationBytes, secret.length)
      const nullifier = sha256(combined)
      const nullifierHash = this.bytesToHex(nullifier)
      
      const proofData = {
        minReputation,
        hasRequiredReputation: currentReputation >= minReputation,
        nullifier: nullifierHash,
        timestamp: Date.now()
      }
      
      const proof = this.bytesToHex(sha256(this.stringToBytes(JSON.stringify(proofData))))
      
      return {
        proof,
        publicSignals: [minReputation.toString(), 'true'],
        nullifierHash
      }
    } catch (error) {
      console.error('❌ Failed to generate reputation proof:', error)
      throw error
    }
  }

  // Verify a ZK proof (simplified)
  async verifyProof(proof: ZKProof, expectedPublicSignals: string[]): Promise<boolean> {
    try {
      // In a real implementation, this would use a ZK-SNARK verifier
      // This is a simplified verification for demonstration
      
      if (proof.publicSignals.length !== expectedPublicSignals.length) {
        return false
      }
      
      for (let i = 0; i < proof.publicSignals.length; i++) {
        if (proof.publicSignals[i] !== expectedPublicSignals[i]) {
          return false
        }
      }
      
      // Verify proof structure
      return proof.proof.length === 64 && proof.nullifierHash.length === 64
    } catch (error) {
      console.error('❌ Failed to verify proof:', error)
      return false
    }
  }

  // Get current identity
  getIdentity(): ZKIdentity | null {
    return this.identity
  }



  // Import identity from backup
  async importIdentity(exportedData: string): Promise<ZKIdentity> {
    try {
      // In production, decrypt with password first
      const data = JSON.parse(exportedData)
      
      return await this.loadIdentity(data.privateKey)
    } catch (error) {
      console.error('❌ Failed to import identity:', error)
      throw error
    }
  }

  // Private helper methods
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  private hexToBytes(hex: string): Uint8Array {
    const matches = hex.match(/.{1,2}/g)
    if (!matches) throw new Error('Invalid hex string')
    return new Uint8Array(matches.map(byte => parseInt(byte, 16)))
  }

  private stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str)
  }

  private async getCurrentReputation(): Promise<number> {
    // In a real implementation, this would query the blockchain
    // For demo purposes, return a random reputation score
    return Math.floor(Math.random() * 100)
  }
}

// Post-Quantum Cryptography utilities
export class PostQuantumCrypto {
  // CRYSTALS-Kyber key encapsulation
  async generateKyberKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
    // In production, integrate with real Kyber implementation
    // For now, require the implementation to be available
    try {
      // Check if kyber implementation is available
      const kyberModule = await import('kyber-crystals').catch(() => null)
      
      if (!kyberModule) {
        throw new Error('Kyber cryptography library not available. Install kyber-crystals package for production use.')
      }

      // Use real Kyber implementation when available
      return kyberModule.generateKeyPair()
    } catch (error) {
      console.error('❌ Kyber key generation failed:', error)
      throw new Error(`Post-quantum key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // CRYSTALS-Dilithium signature
  async signWithDilithium(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    try {
      // Check if dilithium implementation is available
      const dilithiumModule = await import('dilithium-crystals').catch(() => null)
      
      if (!dilithiumModule) {
        throw new Error('Dilithium cryptography library not available. Install dilithium-crystals package for production use.')
      }

      // Use real Dilithium implementation when available
      return dilithiumModule.sign(message, privateKey)
    } catch (error) {
      console.error('❌ Dilithium signing failed:', error)
      throw new Error(`Post-quantum signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Verify Dilithium signature
  async verifyDilithium(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    try {
      // Check if dilithium implementation is available
      const dilithiumModule = await import('dilithium-crystals').catch(() => null)
      
      if (!dilithiumModule) {
        throw new Error('Dilithium cryptography library not available. Install dilithium-crystals package for production use.')
      }

      // Use real Dilithium implementation when available
      return dilithiumModule.verify(message, signature, publicKey)
    } catch (error) {
      console.error('❌ Dilithium verification failed:', error)
      throw new Error(`Post-quantum verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i]
    }
    
    return result === 0
  }
}

// Export singleton instances
export const zkIdentityManager = new ZKIdentityManager()
export const postQuantumCrypto = new PostQuantumCrypto()

// Note: Identity must be explicitly generated or imported in production
console.log('🔐 ZK Identity Manager initialized - call generateIdentity() or importIdentity() to begin')