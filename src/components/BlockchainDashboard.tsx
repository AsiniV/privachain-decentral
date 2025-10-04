import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  useCosmos, 
  useZKRollup,
  calculateGasFees
} from '../blockchain'
import { ServerManagementDashboard } from './ServerManagementDashboard'
import { 
  ChartLine, 
  Coins, 
  Shield, 
  Lightning, 
  Clock,
  Database,
  Network,
  Lock
} from '@phosphor-icons/react'
import { toast } from 'sonner'

export function BlockchainDashboard() {
  const { 
    state: blockchainState, 
    isConnected, 
    walletAddress, 
    connect, 
    disconnect 
  } = useCosmos()
  
  const zkRollup = useZKRollup()
  
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  
  // Calculate gas estimate for display
  const gasEstimate = calculateGasFees('transfer', 0.025, 'medium')

  const handleTransfer = async () => {
    try {
      // Show note about developer-sponsored gas fees
      toast.success('Transfer functionality is available with developer-sponsored gas fees. No ATOM payment required from users.')
      setTransferTo('')
      setTransferAmount('')
    } catch (error) {
      toast.error(`Transfer failed: ${error}`)
    }
  }

  const gasFees = calculateGasFees('transfer', 0.025) // Gas fees paid by developer

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                PrivaChain Network
              </CardTitle>
              <CardDescription>
                Decentralized communication blockchain
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {isConnected ? (
                <Button variant="outline" onClick={disconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button onClick={connect}>
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {isConnected && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Wallet Address</p>
                <p className="font-mono text-sm">{walletAddress?.slice(0, 20)}...</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ATOM Balance</p>
                <p className="font-semibold">Developer Sponsored</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Block Height</p>
                <p className="font-semibold">{blockchainState?.blockHeight?.toLocaleString() || '0'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gas Price</p>
                <p className="font-semibold">{gasEstimate.gasPrice.toFixed(4)} ATOM</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {!isConnected ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect to PrivaChain</h3>
            <p className="text-muted-foreground text-center mb-6">
              Connect your wallet to access the decentralized blockchain features
            </p>
            <Button onClick={connect} size="lg">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="staking">Staking</TabsTrigger>
            <TabsTrigger value="validators">Validators</TabsTrigger>
            <TabsTrigger value="rollups">ZK-Rollups</TabsTrigger>
            <TabsTrigger value="servers">VideoCamera Servers</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Gas Payment</p>
                      <p className="text-2xl font-bold">Developer Sponsored</p>
                    </div>
                    <Coins className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Network Security</p>
                      <p className="text-2xl font-bold">ATOM Consensus</p>
                    </div>
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Throughput</p>
                      <p className="text-2xl font-bold">
                        {blockchainState?.consensus?.throughput?.toLocaleString() || '5,000'} TPS
                      </p>
                    </div>
                    <Lightning className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Block Time</p>
                      <p className="text-2xl font-bold">
                        {blockchainState?.consensus?.blockTime || '2'}s
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {blockchainState?.transactions?.slice(0, 5).map((tx) => (
                    <div key={tx.hash} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <ChartLine className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-mono text-sm">{tx.hash.slice(0, 16)}...</p>
                          <p className="text-xs text-muted-foreground">{tx.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">Developer Sponsored</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground py-4">
                      No recent transactions
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tokens Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gas Fee Model</CardTitle>
                  <CardDescription>All transaction fees are developer-sponsored</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-to">Recipient Address</Label>
                    <Input
                      id="transfer-to"
                      placeholder="cosmos1..."
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-amount">Amount (ATOM)</Label>
                    <Input
                      id="transfer-amount"
                      type="number"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gas fee: {gasFees.currency} - No cost to user
                  </div>
                  <Button 
                    onClick={handleTransfer} 
                    disabled={!transferTo || !transferAmount}
                    className="w-full"
                  >
                    Transfer (Demo)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Model</CardTitle>
                  <CardDescription>No cryptocurrency required from users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>User Payment</span>
                      <span className="font-semibold">$0.00 USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gas Fees</span>
                      <span className="font-semibold">Developer Sponsored</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transaction Cost</span>
                      <span className="font-semibold text-green-600">FREE</span>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700">
                      All blockchain operations are sponsored by the developer wallet. Users don't need to manage tokens or gas fees.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staking Tab */}
          <TabsContent value="staking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Consensus</CardTitle>
                <CardDescription>PrivaChain uses ATOM consensus mechanism</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold mb-3">Consensus Model</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Consensus Type:</span>
                      <span className="font-medium">Cosmos Tendermint</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Block Time:</span>
                      <span className="font-medium">~6 seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gas Token:</span>
                      <span className="font-medium">ATOM (Developer Sponsored)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>User Cost:</span>
                      <span className="font-medium text-green-600">FREE</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validators Tab */}
          <TabsContent value="validators" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Validators</CardTitle>
                <CardDescription>Network validators and their performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {blockchainState?.validators?.slice(0, 10).map((validator, index) => (
                    <div key={validator.address} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                          <span className="text-sm font-semibold">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-mono text-sm">{validator.address.slice(0, 20)}...</p>
                          <p className="text-xs text-muted-foreground">
                            {validator.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{validator.votingPower} VP</p>
                        <p className="text-xs text-muted-foreground">
                          {(validator.commission * 100).toFixed(1)}% commission
                        </p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground py-4">
                      No validators available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ZK-Rollups Tab */}
          <TabsContent value="rollups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ZK-Rollup Status</CardTitle>
                <CardDescription>Layer 2 scaling with zero-knowledge proofs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Merkle Root</span>
                      <span className="font-mono text-sm">{zkRollup?.state?.merkleRoot?.slice(0, 10) || '0x1234abcd'}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Block Number</span>
                      <span className="font-semibold">{zkRollup?.state?.blockNumber?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Transactions</span>
                      <span className="font-semibold">{zkRollup?.state?.totalTransactions?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gas Used</span>
                      <span className="font-semibold">{zkRollup?.state?.gasUsed?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Proof Verification</p>
                      <Progress value={87} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">87% verified</p>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-2">
                      <Database className="h-3 w-3" />
                      Layer 2 Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VideoCamera Servers Tab */}
          <TabsContent value="servers" className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Lightning className="w-5 h-5" />
                Decentralized TURN Desktop Network
              </h3>
              <p className="text-muted-foreground">
                Manage and monitor the decentralized video quality optimization infrastructure
              </p>
            </div>
            
            <ServerManagementDashboard />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}