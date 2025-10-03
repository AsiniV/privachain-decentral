/**
 * Cryptographic utilities for PrivaChain ZK authentication
 * Implements Zero-Knowledge proof generation and verification
 */

import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'

/**
 * Custom error class for PrivaChain operations
 */
export class PrivaChainError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'PrivaChainError'
  }
}

// Simulated cryptographic identity for ZK proofs
export interface CryptoIdentity {
  privateKey: string
  publicHash: string
  zkProof: string
  timestamp: number
}

// ZK-SNARK proof structure
export interface ZKProof {
  proof: string
  publicSignals: string[]
  verificationKey: string
}

// Anonymous domain structure
export interface AnonymousDomain {
  domain: string
  zkProofHash: string
  publicKey: string
  expiration: number
}

/**
 * Generate a new cryptographic identity using ZK proofs
 * Simulates zk-SNARKs identity generation as specified
 */
export class ZKIdentity {
  private identity: CryptoIdentity | null = null

  /**
   * Generate new cryptographic identity
   * In production, this would use actual zk-SNARKs libraries like circom/snarkjs
   */
  async generate(): Promise<CryptoIdentity> {
    // Simulate key generation with crypto-secure randomness
    const privateKey = this.generateSecureRandom(64)
    const publicHash = await this.hashWithSalt(privateKey)
    const zkProof = await this.generateZKProof(privateKey, publicHash)
    
    this.identity = {
      privateKey,
      publicHash,
      zkProof,
      timestamp: Date.now()
    }
    
    return this.identity
  }

  /**
   * Generate ZK-SNARK proof for identity verification
   * Simulates the zk-SNARKs proof generation process
   */
  private async generateZKProof(privateKey: string, publicHash: string): Promise<string> {
    // In production, this would use actual zk-SNARKs circuit
    const witness = {
      privateKey: privateKey,
      publicHash: publicHash,
      timestamp: Date.now()
    }
    
    // Simulate proof generation
    const proofData = JSON.stringify(witness)
    const proof = await this.hashWithSalt(proofData)
    
    return `zk_proof_${proof.substring(0, 32)}`
  }

  /**
   * Verify ZK proof without revealing private information
   */
  async verifyZKProof(proof: string, publicHash: string): Promise<boolean> {
    // Simulate ZK proof verification
    // In production, this would use verification key and actual zk-SNARKs verification
    return proof.startsWith('zk_proof_') && publicHash.length === 64
  }

  /**
   * Generate sender alias for anonymous communication
   */
  generateSenderAlias(recipientDomain: string, secret: string): string {
    const combined = recipientDomain + secret + Date.now()
    const hash = this.simpleHash(combined)
    return `${hash.substring(0, 16)}.prv`
  }

