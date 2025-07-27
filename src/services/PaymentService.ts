/**
 * PrivaChain Payment Service
 * Handles ATOM/USDT payment processing for premium plan activation
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
    id: 'usdt',
    name: 'Tether USD',
    symbol: 'USDT',
    network: 'Ethereum',
    decimals: 6,
    icon: '💲',
    anonymityLevel: 'low',
    processingTime: '1-5 minutes'
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
        options.selectedCrypto.symbol as 'ATOM' | 'USDT'
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
        requiredConfirmations: options.selectedCrypto.symbol === 'ATOM' ? 1 : 3,
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
}

export const paymentService = new PaymentService();