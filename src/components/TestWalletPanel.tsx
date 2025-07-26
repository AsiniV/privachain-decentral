import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useTestWallet } from '../hooks/useTestWallet'
import { useCosmosTestnet } from '../blockchain/CosmosTestnet'
import { GasSponsorshipDemo } from './GasSponsorshipDemo'
import { Wallet, Copy, ArrowSquareOut, ArrowClockwise, TrendUp, TrendingDown, Clock } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function TestWalletPanel() {
  const { wallet, isLoading, connectWallet, disconnectWallet, refreshBalances, getGasBudgetRemaining, config } = useTestWallet()
  const { isTestnetConnected, connectToTestnet, config: testnetConfig } = useCosmosTestnet()
  const [showTransactions, setShowTransactions] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatAmount = (amount: string, decimals: number = 6): string => {
    return (parseInt(amount) / Math.pow(10, decimals)).toFixed(decimals)
  }

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'pending': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="testing">Gas Testing</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Wallet Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Test Wallet Configuration
            </CardTitle>
            <CardDescription>
              Cosmos testnet wallet for PrivaChain platform testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono">
                    {config.address}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(config.address)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Network</label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isTestnetConnected ? "default" : "secondary"}>
                    {config.provider} {config.network}
                  </Badge>
                  {isTestnetConnected && (
                    <Badge variant="outline" className="text-green-600">
                      Connected
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isTestnetConnected && (
                <Button onClick={connectToTestnet} disabled={isLoading}>
                  Connect to Testnet
                </Button>
              )}
              
              {!wallet.isConnected ? (
                <Button onClick={connectWallet} disabled={isLoading}>
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              ) : (
                <Button variant="outline" onClick={disconnectWallet}>
                  Disconnect Wallet
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshBalances}
                disabled={isLoading}
              >
                <ArrowClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Balances */}
        {wallet.isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Wallet Balances</CardTitle>
              <CardDescription>
                Available funds for gas fees and platform operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wallet.balances.map((balance) => (
                  <div key={balance.denom} className="p-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground uppercase">
                      {balance.denom.replace('u', '')}
                    </div>
                    <div className="text-2xl font-bold">
                      {formatAmount(balance.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {balance.amount} {balance.denom}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gas Budget Tracking */}
        {wallet.isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Gas Budget Management</CardTitle>
              <CardDescription>
                Track gas fee usage for platform operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-600">Total Budget</div>
                  <div className="text-xl font-bold text-blue-700">
                    {formatAmount(wallet.gasBudget)} ATOM
                  </div>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-sm font-medium text-red-600">Spent</div>
                  <div className="text-xl font-bold text-red-700">
                    {formatAmount(wallet.totalSpent)} ATOM
                  </div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-600">Remaining</div>
                  <div className="text-xl font-bold text-green-700">
                    {formatAmount(getGasBudgetRemaining().toString())} ATOM
                  </div>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.max(0, Math.min(100, (parseInt(wallet.totalSpent) / parseInt(wallet.gasBudget)) * 100))}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {wallet.isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common operations using the test wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowSquareOut className="h-4 w-4" />
                  Explorer
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <TrendUp className="h-4 w-4" />
                  Faucet
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Stake
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  History
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="testing" className="space-y-6">
        <GasSponsorshipDemo />
      </TabsContent>

      <TabsContent value="transactions" className="space-y-6">
        {/* Transaction History */}
        {wallet.isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Recent gas fee payments and platform operations
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-64">
                {wallet.transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wallet.transactions.map((tx) => (
                      <div key={tx.hash} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getTransactionStatusColor(tx.status)}`} />
                          <div>
                            <div className="font-medium">{tx.type.replace('_', ' ')}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium">
                            -{formatAmount(tx.amount)} ATOM
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Fee: {formatAmount(tx.fee)} ATOM
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(tx.hash)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}