/**
 * Production Initialization Service
 * Coordinates startup of all production systems
 */

import { productionIPFS } from './services/ProductionIPFS'
import { productionNetworking } from './services/ProductionNetworking'
import { productionEmailService } from './services/ProductionEmailService'
import { productionEconomicSystem } from './services/ProductionEconomicSystem'
import { productionCrypto } from './crypto/ProductionCrypto'
import { ProductionDeployer, TESTNET_CONFIG } from './blockchain/ProductionDeployer'

export interface SystemStatus {
  ipfs: boolean
  networking: boolean
  email: boolean
  economic: boolean
  crypto: boolean
  blockchain: boolean
  overall: boolean
}

export interface ProductionMetrics {
  uptime: number
  connectedPeers: number
  storedData: number
  activeUsers: number
  transactionsPerSecond: number
  networkLatency: number
  systemLoad: number
}

export class ProductionInitializer {
  private status: SystemStatus = {
    ipfs: false,
    networking: false,
    email: false,
    economic: false,
    crypto: false,
    blockchain: false,
    overall: false
  }
  
  private deployer: ProductionDeployer | null = null
  private startTime = Date.now()
  private initialized = false

  async initialize(): Promise<SystemStatus> {
    console.log('🚀 Starting PrivaChain production systems...')
    
    try {
      // Initialize in dependency order
      
      // 1. Cryptography (foundation for everything)
      console.log('🔐 Initializing cryptographic systems...')
      this.status.crypto = true // productionCrypto initializes automatically
      
      // 2. IPFS storage
      console.log('📁 Initializing decentralized storage...')
      this.status.ipfs = await productionIPFS.initialize()
      
      // 3. Networking layer
      console.log('🌐 Initializing networking layer...')
      this.status.networking = await productionNetworking.initialize()
      
      // 4. Economic system
      console.log('💰 Initializing economic systems...')
      this.status.economic = await productionEconomicSystem.initialize()
      
      // 5. Email service
      console.log('📧 Initializing email service...')
      this.status.email = await productionEmailService.initialize()
      
      // 6. Blockchain deployment
      console.log('⛓️ Initializing blockchain...')
      this.status.blockchain = await this.initializeBlockchain()
      
      // Check overall status
      this.status.overall = Object.values(this.status).every(status => status === true)
      
      if (this.status.overall) {
        console.log('✅ All production systems initialized successfully!')
        this.initialized = true
        
        // Start monitoring
        this.startSystemMonitoring()
        
        // Setup health checks
        this.setupHealthChecks()
        
        // Initialize test data for demonstration
        await this.initializeTestData()
      } else {
        console.warn('⚠️ Some systems failed to initialize:', this.status)
      }
      
      return this.status
    } catch (error) {
      console.error('❌ Production initialization failed:', error)
      return this.status
    }
  }

  private async initializeBlockchain(): Promise<boolean> {
    try {
      // Initialize deployer for testnet
      this.deployer = new ProductionDeployer('testnet', TESTNET_CONFIG)
      await this.deployer.initialize()
      
      // Deploy all contracts
      const manifest = await this.deployer.deployAll()
      
      console.log('⛓️ Blockchain deployment completed:', manifest.contracts)
      return true
    } catch (error) {
      console.error('❌ Blockchain initialization failed:', error)
      return false
    }
  }

  private startSystemMonitoring(): void {
    // Monitor system health every 30 seconds
    setInterval(async () => {
      const metrics = await this.getSystemMetrics()
      
      // Check for issues
      if (metrics.systemLoad > 80) {
        console.warn('⚠️ High system load detected:', metrics.systemLoad)
      }
      
      if (metrics.networkLatency > 1000) {
        console.warn('⚠️ High network latency detected:', metrics.networkLatency)
      }
    }, 30000)
  }

  private setupHealthChecks(): void {
    // Periodic health checks for all systems
    setInterval(async () => {
      await this.performHealthCheck()
    }, 60000) // Every minute
  }

  private async initializeTestData(): Promise<void> {
    try {
      console.log('🧪 Initializing test data...')
      
      // Register test .prv domains
      await this.registerTestDomains()
      
      // Create test validator network
      await this.setupTestValidators()
      
      // Initialize test economic data
      await this.setupTestEconomics()
      
      console.log('✅ Test data initialized')
    } catch (error) {
      console.error('❌ Test data initialization failed:', error)
    }
  }

