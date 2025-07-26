import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { GasPrice } from '@cosmjs/stargate'
import { DeploymentConfig, DeploymentState, ContractAddress, getConfig } from './config'
import { ContractType } from './contracts'
import { generateContractCode, saveDeploymentState, loadDeploymentState } from './utils'

export class PrivaChainDeployer {
  private client: SigningCosmWasmClient | null = null
  private wallet: DirectSecp256k1HdWallet | null = null
  private config: DeploymentConfig
  private state: DeploymentState

  constructor(network: 'testnet' | 'mainnet' | 'local' = 'testnet') {
    this.config = getConfig(network)
    this.state = this.initializeState(network)
  }

  private initializeState(network: string): DeploymentState {
    return {
      timestamp: Date.now(),
      network,
      deployer: this.config.deployerAddress,
      contracts: {
        mail: null,
        domain: null,
        videoSignaling: null,
        rewards: null,
        consensus: null,
        zkRollup: null,
        prvToken: null,
        nft: null
      }
    }
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing PrivaChain Deployer...')
    
    // Create wallet from mnemonic
    this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      this.config.mnemonic,
      { prefix: 'cosmos' }
    )

    // Get accounts
    const accounts = await this.wallet.getAccounts()
    console.log('📱 Deployer address:', accounts[0].address)

    // Create signing client
    this.client = await SigningCosmWasmClient.connectWithSigner(
      this.config.rpcEndpoint,
      this.wallet,
      {
        gasPrice: GasPrice.fromString(this.config.gasPrice)
      }
    )

