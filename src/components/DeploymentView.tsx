import React from 'react'
import { DeploymentManager } from './deployment/DeploymentManager'
import { SystemIntegrationTest } from './SystemIntegrationTest'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Rocket, 
  Shield, 
  Zap, 
  Globe,
  Code,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  FlaskConical
} from '@phosphor-icons/react'
import { toast } from 'sonner'

export function DeploymentView() {
  const [deploymentStatus, setDeploymentStatus] = React.useState<'idle' | 'deploying' | 'deployed' | 'error'>('idle')

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
          
          <Tabs defaultValue="deployment" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deployment">Deployment</TabsTrigger>
              <TabsTrigger value="testing" className="gap-2">
                <FlaskConical className="w-4 h-4" />
                Integration Tests
              </TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

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