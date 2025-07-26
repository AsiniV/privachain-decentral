import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Warning, AlertDescription } from '@/components/ui/alert'
import { Copy, ArrowSquareOut, ArrowClockwise, WifiHigh, WifiSlash, Activity, Coins, Users, Globe } from '@phosphor-icons/react'
import { useCosmosTestnet, TESTNET_ENDPOINTS, TESTNET_EXPLORERS, FAUCET_ENDPOINTS } from '../blockchain/CosmosTestnet'
import { toast } from 'sonner'

interface TestnetStatus {
  chainId: string
  latestBlockHeight: number
  latestBlockTime: string
  catchingUp: boolean
  validatorCount: number
  bondedTokens: string
  totalSupply: string
}

export function TestnetDashboard() {
  const {
    config,
    isTestnetConnected,
    testnetEndpoint,
    connectToTestnet,
    disconnectFromTestnet,
    switchTestnet,
    getTestnetStatus
  } = useCosmosTestnet()

  const [status, setStatus] = useState<TestnetStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [faucetAddress, setFaucetAddress] = useState('')

  const refreshStatus = async () => {
    if (!isTestnetConnected) return
    
    setLoading(true)
    try {
      const newStatus = await getTestnetStatus()
      setStatus(newStatus)
    } catch {
      toast.error('Failed to fetch testnet status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isTestnetConnected) {
      refreshStatus()
      const interval = setInterval(refreshStatus, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [isTestnetConnected])

  const handleConnect = async () => {
    setLoading(true)
    try {
      await connectToTestnet()
    } catch {
      // Error already handled in context
    } finally {
      setLoading(false)
    }
  }

  const handleEndpointChange = async (endpoint: string) => {
    setLoading(true)
    try {
      await switchTestnet(endpoint)
    } catch {
      // Error already handled in context
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const requestFaucetTokens = async () => {
    if (!faucetAddress.trim()) {
      toast.error('Please enter a valid address')
      return
    }

    setLoading(true)
    try {
      // Simulate faucet request
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Faucet tokens requested successfully!')
      setFaucetAddress('')
    } catch {
      toast.error('Failed to request faucet tokens')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cosmos Testnet Dashboard</h1>
          <p className="text-muted-foreground">Connect and interact with PrivaChain testnet</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isTestnetConnected ? "default" : "secondary"} className="flex items-center gap-1">
            {isTestnetConnected ? <WifiHigh className="w-3 h-3" /> : <WifiSlash className="w-3 h-3" />}
            {isTestnetConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button
            variant={isTestnetConnected ? "outline" : "default"}
            onClick={isTestnetConnected ? disconnectFromTestnet : handleConnect}
            disabled={loading}
          >
            {loading ? <ArrowClockwise className="w-4 h-4 animate-spin" /> : null}
            {isTestnetConnected ? 'Disconnect' : 'Connect to Testnet'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="status">Network Status</TabsTrigger>
          <TabsTrigger value="faucet">Faucet</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle>Testnet Connection</CardTitle>
              <CardDescription>Configure your connection to PrivaChain testnet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chain ID</Label>
                  <Input value={config.chainId} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Chain Name</Label>
                  <Input value={config.chainName} readOnly />
                </div>
              </div>

              <div className="space-y-2">
                <Label>RPC Endpoint</Label>
                <Select onValueChange={handleEndpointChange} value={testnetEndpoint}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TESTNET_ENDPOINTS.PRIVACHAIN_MAIN}>
                      Main Testnet (Global)
                    </SelectItem>
                    <SelectItem value={TESTNET_ENDPOINTS.PRIVACHAIN_EU}>
                      EU Testnet (Europe)
                    </SelectItem>
                    <SelectItem value={TESTNET_ENDPOINTS.PRIVACHAIN_US}>
                      US Testnet (Americas)
                    </SelectItem>
                    <SelectItem value={TESTNET_ENDPOINTS.LOCAL}>
                      Local Node
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>REST API</Label>
                  <div className="flex">
                    <Input value={config.rest} readOnly className="rounded-r-none" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => copyToClipboard(config.rest)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address Prefix</Label>
                  <Input value={config.bech32Config.bech32PrefixAccAddr} readOnly />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(TESTNET_EXPLORERS.PRIVACHAIN, '_blank')}
                  className="flex-1"
                >
                  <ArrowSquareOut className="w-4 h-4 mr-2" />
                  Open Explorer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(FAUCET_ENDPOINTS.PRIVACHAIN, '_blank')}
                  className="flex-1"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Open Faucet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Network Status
                <Button variant="ghost" size="sm" onClick={refreshStatus} disabled={!isTestnetConnected || loading}>
                  <ArrowClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
              <CardDescription>Real-time testnet network information</CardDescription>
            </CardHeader>
            <CardContent>
              {!isTestnetConnected ? (
                <Warning>
                  <AlertDescription>
                    Please connect to the testnet to view network status.
                  </AlertDescription>
                </Warning>
              ) : status ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Activity className="w-4 h-4 mr-1" />
                      Block Height
                    </div>
                    <div className="text-2xl font-bold">{status.latestBlockHeight.toLocaleString()}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      Validators
                    </div>
                    <div className="text-2xl font-bold">{status.validatorCount}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Coins className="w-4 h-4 mr-1" />
                      Bonded Tokens
                    </div>
                    <div className="text-2xl font-bold">
                      {(parseInt(status.bondedTokens) / 1e6).toLocaleString()} PRIV
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Globe className="w-4 h-4 mr-1" />
                      Total Supply
                    </div>
                    <div className="text-2xl font-bold">
                      {(parseInt(status.totalSupply) / 1e6).toLocaleString()} PRIV
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <ArrowClockwise className="w-6 h-6 animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faucet">
          <Card>
            <CardHeader>
              <CardTitle>Testnet Faucet</CardTitle>
              <CardDescription>Request test PRIV tokens for development</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Warning>
                <AlertDescription>
                  You can request test tokens every 24 hours. Each request provides 1000 PRIV tokens.
                </AlertDescription>
              </Warning>

              <div className="space-y-2">
                <Label htmlFor="faucet-address">Your PrivaChain Address</Label>
                <Input
                  id="faucet-address"
                  placeholder="priv1..."
                  value={faucetAddress}
                  onChange={(e) => setFaucetAddress(e.target.value)}
                />
              </div>

              <Button
                onClick={requestFaucetTokens}
                disabled={loading || !faucetAddress.trim()}
                className="w-full"
              >
                {loading ? <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" /> : <Coins className="w-4 h-4 mr-2" />}
                Request Test Tokens
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Setup Guide</CardTitle>
              <CardDescription>Step-by-step guide to connect to PrivaChain testnet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Requirements</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Keplr wallet extension (recommended) or any Cosmos-compatible wallet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Modern web browser with JavaScript enabled</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Stable internet connection</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Setup Steps</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      1
                    </span>
                    <div>
                      <strong>Install Keplr Wallet</strong>
                      <p className="text-muted-foreground">Download from the Chrome Web Store or Firefox Add-ons</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      2
                    </span>
                    <div>
                      <strong>Connect to Testnet</strong>
                      <p className="text-muted-foreground">Click the "Connect to Testnet" button above</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      3
                    </span>
                    <div>
                      <strong>Add Network to Keplr</strong>
                      <p className="text-muted-foreground">The testnet configuration will be automatically suggested to your wallet</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      4
                    </span>
                    <div>
                      <strong>Get Test Tokens</strong>
                      <p className="text-muted-foreground">Use the faucet to request PRIV tokens for testing</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Troubleshooting</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Connection Issues</strong>
                    <p className="text-muted-foreground">Try switching to a different RPC endpoint from the Connection tab</p>
                  </div>
                  <div>
                    <strong>Wallet Not Detected</strong>
                    <p className="text-muted-foreground">Make sure Keplr is installed and enabled in your browser</p>
                  </div>
                  <div>
                    <strong>Transaction Failures</strong>
                    <p className="text-muted-foreground">Ensure you have sufficient PRIV tokens for gas fees</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}