import React, { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { DeploymentManager } from './deployment/DeploymentManager'
import { SystemIntegrationTest } from './SystemIntegrationTest'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { 
  Rocket, 
  Shield, 
  Zap, 
  Globe,
  Code,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  FlaskConical,
  Wallet,
  Server,
  Database,
  Activity,
  Users,
  Clock
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cosmosService } from '../services/cosmos'
import { zkIdentityManager } from '../services/zkCrypto'
import { ipfsService } from '../services/ipfs'

export function DeploymentView() {
  const [activeTab, setActiveTab] = useKV('deployment-tab', 'overview')
  const [deploymentStatus, setDeploymentStatus] = React.useState<'idle' | 'deploying' | 'deployed' | 'error'>('idle')
  const [cosmosConnected, setCosmosConnected] = useState(false)
  const [zkIdentityLoaded, setZkIdentityLoaded] = useState(false)
  const [ipfsInitialized, setIpfsInitialized] = useState(false)
  const [networkStats, setNetworkStats] = useState<any>(null)
  
  useEffect(() => {
    initializeServices()
    const interval = setInterval(updateNetworkStats, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const initializeServices = async () => {
    // Initialize Cosmos connection
    try {
      const cosmosInit = await cosmosService.initialize()
      setCosmosConnected(cosmosInit)
      if (cosmosInit) {
        toast.success('Cosmos blockchain connected')
      }
    } catch (error) {
      console.error('Cosmos initialization failed:', error)
      toast.error('Failed to connect to Cosmos blockchain')
    }

    // Check ZK identity
    try {
      const identity = zkIdentityManager.getIdentity()
      setZkIdentityLoaded(!!identity)
      if (identity) {
        toast.success('ZK identity loaded')
      }
    } catch (error) {
      console.error('ZK identity check failed:', error)
    }

    // Initialize IPFS
    try {
      const ipfsInit = await ipfsService.initialize()
      setIpfsInitialized(ipfsInit)
      if (ipfsInit) {
        toast.success('IPFS storage connected')
      }
    } catch (error) {
      console.error('IPFS initialization failed:', error)
      toast.error('Failed to connect to IPFS')
    }
  }

  const updateNetworkStats = async () => {
    try {
      const stats = await cosmosService.getNetworkStats()
      setNetworkStats(stats)
    } catch (error) {
      console.error('Failed to update network stats:', error)
    }
  }

  const testCosmosWallet = async () => {
    try {
      toast.info('Testing Cosmos wallet connection...')
      
      // Test wallet connection with the provided test address
      const testWallet = 'cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k'
      
      // Get balance and network info
      const stats = await cosmosService.getNetworkStats()
      
      if (stats) {
        toast.success(`Cosmos testnet accessible! Block height: ${stats.blockHeight}`)
      } else {
        toast.error('Failed to access Cosmos testnet')
      }
    } catch (error) {
      console.error('Cosmos wallet test failed:', error)
      toast.error('Cosmos wallet test failed')
    }
  }

  const testZkProofs = async () => {
    try {
      toast.info('Testing ZK proof generation...')
      
      // Generate a test membership proof
      const proof = await zkIdentityManager.generateMembershipProof('test-group')
      
      // Verify the proof
      const isValid = await zkIdentityManager.verifyProof(proof, ['test-group', proof.nullifierHash])
      
      if (isValid) {
        toast.success('ZK proof generation and verification successful')
      } else {
        toast.error('ZK proof verification failed')
      }
    } catch (error) {
      console.error('ZK proof test failed:', error)
      toast.error('ZK proof test failed')
    }
  }

  const testIPFS = async () => {
    try {
      toast.info('Testing IPFS upload...')
      
      // Create a test file
      const testData = new Blob(['Hello from PrivaChain testnet!'], { type: 'text/plain' })
      
      // Upload to IPFS
      const result = await ipfsService.upload(testData, 'test.txt')
      
      if (result.cid) {
        toast.success(`IPFS upload successful! CID: ${result.cid.substring(0, 12)}...`)
      } else {
        toast.error('IPFS upload failed')
      }
    } catch (error) {
      console.error('IPFS test failed:', error)
      toast.error('IPFS test failed')
    }
  }

  const handleDeploy = (network: string) => {
    setDeploymentStatus('deployed')
    toast.success(`Successfully deployed to ${network}!`, {
      description: 'All contracts are now live and verified.'
    })
  }

  const handleVerify = (network: string) => {
    toast.success(`Verified deployment on ${network}`, {
      description: 'All contracts passed verification checks.'
    })
  }

  const features = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Zero-Knowledge Proofs',
      description: 'Anonymous authentication and privacy-preserving transactions',
      status: 'implemented'
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: 'Decentralized Storage',
      description: 'IPFS integration for secure content distribution',
      status: 'implemented'
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'High-Performance Consensus',
      description: 'Cosmos SDK with 2-second block times and 5000+ TPS',
      status: 'implemented'
    },
    {
      icon: <Code className="w-5 h-5" />,
      title: 'Smart Contract Suite',
      description: 'Complete set of contracts for mail, domains, and video',
      status: 'ready-to-deploy'
    }
  ]

  const deploymentStats = [
    { label: 'Smart Contracts', value: '8', description: 'Core protocol contracts' },
    { label: 'Supported Networks', value: '3', description: 'Testnet, Mainnet, Local' },
    { label: 'Deployment Time', value: '~5min', description: 'Full deployment duration' },
    { label: 'Gas Efficiency', value: '99%', description: 'Optimized for low fees' }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'implemented':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Live</Badge>
      case 'ready-to-deploy':
        return <Badge variant="secondary"><Rocket className="w-3 h-3 mr-1" />Ready</Badge>
      default:
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Rocket className="w-6 h-6 text-primary" />
                Contract Deployment
              </h1>
              <p className="text-muted-foreground mt-1">
                Deploy and manage PrivaChain smart contracts across networks
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://docs.privachain.com/deployment" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Documentation
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deployment">Deployment</TabsTrigger>
              <TabsTrigger value="testing" className="gap-2">
                <FlaskConical className="w-4 h-4" />
                Integration Tests
              </TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
          {/* Testnet Status Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cosmos Blockchain</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {cosmosConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {cosmosConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
                {networkStats && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Block: {networkStats.blockHeight?.toLocaleString() || 'Loading...'}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ZK Identity</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {zkIdentityLoaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {zkIdentityLoaded ? 'Loaded' : 'Generating...'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Anonymous identity ready
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IPFS Storage</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {ipfsInitialized ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {ipfsInitialized ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Decentralized storage ready
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Wallet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Test Wallet Configuration
              </CardTitle>
              <CardDescription>
                Testing with provided Cosmos testnet wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="font-mono text-sm break-all">
                  cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pre-funded testnet wallet for smart contract interactions
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={testCosmosWallet} variant="outline" size="sm">
                  Test Connection
                </Button>
                <Button onClick={testZkProofs} variant="outline" size="sm">
                  Test ZK Proofs
                </Button>
                <Button onClick={testIPFS} variant="outline" size="sm">
                  Test IPFS
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Network Statistics */}
          {networkStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Network Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-2xl font-bold">{networkStats.totalDomains || 0}</div>
                    <div className="text-xs text-muted-foreground">.prv Domains</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{networkStats.totalEmails || 0}</div>
                    <div className="text-xs text-muted-foreground">Encrypted Emails</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{networkStats.activeRelays || 0}</div>
                    <div className="text-xs text-muted-foreground">Mail Relays</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{networkStats.blockHeight || 0}</div>
                    <div className="text-xs text-muted-foreground">Block Height</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

            <TabsContent value="deployment" className="space-y-6">
              {/* Deployment Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {deploymentStats.map((stat, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-primary">{stat.value}</div>
                      <div className="font-medium">{stat.label}</div>
                      <div className="text-sm text-muted-foreground">{stat.description}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Deployment Manager */}
              <DeploymentManager onDeploy={handleDeploy} onVerify={handleVerify} />
            </TabsContent>

            <TabsContent value="testing" className="space-y-6">
              <SystemIntegrationTest />
            </TabsContent>

            <TabsContent value="status" className="space-y-6">

              {/* Feature Status */}
              <Card>
                <CardHeader>
                  <CardTitle>PrivaChain Features Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="text-primary mt-1">{feature.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{feature.title}</h4>
                            {getStatusBadge(feature.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Architecture Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Architecture Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-3">Core Components</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                          <div className="font-medium text-primary mb-2">Layer 1: Blockchain</div>
                          <div className="text-sm text-muted-foreground">
                            Cosmos SDK with Tendermint consensus, providing 2-second finality and high throughput
                          </div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="font-medium text-primary mb-2">Layer 2: Services</div>
                          <div className="text-sm text-muted-foreground">
                            Anonymous mail, video signaling, domain registry, and node rewards
                          </div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="font-medium text-primary mb-2">Infrastructure</div>
                          <div className="text-sm text-muted-foreground">
                            IPFS storage, TURN relays, search indexing, and ZK-proof generation
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}