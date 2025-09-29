import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { UserCodesScreen } from './UserCodesScreen'
import { RecoveryScreen } from './RecoveryScreen'
import { 
  User,
  Crown,
  Copy,
  Check,
  Key,
  Shield,
  CreditCard,
  Star
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '../hooks/useKV'

interface UserProfile {
  address: string
  displayName: string
  joinDate: number
  isPremium: boolean
  reputation: number
  publicKey: string
}

interface UserTabProps {
  // Empty interface for future props
  placeholder?: never
}

export function UserTab(_props: UserTabProps) {
  const [profile, setProfile] = useKV<UserProfile>('user-profile', {
    address: 'did:priva:alice',
    displayName: 'PrivaChain User',
    joinDate: Date.now() - 2592000000, // 30 days ago
    isPremium: false,
    reputation: 847,
    publicKey: 'pk_1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z'
  })
  
  const [activeTab, setActiveTab] = useState('overview')
  const [showRecovery, setShowRecovery] = useState(false)
  const [showBuyLifetime, setShowBuyLifetime] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      toast.success(`${type} copied to clipboard`)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleRecoveryComplete = () => {
    setProfile(prev => ({ ...prev, isPremium: true }))
    setShowRecovery(false)
    toast.success('Premium access successfully restored!')
  }

  const handleBuyLifetime = async () => {
    try {
      // Simulate lifetime purchase process
      toast.info('Redirecting to payment system...')
      
      // In real implementation, this would integrate with payment processor
      // For demo purposes, simulate successful purchase after delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate potential payment errors
      if (Math.random() < 0.1) { // 10% chance of payment error for demo
        throw new Error('Payment processing failed')
      }
      
      setProfile(prev => ({ ...prev, isPremium: true }))
      setShowBuyLifetime(false)
      toast.success('Lifetime subscription activated!')
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (showRecovery) {
    return (
      <div className="h-full bg-background">
        <div className="p-4 border-b border-border">
          <Button variant="ghost" onClick={() => setShowRecovery(false)}>
            ← Back to profile
          </Button>
        </div>
        <RecoveryScreen 
          onNavigateToUserCodes={() => setShowRecovery(false)}
          onRecoveryComplete={handleRecoveryComplete}
        />
      </div>
    )
  }

  if (showBuyLifetime) {
    return (
      <div className="h-full bg-background">
        <div className="p-4 border-b border-border">
          <Button variant="ghost" onClick={() => setShowBuyLifetime(false)}>
            ← Back to profile
          </Button>
        </div>
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <Card className="p-6 bg-gradient-to-r from-accent/10 to-yellow-500/10 border-accent">
            <div className="text-center">
              <Crown className="w-16 h-16 mx-auto mb-4 text-accent" />
              <h2 className="text-2xl font-bold mb-2">PrivaChain Lifetime Subscription</h2>
              <p className="text-muted-foreground mb-6">
                Get access to all premium features forever
              </p>
              
              <div className="bg-background/50 rounded-lg p-6 mb-6">
                <div className="text-4xl font-bold mb-2 text-accent">$99</div>
                <div className="text-muted-foreground">One-time payment</div>
              </div>
              
              <div className="space-y-3 text-left mb-6">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Unlimited ZK-SNARK encryption</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>1TB encrypted storage</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Priority video call servers</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Personal .prv domains</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Enhanced metadata privacy</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Priority technical support</span>
                </div>
              </div>
              
              <Button 
                onClick={handleBuyLifetime}
                className="w-full bg-gradient-to-r from-accent to-yellow-500 hover:from-accent/90 hover:to-yellow-500/90"
                size="lg"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Buy Lifetime Subscription
              </Button>
              
              <p className="text-xs text-muted-foreground mt-4">
                Secure payment via cryptocurrency or bank card
              </p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-2xl bg-accent text-accent-foreground">
              {profile.displayName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-foreground">{profile.displayName}</h2>
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
                <Star className="w-3 h-3 text-yellow-500" />
                {profile.reputation.toLocaleString()} reputation
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="codes">My Codes</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <User className="w-5 h-5" />
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="text-foreground">{new Date(profile.joinDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account type</span>
                    <span className="text-foreground">{profile.isPremium ? 'Premium' : 'Starter'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reputation</span>
                    <span className="flex items-center gap-1 text-foreground">
                      <Star className="w-4 h-4 text-yellow-500" />
                      {profile.reputation.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Shield className="w-5 h-5" />
                  Privacy Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">E2E encryption</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1">
                      <Shield className="w-3 h-3" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Anonymous routing</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 gap-1">
                      <Shield className="w-3 h-3" />
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ZK-proof</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 gap-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => setShowRecovery(true)}
                variant="outline"
                className="flex-1"
              >
                <Key className="w-4 h-4 mr-2" />
                Restore Account
              </Button>
              
              {!profile.isPremium && (
                <Button 
                  onClick={() => setShowBuyLifetime(true)}
                  className="flex-1 bg-gradient-to-r from-accent to-yellow-500 hover:from-accent/90 hover:to-yellow-500/90"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Buy Lifetime
                </Button>
              )}
            </div>

            {/* ID Display */}
            <Card className="p-6 bg-card border-border">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                <Key className="w-5 h-5" />
                Your DID
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded font-mono text-sm text-foreground">
                  {profile.address}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(profile.address, 'DID')}
                >
                  {copied === 'DID' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-6">
            <UserCodesScreen onNavigateToRecovery={() => setShowRecovery(true)} />
          </TabsContent>

          <TabsContent value="premium" className="space-y-6">
            {profile.isPremium ? (
              <Card className="p-6 bg-gradient-to-r from-accent/20 to-yellow-500/20 border-accent">
                <div className="flex items-center gap-3 mb-4">
                  <Crown className="w-6 h-6 text-accent" />
                  <h3 className="text-xl font-bold text-foreground">Premium Active</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  You have access to all premium features including enhanced privacy, unlimited storage, and priority support.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <h4 className="font-semibold mb-1 text-foreground">Enhanced Privacy</h4>
                    <p className="text-sm text-muted-foreground">ZK-SNARK anonymous domains and metadata protection</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <h4 className="font-semibold mb-1 text-foreground">Unlimited Storage</h4>
                    <p className="text-sm text-muted-foreground">1TB encrypted storage with IPFS auto-pinning</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <h4 className="font-semibold mb-1 text-foreground">Priority TURN Servers</h4>
                    <p className="text-sm text-muted-foreground">HD video calls with guaranteed quality</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <h4 className="font-semibold mb-1 text-foreground">Personal .prv Domains</h4>
                    <p className="text-sm text-muted-foreground">Create personalized anonymous email addresses</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 bg-card border-border">
                <div className="text-center mb-6">
                  <Crown className="w-12 h-12 mx-auto mb-4 text-accent" />
                  <h3 className="text-2xl font-bold mb-2 text-foreground">Upgrade to Premium</h3>
                  <p className="text-muted-foreground">
                    Unlock advanced privacy features and enhanced security
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-foreground">Premium Features</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-foreground">ZK-SNARK anonymous domains</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-foreground">1TB encrypted storage</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-foreground">Priority video call servers</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-foreground">Advanced search filters</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-foreground">Personal .prv email domains</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2 text-foreground">$99</div>
                    <div className="text-muted-foreground mb-4">lifetime</div>
                    <Button 
                      onClick={() => setShowBuyLifetime(true)}
                      className="w-full bg-gradient-to-r from-accent to-yellow-500 hover:from-accent/90 hover:to-yellow-500/90"
                    >
                      Buy Now
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