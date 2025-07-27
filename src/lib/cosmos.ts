/**
 * Cosmos SDK integration for PrivaChain ZK authentication
 * Connects to Osmosis testnet for real blockchain functionality
 */

import { SigningStargateClient, StargateClient } from '@cosmjs/stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { stringToPath } from '@cosmjs/crypto'
import { coins, GasPrice } from '@cosmjs/stargate'
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx'
import { toUtf8 } from '@cosmjs/encoding'

// Osmosis testnet configuration
export const COSMOS_CONFIG = {
  rpcEndpoint: 'https://rpc.osmotest5.osmosis.zone',
  chainId: 'osmo-test-5',
  prefix: 'osmo',
  gasPrice: GasPrice.fromString('0.025uosmo'),
  denom: 'uosmo',
  faucetUrl: 'https://faucet.osmosis.zone'
}

// Smart contract addresses for PrivaChain services
export const CONTRACT_ADDRESSES = {
  // These would be deployed contracts on testnet
  zkAuth: 'osmo1...',  // ZK authentication contract
  mailService: 'osmo1...',  // Anonymous mail contract
  domainRegistry: 'osmo1...',  // .prv domain registry
  videoSignaling: 'osmo1...'  // VideoCamera call signaling
}

export interface CosmosAccount {
  address: string
  balance: string
  sequence: number
  accountNumber: number
}

export interface ZKAuthMessage {
  register_identity: {
    public_hash: string
    zk_proof: string
    ephemeral_key: string
  }
}

export interface DomainRegistrationMessage {
  register_domain: {
    domain_name: string
    zk_proof_hash: string
    public_key: string
    expiration_blocks: number
  }
}

export interface VideoSessionMessage {
  start_session: {
    receiver: string
    stun_turn_server: string
    session_id: string
  }
}

/**
 * Cosmos blockchain client for PrivaChain operations
 */
export class CosmosClient {
  private client: StargateClient | null = null
  private signingClient: SigningStargateClient | null = null
  private wallet: DirectSecp256k1HdWallet | null = null
  private address: string | null = null

  async connect(): Promise<boolean> {
    try {
      console.log('Connecting to Cosmos testnet:', COSMOS_CONFIG.rpcEndpoint)
      this.client = await StargateClient.connect(COSMOS_CONFIG.rpcEndpoint)
      
      // Test connection
      const chainId = await this.client.getChainId()
      console.log('Connected to chain:', chainId)
      
      return chainId === COSMOS_CONFIG.chainId
    } catch (error) {
      console.error('Failed to connect to Cosmos:', error)
      return false
    }
  }

  async createWallet(mnemonic?: string): Promise<string> {
    try {
      if (mnemonic) {
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
          prefix: COSMOS_CONFIG.prefix,
          hdPaths: [stringToPath("m/44'/118'/0'/0/0")]
        })
      } else {
        this.wallet = await DirectSecp256k1HdWallet.generate(24, {
          prefix: COSMOS_CONFIG.prefix,
          hdPaths: [stringToPath("m/44'/118'/0'/0/0")]
        })
      }

      const [firstAccount] = await this.wallet.getAccounts()
      this.address = firstAccount.address
      
