import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  Upload, 
  CheckCircle, 
  Warning, 
  ArrowSquareOut,
  ArrowClockwise,
  CurrencyDollar
} from '@phosphor-icons/react'
import { useKV } from '../../hooks/useKV'
import { DeploymentState } from '../../blockchain/deployment/config'

interface DeploymentManagerProps {
  onDeploy?: (network: string) => void
  onVerify?: (network: string) => void
}

export function DeploymentManager({ onDeploy, onVerify }: DeploymentManagerProps) {
  const [deploymentState, setDeploymentState] = useKV<DeploymentState | null>('deployment-state', null)
  const [isDeploying, setIsDeploying] = React.useState(false)
  const [selectedNetwork, setSelectedNetwork] = React.useState<'testnet' | 'mainnet' | 'local'>('testnet')

  const networks = [
    { id: 'testnet', name: 'Testnet', rpc: 'https://rpc.cosmos-testnet.priv' },
    { id: 'mainnet', name: 'Mainnet', rpc: 'https://rpc.cosmos.priv' },
    { id: 'local', name: 'Local', rpc: 'http://localhost:26657' }
  ]

  const contracts = [
    { key: 'prvToken', name: 'PRIV Token', description: 'Native utility token' },
    { key: 'nft', name: 'Identity NFT', description: 'Premium access and identity' },
    { key: 'mail', name: 'Anonymous Envelope', description: 'Encrypted email service' },
    { key: 'domain', name: 'Domain Registry', description: '.prv domain registration' },
    { key: 'videoSignaling', name: 'VideoCamera Signaling', description: 'WebRTC coordination' },
    { key: 'rewards', name: 'Node Rewards', description: 'Incentivization system' },
    { key: 'consensus', name: 'Consensus Manager', description: 'Validator governance' },
    { key: 'zkRollup', name: 'ZK Rollup', description: 'Layer 2 scaling' }
  ]

  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock deployment state
      const mockState: DeploymentState = {
        timestamp: Date.now(),
        network: selectedNetwork,
        deployer: 'cosmos1njr8d9xrsqz5dr3xavj3mdzd8p8dvsql0q8cyx',
        contracts: {
          prvToken: {
            codeId: 1,
            contractAddress: 'cosmos1abc123def456ghi789jkl012mno345pqr678',
            txHash: '0x1234567890abcdef'
          },
          nft: {
            codeId: 2,
            contractAddress: 'cosmos1def456ghi789jkl012mno345pqr678abc123',
            txHash: '0x234567890abcdef1'
          },
          mail: {
            codeId: 3,
            contractAddress: 'cosmos1ghi789jkl012mno345pqr678abc123def456',
            txHash: '0x34567890abcdef12'
          },
          domain: {
            codeId: 4,
            contractAddress: 'cosmos1jkl012mno345pqr678abc123def456ghi789',
            txHash: '0x4567890abcdef123'
          },
          videoSignaling: {
            codeId: 5,
            contractAddress: 'cosmos1mno345pqr678abc123def456ghi789jkl012',
            txHash: '0x567890abcdef1234'
          },
          rewards: {
            codeId: 6,
            contractAddress: 'cosmos1pqr678abc123def456ghi789jkl012mno345',
            txHash: '0x67890abcdef12345'
          },
          consensus: {
            codeId: 7,
            contractAddress: 'cosmos1abc123def456ghi789jkl012mno345pqr678',
            txHash: '0x7890abcdef123456'
          },
          zkRollup: {
            codeId: 8,
            contractAddress: 'cosmos1def456ghi789jkl012mno345pqr678abc123',
            txHash: '0x890abcdef1234567'
          }
        }
      }
      
      setDeploymentState(mockState)
      onDeploy?.(selectedNetwork)
    } catch (error) {
      console.error('Deployment failed:', error)
    } finally {
      setIsDeploying(false)
    }
  }

  const handleVerify = async () => {
    if (!deploymentState) return
    
    try {
      // Simulate verification
      await new Promise(resolve => setTimeout(resolve, 1000))
      onVerify?.(selectedNetwork)
    } catch (error) {
      console.error('Verification failed:', error)
    }
  }

  const getContractStatus = (contractKey: string) => {
    const contract = deploymentState?.contracts[contractKey as keyof typeof deploymentState.contracts]
    return contract ? 'deployed' : 'not-deployed'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deployed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Deployed</Badge>
      case 'deploying':
        return <Badge variant="secondary"><ArrowClockwise className="w-3 h-3 mr-1 animate-spin" />Deploying</Badge>
      default:
        return <Badge variant="outline"><Warning className="w-3 h-3 mr-1" />Not Deployed</Badge>
    }
  }

  const estimatedCosts = {
    testnet: { upload: '20 PRIV', instantiate: '2 PRIV', total: '22 PRIV' },
    mainnet: { upload: '200 PRIV', instantiate: '20 PRIV', total: '220 PRIV' },
    local: { upload: '0.02 PRIV', instantiate: '0.002 PRIV', total: '0.022 PRIV' }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            PrivaChain Contract Deployment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Network Selection */}
          <div>
            <label className="text-sm font-medium">Target Network</label>
            <div className="flex gap-2 mt-2">
              {networks.map((network) => (
                <Button
                  key={network.id}
                  variant={selectedNetwork === network.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedNetwork(network.id as 'testnet' | 'mainnet' | 'local')}
                >
                  {network.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Cost Estimation */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="flex items-center gap-2 font-medium mb-2">
              <CurrencyDollar className="w-4 h-4" />
              Estimated Deployment Costs ({selectedNetwork})
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Upload:</span>
                <span className="ml-2 font-mono">{estimatedCosts[selectedNetwork].upload}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Instantiate:</span>
                <span className="ml-2 font-mono">{estimatedCosts[selectedNetwork].instantiate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-2 font-mono font-semibold">{estimatedCosts[selectedNetwork].total}</span>
              </div>
            </div>
          </div>

          {/* Deployment Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleDeploy}
              disabled={isDeploying}
              className="flex-1"
            >
              {isDeploying ? (
                <>
                  <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Deploy All Contracts
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleVerify}
              disabled={!deploymentState}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contract Status */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contracts.map((contract) => {
              const status = getContractStatus(contract.key)
              const contractInfo = deploymentState?.contracts[contract.key as keyof typeof deploymentState.contracts]
              
              return (
                <div key={contract.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{contract.name}</h4>
                    <p className="text-sm text-muted-foreground">{contract.description}</p>
                    {contractInfo && (
                      <div className="mt-1">
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {contractInfo.contractAddress}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(status)}
                    {contractInfo && (
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={`https://explorer.${selectedNetwork}.priv/contract/${contractInfo.contractAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowSquareOut className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Info */}
      {deploymentState && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Network:</span>
                <span className="ml-2 font-medium">{deploymentState.network}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Deployer:</span>
                <span className="ml-2 font-mono text-xs">{deploymentState.deployer}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="ml-2">{new Date(deploymentState.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contracts:</span>
                <span className="ml-2 font-medium">
                  {Object.values(deploymentState.contracts).filter(Boolean).length} / {contracts.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}