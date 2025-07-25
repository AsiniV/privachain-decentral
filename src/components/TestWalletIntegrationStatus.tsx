import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useTestWallet } from '../hooks/useTestWallet'
import { useCosmosTestnet } from '../blockchain/CosmosTestnet'
import { gasFeeManager } from '../services/GasFeeManager'
import { TEST_WALLET_ADDRESS } from '../blockchain/CosmosTestnet'
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Wallet,
  Shield,
  Lightning,
  TrendUp,
  Copy,
  ArrowSquareOut,
  Coins
} from '@phosphor-icons/react'
import { toast } from 'sonner'

export function TestWalletIntegrationStatus() {
  const { wallet, config } = useTestWallet()
  const { isTestnetConnected, config: testnetConfig } = useCosmosTestnet()
  const [gasStats, setGasStats] = useState<any>(null)

  useEffect(() => {
    const stats = gasFeeManager.getGasStats()
    setGasStats(stats)
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const integrationChecks = [
    {
      name: 'Testnet Connection',
      status: isTestnetConnected,
      description: 'Connected to Cosmos Hub testnet'
    },
    {
      name: 'Test Wallet',
      status: wallet.isConnected,
      description: 'Test wallet connected and operational'
    },
    {
      name: 'Gas Sponsorship',
      status: wallet.isConnected && parseInt(wallet.balances.find(b => b.denom === 'uatom')?.amount || '0') > 0,
      description: 'Sufficient ATOM balance for gas fee sponsorship'
    },
    {
      name: 'Transaction Processing',
      status: gasStats?.totalTransactions > 0,
      description: 'Gas transactions being processed successfully'
    }
  ]

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Integration Status Overview */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Wallet className="w-6 h-6" />
            Test Wallet Integration Status
          </CardTitle>
          <CardDescription className="text-blue-700">
            Comprehensive overview of test wallet integration and gas fee sponsorship
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrationChecks.map((check) => (
              <div key={check.name} className="p-4 bg-white rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{check.name}</span>
                  {getStatusIcon(check.status)}
                </div>
                <p className="text-sm text-muted-foreground">{check.description}</p>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded border">
              <div className="text-2xl font-bold text-blue-600">
                {wallet.isConnected ? wallet.balances.find(b => b.denom === 'uatom')?.formatted.split(' ')[0] || '0' : '0'}
              </div>
              <div className="text-xs text-muted-foreground">ATOM Balance</div>
            </div>
            <div className="text-center p-3 bg-white rounded border">
              <div className="text-2xl font-bold text-green-600">
                {gasStats?.testWalletSponsored || 0}
              </div>
              <div className="text-xs text-muted-foreground">Sponsored TXs</div>
            </div>
            <div className="text-center p-3 bg-white rounded border">
              <div className="text-2xl font-bold text-purple-600">
                {gasStats?.totalTransactions || 0}
              </div>
              <div className="text-xs text-muted-foreground">Total TXs</div>
            </div>
            <div className="text-center p-3 bg-white rounded border">
              <div className="text-2xl font-bold text-orange-600">
                {wallet.transactions.length}
              </div>
              <div className="text-xs text-muted-foreground">Wallet TXs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Configuration Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Wallet Configuration
          </CardTitle>
          <CardDescription>
            Test wallet and network configuration details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Test Wallet Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{config.address.slice(0, 20)}...</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(config.address)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-medium">{config.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium">{config.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purpose:</span>
                  <span className="font-medium text-blue-600">Gas Sponsorship</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Network Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chain ID:</span>
                  <span className="font-medium">{testnetConfig.chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chain Name:</span>
                  <span className="font-medium">{testnetConfig.chainName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency:</span>
                  <span className="font-medium">{testnetConfig.stakeCurrency.coinDenom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={isTestnetConnected ? "default" : "secondary"}>
                    {isTestnetConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gas Fee Statistics */}
      {gasStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightning className="w-5 h-5" />
              Gas Fee Statistics
            </CardTitle>
            <CardDescription>
              Real-time statistics of gas fee sponsorship and usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Test Wallet Sponsored</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {gasStats.testWalletSponsored}
                </div>
                <div className="text-xs text-muted-foreground">
                  {gasStats.totalTransactions > 0 
                    ? `${Math.round((gasStats.testWalletSponsored / gasStats.totalTransactions) * 100)}% of total`
                    : 'No transactions yet'
                  }
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Foundation Sponsored</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {gasStats.foundationSponsored}
                </div>
                <div className="text-xs text-muted-foreground">
                  Free tier transactions
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendUp className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Premium Payments</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {gasStats.premiumPayments}
                </div>
                <div className="text-xs text-muted-foreground">
                  Subscription transactions
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">Direct Payments</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {gasStats.directPayments}
                </div>
                <div className="text-xs text-muted-foreground">
                  User wallet transactions
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Average Gas Cost:</span>
                <span className="font-mono">{gasStats.averageGasCost.toFixed(6)} PRIV</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Summary</CardTitle>
          <CardDescription>
            Overview of what has been implemented with the test wallet integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-700 mb-3">✅ Implemented Features</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Test wallet integration with Cosmos Hub testnet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Automatic gas fee sponsorship for platform operations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Real-time transaction monitoring and balance tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Gas fee testing simulator for all operations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Integration with messenger, email, and video call features</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-700 mb-3">🔧 Technical Integration</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 bg-blue-600 rounded-full mt-1 flex-shrink-0"></span>
                    <span>GasFeeManager service updated for test wallet priority</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 bg-blue-600 rounded-full mt-1 flex-shrink-0"></span>
                    <span>useTestWallet hook for wallet state management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 bg-blue-600 rounded-full mt-1 flex-shrink-0"></span>
                    <span>CosmosTestnetProvider for network connectivity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 bg-blue-600 rounded-full mt-1 flex-shrink-0"></span>
                    <span>Test wallet address: {TEST_WALLET_ADDRESS.slice(0, 20)}...</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">💡</span>
                </div>
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">Gas Fee Strategy</h5>
                  <p className="text-sm text-blue-700">
                    The test wallet automatically sponsors gas fees for all platform operations during testing. 
                    This allows users to experience the full PrivaChain functionality without needing to manage 
                    cryptocurrency or understand blockchain technicalities. In production, users can choose between 
                    free tier quotas, premium subscriptions, or direct token payments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}