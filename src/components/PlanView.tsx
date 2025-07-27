import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Crown, 
  Check, 
  Star,
  Shield,
  Database,
  Globe,
  VideoCamera,
  Clock,
  CreditCard,
  Info
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { planManager } from '../services/PlanManager';
import { planActivationContract } from '../services/PlanActivationContract';

interface PlanViewProps {
  onClose?: () => void;
}

export function PlanView({ onClose }: PlanViewProps) {
  const [planStatus, setPlanStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'ATOM' | 'USDT'>('ATOM');
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);

  useEffect(() => {
    loadPlanStatus();
  }, []);

  useEffect(() => {
    // Listen for premium activation
    const handlePremiumActivated = () => {
      loadPlanStatus();
      setShowUpgradeDialog(false);
      setPaymentInvoice(null);
      toast.success('🎉 Premium plan activated successfully!');
    };

    window.addEventListener('premium-activated', handlePremiumActivated);
    return () => window.removeEventListener('premium-activated', handlePremiumActivated);
  }, []);

  const loadPlanStatus = async () => {
    try {
      setLoading(true);
      await planManager.initializePlan();
      const status = await planManager.getPlanStatus();
      setPlanStatus(status);
    } catch (error) {
      console.error('Error loading plan status:', error);
      toast.error('Failed to load plan information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    setShowUpgradeDialog(true);
  };

  const handleUpgradeConfirm = async () => {
    if (!planStatus) return;
    
    try {
      setUpgrading(true);
      const invoice = await planActivationContract.generatePaymentInvoice(
        planStatus.planId || 'default',
        selectedCurrency
      );
      setPaymentInvoice(invoice);
    } catch (error) {
      console.error('Error creating payment invoice:', error);
      toast.error('Failed to create payment invoice');
    } finally {
      setUpgrading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatQuota = (used: number, limit: number) => {
    if (limit === -1) return 'Unlimited';
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
  };

  const getQuotaPercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plan information...</p>
        </div>
      </div>
    );
  }

  if (!planStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No plan information available</p>
          <Button onClick={loadPlanStatus}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className={`w-6 h-6 ${planStatus.planType === 'premium' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            Your Plan
          </h1>
          <p className="text-muted-foreground">
            {planStatus.planType === 'premium' ? 'Premium features unlocked' : 'Starter plan active'}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Current Plan Card */}
      <Card className={planStatus.planType === 'premium' ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {planStatus.planType === 'premium' ? (
                <>
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Premium Plan
                </>
              ) : (
                <>
                  <Star className="w-5 h-5 text-blue-500" />
                  Starter Plan
                </>
              )}
            </CardTitle>
            <Badge 
              variant={planStatus.planType === 'premium' ? 'default' : 'secondary'}
              className={planStatus.planType === 'premium' ? 'bg-yellow-500 text-white' : ''}
            >
              {planStatus.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <CardDescription>
            ${planStatus.costPerMonth}/month • All gas fees sponsored by developer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="usage" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
            </TabsList>

            <TabsContent value="usage" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Messages Today</span>
                    <span>{formatQuota(planStatus.quotas.messages.used, planStatus.quotas.messages.limit)}</span>
                  </div>
                  <Progress value={getQuotaPercentage(planStatus.quotas.messages.used, planStatus.quotas.messages.limit)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Emails Today</span>
                    <span>{formatQuota(planStatus.quotas.emails.used, planStatus.quotas.emails.limit)}</span>
                  </div>
                  <Progress value={getQuotaPercentage(planStatus.quotas.emails.used, planStatus.quotas.emails.limit)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Searches Today</span>
                    <span>{formatQuota(planStatus.quotas.searches.used, planStatus.quotas.searches.limit)}</span>
                  </div>
                  <Progress value={getQuotaPercentage(planStatus.quotas.searches.used, planStatus.quotas.searches.limit)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage Used</span>
                    <span>{formatQuota(planStatus.quotas.storage.used, planStatus.quotas.storage.limit)} MB</span>
                  </div>
                  <Progress value={getQuotaPercentage(planStatus.quotas.storage.used, planStatus.quotas.storage.limit)} />
                </div>
              </div>

              {planStatus.quotas.videoMinutes.limit !== -1 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Video Minutes Today</span>
                    <span>{formatQuota(planStatus.quotas.videoMinutes.used, planStatus.quotas.videoMinutes.limit)}</span>
                  </div>
                  <Progress value={getQuotaPercentage(planStatus.quotas.videoMinutes.used, planStatus.quotas.videoMinutes.limit)} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {planStatus.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Storage</span>
                  </div>
                  <p className="text-2xl font-bold">{planStatus.quotas.storage.limit === -1 ? '1TB' : `${planStatus.quotas.storage.limit}MB`}</p>
                  <p className="text-sm text-muted-foreground">Encrypted IPFS storage</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">.prv Domains</span>
                  </div>
                  <p className="text-2xl font-bold">{planStatus.quotas.prvDomains.limit}</p>
                  <p className="text-sm text-muted-foreground">Anonymous email domains</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <VideoCamera className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Video Calls</span>
                  </div>
                  <p className="text-2xl font-bold">{planStatus.quotas.videoMinutes.limit === -1 ? 'Unlimited' : 'Not Available'}</p>
                  <p className="text-sm text-muted-foreground">HD video calling</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">Gas Fees</span>
                  </div>
                  <p className="text-2xl font-bold">FREE</p>
                  <p className="text-sm text-muted-foreground">Developer sponsored</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Upgrade Section */}
      {planStatus.planType === 'starter' && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Upgrade to Premium
            </CardTitle>
            <CardDescription>
              Unlock unlimited features for just $10/month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Premium Benefits</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    1TB storage (vs 500MB)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Unlimited traffic
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    5 custom .prv domains
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Unlimited video calls
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Unlimited daily quotas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Priority support
                  </li>
                </ul>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">$10</div>
                <div className="text-muted-foreground mb-4">per month</div>
                <Button onClick={handleUpgradeClick} className="w-full" size="lg">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upgrade to Premium</DialogTitle>
          </DialogHeader>
          
          {!paymentInvoice ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Choose your payment method to activate Premium features
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedCurrency === 'ATOM' ? 'default' : 'outline'}
                  onClick={() => setSelectedCurrency('ATOM')}
                  className="h-16 flex-col"
                >
                  <div className="text-lg mb-1">🪐 ATOM</div>
                  <div className="text-xs">Cosmos Network</div>
                </Button>
                <Button
                  variant={selectedCurrency === 'USDT' ? 'default' : 'outline'}
                  onClick={() => setSelectedCurrency('USDT')}
                  className="h-16 flex-col"
                >
                  <div className="text-lg mb-1">💲 USDT</div>
                  <div className="text-xs">Ethereum Network</div>
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Automatic Activation</p>
                    <p>Once your payment is confirmed on the blockchain, your Premium plan will be activated automatically. You'll receive a notification when this happens.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpgradeConfirm} disabled={upgrading} className="flex-1">
                  {upgrading ? 'Creating Invoice...' : `Pay with ${selectedCurrency}`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Complete Your Payment</h3>
                <p className="text-muted-foreground">
                  Send exactly {paymentInvoice.amount} {paymentInvoice.currency} to the address below
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      value={`${paymentInvoice.amount} ${paymentInvoice.currency}`}
                      readOnly 
                      className="flex-1 p-2 bg-muted rounded border font-mono"
                    />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(paymentInvoice.amount.toString(), 'Amount')}>
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Wallet Address</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      value={paymentInvoice.walletAddress}
                      readOnly 
                      className="flex-1 p-2 bg-muted rounded border font-mono text-xs"
                    />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(paymentInvoice.walletAddress, 'Address')}>
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border">
                    <img 
                      src={paymentInvoice.qrCode} 
                      alt="Payment QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">Monitoring Payment</p>
                      <p>We're watching the blockchain for your payment. Premium will activate automatically once confirmed.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}