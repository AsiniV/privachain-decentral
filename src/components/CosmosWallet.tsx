import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Warning, AlertDescription } from '@/components/ui/alert'
import { useCosmos } from '@/hooks/useCosmos'
import { toast } from 'sonner'
import { 
  Wallet, 
  Copy, 
  ArrowSquareOut, 
  Warning, 
  CheckCircle, 
  Coins,
  Globe,
  ArrowClockwise
} from '@phosphor-icons/react'

export function CosmosWallet() {
  const {
    isConnected,
    isConnecting,
    account,
    error,
    mnemonic,
    createWallet,
    importWallet,
    refreshAccount,
    disconnect,
    getFaucetInfo,
    config
  } = useCosmos()

  const [importMnemonic, setImportMnemonic] = useState('')
  const [showMnemonic, setShowMnemonic] = useState(false)

  const handleCreateWallet = async () => {
    await createWallet()
  }

  const handleImportWallet = async () => {
    if (!importMnemonic.trim()) {
      toast.error('Please enter a mnemonic phrase')
      return
    }

    const success = await importWallet(importMnemonic.trim())
    if (success) {
      setImportMnemonic('')
    }
  }

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleOpenFaucet = () => {
    const faucetInfo = getFaucetInfo()
    if (faucetInfo.address) {
      window.open(faucetInfo.url, '_blank')
      toast.info('Use the faucet to get testnet tokens')
    }
  }

  const formatBalance = (balance: string) => {
    const amount = parseInt(balance) / 1000000 // Convert from micro units
    return amount.toFixed(6)
  }

  if (error) {
    return (
      <Warning variant="destructive">
        <Warning className="h-4 w-4" />
        <AlertDescription>
          Failed to connect to Cosmos testnet: {error}
        </AlertDescription>
      </Warning>
    )
  }

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Connecting to Cosmos testnet...</span>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <Warning>
        <Warning className="h-4 w-4" />
        <AlertDescription>
          Not connected to Cosmos testnet. The blockchain features require a connection.
        </AlertDescription>
      </Warning>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Cosmos Testnet Connection
            </span>
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Chain ID</Label>
              <p className="font-mono">{config.chainId}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">RPC Endpoint</Label>
              <p className="font-mono text-xs break-all">{config.rpcEndpoint}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Denom</Label>
              <p className="font-mono">{config.denom}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Gas Price</Label>
              <p className="font-mono">{config.gasPrice.toString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!account ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create New Wallet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Create New Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a new Cosmos wallet for blockchain operations. Your mnemonic will be stored securely.
              </p>
              <Button 
                onClick={handleCreateWallet} 
                disabled={isConnecting}
                className="w-full"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Create Wallet
              </Button>
            </CardContent>
          </Card>

          {/* Import Existing Wallet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Import Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-mnemonic">Mnemonic Phrase</Label>
                <Textarea
                  id="import-mnemonic"
                  placeholder="Enter your 24-word mnemonic phrase..."
                  value={importMnemonic}
                  onChange={(e) => setImportMnemonic(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleImportWallet} 
                disabled={isConnecting || !importMnemonic.trim()}
                className="w-full"
              >
                Import Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Cosmos Account
                </span>
                <Button
                  onClick={refreshAccount}
                  variant="outline"
                  size="sm"
                >
                  <ArrowClockwise className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={account.address} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(account.address, 'Address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Balance</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={`${formatBalance(account.balance)} OSMO`}
                      readOnly 
                      className="font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenFaucet}
                      title="Get testnet tokens"
                    >
                      <Coins className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input 
                    value={account.accountNumber.toString()} 
                    readOnly 
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sequence</Label>
                  <Input 
                    value={account.sequence.toString()} 
                    readOnly 
                    className="font-mono"
                  />
                </div>
              </div>

              {mnemonic && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Mnemonic Phrase (Keep Safe!)</Label>
                    <div className="space-y-2">
                      {showMnemonic ? (
                        <Textarea
                          value={mnemonic}
                          readOnly
                          className="font-mono text-xs"
                          rows={3}
                        />
                      ) : (
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm text-muted-foreground">
                            Mnemonic is hidden for security. Click to reveal.
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowMnemonic(!showMnemonic)}
                          variant="outline"
                          size="sm"
                        >
                          {showMnemonic ? 'Hide' : 'Show'} Mnemonic
                        </Button>
                        {showMnemonic && (
                          <Button
                            onClick={() => handleCopyToClipboard(mnemonic, 'Mnemonic')}
                            variant="outline"
                            size="sm"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleOpenFaucet}
                  variant="outline"
                  size="sm"
                >
                  <ArrowSquareOut className="h-4 w-4 mr-2" />
                  Get Testnet Tokens
                </Button>
                <Button 
                  onClick={disconnect} 
                  variant="destructive" 
                  size="sm"
                >
                  Disconnect Wallet
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Balance Warning */}
          {parseInt(account.balance) < 1000000 && (
            <Warning>
              <Warning className="h-4 w-4" />
              <AlertDescription>
                Your balance is low. Use the faucet to get testnet tokens for blockchain operations.
              </AlertDescription>
            </Warning>
          )}
        </div>
      )}
    </div>
  )
}