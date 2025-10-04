/**
 * PrivaChain Payment Service
 * Handles ATOM/USDC payment processing for premium plan activation
 * Integrated with smart contract for automatic plan activation
 */

import { toast } from 'sonner'
import { planActivationContract } from './PlanActivationContract'
import { planManager } from './PlanManager'

// Supported cryptocurrencies for plan payments
export interface CryptoCurrency {
  id: string
  name: string
  symbol: string
  network: string
  decimals: number
  icon: string
  anonymityLevel: 'high' | 'medium' | 'low'
  processingTime: string
}

export const SUPPORTED_CRYPTOS: CryptoCurrency[] = [
  {
    id: 'atom',
    name: 'Cosmos ATOM',
    symbol: 'ATOM',
    network: 'Cosmos Hub',
    decimals: 6,
    icon: '🪐',
    anonymityLevel: 'medium',
    processingTime: '3-5 seconds'
  },
  {
    id: 'usdc',
    name: 'USD Coin (Noble)',
    symbol: 'USDC',
    network: 'Noble',
    decimals: 6,
    icon: '💙',
    anonymityLevel: 'low',
    processingTime: '10-30 seconds'
  }
]

export interface PaymentInvoice {
  id: string
  planId: string
  amount: number
  currency: CryptoCurrency
  walletAddress: string
  qrCode: string
  expiresAt: Date
  status: 'pending' | 'confirmed' | 'expired' | 'failed'
  confirmations: number
  requiredConfirmations: number
  transactionHash?: string
  createdAt: Date
}

export interface PlanUpgradeOptions {
  planId: string
  selectedCrypto: CryptoCurrency
}

class PaymentService {
  private readonly PREMIUM_COST_USD = 10

  /**
   * Create payment invoice for premium plan upgrade
   */
  async createPlanUpgradeInvoice(options: PlanUpgradeOptions): Promise<PaymentInvoice> {
    try {
      const invoice = await planActivationContract.generatePaymentInvoice(
        options.planId,
        options.selectedCrypto.symbol as 'ATOM' | 'USDC'
      );

      return {
        id: invoice.invoiceId,
        planId: options.planId,
        amount: invoice.amount,
        currency: options.selectedCrypto,
        walletAddress: invoice.walletAddress,
        qrCode: invoice.qrCode,
        expiresAt: invoice.expiresAt,
        status: 'pending',
        confirmations: 0,
        requiredConfirmations: options.selectedCrypto.symbol === 'ATOM' ? 1 : 2,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating payment invoice:', error);
      throw new Error('Failed to create payment invoice');
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
    return await planActivationContract.getPaymentStatus(invoiceId);
  }

  /**
   * Get current plan status
   */
  async getPlanStatus(): Promise<{
    planType: 'starter' | 'premium';
    isActive: boolean;
    features: string[];
    expiresAt: number | null;
  } | null> {
    try {
      const status = await planManager.getPlanStatus();
      if (!status) return null;

      return {
        planType: status.planType,
        isActive: status.isActive,
        features: status.features,
        expiresAt: status.expiresAt
      };
    } catch (error) {
      console.error('Error getting plan status:', error);
      return null;
    }
  }

  /**
   * Get supported payment methods
   */
  getSupportedCryptos(): CryptoCurrency[] {
    return [...SUPPORTED_CRYPTOS];
  }

  /**
   * Get payment wallets
   */
  getPaymentWallets() {
    return planActivationContract.getPaymentWallets();
  }

  /**
   * Create a premium order
   */
  async createOrder(planType: 'monthly' | 'yearly'): Promise<PremiumOrder> {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const amount = planType === 'monthly' ? 10 : 100;
    
    return {
      id: orderId,
      planType,
      amount,
      currency: 'USD',
      status: 'pending',
      createdAt: new Date()
    };
  }

  /**
   * Create crypto payment invoice
   */
  async createCryptoInvoice(options: {
    orderId: string;
    planType: 'monthly' | 'yearly';
    selectedCrypto: CryptoCurrency;
  }): Promise<PaymentInvoice> {
    const planId = options.planType === 'monthly' ? 'premium-monthly' : 'premium-yearly';
    
    return await this.createPlanUpgradeInvoice({
      planId,
      selectedCrypto: options.selectedCrypto
    });
  }

  /**
   * Process card payment
   */
  async processCardPayment(options: {
    orderId: string;
    planType: 'monthly' | 'yearly';
    cardDetails: {
      number: string;
      expiry: string;
      cvv: string;
      name: string;
    };
  }): Promise<{ success: boolean; message?: string }> {
    // Simulate payment processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Payment processed successfully'
        });
      }, 2000);
    });
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<PaymentInvoice | null> {
    try {
      const status = await this.getPaymentStatus(invoiceId);
      if (!status) return null;
      
      // Return a minimal invoice object
      return {
        id: invoiceId,
        planId: 'premium',
        amount: this.PREMIUM_COST_USD,
        currency: SUPPORTED_CRYPTOS[0],
        walletAddress: '',
        qrCode: '',
        expiresAt: new Date(Date.now() + 3600000),
        status: status.status,
        confirmations: 0,
        requiredConfirmations: 1,
        transactionHash: status.transactionHash,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error getting invoice:', error);
      return null;
    }
  }

  /**
   * Premium pricing information
   */
  readonly PREMIUM_PRICES = {
    monthly: { usd: 10, atom: 2.5 },
    yearly: { usd: 100, atom: 25 }
  };
}

// Premium Order type
export interface PremiumOrder {
  id: string;
  planType: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export const paymentService = new PaymentService();