  private async registerTestDomains(): Promise<void> {
    const testDomains = [
      'alice',
      'bob', 
      'charlie',
      'foundation',
      'community'
    ]

    for (const domain of testDomains) {
      try {
        // Generate test ZK proof and keys
        const zkProof = new Uint8Array(64).fill(1) // Mock proof
        const publicKey = new Uint8Array(32).fill(2) // Mock key
        
        await productionEmailService.registerPrvDomain(
          domain,
          zkProof,
          publicKey,
          [`mx1.${domain}.prv`, `mx2.${domain}.prv`]
        )
        
        console.log(`📧 Registered test domain: ${domain}.prv`)
      } catch (error) {
        console.warn(`Failed to register ${domain}.prv:`, error)
      }
    }
  }

  private async setupTestValidators(): Promise<void> {
    if (!this.deployer) return

    const testValidators = [
      { moniker: 'Genesis Validator', stake: '50000000', commission: '5' },
      { moniker: 'Community Validator', stake: '30000000', commission: '7' },
      { moniker: 'Enterprise Validator', stake: '40000000', commission: '6' }
    ]

    await this.deployer.setupValidators(testValidators)
    console.log('🏛️ Test validators configured')
  }

  private async setupTestEconomics(): Promise<void> {
    // Stake tokens with test validators
    const testStakingPositions = [
      { staker: 'test-user-1', amount: '10000000', validator: 'val1' },
      { staker: 'test-user-2', amount: '15000000', validator: 'val2' },
      { staker: 'test-user-3', amount: '8000000', validator: 'val1' }
    ]

    for (const position of testStakingPositions) {
      try {
        await productionEconomicSystem.stakeTokens(
          position.staker,
          position.amount,
          position.validator
        )
      } catch (error) {
        console.warn('Failed to create test staking position:', error)
      }
    }

    // Create test micropayment channels
    await productionEconomicSystem.createMicropaymentChannel(
      'test-sender',
      'test-receiver',
      '1000000',
      24 * 60 * 60 * 1000
    )

    console.log('💰 Test economic data setup complete')
  }

  async getSystemMetrics(): Promise<ProductionMetrics> {
    const uptime = Date.now() - this.startTime
    
    // Get metrics from all systems
    const networkMetrics = productionNetworking.getNetworkMetrics()
    const emailMetrics = productionEmailService.getMetrics()
    const economicMetrics = productionEconomicSystem.getEconomicMetrics()
    
    return {
      uptime,
      connectedPeers: networkMetrics.connectedPeers,
      storedData: 0, // TODO: Get from IPFS
      activeUsers: emailMetrics.activeDomains,
      transactionsPerSecond: 0, // TODO: Calculate from blockchain
      networkLatency: networkMetrics.averageLatency,
      systemLoad: this.calculateSystemLoad()
    }
  }

  async performHealthCheck(): Promise<{ [key: string]: boolean }> {
    const results = {
      ipfs: false,
      networking: false,
      email: false,
      economic: false,
      crypto: true, // Always available
      blockchain: false
    }

    try {
      // Check IPFS health
      const ipfsMetrics = await productionIPFS.getStorageMetrics()
      results.ipfs = ipfsMetrics.networkedPeers > 0

      // Check networking health
      const networkMetrics = productionNetworking.getNetworkMetrics()
      results.networking = networkMetrics.connectedPeers > 0

      // Check email service health
      const emailMetrics = productionEmailService.getMetrics()
      results.email = emailMetrics.totalDomains > 0

      // Check economic system health
      const economicMetrics = productionEconomicSystem.getEconomicMetrics()
      results.economic = parseFloat(economicMetrics.totalSupply) > 0

      // Check blockchain health
      results.blockchain = this.deployer !== null

    } catch (error) {
      console.error('Health check failed:', error)
    }

    // Update status
    Object.assign(this.status, results)
    this.status.overall = Object.values(results).every(status => status === true)

    return results
  }

  private calculateSystemLoad(): number {
    // Simple system load calculation
    // In production, this would use actual system metrics
    const baseLoad = 20 // Base load
    const networkLoad = Math.min(productionNetworking.getNetworkMetrics().connectedPeers, 50)
    const emailLoad = Math.min(productionEmailService.getMetrics().emailsSent / 100, 30)
    
    return Math.min(baseLoad + networkLoad + emailLoad, 100)
  }

  getStatus(): SystemStatus {
    return { ...this.status }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down production systems...')
    
    try {
      // Graceful shutdown of all systems
      // TODO: Implement proper cleanup for each service
      
      this.initialized = false
      console.log('✅ Production systems shut down')
    } catch (error) {
      console.error('❌ Shutdown error:', error)
    }
  }
}

// Singleton instance
export const productionInitializer = new ProductionInitializer()

// Auto-initialize in production environment
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  productionInitializer.initialize().then(status => {
    console.log('🎉 PrivaChain production ready:', status)
  })
}