    console.log('✅ Connected to blockchain:', this.config.chainId)
  }

  async deployContract(
    contractType: ContractType,
    initMsg: any,
    label?: string
  ): Promise<ContractAddress> {
    if (!this.client || !this.wallet) {
      throw new Error('Deployer not initialized. Call initialize() first.')
    }

    const accounts = await this.wallet.getAccounts()
    const deployerAddress = accounts[0].address

    console.log(`📦 Deploying ${contractType} contract...`)

    try {
      // Generate contract code (in real implementation, this would be compiled WASM)
      const contractCode = generateContractCode(contractType)
      
      // Upload code to blockchain
      console.log(`⬆️  Uploading ${contractType} code...`)
      const uploadResult = await this.client.upload(
        deployerAddress,
        contractCode,
        'auto',
        `PrivaChain ${contractType} contract`
      )

      console.log(`✅ CodeSimple uploaded. CodeSimple ID: ${uploadResult.codeId}`)

      // Instantiate contract
      console.log(`🏗️  Instantiating ${contractType} contract...`)
      const instantiateResult = await this.client.instantiate(
        deployerAddress,
        uploadResult.codeId,
        initMsg,
        label || `PrivaChain ${contractType}`,
        'auto',
        {
          admin: deployerAddress
        }
      )

      const contractAddress: ContractAddress = {
        codeId: uploadResult.codeId,
        contractAddress: instantiateResult.contractAddress,
        txHash: instantiateResult.transactionHash
      }

      console.log(`✅ ${contractType} deployed:`, contractAddress.contractAddress)
      
      // Update state
      this.state.contracts[contractType] = contractAddress
      
      return contractAddress

    } catch (error) {
      console.error(`❌ Failed to deploy ${contractType}:`, error)
      throw error
    }
  }

  async deployPRIVToken(): Promise<ContractAddress> {
    const initMsg = {
      name: 'PrivaChain Token',
      symbol: 'PRIV',
      decimals: 18,
      initial_balances: [
        {
          address: this.config.deployerAddress,
          amount: '1000000000000000000000000000' // 1 billion PRIV
        }
      ],
      mint: {
        minter: this.config.deployerAddress,
        cap: '10000000000000000000000000000' // 10 billion cap
      }
    }

    return await this.deployContract('prvToken', initMsg, 'PRIV Token')
  }

  async deployNFTContract(_prvTokenAddress: string): Promise<ContractAddress> {
    const initMsg = {
      name: 'PrivaChain Identity NFT',
      symbol: 'PRIV-ID',
      minter: this.config.deployerAddress,
      premium_price: '100000000000000000000' // 100 PRIV
    }

    return await this.deployContract('nft', initMsg, 'PrivaChain NFT')
  }

  async deployMailContract(): Promise<ContractAddress> {
    const initMsg = {
      admin: this.config.deployerAddress,
      pow_difficulty: 4,
      max_email_size: 1048576 // 1MB
    }

    return await this.deployContract('mail', initMsg, 'Anonymous Envelope')
  }

  async deployDomainContract(): Promise<ContractAddress> {
    const initMsg = {
      admin: this.config.deployerAddress,
      registration_fee: '10000000000000000000', // 10 PRIV
      renewal_period: 31536000 // 1 year
    }

    return await this.deployContract('domain', initMsg, 'Anonymous DNS')
  }

  async deployVideoSignalingContract(): Promise<ContractAddress> {
    const initMsg = {
      admin: this.config.deployerAddress,
      session_timeout: 3600, // 1 hour
      max_participants: 50
    }

    return await this.deployContract('videoSignaling', initMsg, 'VideoCamera Signaling')
  }

  async deployRewardsContract(prvTokenAddress: string): Promise<ContractAddress> {
    const initMsg = {
      admin: this.config.deployerAddress,
      priv_token_address: prvTokenAddress,
      rate_per_mb: '1000000000000000', // 0.001 PRIV per MB
      min_stake: '10000000000000000000000' // 10,000 PRIV
    }

    return await this.deployContract('rewards', initMsg, 'VideoCamera Rewards')
  }

  async deployConsensusContract(): Promise<ContractAddress> {
    const initMsg = {
      admin: this.config.deployerAddress,
      min_stake: '100000000000000000000000', // 100,000 PRIV
      max_validators: 100,
      slash_percentage: 5
    }

    return await this.deployContract('consensus', initMsg, 'Consensus Manager')
  }

  async deployZKRollupContract(): Promise<ContractAddress> {
    const initMsg = {
      admin: this.config.deployerAddress,
      verifier_key: '0x' + '0'.repeat(64), // Placeholder verifier key
      batch_size: 100,
      challenge_period: 604800 // 1 week
    }

    return await this.deployContract('zkRollup', initMsg, 'ZK Rollup')
  }

  async deployAllContracts(): Promise<DeploymentState> {
    console.log('🚀 Starting full PrivaChain deployment...')
    
    try {
      // Deploy core token first
      console.log('1/8 Deploying PRIV Token...')
      const prvToken = await this.deployPRIVToken()
      
      // Deploy NFT contract
      console.log('2/8 Deploying NFT Contract...')
      const nft = await this.deployNFTContract(prvToken.contractAddress)
      
      // Deploy mail contract
      console.log('3/8 Deploying Envelope Contract...')
      const mail = await this.deployMailContract()
      
      // Deploy domain contract
      console.log('4/8 Deploying Domain Contract...')
      const domain = await this.deployDomainContract()
      
      // Deploy video signaling
      console.log('5/8 Deploying VideoCamera Signaling...')
      const videoSignaling = await this.deployVideoSignalingContract()
      
      // Deploy rewards contract (depends on PRIV token)
      console.log('6/8 Deploying Rewards Contract...')
      const rewards = await this.deployRewardsContract(prvToken.contractAddress)
      
      // Deploy consensus contract
      console.log('7/8 Deploying Consensus Contract...')
      const consensus = await this.deployConsensusContract()
      
      // Deploy ZK rollup
      console.log('8/8 Deploying ZK Rollup...')
      const zkRollup = await this.deployZKRollupContract()

      console.log('✅ All contracts deployed successfully!')
      
      // Save deployment state
      await saveDeploymentState(this.state)
      
      return this.state

    } catch (error) {
      console.error('❌ Deployment failed:', error)
      throw error
    }
  }

  async verifyDeployment(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Client not initialized')
    }

    console.log('🔍 Verifying deployment...')
    
    try {
      for (const [contractType, contractInfo] of Object.entries(this.state.contracts)) {
        if (contractInfo) {
          console.log(`Verifying ${contractType}...`)
          
          // Query contract info
          const contractInfo_result = await this.client.getContract(contractInfo.contractAddress)
          
          if (!contractInfo_result) {
            console.error(`❌ Contract ${contractType} not found at ${contractInfo.contractAddress}`)
            return false
          }
          
          console.log(`✅ ${contractType} verified:`, contractInfo.contractAddress)
        }
      }
      
      console.log('✅ All contracts verified successfully!')
      return true
      
    } catch (error) {
      console.error('❌ Verification failed:', error)
      return false
    }
  }

  getDeploymentState(): DeploymentState {
    return this.state
  }

  async loadExistingDeployment(filePath?: string): Promise<void> {
    const existingState = await loadDeploymentState(filePath)
    if (existingState) {
      this.state = existingState
      console.log('📂 Loaded existing deployment state')
    }
  }
}

// Convenience functions for different deployment scenarios
export async function deployToTestnet(): Promise<DeploymentState> {
  const deployer = new PrivaChainDeployer('testnet')
  await deployer.initialize()
  return await deployer.deployAllContracts()
}

export async function deployToMainnet(): Promise<DeploymentState> {
  const deployer = new PrivaChainDeployer('mainnet')
  await deployer.initialize()
  return await deployer.deployAllContracts()
}

export async function deployToLocal(): Promise<DeploymentState> {
  const deployer = new PrivaChainDeployer('local')
  await deployer.initialize()
  return await deployer.deployAllContracts()
}

// Quick deployment function for development
export async function quickDeploy(network: 'testnet' | 'mainnet' | 'local' = 'testnet'): Promise<void> {
  console.log(`🚀 Quick deploying to ${network}...`)
  
  const deployer = new PrivaChainDeployer(network)
  await deployer.initialize()
  
  const state = await deployer.deployAllContracts()
  const verified = await deployer.verifyDeployment()
  
  if (verified) {
    console.log('🎉 Deployment completed successfully!')
    console.log('📋 Contract addresses:')
    
    for (const [name, contract] of Object.entries(state.contracts)) {
      if (contract) {
        console.log(`  ${name}: ${contract.contractAddress}`)
      }
    }
  } else {
    throw new Error('Deployment verification failed')
  }
}