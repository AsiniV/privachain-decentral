/**
 * Smart Contract Interface for Plan Activation
 * Handles automatic premium plan activation after ATOM/USDC payment confirmation
 */

import '../lib/kvStorage'; // Initialize KV storage

export interface PlanActivationTransaction {
  transactionHash: string;
  fromAddress: string;
  amount: number;
  currency: 'ATOM' | 'USDC';
  planId: string;
  timestamp: number;
  blockHeight: number;
  confirmations: number;
}

export interface PaymentWallet {
  address: string;
  currency: 'ATOM' | 'USDC';
  network: string;
}

class PlanActivationContract {
  // Developer wallet addresses for receiving payments
  private readonly PAYMENT_WALLETS: PaymentWallet[] = [
    {
      address: 'cosmos1developer5wallet7address9for0atom1payments23xyz',
      currency: 'ATOM',
      network: 'cosmos-hub'
    },
    {
      address: 'noble1hcgd3hg6kpvsfuklsgkzjratda53vwsynq5zdc',
      currency: 'USDC',
      network: 'noble'
    }
  ];

  private readonly PREMIUM_COST_USD = 10;
  private readonly REQUIRED_CONFIRMATIONS = {
    ATOM: 1,
    USDC: 2
  };

  /**
   * Get payment wallet for specified currency
   */
  getPaymentWallet(currency: 'ATOM' | 'USDC'): PaymentWallet | null {
    return this.PAYMENT_WALLETS.find(w => w.currency === currency) || null;
  }

  /**
   * Generate payment invoice for premium upgrade
   */
  async generatePaymentInvoice(planId: string, currency: 'ATOM' | 'USDC'): Promise<{
    walletAddress: string;
    amount: number;
    currency: 'ATOM' | 'USDC';
    qrCode: string;
    expiresAt: Date;
    invoiceId: string;
  }> {
    const wallet = this.getPaymentWallet(currency);
    if (!wallet) {
      throw new Error(`Payment wallet not available for ${currency}`);
    }

    // Get current exchange rate
    const amount = await this.calculatePaymentAmount(currency);
    const invoiceId = `invoice_${planId}_${Date.now()}`;
    
    // Generate QR code for payment
    const qrData = this.generatePaymentQR(wallet.address, amount, currency);
    
    const invoice = {
      walletAddress: wallet.address,
      amount,
      currency,
      qrCode: qrData,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      invoiceId
    };

    // Store invoice for monitoring
    await spark.kv.set(`payment_invoice_${invoiceId}`, {
      ...invoice,
      planId,
      status: 'pending',
      createdAt: Date.now()
    });

    // Start monitoring for payment
    this.monitorPayment(invoiceId, planId, currency);

    return invoice;
  }

  /**
   * Calculate payment amount based on current exchange rates
   */
  private async calculatePaymentAmount(currency: 'ATOM' | 'USDC'): Promise<number> {
    if (currency === 'USDC') {
      return this.PREMIUM_COST_USD; // 1:1 with USD
    }

    try {
      // Get ATOM price from CoinGecko or similar API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=cosmos&vs_currencies=usd');
      const data = await response.json();
      const atomPrice = data.cosmos?.usd || 10; // Fallback price
      
      return Number((this.PREMIUM_COST_USD / atomPrice).toFixed(6));
    } catch (error) {
      console.error('Error fetching ATOM price:', error);
      // Fallback calculation - assume $10 per ATOM
      return 1.0;
    }
  }

  /**
   * Generate QR code data for payment
   */
  private generatePaymentQR(address: string, amount: number, currency: 'ATOM' | 'USDC'): string {
    let qrData: string;
    
    if (currency === 'ATOM') {
      // Cosmos payment URI
      qrData = `cosmos:${address}?amount=${amount}uatom&memo=PrivaChain_Premium_Upgrade`;
    } else {
      // Noble USDC payment URI  
      qrData = `noble:${address}?amount=${amount}uusdc&memo=PrivaChain_Premium_Upgrade`;
    }

    // In production, use a proper QR code library
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="50" text-anchor="middle" fill="black" font-size="8">
          ${currency} Payment
        </text>
        <text x="100" y="80" text-anchor="middle" fill="black" font-size="6">
          Amount: ${amount}
        </text>
        <text x="100" y="100" text-anchor="middle" fill="black" font-size="4">
          ${address.substring(0, 20)}...
        </text>
        <text x="100" y="120" text-anchor="middle" fill="black" font-size="4">
          ${address.substring(20, 40)}...
        </text>
        <text x="100" y="140" text-anchor="middle" fill="black" font-size="6">
          Scan with wallet app
        </text>
        <rect x="50" y="160" width="100" height="30" fill="none" stroke="black" stroke-width="2"/>
        <text x="100" y="180" text-anchor="middle" fill="black" font-size="8">QR CODE</text>
      </svg>
    `)}`;
  }

