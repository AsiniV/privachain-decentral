/**
 * Gas Fee Status Component
 * Displays user's payment status, quotas, and upgrade options
 */

import { useState, useEffect, useCallback } from 'react';
import { useKV } from '../hooks/useKV';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  CreditCard, 
  Lightning, 
  Shield, 
  Clock, 
  TrendUp,
  Warning,
  CheckCircle,
  Wallet 
} from '@phosphor-icons/react';
import { gasFeeManager } from '../services/GasFeeManager';
import { useTestWallet } from '../hooks/useTestWallet';
import { TEST_WALLET_ADDRESS } from '../blockchain/CosmosTestnet';
import { toast } from 'sonner';

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

export function GasFeeStatus() {
  const [userAddress] = useKV('user-address', TEST_WALLET_ADDRESS);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { wallet } = useTestWallet();

  const loadPaymentStatus = useCallback(() => {
    try {
      const status = gasFeeManager.getPaymentStatus(userAddress);
      setPaymentStatus(status);
    } catch (error) {
      console.error('Failed to load payment status:', error);
      toast.error('Failed to load payment status');
    }
  }, [userAddress]);

  useEffect(() => {
    loadPaymentStatus();
  }, [userAddress, loadPaymentStatus]);

  const handleUpgradeToPremium = async () => {
    setIsLoading(true);
    try {
      await gasFeeManager.subscribeToPremium(userAddress, 30, true);
      toast.success('Successfully upgraded to Premium!');
      loadPaymentStatus();
      setShowUpgradeDialog(false);
    } catch (error) {
      console.error('Premium upgrade failed:', error);
      toast.error('Failed to upgrade to Premium');
    } finally {
      setIsLoading(false);
    }
  };

  const getQuotaUsageColor = (used: number, total: number): string => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-primary';
  };

  const getQuotaProgress = (used: number, total: number): number => {
    return Math.min((used / total) * 100, 100);
  };

  if (!paymentStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Lightning className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p>Loading payment status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Test Wallet Gas Sponsor Status */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Wallet className="w-5 h-5" />
            Test Wallet Gas Sponsorship
          </CardTitle>
          <CardDescription className="text-blue-700">
            Your transactions are sponsored by the test wallet for platform testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-muted-foreground">Sponsor Wallet</div>
              <div className="font-mono text-xs mt-1">{TEST_WALLET_ADDRESS.slice(0, 20)}...</div>
            </div>
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-muted-foreground">Available ATOM</div>
              <div className="text-lg font-bold text-blue-600">
                {wallet.isConnected ? wallet.balances.find(b => b.denom === 'uatom')?.formatted || '0 ATOM' : 'Not Connected'}
              </div>
            </div>
            <div className="p-3 bg-white rounded border">
              <div className="text-sm font-medium text-muted-foreground">Sponsorship Status</div>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Active</span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
            💡 All your platform operations are currently sponsored by the test wallet. No manual gas payments required!
          </div>
        </CardContent>
      </Card>

      {/* Current Plan Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">Payment Status</CardTitle>
            <CardDescription>
              Gas fees and service access overview
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {paymentStatus.premiumStatus?.active ? (
              <Badge variant="default" className="bg-primary">
                <Shield className="w-3 h-3 mr-1" />
                Premium Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                Free Tier
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free Quota Status */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Lightning className="w-4 h-4" />
                Free Daily Quota
              </h4>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Messages</span>
                    <span className={getQuotaUsageColor(100 - paymentStatus.freeQuotaRemaining.messages, 100)}>
                      {paymentStatus.freeQuotaRemaining.messages}/100
                    </span>
                  </div>
                  <Progress 
                    value={getQuotaProgress(100 - paymentStatus.freeQuotaRemaining.messages, 100)}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Emails</span>
                    <span className={getQuotaUsageColor(20 - paymentStatus.freeQuotaRemaining.emails, 20)}>
                      {paymentStatus.freeQuotaRemaining.emails}/20
                    </span>
                  </div>
                  <Progress 
                    value={getQuotaProgress(20 - paymentStatus.freeQuotaRemaining.emails, 20)}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>VideoCamera (min)</span>
                    <span className={getQuotaUsageColor(60 - paymentStatus.freeQuotaRemaining.videoMinutes, 60)}>
                      {paymentStatus.freeQuotaRemaining.videoMinutes}/60
                    </span>
                  </div>
                  <Progress 
                    value={getQuotaProgress(60 - paymentStatus.freeQuotaRemaining.videoMinutes, 60)}
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            {/* Premium Status */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Premium Account
              </h4>
              
              {paymentStatus.premiumStatus ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Active</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Balance: {paymentStatus.premiumStatus.balance} PRIV</p>
                    <p>Expires: {paymentStatus.premiumStatus.expiryDate.toLocaleDateString()}</p>
                    <p>Auto-refill: {paymentStatus.premiumStatus.autoRefill ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Warning className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm">Not Active</span>
                  </div>
                  <Button 
                    onClick={() => setShowUpgradeDialog(true)}
                    className="w-full"
                    size="sm"
                  >
                    Upgrade to Premium
                  </Button>
                </div>
              )}
            </div>

            {/* Direct Balance */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                PRIV Balance
              </h4>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {paymentStatus.directBalance} PRIV
                </div>
                <div className="text-sm text-muted-foreground">
                  Available for direct payments
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Add PRIV Tokens
                </Button>
              </div>
            </div>
          </div>

          {/* Recommended Action */}
          {paymentStatus.recommendedAction !== 'You have sufficient access for current usage' && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start gap-3">
                <TrendUp className="w-5 h-5 mt-0.5 text-primary" />
                <div>
                  <h5 className="font-medium mb-1">Recommendation</h5>
                  <p className="text-sm text-muted-foreground">
                    {paymentStatus.recommendedAction}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gas Cost Information */}
      <Card>
        <CardHeader>
          <CardTitle>Gas Cost Schedule</CardTitle>
          <CardDescription>
            Current gas fees for different operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex justify-between p-3 border rounded">
              <span>Send Message</span>
              <span className="font-mono">0.001 PRIV</span>
            </div>
            <div className="flex justify-between p-3 border rounded">
              <span>Send Email</span>
              <span className="font-mono">0.01 PRIV</span>
            </div>
            <div className="flex justify-between p-3 border rounded">
              <span>VideoCamera Call</span>
              <span className="font-mono">0.1 PRIV/session</span>
            </div>
            <div className="flex justify-between p-3 border rounded">
              <span>MagnifyingGlass Query</span>
              <span className="font-mono">0.0005 PRIV</span>
            </div>
            <div className="flex justify-between p-3 border rounded">
              <span>.prv Domain</span>
              <span className="font-mono">50 PRIV</span>
            </div>
            <div className="flex justify-between p-3 border rounded bg-primary/10">
              <span>Premium Plan</span>
              <span className="font-mono">100 PRIV/month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      {showUpgradeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Upgrade to Premium</CardTitle>
              <CardDescription>
                Unlock unlimited usage and priority access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Premium Features:</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ Unlimited messages and emails</li>
                  <li>✓ HD video calls with priority servers</li>
                  <li>✓ Advanced search with filters</li>
                  <li>✓ .prv domain registration</li>
                  <li>✓ Zero-knowledge encryption</li>
                  <li>✓ 50GB encrypted storage</li>
                </ul>
              </div>
              
              <div className="border rounded p-3 bg-muted/50">
                <div className="flex justify-between items-center">
                  <span>Monthly Cost:</span>
                  <span className="font-bold">100 PRIV (~$10)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUpgradeDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpgradeToPremium}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Upgrade Now'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}