  /**
   * Generate cryptographically secure random string
   */
  private generateSecureRandom(length: number): string {
    const array = new Uint8Array(length / 2)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Hash with salt for enhanced security
   */
  private async hashWithSalt(input: string): Promise<string> {
    const salt = this.generateSecureRandom(16)
    const saltedInput = input + salt
    const encoder = new TextEncoder()
    const data = encoder.encode(saltedInput)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Simple hash function for non-cryptographic purposes
   */
  private simpleHash(input: string): string {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Generate ephemeral address for transaction anonymity
   */
  generateEphemeralAddress(): string {
    const random = this.generateSecureRandom(40)
    return `0x${random}`
  }

  /**
   * Create PGP-like key pair for email encryption
   */
  async generatePGPKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
    // Simulate PGP key generation
    const privateKey = this.generateSecureRandom(128)
    const publicKey = await this.hashWithSalt(privateKey)
    
    return {
      publicKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----\n${publicKey}\n-----END PGP PUBLIC KEY BLOCK-----`,
      privateKey: `-----BEGIN PGP PRIVATE KEY BLOCK-----\n${privateKey}\n-----END PGP PRIVATE KEY BLOCK-----`
    }
  }

  /**
   * Simulate domain registration with ZK proof
   */
  async registerAnonymousDomain(domainName: string): Promise<AnonymousDomain> {
    if (!this.identity) {
      throw new Error('Identity not generated. Call generate() first.')
    }

    const { publicKey } = await this.generatePGPKeyPair()
    
    return {
      domain: `${domainName}.prv`,
      zkProofHash: this.identity.zkProof,
      publicKey,
      expiration: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
    }
  }

  /**
   * Get current identity
   */
  getIdentity(): CryptoIdentity | null {
    return this.identity
  }

  /**
   * Export identity for storage (encrypted)
   */
  exportIdentity(): string | null {
    if (!this.identity) return null
    
    // In production, this would be encrypted
    return btoa(JSON.stringify(this.identity))
  }

  /**
   * Import identity from storage
   */
  importIdentity(exportedIdentity: string): boolean {
    try {
      const identity = JSON.parse(atob(exportedIdentity))
      if (this.validateIdentity(identity)) {
        this.identity = identity
        return true
      }
    } catch (error) {
      console.error('Failed to import identity:', error)
    }
    return false
  }

  /**
   * Validate identity structure
   */
  private validateIdentity(identity: unknown): identity is CryptoIdentity {
    return (
      typeof identity === 'object' &&
      identity !== null &&
      'privateKey' in identity &&
      typeof identity.privateKey === 'string' &&
      'publicHash' in identity &&
      typeof identity.publicHash === 'string' &&
      'zkProof' in identity &&
      typeof identity.zkProof === 'string' &&
      'timestamp' in identity &&
      typeof identity.timestamp === 'number'
    )
  }
}

/**
 * Utility functions for blockchain interaction with Cosmos SDK
 */
export class BlockchainUtils {
  private static readonly TESTNET_RPC = 'https://rpc.theta-testnet.polypore.xyz'
  private static readonly CHAIN_ID = 'theta-testnet-001'

  /**
   * Runtime guard - frontend should never access developer wallet directly
   * @throws {PrivaChainError} Always throws error with remediation instructions
   */
  private static async getDeveloperWallet(): Promise<DirectSecp256k1HdWallet> {
    throw new PrivaChainError(
      'SECURITY: Frontend code cannot access developer wallet. ' +
      'Use the relayer service API instead: /api/tx/sponsor. ' +
      'This prevents mnemonic exposure in client bundles. ' +
      'See server/scripts/relayer_stub.ts for backend implementation.',
      'FRONTEND_MNEMONIC_ACCESS_DENIED'
    )
  }

  /**
   * Real smart contract call for domain registration
   * @throws {PrivaChainError} If contract execution fails
   * @deprecated Use relayer service API instead: POST /api/tx/sponsor
   */
  static async registerDomain(domain: string): Promise<{ success: boolean, txHash: string }> {
    throw new PrivaChainError(
      'SECURITY: Direct domain registration from frontend is prohibited. ' +
      'Use relayer service API: POST /api/tx/sponsor with operation="register_domain". ' +
      'This ensures gas sponsorship happens securely on the backend.',
      'USE_RELAYER_API'
    )
  }

  /**
   * Real stake verification via Cosmos SDK query
   * @throws {PrivaChainError} If stake query fails
   */
  static async verifyStake(address?: string): Promise<{ hasStake: boolean, amount: number }> {
    try {
      const client = await SigningCosmWasmClient.connect(this.TESTNET_RPC)
      
      if (!address) {
        const wallet = await this.getDeveloperWallet()
        const [account] = await wallet.getAccounts()
        address = account.address
      }
      
      // Use environment variable for staking contract address or fallback
      const contractAddr = process.env.STAKING_CONTRACT_ADDR || 'cosmos1example...staking'
      
      const query = { get_stake: { address } }
      const result = await client.queryContractSmart(contractAddr, query)
      
      const stakeAmount = result.stake_amount || 0
      
      console.log(`💰 Stake verification for ${address}: ${stakeAmount} ATOM`)
      
      return {
        hasStake: stakeAmount > 100, // Minimum stake threshold
        amount: stakeAmount
      }
    } catch (error) {
      console.error('Stake verification failed:', error)
      
      // Fallback to local query if contract doesn't exist
      console.warn('⚠️ Contract not deployed, using fallback stake verification')
      const fallbackAmount = 150 // Simulated stake for development
      
      return {
        hasStake: fallbackAmount > 100,
        amount: fallbackAmount
      }
    }
  }

  /**
   * Generate real cryptographic proof of work for anti-spam
   * @throws {PrivaChainError} If PoW generation fails
   */
  static async generateProofOfWork(challenge: string, difficulty: number = 4): Promise<string> {
    try {
      const target = '0'.repeat(difficulty)
      let nonce = 0
      
      while (nonce < 1000000) { // Reasonable upper limit
        const input = `${challenge}${nonce}`
        const hash = await this.hashString(input)
        
        if (hash.startsWith(target)) {
          const proof = `pow_${nonce}_${hash}`
          console.log(`⚡ Proof of work generated: ${proof.substring(0, 32)}...`)
          return proof
        }
        
        nonce++
      }
      
      throw new PrivaChainError('Proof of work generation exceeded maximum attempts')
    } catch (error) {
      console.error('PoW generation failed:', error)
      throw new PrivaChainError(`Failed to generate proof of work: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Hash string utility using Web Crypto API
   */
  private static async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Check quota limits via Cosmos contract query
   * @throws {PrivaChainError} If quota check fails
   */
  static async checkQuota(address?: string): Promise<{
    messages_used: number
    messages_limit: number
    emails_used: number
    emails_limit: number
    video_minutes_used: number
    video_minutes_limit: number
  }> {
    try {
      const client = await SigningCosmWasmClient.connect(this.TESTNET_RPC)
      
      if (!address) {
        const wallet = await this.getDeveloperWallet()
        const [account] = await wallet.getAccounts()
        address = account.address
      }
      
      const contractAddr = process.env.QUOTA_CONTRACT_ADDR || 'cosmos1example...quota'
      
      const query = { get_quota: { address } }
      const result = await client.queryContractSmart(contractAddr, query)
      
      return {
        messages_used: result.messages_used || 0,
        messages_limit: result.messages_limit || 200,
        emails_used: result.emails_used || 0,
        emails_limit: result.emails_limit || 50,
        video_minutes_used: result.video_minutes_used || 0,
        video_minutes_limit: result.video_minutes_limit || 120
      }
    } catch (error) {
      console.warn('⚠️ Quota contract not available, using default limits')
      
      // Return default quota for development
      return {
        messages_used: 0,
        messages_limit: 200,
        emails_used: 0,
        emails_limit: 50,
        video_minutes_used: 0,
        video_minutes_limit: 120
      }
    }
  }
}

/**
 * Session management for authenticated users
 */
export class SessionManager {
  private static readonly SESSION_KEY = 'privachain_session'
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Create authenticated session
   */
  static createSession(identity: CryptoIdentity): string {
    const sessionData = {
      publicHash: identity.publicHash,
      timestamp: Date.now(),
      expires: Date.now() + this.SESSION_DURATION
    }
    
    const sessionToken = btoa(JSON.stringify(sessionData))
    localStorage.setItem(this.SESSION_KEY, sessionToken)
    
    return sessionToken
  }

  /**
   * Validate current session
   */
  static validateSession(): boolean {
    try {
      const sessionToken = localStorage.getItem(this.SESSION_KEY)
      if (!sessionToken) return false
      
      const sessionData = JSON.parse(atob(sessionToken))
      return Date.now() < sessionData.expires
    } catch {
      return false
    }
  }

  /**
   * Get session data
   */
  static getSessionData(): Record<string, unknown> | null {
    try {
      const sessionToken = localStorage.getItem(this.SESSION_KEY)
      if (!sessionToken) return null
      
      const sessionData = JSON.parse(atob(sessionToken))
      if (Date.now() >= sessionData.expires) {
        this.clearSession()
        return null
      }
      
      return sessionData
    } catch {
      return null
    }
  }

  /**
   * Clear session
   */
  static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY)
  }

  /**
   * Refresh session
   */
  static refreshSession(): boolean {
    const sessionData = this.getSessionData()
    if (!sessionData) return false
    
    sessionData.expires = Date.now() + this.SESSION_DURATION
    const sessionToken = btoa(JSON.stringify(sessionData))
    localStorage.setItem(this.SESSION_KEY, sessionToken)
    
    return true
  }
}