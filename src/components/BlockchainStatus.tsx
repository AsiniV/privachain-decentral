import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { 
  Wallet,
  CurrencyDollar,
  Lightning,
  ShieldCheck,
  ChartLine,
  Warning
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface BlockchainState {
  connected: boolean
  network: string
  blockHeight: number
  validators: number
  gasPrice: string
  privBalance: string
  staked: string
  pendingTx: number
}

export function BlockchainStatus() {
  const [blockchainState, setBlockchainState] = useKV<BlockchainState>('blockchain-state', {
    connected: true,
    network: 'PrivaChain Mainnet',
    blockHeight: 2847563,
    validators: 127,
    gasPrice: '0.025',
    privBalance: '1,247.50',
    staked: '500.00',
    pendingTx: 0
  })

  // Simulate blockchain updates
  useEffect(() => {
    const interval = setInterval(() => {
      setBlockchainState(prev => ({
        ...prev,
        blockHeight: prev.blockHeight + Math.floor(Math.random() * 3) + 1,
        validators: 125 + Math.floor(Math.random() * 5),
        gasPrice: (0.020 + Math.random() * 0.015).toFixed(3),
        privBalance: (parseFloat(prev.privBalance.replace(',', '')) + (Math.random() - 0.5) * 0.1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        pendingTx: Math.floor(Math.random() * 3)
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleConnect = () => {
    if (blockchainState.connected) {
      setBlockchainState(prev => ({ ...prev, connected: false }))
      toast.info('Disconnected from PrivaChain')
    } else {
      setBlockchainState(prev => ({ ...prev, connected: true }))
      toast.success('Connected to PrivaChain network')
    }
  }

  const handleStake = () => {
    const amount = Math.floor(Math.random() * 50) + 10
    setBlockchainState(prev => ({
      ...prev,
      staked: (parseFloat(prev.staked) + amount).toFixed(2),
      privBalance: (parseFloat(prev.privBalance.replace(',', '')) - amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }))
    toast.success(`Staked ${amount} PRIV tokens`)
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Blockchain Status</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${blockchainState.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {blockchainState.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Network Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Network</p>
            <p className="font-medium">{blockchainState.network}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Block Height</p>
            <p className="font-mono text-sm">{blockchainState.blockHeight.toLocaleString()}</p>
          </div>
        </div>

        {/* Validator Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Active Validators</p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <p className="font-medium">{blockchainState.validators}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gas Price</p>
            <p className="font-mono text-sm">{blockchainState.gasPrice} PRIV</p>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className="p-3 bg-accent/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">PRIV Balance</span>
            </div>
            <span className="font-mono text-lg">{blockchainState.privBalance}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Staked:</span>
            <span className="font-mono">{blockchainState.staked} PRIV</span>
          </div>
        </div>

        {/* Pending Transactions */}
        {blockchainState.pendingTx > 0 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded">
            <Warning className="w-4 h-4 text-yellow-600" />
            <span className="text-sm">{blockchainState.pendingTx} pending transaction(s)</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleConnect}
            className="flex items-center gap-2"
          >
            <Lightning className="w-4 h-4" />
            {blockchainState.connected ? 'Disconnect' : 'Connect'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleStake}
            className="flex items-center gap-2"
            disabled={!blockchainState.connected}
          >
            <ChartLine className="w-4 h-4" />
            Stake PRIV
          </Button>
        </div>

        {/* Network Features */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Network Features</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              ZK-Rollups
            </Badge>
            <Badge variant="secondary" className="text-xs">
              DPoS Consensus
            </Badge>
            <Badge variant="secondary" className="text-xs">
              IPFS Storage
            </Badge>
            <Badge variant="secondary" className="text-xs">
              5000 TPS
            </Badge>
            <Badge variant="secondary" className="text-xs">
              2s Finality
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  )
}