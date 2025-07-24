import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { BlockchainStatus } from './BlockchainStatus'
import { 
  User,
  Shield,
  Key,
  Wallet,
  Crown,
  Copy,
  Check,
  QrCode,
  Lock,
  Globe,
  Star
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

interface UserProfile {
  address: string
  displayName: string
  joinDate: number
  isPremium: boolean
  reputation: number
  publicKey: string
}

interface WalletInfo {
  balance: string
  staked: string
  earned: string
}

export function ProfileView() {
  const [profile, setProfile] = useKV<UserProfile>('user-profile', {
    address: 'priv1x7k9m2n8q5r3t6u9v2w5y8z1a4b7c0d3e6f9',
    displayName: 'Anonymous User',
    joinDate: Date.now() - 2592000000, // 30 days ago
    isPremium: false,
    reputation: 847,
    publicKey: 'pk_1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z'
  })
  
  const [walletInfo] = useKV<WalletInfo>('wallet-info', {
    balance: '1,247.58',
    staked: '500.00',
    earned: '47.23'
  })
  
  const [copied, setCopied] = useState<string | null>(null)
  const [newDisplayName, setNewDisplayName] = useState(profile.displayName)

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      toast.success(`${type} copied to clipboard`)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const updateProfile = () => {
    setProfile({
      ...profile,
      displayName: newDisplayName
    })
    toast.success('Profile updated successfully')
  }

  const upgradeToPremium = () => {
    setProfile({
      ...profile,
      isPremium: true
    })
    toast.success('Upgraded to Premium! Welcome to enhanced privacy features.')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-2xl">
              {profile.displayName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold">{profile.displayName}</h2>
              {profile.isPremium && (
                <Badge className="bg-gradient-to-r from-accent to-yellow-500 text-white gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono">{profile.address}</span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {profile.reputation.toLocaleString()} reputation
              </span>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Edit Profile</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="mt-1"
                  />
                </div>
                <Button onClick={updateProfile} className="w-full">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member since</span>
                    <span>{new Date(profile.joinDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account type</span>
                    <span>{profile.isPremium ? 'Premium' : 'Free'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reputation</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      {profile.reputation.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">E2E Encryption</span>
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="w-3 h-3" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Anonymous routing</span>
                    <Badge variant="secondary" className="gap-1">
                      <Globe className="w-3 h-3" />
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ZK-proof identity</span>
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Blockchain Status Section */}
            <BlockchainStatus />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Cryptographic Keys
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Public Key</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded font-mono text-sm break-all">
                      {profile.publicKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(profile.publicKey, 'Public key')}
                    >
                      {copied === 'Public key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                      {profile.address}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(profile.address, 'Address')}
                    >
                      {copied === 'Address' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="icon">
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Security Features</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span className="font-medium">End-to-End Encryption</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All messages and emails are encrypted with Signal Protocol
                  </p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Zero-Knowledge Proofs</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Verify identity without revealing personal information
                  </p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Anonymous Routing</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Communications routed through multiple encrypted nodes
                  </p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">Quantum Resistant</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Protected against future quantum computing attacks
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 text-center">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-accent" />
                <h3 className="font-semibold mb-1">Balance</h3>
                <p className="text-2xl font-bold">{walletInfo.balance}</p>
                <p className="text-sm text-muted-foreground">PRIV tokens</p>
              </Card>
              
              <Card className="p-6 text-center">
                <Lock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold mb-1">Staked</h3>
                <p className="text-2xl font-bold">{walletInfo.staked}</p>
                <p className="text-sm text-muted-foreground">PRIV tokens</p>
              </Card>
              
              <Card className="p-6 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <h3 className="font-semibold mb-1">Earned</h3>
                <p className="text-2xl font-bold">{walletInfo.earned}</p>
                <p className="text-sm text-muted-foreground">PRIV rewards</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Staking Rewards</h3>
              <p className="text-muted-foreground mb-4">
                Earn rewards by staking PRIV tokens to secure the network and run infrastructure nodes.
              </p>
              <div className="flex gap-3">
                <Button>Stake More Tokens</Button>
                <Button variant="outline">Claim Rewards</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="premium" className="space-y-6">
            {profile.isPremium ? (
              <Card className="p-6 bg-gradient-to-r from-accent/20 to-yellow-500/20 border-accent">
                <div className="flex items-center gap-3 mb-4">
                  <Crown className="w-6 h-6 text-accent" />
                  <h3 className="text-xl font-bold">Premium Active</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  You have access to all premium features including enhanced privacy, unlimited storage, and priority support.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <h4 className="font-semibold mb-1">Enhanced Privacy</h4>
                    <p className="text-sm text-muted-foreground">ZK-SNARK anonymous domains and metadata protection</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <h4 className="font-semibold mb-1">Unlimited Storage</h4>
                    <p className="text-sm text-muted-foreground">50GB encrypted storage with IPFS auto-pinning</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <h4 className="font-semibold mb-1">Priority TURN Servers</h4>
                    <p className="text-sm text-muted-foreground">HD video calls with guaranteed quality</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <h4 className="font-semibold mb-1">Custom .prv Domains</h4>
                    <p className="text-sm text-muted-foreground">Create personalized anonymous email addresses</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="text-center mb-6">
                  <Crown className="w-12 h-12 mx-auto mb-4 text-accent" />
                  <h3 className="text-2xl font-bold mb-2">Upgrade to Premium</h3>
                  <p className="text-muted-foreground">
                    Unlock advanced privacy features and enhanced security
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold mb-3">Premium Features</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        ZK-SNARK anonymous domains
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        50GB encrypted storage
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Priority video call servers
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Advanced search filters
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Custom .prv email domains
                      </li>
                    </ul>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">$10</div>
                    <div className="text-muted-foreground mb-4">per month</div>
                    <Button onClick={upgradeToPremium} className="w-full">
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}