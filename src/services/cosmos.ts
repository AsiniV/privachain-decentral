// PrivaChain WebRTC signaling integration with Cosmos blockchain

import { SigningCosmWasmClient, CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { GasPrice } from '@cosmjs/stargate'

// Cosmos configuration for testnet
const COSMOS_CONFIG = {
  chainId: 'privachain-testnet-1',
  rpcEndpoint: 'https://rpc.privachain-testnet.com',
  addressPrefix: 'cosmos',
  gasPrice: GasPrice.fromString('0.001upriv'),
  testWallet: 'cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k'
}

// Contract addresses (will be populated after deployment)
const CONTRACTS = {
  videoSignaling: 'cosmos1...',  // VideoCamera signaling contract
  mail: 'cosmos1...',           // Envelope contract
  messaging: 'cosmos1...',      // Messaging contract
  identity: 'cosmos1...'        // Identity contract
}

export class CosmosBlockchainService {
  private client: CosmWasmClient | null = null
  private signingClient: SigningCosmWasmClient | null = null
  private wallet: DirectSecp256k1HdWallet | null = null

  async initialize(mnemonic?: string) {
    try {
      // Initialize read-only client
      this.client = await CosmWasmClient.connect(COSMOS_CONFIG.rpcEndpoint)
      
      // Initialize signing client if mnemonic provided
      if (mnemonic) {
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
          prefix: COSMOS_CONFIG.addressPrefix
        })
        
        this.signingClient = await SigningCosmWasmClient.connectWithSigner(
          COSMOS_CONFIG.rpcEndpoint,
          this.wallet,
          {
            gasPrice: COSMOS_CONFIG.gasPrice
          }
        )
      }
      
      console.log('✅ Cosmos blockchain service initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Cosmos service:', error)
      return false
    }
  }

  // VideoCamera Call Signaling on Blockchain
  async initiateVideoCall(recipientAddress: string, turnServers: string[]) {
    if (!this.signingClient || !this.wallet) {
      throw new Error('Signing client not initialized')
    }

    const [account] = await this.wallet.getAccounts()
    
    const msg = {
      start_session: {
        receiver: recipientAddress,
        stun_turn_server: turnServers[0], // Primary TURN server
        metadata: {
          call_type: 'video',
          encryption_key: await this.generateSessionKey(),
          quality_preference: 'hd'
        }
      }
    }

    try {
      const result = await this.signingClient.execute(
        account.address,
        CONTRACTS.videoSignaling,
        msg,
        'auto',
        'Initiate video call'
      )

      const sessionId = this.extractSessionId(result)
      
      console.log('📞 VideoCamera call initiated on blockchain:', sessionId)
      return {
        sessionId,
        transactionHash: result.transactionHash,
        blockHeight: result.height
      }
    } catch (error) {
      console.error('❌ Failed to initiate video call:', error)
      throw error
    }
  }

  // Register .prv Email Domain
  async registerPrvDomain(domain: string, publicKey: string) {
    if (!this.signingClient || !this.wallet) {
      throw new Error('Signing client not initialized')
    }

    const [account] = await this.wallet.getAccounts()
    
    // Generate ZK proof of ownership (simplified for demo)
    const zkProof = await this.generateZkProof(account.address, domain)
    
    const msg = {
      register_domain: {
        domain,
        zk_proof: zkProof,
        public_key: publicKey,
        mx_records: [`mx1.privachain.org`, `mx2.privachain.org`]
      }
    }

    // Calculate registration fee (1 PRIV = 1,000,000 upriv)
    const registrationFee = [{ denom: 'upriv', amount: '1000000' }]

    try {
      const result = await this.signingClient.execute(
        account.address,
        CONTRACTS.mail,
        msg,
        'auto',
        'Register .prv domain',
        registrationFee
      )

      console.log('📧 .prv domain registered:', domain)
      return {
        domain: `${domain}.prv`,
        transactionHash: result.transactionHash,
        blockHeight: result.height,
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
      }
    } catch (error) {
      console.error('❌ Failed to register domain:', error)
      throw error
    }
  }

  // Send Encrypted Email
  async sendEncryptedEmail(recipientDomain: string, contentCid: string) {
    if (!this.signingClient || !this.wallet) {
      throw new Error('Signing client not initialized')
    }

    const [account] = await this.wallet.getAccounts()
    
    // Generate proof-of-work for anti-spam
    const powProof = await this.generateProofOfWork(contentCid)
    
    const msg = {
      send_email: {
        recipient_domain: recipientDomain,
        content_cid: contentCid,
        pow_proof: powProof,
        sender_alias: null // Auto-generated anonymous alias
      }
    }

    // Email fee (0.01 PRIV = 10,000 upriv)
    const emailFee = [{ denom: 'upriv', amount: '10000' }]

    try {
      const result = await this.signingClient.execute(
        account.address,
        CONTRACTS.mail,
        msg,
        'auto',
        'Send encrypted email',
        emailFee
      )

      console.log('✉️ Encrypted email sent to:', recipientDomain)
      return {
        emailId: this.extractEmailId(result),
        transactionHash: result.transactionHash,
        blockHeight: result.height
      }
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      throw error
    }
  }

  // Query User's .prv Domain
  async getUserDomain(domain: string) {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    try {
      const result = await this.client.queryContractSmart(CONTRACTS.mail, {
        get_domain: { domain }
      })

      return {
        domain: result.domain,
        publicKey: result.public_key,
        mxRecords: result.mx_records,
        registeredAt: new Date(result.registered_at * 1000),
        expiresAt: new Date(result.expires_at * 1000),
        active: result.active,
        reputation: result.reputation
      }
    } catch (error) {
      console.error('❌ Failed to query domain:', error)
      return null
    }
  }

  // Query User's Emails
  async getUserEmails(domain: string, limit = 50) {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    try {
      const result = await this.client.queryContractSmart(CONTRACTS.mail, {
        get_emails: { domain, limit }
      })

      return result.emails.map((email: {
        id: string;
        sender_alias: string;
        content_cid: string;
        timestamp: number;
        delivered: boolean;
      }) => ({
        id: email.id,
        senderAlias: email.sender_alias,
        contentCid: email.content_cid,
        timestamp: new Date(email.timestamp * 1000),
        delivered: email.delivered
      }))
    } catch (error) {
      console.error('❌ Failed to query emails:', error)
      return []
    }
  }

  // Get Network Statistics
  async getNetworkStats() {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    try {
      const mailStats = await this.client.queryContractSmart(CONTRACTS.mail, {
        get_stats: {}
      })

      const blockHeight = await this.client.getHeight()
      
      return {
        blockHeight,
        totalDomains: mailStats.total_domains,
        activeDomains: mailStats.active_domains,
        totalEmails: mailStats.total_emails,
        totalRelays: mailStats.total_relays,
        activeRelays: mailStats.active_relays,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('❌ Failed to get network stats:', error)
      return null
    }
  }

  // Staking and Rewards
  async stakeTokens(amount: string, validatorAddress: string) {
    if (!this.signingClient || !this.wallet) {
      throw new Error('Signing client not initialized')
    }

    const [account] = await this.wallet.getAccounts()
    
    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: {
        delegatorAddress: account.address,
        validatorAddress,
        amount: { denom: 'upriv', amount }
      }
    }

    try {
      const result = await this.signingClient.signAndBroadcast(
        account.address,
        [msg],
        'auto',
        'Stake PRIV tokens'
      )

      console.log('🥩 Tokens staked successfully')
      return {
        amount,
        validator: validatorAddress,
        transactionHash: result.transactionHash
      }
    } catch (error) {
      console.error('❌ Failed to stake tokens:', error)
      throw error
    }
  }

  // Get User's Staking Info
  async getStakingInfo(userAddress: string) {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    try {
      // Query delegations
      const delegations = await this.client.getBalance(userAddress, 'upriv')
      
      // For a full implementation, you'd query the staking module
      // This is a simplified version
      return {
        totalStaked: delegations.amount,
        availableRewards: '0', // Would be calculated from staking rewards
        validators: [] // Would list delegated validators
      }
    } catch (error) {
      console.error('❌ Failed to get staking info:', error)
      return null
    }
  }

  // Helper Methods
  private async generateSessionKey(): Promise<string> {
    // Generate a random session key for WebRTC encryption
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  private async generateZkProof(address: string, domain: string): Promise<string> {
    // In a real implementation, this would generate a ZK-SNARK proof
    // For demo purposes, we'll create a simple hash-based proof
    const encoder = new TextEncoder()
    const data = encoder.encode(address + domain + Date.now())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('')
  }

  private async generateProofOfWork(contentCid: string): Promise<string> {
    // Simple proof-of-work implementation
    let nonce = 0
    const target = 12 // Difficulty (number of leading zeros)
    
    while (true) {
      const data = contentCid + nonce.toString()
      const encoder = new TextEncoder()
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
      const hash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('')
      
      // Check if hash has enough leading zeros
      if (hash.startsWith('0'.repeat(Math.floor(target / 4)))) {
        return nonce.toString(16).padStart(64, '0') + hash
      }
      
      nonce++
      if (nonce > 100000) break // Prevent infinite loop in demo
    }
    
    return '0'.repeat(96) // Fallback for demo
  }

  private extractSessionId(result: { events: Array<{ attributes: Array<{ key: string; value: string }> }> }): string {
    // Extract session ID from transaction events
    for (const event of result.events) {
      if (event.type === 'wasm') {
        for (const attr of event.attributes) {
          if (attr.key === 'session_id') {
            return attr.value
          }
        }
      }
    }
    return Math.random().toString(36).substring(7)
  }

  private extractEmailId(result: { events: Array<{ attributes: Array<{ key: string; value: string }> }> }): string {
    // Extract email ID from transaction events
    for (const event of result.events) {
      if (event.type === 'wasm') {
        for (const attr of event.attributes) {
          if (attr.key === 'email_id') {
            return attr.value
          }
        }
      }
    }
    return Math.random().toString(36).substring(7)
  }
}

// Export singleton instance
export const cosmosService = new CosmosBlockchainService()

// Initialize with test wallet for development
if (process.env.NODE_ENV === 'development') {
  // Runtime guard: frontend should never initialize with developer mnemonic
  if (typeof window !== 'undefined') {
    console.error(
      'SECURITY: Frontend cannot initialize cosmos service with developer mnemonic. ' +
      'Use relayer service API instead: POST /api/tx/sponsor'
    )
  } else {
    // Server-side initialization only
    const DEV_MNEMONIC = process.env.DEVELOPER_MNEMONIC
    if (DEV_MNEMONIC) {
      cosmosService.initialize(DEV_MNEMONIC)
    } else {
      console.warn('⚠️ DEVELOPER_MNEMONIC not set - cosmos service not initialized')
    }
  }
}