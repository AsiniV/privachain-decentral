import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Wallet, Shield, AlertTriangle, Zap, ArrowRight, Coins } from '@phosphor-icons/react';
import { useKV } from '@github/spark/hooks';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  privacyLevel: 'maximum' | 'reduced' | 'minimal';
  enabled: boolean;
  costMultiplier: number;
  icon: React.ReactNode;
  restrictions: string[];
}

interface WalletBalance {
  priv: string;
  atom: string;
  usd: string;
}

interface PaymentStatus {
  freeQuotaRemaining: {
    messages: number;
    emails: number;
    videoMinutes: number;
    searches: number;
  };
  premiumStatus: {
    active: boolean;
    balance: string;
    expiryDate: Date;
    autoRefill: boolean;
  } | null;
  directBalance: string;
  recommendedAction: string;
}

export function WalletManager() {
  const [selectedPayment, setSelectedPayment] = useKV<string>('selected-payment-method', 'priv-native');
  const [walletConnected, setWalletConnected] = useKV<boolean>('wallet-connected', false);
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    freeQuotaRemaining: { messages: 8, emails: 2, videoMinutes: 10, searches: 45 },
    premiumStatus: null,
    directBalance: '0.0',
    recommendedAction: 'Consider adding PRIV tokens for enhanced privacy'
  });
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    priv: '0.0',
    atom: '12.5',
    usd: '156.80'
  });

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'priv-native',
      name: 'PRIV Native',
      description: 'Maximum privacy with ZK-proofs and anonymous transactions',
      privacyLevel: 'maximum',
      enabled: true,
      costMultiplier: 1.0,
      icon: <Shield className="w-5 h-5 text-green-500" />,
      restrictions: []
    },
    {
      id: 'atom-sponsored',
      name: 'ATOM Wallet',
      description: 'Use your existing ATOM balance (reduced privacy)',
      privacyLevel: 'reduced',
      enabled: true,
      costMultiplier: 1.0,
      icon: <Wallet className="w-5 h-5 text-blue-500" />,
      restrictions: ['Public transactions', 'Daily limits', 'Metadata visible']
    },
    {
      id: 'hybrid-bridge',
      name: 'Cross-Chain Bridge',
      description: 'Convert ATOM to PRIV credits automatically',
      privacyLevel: 'minimal',
      enabled: false,
      costMultiplier: 1.15,
      icon: <ArrowRight className="w-5 h-5 text-purple-500" />,
      restrictions: ['Exchange rate risk', 'Bridge delays', 'Higher fees']
    }
  ];

  const getPrivacyColor = (level: string) => {
    switch (level) {
      case 'maximum': return 'bg-green-100 text-green-800 border-green-200';
      case 'reduced': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'minimal': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const connectWallet = async (type: 'keplr' | 'leap' | 'cosmostation') => {
    // Simulate wallet connection
    setWalletConnected(true);
    setWalletBalance({
      priv: '0.0',
      atom: '12.5',
      usd: '156.80'
    });
  };

  const switchPaymentMethod = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (!method) return;

    setSelectedPayment(methodId);
    
    if (methodId === 'atom-sponsored') {
      setShowPrivacyWarning(true);
    } else {
      setShowPrivacyWarning(false);
    }
  };

  const upgradeToPremium = () => {
    // Simulate premium upgrade
    setPaymentStatus(prev => ({
      ...prev,
      premiumStatus: {
        active: true,
        balance: '1000.0',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRefill: true
      },
      recommendedAction: 'Premium activated - unlimited secure communication'
    }));
  };

  const selectedMethod = paymentMethods.find(m => m.id === selectedPayment);

  return (
    <div className="space-y-6">
      {/* Wallet Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Connection
          </CardTitle>
          <CardDescription>
            Connect your Cosmos wallet to manage payments and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!walletConnected ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={() => connectWallet('keplr')} variant="outline" className="h-12">
                <div className="text-center">
                  <div className="font-medium">Keplr</div>
                  <div className="text-xs text-muted-foreground">Recommended</div>
                </div>
              </Button>
              <Button onClick={() => connectWallet('leap')} variant="outline" className="h-12">
                <div className="text-center">
                  <div className="font-medium">Leap</div>
                  <div className="text-xs text-muted-foreground">Fast & Secure</div>
                </div>
              </Button>
              <Button onClick={() => connectWallet('cosmostation')} variant="outline" className="h-12">
                <div className="text-center">
                  <div className="font-medium">Cosmostation</div>
                  <div className="text-xs text-muted-foreground">Multi-chain</div>
                </div>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <div className="font-medium">Wallet Connected</div>
                <div className="text-sm text-muted-foreground">cosmos1abc...xyz789</div>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Connected
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Balances */}
      {walletConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Current Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{walletBalance.priv}</div>
                <div className="text-sm text-muted-foreground">PRIV Tokens</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{walletBalance.atom}</div>
                <div className="text-sm text-muted-foreground">ATOM Tokens</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">${walletBalance.usd}</div>
                <div className="text-sm text-muted-foreground">USD Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Choose how you want to pay for network transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedPayment === method.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              } ${!method.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => method.enabled && switchPaymentMethod(method.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {method.icon}
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {method.name}
                      {!method.enabled && <Badge variant="secondary">Coming Soon</Badge>}
                      {method.costMultiplier > 1 && (
                        <Badge variant="outline">+{((method.costMultiplier - 1) * 100).toFixed(0)}% fee</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {method.description}
                    </div>
                    {method.restrictions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {method.restrictions.map((restriction) => (
                          <Badge key={restriction} variant="outline" className="text-xs">
                            {restriction}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Badge className={getPrivacyColor(method.privacyLevel)}>
                  {method.privacyLevel} privacy
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy Warning for ATOM */}
      {showPrivacyWarning && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Privacy Notice:</strong> Using ATOM for payments will create public transaction records 
            that can be linked to your wallet address. Your PrivaChain usage patterns may become visible. 
            For maximum privacy, consider using PRIV tokens instead.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Daily Usage Status
          </CardTitle>
          <CardDescription>
            Your current usage and remaining free quotas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Messages</span>
                <span>{paymentStatus.freeQuotaRemaining.messages}/10</span>
              </div>
              <Progress value={(10 - paymentStatus.freeQuotaRemaining.messages) * 10} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Emails</span>
                <span>{paymentStatus.freeQuotaRemaining.emails}/2</span>
              </div>
              <Progress value={(2 - paymentStatus.freeQuotaRemaining.emails) * 50} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Video (min)</span>
                <span>{paymentStatus.freeQuotaRemaining.videoMinutes}/10</span>
              </div>
              <Progress value={(10 - paymentStatus.freeQuotaRemaining.videoMinutes) * 10} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Searches</span>
                <span>{paymentStatus.freeQuotaRemaining.searches}/50</span>
              </div>
              <Progress value={(50 - paymentStatus.freeQuotaRemaining.searches) * 2} />
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Recommendation</div>
                <div className="text-sm text-muted-foreground">
                  {paymentStatus.recommendedAction}
                </div>
              </div>
              {!paymentStatus.premiumStatus && (
                <Button onClick={upgradeToPremium} size="sm">
                  Upgrade to Premium
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Status */}
      {paymentStatus.premiumStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Premium Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <div className="font-medium text-green-800">Premium Active</div>
                <div className="text-sm text-green-600">
                  Balance: {paymentStatus.premiumStatus.balance} PRIV • 
                  Expires: {paymentStatus.premiumStatus.expiryDate.toLocaleDateString()}
                </div>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Unlimited
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}