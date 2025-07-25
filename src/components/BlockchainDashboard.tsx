import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  useCosmos, 
  usePrivToken, 
  useSmartContracts,
  useZKRollup,
  calculateGasFees
} from '../blockchain'
import { ServerManagementDashboard } from './ServerManagementDashboard'
import { 
  Activity, 
  Coins, 
  Shield, 
  Zap, 
  TrendingUp, 
  Users,
  Clock,
  Database,
  Network,
  Lock,
  Lightning
} from '@phosphor-icons/react'
import { toast } from 'sonner'

export function BlockchainDashboard() {
  const { 
    state: blockchainState, 
    isConnected, 
    walletAddress, 
    privBalance,
    connect, 
    disconnect 
  } = useCosmos()
  
  const { 
    tokenState, 
    gasEstimate, 
    stakingPools, 
    userTokens,
    transfer,
    stake,
    claimRewards
  } = usePrivToken()
  
  const { mailContract, domainContract } = useSmartContracts()
  const zkRollup = useZKRollup()
  
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [stakeAmount, setStakeAmount] = useState('')
  const [selectedValidator, setSelectedValidator] = useState('')

  const handleTransfer = async () => {
    try {
      await transfer(transferTo, transferAmount)
      setTransferTo('')
      setTransferAmount('')
    } catch (error) {
      toast.error(`Transfer failed: ${error}`)
    }
  }

  const handleStake = async () => {
    try {
      await stake(selectedValidator, stakeAmount)
      setStakeAmount('')
    } catch (error) {
      toast.error(`Staking failed: ${error}`)
    }
  }

  const gasFees = gasEstimate?.current ? calculateGasFees('transfer', gasEstimate.current) : { totalFee: 0.001 }

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
                <p className="text-sm text-muted-foreground">PRIV Balance</p>
                <p className="font-semibold">{parseFloat(privBalance).toFixed(2)} PRIV</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Block Height</p>
                <p className="font-semibold">{blockchainState?.blockHeight?.toLocaleString() || '0'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gas Price</p>
                <p className="font-semibold">{gasEstimate?.current?.toFixed(4) || '0.0010'} PRIV</p>
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
            <TabsTrigger value="servers">Video Servers</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Supply</p>
                      <p className="text-2xl font-bold">
                        {tokenState?.totalSupply ? (parseFloat(tokenState.totalSupply) / 1e9).toFixed(1) : '1.0'}B
                      </p>
                    </div>
                    <Coins className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Staked</p>
                      <p className="text-2xl font-bold">
                        {tokenState?.stakedAmount ? (parseFloat(tokenState.stakedAmount) / 1e9).toFixed(1) : '0.5'}B
                      </p>
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
                    <Zap className="h-8 w-8 text-primary" />
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
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-mono text-sm">{tx.hash.slice(0, 16)}...</p>
                          <p className="text-xs text-muted-foreground">{tx.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{tx.amount || '0'} PRIV</p>
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
                  <CardTitle>Transfer PRIV</CardTitle>
                  <CardDescription>Send PRIV tokens to another address</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-to">Recipient Address</Label>
                    <Input
                      id="transfer-to"
                      placeholder="priv1..."
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-amount">Amount</Label>
                    <Input
                      id="transfer-amount"
                      type="number"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gas fee: {gasFees.totalFee.toFixed(6)} PRIV
                  </div>
                  <Button 
                    onClick={handleTransfer} 
                    disabled={!transferTo || !transferAmount}
                    className="w-full"
                  >
                    Transfer
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Token Balance</CardTitle>
                  <CardDescription>Your PRIV token holdings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Available</span>
                      <span className="font-semibold">{userTokens?.balance ? parseFloat(userTokens.balance).toFixed(2) : '0.00'} PRIV</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Staked</span>
                      <span className="font-semibold">{userTokens?.staked ? parseFloat(userTokens.staked).toFixed(2) : '0.00'} PRIV</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rewards</span>
                      <span className="font-semibold text-green-600">{userTokens?.rewards ? parseFloat(userTokens.rewards).toFixed(6) : '0.000000'} PRIV</span>
                    </div>
                  </div>
                  {userTokens?.rewards && parseFloat(userTokens.rewards) > 0 && (
                    <Button onClick={claimRewards} variant="outline" className="w-full">
                      Claim Rewards
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staking Tab */}
          <TabsContent value="staking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stake PRIV Tokens</CardTitle>
                <CardDescription>Earn rewards by staking your PRIV tokens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stake-amount">Amount to Stake</Label>
                    <Input
                      id="stake-amount"
                      type="number"
                      placeholder="0.00"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validator-select">Select Validator</Label>
                    <select
                      id="validator-select"
                      className="w-full p-2 border rounded-md"
                      value={selectedValidator}
                      onChange={(e) => setSelectedValidator(e.target.value)}
                    >
                      <option value="">Choose validator...</option>
                      {stakingPools?.map((pool) => (
                        <option key={pool.validator} value={pool.validator}>
                          {pool.validator.slice(0, 20)}... ({pool.apy}% APY)
                        </option>
                      )) || null}
                    </select>
                  </div>
                </div>
                <Button 
                  onClick={handleStake} 
                  disabled={!stakeAmount || !selectedValidator}
                  className="w-full"
                >
                  Stake Tokens
                </Button>
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

          {/* Video Servers Tab */}
          <TabsContent value="servers" className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Lightning className="w-5 h-5" />
                Decentralized TURN Server Network
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