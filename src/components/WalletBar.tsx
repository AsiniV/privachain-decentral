// WalletBar.tsx - Wallet Connection Status Bar
//
// Displays wallet connection status and provides connect/disconnect functionality
// Shows connected address or connect button depending on state

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppState } from '@/lib/app_state'
import { connectKeplr, isKeplrInstalled } from '@/lib/keplr_connect'
import { isContractConfigured } from '@/lib/onchain_ops'
import { toast } from 'sonner'
import { Wallet, Warning, CheckCircle } from '@phosphor-icons/react'

export function WalletBar() {
  const { cosmosAddress, isKeplrConnected, setAddress, setKeplrConnected, clearWallet } = useAppState()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    if (!isKeplrInstalled()) {
      toast.error("Please install Keplr extension to connect your wallet")
      return
    }

    if (!isContractConfigured()) {
      toast.warning("Contract address not configured. On-chain operations will not work.")
    }

    setIsConnecting(true)
    
    try {
      const address = await connectKeplr()
      setAddress(address)
      setKeplrConnected(true)
      toast.success(`Wallet connected: ${address.slice(0, 12)}...`)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Keplr')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    clearWallet()
    toast.info('Wallet disconnected')
  }

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

  if (!isKeplrInstalled()) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
        <Warning className="h-4 w-4 text-orange-600" />
        <span className="text-sm text-orange-700 dark:text-orange-300">
          Keplr extension required for wallet features
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open('https://www.keplr.app/', '_blank')}
        >
          Install Keplr
        </Button>
      </div>
    )
  }

  if (cosmosAddress && isKeplrConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <Badge variant="secondary" className="font-mono text-xs">
          🟢 {formatAddress(cosmosAddress)}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDisconnect}
          className="h-7 px-2 text-xs"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        size="sm"
        className="flex items-center gap-2"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Keplr'}
      </Button>
    </div>
  )
}