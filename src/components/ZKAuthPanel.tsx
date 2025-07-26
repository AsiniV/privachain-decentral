import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Warning, AlertDescription } from '@/components/ui/alert'
import { useZKAuth } from '@/hooks/useZKAuth'
import { useCosmos } from '@/hooks/useCosmos'
import { BlockchainUtils } from '@/lib/crypto'
import { CosmosWallet } from './CosmosWallet'
import { toast } from 'sonner'
import { Shield, Key, Eye, EyeSlash, Copy, Fingerprint, Lightning, CheckCircle, Warning, ArrowSquareOut } from '@phosphor-icons/react'

export function ZKAuthPanel() {
  const {
    identity,
    isAuthenticated,
    isLoading,
    generateIdentity,
    authenticateWithIdentity,
    logout,
    generateSenderAlias,
    generateEphemeralAddress,
    zkInstance
  } = useZKAuth()

  const {
    isConnected: cosmosConnected,
    account: cosmosAccount,
    registerZKIdentity,
    registerDomain,
    queryDomain
  } = useCosmos()

  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [importIdentity, setImportIdentity] = useState('')
  const [testDomain, setTestDomain] = useState('journalist.prv')
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [powStatus, _setPowStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [blockchainRegistrationTx, setBlockchainRegistrationTx] = useState<string | null>(null)

  const handleGenerateIdentity = async () => {
    try {
      await generateIdentity()
      toast.success('ZK identity generated successfully!')
    } catch (error) {
      toast.error('Failed to generate identity')
      console.error(error)
    }
  }

  const handleImportIdentity = async () => {
    if (!importIdentity.trim()) {
      toast.error('Please enter an identity to import')
      return
    }

    try {
      const success = await authenticateWithIdentity(importIdentity.trim())
      if (success) {
        toast.success('Identity imported successfully!')
        setImportIdentity('')
      } else {
        toast.error('Invalid identity format')
      }
    } catch (error) {
      toast.error('Failed to import identity')
      console.error(error)
    }
  }

  const handleCopyIdentity = () => {
    if (identity) {
      const exported = zkInstance.exportIdentity()
      if (exported) {
        navigator.clipboard.writeText(exported)
        toast.success('Identity copied to clipboard')
      }
    }
  }

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleRegisterDomain = async () => {
    if (!identity) return

    if (!cosmosConnected || !cosmosAccount) {
      toast.error('Please connect your Cosmos wallet first')
      return
    }

    setRegistrationStatus('loading')
    try {
      const domain = await zkInstance.registerAnonymousDomain(testDomain.replace('.prv', ''))
      
      // Register on blockchain first
      const txHash = await registerDomain(
        domain.domain,
        domain.zkProofHash,
        domain.publicKey
      )

      if (txHash) {
        setBlockchainRegistrationTx(txHash)
        
        // Also register in local simulation for UI feedback
        const result = await BlockchainUtils.registerDomain(
          domain.domain,
          domain.zkProofHash,
          domain.publicKey
        )
        
        if (result.success) {
          setRegistrationStatus('success')
          toast.success(`Domain ${domain.domain} registered on Cosmos blockchain!`)
        } else {
          setRegistrationStatus('error')
          toast.error('Local registration failed')
        }
      } else {
        setRegistrationStatus('error')
        toast.error('Blockchain registration failed')
      }
    } catch (error) {
      setRegistrationStatus('error')
      toast.error('Domain registration failed')
      console.error(error)
    }
  }

  const handleQueryDomain = async () => {
    if (!cosmosConnected) {
      toast.error('Not connected to Cosmos')
      return
    }

    try {
      const result = await queryDomain(testDomain.replace('.prv', ''))
      if (result) {
        toast.success('Domain found on blockchain!')
        console.log('Domain data:', result)
      } else {
        toast.info('Domain not found on blockchain')
      }
    } catch (error) {
      console.error('Query failed:', error)
      toast.error('Failed to query domain')
    }
  }

  const handleRegisterOnBlockchain = async () => {
    if (!identity || !cosmosConnected || !cosmosAccount) {
      toast.error('Please connect your Cosmos wallet first')
      return
    }

    try {
      const ephemeralKey = generateEphemeralAddress()
      const txHash = await registerZKIdentity(
        identity.publicHash,
        identity.zkProof,
        ephemeralKey
      )

      if (txHash) {
        toast.success('ZK Identity registered on Cosmos blockchain!')
      }
    } catch (error) {
      console.error('Blockchain registration failed:', error)
      toast.error('Failed to register on blockchain')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Loading ZK authentication...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cosmos Wallet Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowSquareOut className="h-5 w-5" />
            Cosmos Blockchain Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CosmosWallet />
        </CardContent>
      </Card>

      {/* ZK Authentication Status */}
      {!cosmosConnected && (
        <Warning>
          <Warning className="h-4 w-4" />
          <AlertDescription>
            Connect to Cosmos testnet above to enable blockchain-based ZK authentication.
          </AlertDescription>
        </Warning>
      )}

      {!isAuthenticated ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Generate New Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Generate New Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a new cryptographic identity with zero-knowledge proofs for anonymous authentication.
              </p>
              <Button 
                onClick={handleGenerateIdentity} 
                disabled={isLoading}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                Generate ZK Identity
              </Button>
            </CardContent>
          </Card>

          {/* Import Existing Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Import Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-identity">Exported Identity</Label>
                <Textarea
                  id="import-identity"
                  placeholder="Paste your exported identity here..."
                  value={importIdentity}
                  onChange={(e) => setImportIdentity(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleImportIdentity} 
                disabled={isLoading || !importIdentity.trim()}
                className="w-full"
              >
                Import Identity
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Authenticated Identity
                </span>
                <Badge variant="default">Active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Public Hash</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={identity?.publicHash || ''} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(identity?.publicHash || '', 'Public hash')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ZK Proof</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={identity?.zkProof || ''} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(identity?.zkProof || '', 'ZK proof')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Private Key</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type={showPrivateKey ? 'text' : 'password'}
                      value={identity?.privateKey || ''} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(identity?.privateKey || '', 'Private key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Created</Label>
                  <Input 
                    value={identity && identity.timestamp ? new Date(identity.timestamp).toLocaleString() : 'Not available'} 
                    readOnly 
                  />
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCopyIdentity} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Export Identity
                </Button>
                {cosmosConnected && cosmosAccount && (
                  <Button onClick={handleRegisterOnBlockchain} variant="default" size="sm">
                    <ArrowSquareOut className="h-4 w-4 mr-2" />
                    Register on Blockchain
                  </Button>
                )}
                <Button onClick={logout} variant="destructive" size="sm">
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Anonymous Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Anonymous Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Domain Registration */}
              <div className="space-y-4">
                <h4 className="font-semibold">Anonymous Domain Registration</h4>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="your-domain"
                    value={testDomain.replace('.prv', '')}
                    onChange={(e) => setTestDomain(e.target.value + '.prv')}
                  />
                  <span className="text-sm text-muted-foreground">.prv</span>
                  <Button 
                    onClick={handleRegisterDomain}
                    disabled={registrationStatus === 'loading' || !cosmosConnected}
                    size="sm"
                  >
                    {registrationStatus === 'loading' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : registrationStatus === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : registrationStatus === 'error' ? (
                      <Warning className="h-4 w-4" />
                    ) : (
                      'Register'
                    )}
                  </Button>
                  <Button
                    onClick={handleQueryDomain}
                    disabled={!cosmosConnected}
                    variant="outline"
                    size="sm"
                  >
                    Query
                  </Button>
                </div>
                {blockchainRegistrationTx && (
                  <div className="mt-2">
                    <Label className="text-sm text-muted-foreground">Blockchain Transaction:</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        value={blockchainRegistrationTx} 
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(blockchainRegistrationTx, 'Transaction hash')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {!cosmosConnected && (
                  <p className="text-sm text-muted-foreground">
                    Connect to Cosmos testnet to register domains on blockchain
                  </p>
                )}
              </div>

              <Separator />

              {/* Sender Alias Generation */}
              <div className="space-y-4">
                <h4 className="font-semibold">Generate Sender Alias</h4>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const alias = generateSenderAlias(testDomain)
                      handleCopyToClipboard(alias, 'Sender alias')
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Generate Alias for {testDomain}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Ephemeral Address */}
              <div className="space-y-4">
                <h4 className="font-semibold">Ephemeral Address</h4>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const address = generateEphemeralAddress()
                      handleCopyToClipboard(address, 'Ephemeral address')
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Generate Ephemeral Address
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Proof of Work */}
              <div className="space-y-4">
                <h4 className="font-semibold">Anti-Spam Proof of Work</h4>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleGeneratePoW}
                    disabled={powStatus === 'loading'}
                    variant="outline"
                    size="sm"
                  >
                    <Lightning className="h-4 w-4 mr-2" />
                    {powStatus === 'loading' ? 'Generating...' : 'Generate PoW'}
                  </Button>
                  {powStatus === 'success' && (
                    <Badge variant="default">PoW Generated</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}