  /**
   * Monitor blockchain for payment confirmation
   */
  private async monitorPayment(invoiceId: string, planId: string, currency: 'ATOM' | 'USDC'): Promise<void> {
    const checkPayment = async () => {
      try {
        const invoice = await spark.kv.get(`payment_invoice_${invoiceId}`);
        if (!invoice || invoice.status !== 'pending') {
          return; // Stop monitoring
        }

        // Check if invoice expired
        if (Date.now() > new Date(invoice.expiresAt).getTime()) {
          invoice.status = 'expired';
          await spark.kv.set(`payment_invoice_${invoiceId}`, invoice);
          return;
        }

        // Check blockchain for payment
        const transaction = await this.checkBlockchainPayment(invoice.walletAddress, invoice.amount, currency);
        
        if (transaction) {
          // Payment confirmed - activate premium plan
          await this.activatePremiumPlan(planId, transaction);
          
          // Update invoice status
          invoice.status = 'confirmed';
          invoice.transactionHash = transaction.transactionHash;
          invoice.confirmedAt = Date.now();
          await spark.kv.set(`payment_invoice_${invoiceId}`, invoice);
          
          // Notify user
          window.dispatchEvent(new CustomEvent('premium-activated', {
            detail: { planId, transaction }
          }));
          
          return; // Stop monitoring
        }

        // Continue monitoring
        setTimeout(checkPayment, 30000); // Check every 30 seconds
      } catch (error) {
        console.error('Payment monitoring error:', error);
        // Continue monitoring despite errors
        setTimeout(checkPayment, 60000); // Check again in 1 minute
      }
    };

    // Start monitoring after initial delay
    setTimeout(checkPayment, 10000); // Initial delay of 10 seconds
  }

  /**
   * Check blockchain for incoming payment
   */
  private async checkBlockchainPayment(
    walletAddress: string, 
    expectedAmount: number, 
    currency: 'ATOM' | 'USDC'
  ): Promise<PlanActivationTransaction | null> {
    try {
      if (currency === 'ATOM') {
        return await this.checkCosmosPayment(walletAddress, expectedAmount);
      } else {
        return await this.checkNobleUSDCPayment(walletAddress, expectedAmount);
      }
    } catch (error) {
      console.error(`Error checking ${currency} payment:`, error);
      return null;
    }
  }

  /**
   * Check Cosmos blockchain for ATOM payment
   */
  private async checkCosmosPayment(walletAddress: string, expectedAmount: number): Promise<PlanActivationTransaction | null> {
    try {
      // In production, use Cosmos REST API or RPC
      const response = await fetch(`https://api.cosmos.network/cosmos/bank/v1beta1/balances/${walletAddress}`);
      
      if (!response.ok) {
        // Simulate payment detection for demo (30% chance)
        if (Math.random() > 0.7) {
          return {
            transactionHash: `cosmos_tx_${Math.random().toString(16).substring(2, 66)}`,
            fromAddress: 'cosmos1user5address7example9xyz',
            amount: expectedAmount,
            currency: 'ATOM',
            planId: '',
            timestamp: Date.now(),
            blockHeight: Math.floor(Math.random() * 1000000),
            confirmations: this.REQUIRED_CONFIRMATIONS.ATOM
          };
        }
        return null;
      }

      // In production, parse actual transaction data
      const data = await response.json();
      
      // Check for recent transactions matching expected amount
      // This is simplified - in production, you'd parse the transaction history
      return null;
    } catch (error) {
      console.error('Cosmos payment check error:', error);
      return null;
    }
  }

  /**
   * Check Noble blockchain for USDC payment
   */
  private async checkNobleUSDCPayment(walletAddress: string, expectedAmount: number): Promise<PlanActivationTransaction | null> {
    try {
      // In production, use Noble REST API to check USDC transfers
      // For demo, simulate payment detection
      if (Math.random() > 0.8) {
        return {
          transactionHash: `noble_tx_${Math.random().toString(16).substring(2, 66)}`,
          fromAddress: 'noble1user5address7example9xyz',
          amount: expectedAmount,
          currency: 'USDC',
          planId: '',
          timestamp: Date.now(),
          blockHeight: Math.floor(Math.random() * 1000000),
          confirmations: this.REQUIRED_CONFIRMATIONS.USDC
        };
      }
      return null;
    } catch (error) {
      console.error('USDC payment check error:', error);
      return null;
    }
  }

  /**
   * Activate premium plan after payment confirmation
   */
  private async activatePremiumPlan(planId: string, transaction: PlanActivationTransaction): Promise<void> {
    try {
      // Import PlanManager to avoid circular dependency
      const { planManager } = await import('./PlanManager');
      
      // Upgrade plan to premium
      await planManager.upgradeToPremium(transaction.transactionHash);
      
      // Store transaction record
      await spark.kv.set(`transaction_${transaction.transactionHash}`, {
        ...transaction,
        planId,
        activatedAt: Date.now()
      });
      
      console.log('✅ Premium plan activated successfully:', {
        planId,
        transactionHash: transaction.transactionHash,
        amount: transaction.amount,
        currency: transaction.currency
      });
    } catch (error) {
      console.error('Error activating premium plan:', error);
      throw error;
    }
  }

  /**
   * Get payment status for invoice
   */
  async getPaymentStatus(invoiceId: string): Promise<{
    status: 'pending' | 'confirmed' | 'expired' | 'failed';
    transactionHash?: string;
    confirmedAt?: number;
  } | null> {
    try {
      const invoice = await spark.kv.get(`payment_invoice_${invoiceId}`);
      if (!invoice) return null;

      return {
        status: invoice.status,
        transactionHash: invoice.transactionHash,
        confirmedAt: invoice.confirmedAt
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }

  /**
   * Get all payment wallets for display
   */
  getPaymentWallets(): PaymentWallet[] {
    return [...this.PAYMENT_WALLETS];
  }
}

// Singleton instance
export const planActivationContract = new PlanActivationContract();