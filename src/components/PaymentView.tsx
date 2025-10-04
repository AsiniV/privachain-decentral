import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { CreditCard, Shield, Clock, Copy, ArrowSquareOut, CheckCircle, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { paymentService, SUPPORTED_CRYPTOS, type CryptoCurrency, type PaymentInvoice, type PremiumOrder } from '@/services/PaymentService'

interface PaymentViewProps {
  onBack: () => void
}

interface Plan {
  name: string
  price: number
  period: string
  savings?: string
  features: string[]
}

export function PaymentView({ onBack }: PaymentViewProps) {
  const [step, setStep] = useState<'plan' | 'method' | 'crypto' | 'card' | 'processing'>('plan')
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency>(SUPPORTED_CRYPTOS[0])
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'card'>('crypto')
  const [currentOrder, setCurrentOrder] = useState<PremiumOrder | null>(null)
  const [currentInvoice, setCurrentInvoice] = useState<PaymentInvoice | null>(null)
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  })
  const [processing, setProcessing] = useState(false)

  const plans: Record<'monthly' | 'yearly', Plan> = {
    monthly: {
      name: 'Premium Monthly',
      price: 10,
      period: 'month',
      features: [
        'HD video calls with priority TURN servers',
        'Anonymous .prv domain registration',
        '50GB encrypted storage with auto-pinning',
        'Zero-knowledge encryption (ZK-SNARKs)',
        'Advanced search with date/content filters',
        'Unlimited audience channels',
        'Custom UI themes'
      ]
    },
    yearly: {
      name: 'Premium Yearly',
      price: 100,
      period: 'year',
      savings: '17% off',
      features: [
        'All monthly features included',
        'Priority customer support',
        'Early access to new features',
        'Quantum-resistant encryption',
        'Advanced analytics dashboard',
        'API access for integrations',
        'White-label options'
      ]
    }
  }

  const handleCreateOrder = async () => {
    try {
      const order = await paymentService.createOrder(selectedPlan)
      setCurrentOrder(order)
      setStep('method')
    } catch {
      toast.error('Failed to create order. Please try again.')
    }
  }

  const handleCryptoPayment = async () => {
    if (!currentOrder) return
    
    try {
      setProcessing(true)
      const invoice = await paymentService.createCryptoInvoice({
        orderId: currentOrder.id,
        planType: selectedPlan,
        selectedCrypto
      })
      setCurrentInvoice(invoice)
      setStep('processing')
    } catch {
      toast.error('Failed to create payment invoice. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleCardPayment = async () => {
    if (!currentOrder) return
    
    try {
      setProcessing(true)
      setStep('processing')
      
      const result = await paymentService.processCardPayment({
        orderId: currentOrder.id,
        planType: selectedPlan,
        cardDetails
      })

      if (result.success) {
        toast.success('Payment successful! Premium access activated.')
        setTimeout(() => {
          onBack()
        }, 2000)
      } else {
        toast.error(result.message)
        setStep('card')
      }
    } catch {
      toast.error('Payment processing failed. Please try again.')
      setStep('card')
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts: string[] = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  // Check payment status periodically
  useEffect(() => {
    if (currentInvoice && currentInvoice.status === 'pending') {
      const interval = setInterval(async () => {
        const updatedInvoice = await paymentService.getInvoice(currentInvoice.id)
        if (updatedInvoice) {
          setCurrentInvoice(updatedInvoice)
          if (updatedInvoice.status === 'confirmed') {
            clearInterval(interval)
            toast.success('Payment confirmed! Premium access activated.')
            setTimeout(() => {
              onBack()
            }, 2000)
          }
        }
      }, 10000) // Check every 10 seconds

      return () => clearInterval(interval)
    }
  }, [currentInvoice, onBack])

  if (step === 'plan') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Upgrade to Premium</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get enhanced privacy features, unlimited storage, and priority access to decentralized infrastructure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(plans).map(([key, plan]) => (
            <Card 
              key={key}
              className={`cursor-pointer transition-all border-2 ${
                selectedPlan === key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedPlan(key as 'monthly' | 'yearly')}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.savings && (
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      {plan.savings}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  <span className="text-2xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={handleCreateOrder} className="px-8">
            Continue with {plans[selectedPlan].name}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'method') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Choose Payment Method</h1>
          <p className="text-muted-foreground">
            Select your preferred payment method for {plans[selectedPlan].name}
          </p>
        </div>

        <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'crypto' | 'card')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crypto" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Cryptocurrency
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Credit Card
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crypto" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Anonymous Cryptocurrency Payment
                </CardTitle>
                <CardDescription>
                  Pay with cryptocurrency for maximum privacy and anonymity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedCrypto.id} onValueChange={(value) => {
                  const crypto = SUPPORTED_CRYPTOS.find(c => c.id === value)
                  if (crypto) setSelectedCrypto(crypto)
                }}>
                  {SUPPORTED_CRYPTOS.map((crypto) => (
                    <div key={crypto.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value={crypto.id} id={crypto.id} />
                      <Label htmlFor={crypto.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{crypto.icon}</span>
                            <div>
                              <div className="font-medium">{crypto.name} ({crypto.symbol})</div>
                              <div className="text-sm text-muted-foreground">
                                {crypto.network} • {crypto.processingTime}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={crypto.anonymityLevel === 'high' ? 'default' : 'secondary'}
                              className={crypto.anonymityLevel === 'high' ? 'bg-accent' : ''}
                            >
                              {crypto.anonymityLevel} privacy
                            </Badge>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setStep('plan')}>
                Back
              </Button>
              <Button onClick={() => setStep('crypto')} className="px-8">
                Pay with {selectedCrypto.symbol}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="card" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Credit Card Payment
                </CardTitle>
                <CardDescription>
                  Quick payment with Visa or Mastercard (purchase details will be recorded)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="card-name">Cardholder Name</Label>
                      <Input
                        id="card-name"
                        placeholder="John Doe"
                        value={cardDetails.name}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="card-number">Card Number</Label>
                      <Input
                        id="card-number"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.number}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                        maxLength={19}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Warning className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <strong>Privacy Notice:</strong> Card payments are processed through traditional banking systems. 
                      Your purchase details will be visible to payment processors and banks.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setStep('plan')}>
                Back
              </Button>
              <Button 
                onClick={() => setStep('card')} 
                className="px-8"
                disabled={!cardDetails.name || !cardDetails.number || !cardDetails.expiry || !cardDetails.cvv}
              >
                Pay ${plans[selectedPlan].price}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  if (step === 'crypto') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Review Cryptocurrency Payment</h1>
          <p className="text-muted-foreground">
            Confirm your payment details before proceeding
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">{plans[selectedPlan].name}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-medium flex items-center gap-2">
                {selectedCrypto.icon} {selectedCrypto.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">
                {paymentService['PREMIUM_PRICES'][selectedPlan][selectedCrypto.symbol.toLowerCase() as keyof typeof paymentService['PREMIUM_PRICES']['monthly']]} {selectedCrypto.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Processing Time:</span>
              <span className="font-medium">{selectedCrypto.processingTime}</span>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>This payment method provides {selectedCrypto.anonymityLevel} anonymity</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => setStep('method')}>
            Back
          </Button>
          <Button onClick={handleCryptoPayment} disabled={processing} className="px-8">
            {processing ? 'Creating Invoice...' : 'Create Payment Invoice'}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'card') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Confirm Card Payment</h1>
          <p className="text-muted-foreground">
            Review your payment details before processing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">{plans[selectedPlan].name}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">${plans[selectedPlan].price} USD</span>
            </div>
            <div className="flex justify-between">
              <span>Card:</span>
              <span className="font-medium">****{cardDetails.number.slice(-4)}</span>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Warning className="w-4 h-4" />
              <span>Card payments are processed through traditional banking systems</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => setStep('method')}>
            Back
          </Button>
          <Button onClick={handleCardPayment} disabled={processing} className="px-8">
            {processing ? 'Processing Payment...' : `Pay $${plans[selectedPlan].price}`}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    if (paymentMethod === 'crypto' && currentInvoice) {
      return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Complete Your Payment</h1>
            <p className="text-muted-foreground">
              Send the exact amount to the address below to activate your premium access
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedCrypto.icon} {selectedCrypto.name} Payment
                <Badge variant={currentInvoice.status === 'confirmed' ? 'default' : 'secondary'}>
                  {currentInvoice.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Amount to Send</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      value={`${currentInvoice.amount} ${selectedCrypto.symbol}`} 
                      readOnly 
                      className="font-mono"
                    />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(currentInvoice.amount.toString())}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Wallet Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      value={currentInvoice.walletAddress} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(currentInvoice.walletAddress)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border">
                    <img 
                      src={currentInvoice.qrCode} 
                      alt="Payment QR CodeSimple" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="font-medium capitalize">{currentInvoice.status}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confirmations:</span>
                    <div className="font-medium">{currentInvoice.confirmations}/{currentInvoice.requiredConfirmations}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expires:</span>
                    <div className="font-medium">{new Date(currentInvoice.expiresAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Processing Time:</span>
                    <div className="font-medium">{selectedCrypto.processingTime}</div>
                  </div>
                </div>

                {currentInvoice.transactionHash && (
                  <div>
                    <Label>Transaction Hash</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        value={currentInvoice.transactionHash} 
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button size="sm" variant="outline">
                        <ArrowSquareOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
                <div className="text-sm text-blue-800">
                  We're monitoring the blockchain for your payment. You'll be notified once it's confirmed.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button variant="outline" onClick={onBack}>
              Done
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-bold">Processing Payment</h1>
          <p className="text-muted-foreground">
            Please wait while we process your payment...
          </p>
        </div>
      </div>
    )
  }

  return null
}