      console.log('Wallet created with address:', this.address)
      return this.address
    } catch (error) {
      console.error('Failed to create wallet:', error)
      throw error
    }
  }

  async connectWallet(): Promise<SigningStargateClient | null> {
    if (!this.wallet || !this.address) {
      throw new Error('Wallet not created')
    }

    try {
      this.signingClient = await SigningStargateClient.connectWithSigner(
        COSMOS_CONFIG.rpcEndpoint,
        this.wallet,
        {
          gasPrice: COSMOS_CONFIG.gasPrice,
        }
      )
      
      console.log('Signing client connected')
      return this.signingClient
    } catch (error) {
      console.error('Failed to connect signing client:', error)
      return null
    }
  }

  async getAccount(): Promise<CosmosAccount | null> {
    if (!this.client || !this.address) return null

    try {
      const account = await this.client.getAccount(this.address)
      const balance = await this.client.getBalance(this.address, COSMOS_CONFIG.denom)
      
      return {
        address: this.address,
        balance: balance.amount,
        sequence: account?.sequence || 0,
        accountNumber: account?.accountNumber || 0
      }
    } catch (error) {
      console.error('Failed to get account:', error)
      return null
    }
  }

  async registerZKIdentity(publicHash: string, zkProof: string, ephemeralKey: string): Promise<string | null> {
    if (!this.signingClient || !this.address) {
      throw new Error('Signing client not connected')
    }

    try {
      const msg: ZKAuthMessage = {
        register_identity: {
          public_hash: publicHash,
          zk_proof: zkProof,
          ephemeral_key: ephemeralKey
        }
      }

      const executeMsg = {
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: MsgExecuteContract.fromPartial({
          sender: this.address,
          contract: CONTRACT_ADDRESSES.zkAuth,
          msg: toUtf8(JSON.stringify(msg)),
          funds: []
        })
      }

      const fee = {
        amount: coins(5000, COSMOS_CONFIG.denom),
        gas: '200000'
      }

      const result = await this.signingClient.signAndBroadcast(
        this.address,
        [executeMsg],
        fee,
        'Register ZK Identity'
      )

      console.log('ZK Identity registered:', result.transactionHash)
      return result.transactionHash
    } catch (error) {
      console.error('Failed to register ZK identity:', error)
      return null
    }
  }

  async registerDomain(domainName: string, zkProofHash: string, publicKey: string): Promise<string | null> {
    if (!this.signingClient || !this.address) {
      throw new Error('Signing client not connected')
    }

    try {
      const msg: DomainRegistrationMessage = {
        register_domain: {
          domain_name: domainName,
          zk_proof_hash: zkProofHash,
          public_key: publicKey,
          expiration_blocks: 525600 // ~1 year at 6s block time
        }
      }

      const executeMsg = {
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: MsgExecuteContract.fromPartial({
          sender: this.address,
          contract: CONTRACT_ADDRESSES.domainRegistry,
          msg: toUtf8(JSON.stringify(msg)),
          funds: coins(10000, COSMOS_CONFIG.denom) // Domain registration fee
        })
      }

      const fee = {
        amount: coins(5000, COSMOS_CONFIG.denom),
        gas: '200000'
      }

      const result = await this.signingClient.signAndBroadcast(
        this.address,
        [executeMsg],
        fee,
        `Register domain ${domainName}.prv`
      )

      console.log('Domain registered:', result.transactionHash)
      return result.transactionHash
    } catch (error) {
      console.error('Failed to register domain:', error)
      return null
    }
  }

  async startVideoSession(receiver: string, stunTurnServer: string): Promise<string | null> {
    if (!this.signingClient || !this.address) {
      throw new Error('Signing client not connected')
    }

    try {
      const sessionId = this.generateSessionId(this.address, receiver)
      
      const msg: VideoSessionMessage = {
        start_session: {
          receiver,
          stun_turn_server: stunTurnServer,
          session_id: sessionId
        }
      }

      const executeMsg = {
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: MsgExecuteContract.fromPartial({
          sender: this.address,
          contract: CONTRACT_ADDRESSES.videoSignaling,
          msg: toUtf8(JSON.stringify(msg)),
          funds: []
        })
      }

      const fee = {
        amount: coins(3000, COSMOS_CONFIG.denom),
        gas: '150000'
      }

      const result = await this.signingClient.signAndBroadcast(
        this.address,
        [executeMsg],
        fee,
        'Start video session'
      )

      console.log('VideoCamera session started:', result.transactionHash)
      return result.transactionHash
    } catch (error) {
      console.error('Failed to start video session:', error)
      return null
    }
  }

  async queryDomain(domainName: string): Promise<Record<string, unknown> | null> {
    if (!this.client) return null

    try {
      const queryMsg = {
        get_domain: { domain: domainName }
      }

      const result = await this.client.queryContractSmart(
        CONTRACT_ADDRESSES.domainRegistry,
        queryMsg
      )

      return result
    } catch (error) {
      console.error('Failed to query domain:', error)
      return null
    }
  }

  async queryZKIdentity(publicHash: string): Promise<Record<string, unknown> | null> {
    if (!this.client) return null

    try {
      const queryMsg = {
        get_identity: { public_hash: publicHash }
      }

      const result = await this.client.queryContractSmart(
        CONTRACT_ADDRESSES.zkAuth,
        queryMsg
      )

      return result
    } catch (error) {
      console.error('Failed to query ZK identity:', error)
      return null
    }
  }

  private generateSessionId(initiator: string, receiver: string): string {
    const timestamp = Date.now()
    const data = `${initiator}-${receiver}-${timestamp}`
    return Buffer.from(data).toString('base64').substring(0, 32)
  }

  getMnemonic(): string | null {
    return this.wallet?.mnemonic || null
  }

  getAddress(): string | null {
    return this.address
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.disconnect()
      this.client = null
    }
    this.signingClient = null
    this.wallet = null
    this.address = null
  }

  // Utility method to get testnet tokens from faucet
  getFaucetInfo(): { url: string; address: string | null } {
    return {
      url: COSMOS_CONFIG.faucetUrl,
      address: this.address
    }
  }
}

// Singleton instance
export const cosmosClient = new CosmosClient()