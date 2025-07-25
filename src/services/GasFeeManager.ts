/**
 * Gas Fee Management System for PrivaChain
 * Handles foundation subsidies, premium subscriptions, and test wallet sponsorship
 */

import { privToken, TokenBalance } from '../blockchain/PRIVToken';
import { TEST_WALLET_ADDRESS } from '../blockchain/CosmosTestnet';

export interface UserQuota {
  messagesUsed: number;
  emailsUsed: number;
  videoMinutesUsed: number;
  searchesUsed: number;
  lastResetTime: number;
  dailyLimits: {
    messages: number;
    emails: number;
    videoMinutes: number;
    searches: number;
  };
}

export interface GasTransaction {
  id: string;
  userAddress: string;
  operation: 'message' | 'email' | 'video' | 'search' | 'domain';
  gasCost: bigint;
  paymentMethod: 'test_wallet' | 'foundation' | 'premium' | 'direct';
  sponsorWallet?: string;
  timestamp: number;
  success: boolean;
  errorReason?: string;
}

export interface PremiumSubscription {
  userAddress: string;
  prepaidBalance: bigint;
  expiryTime: number;
  autoRefill: boolean;
  monthlyLimit: bigint;
}

export class GasFeeManager {
  private userQuotas: Map<string, UserQuota> = new Map();
  private gasTransactions: GasTransaction[] = [];
  private premiumSubscriptions: Map<string, PremiumSubscription> = new Map();
  private foundationDailyBudget = BigInt('1000000000000000000000000'); // 1M PRIV daily
  private foundationCurrentBudget = this.foundationDailyBudget;
  private testWalletBudget = BigInt('50000000000000000000000'); // 50K ATOM equivalent
  private lastBudgetReset = Date.now();

  // Gas costs for different operations (in wei, 18 decimals)
  private readonly gasCosts = {
    message: BigInt('1000000000000000'),      // 0.001 PRIV
    email: BigInt('10000000000000000'),       // 0.01 PRIV
    video: BigInt('100000000000000000'),      // 0.1 PRIV per session
    search: BigInt('500000000000000'),        // 0.0005 PRIV
    domain: BigInt('50000000000000000000'),   // 50 PRIV for .prv domain
  };

  // Free tier daily limits
  private readonly freeLimits = {
    messages: 100,    // Increased for testing
    emails: 20,       // Increased for testing
    videoMinutes: 60, // Increased for testing
    searches: 200,    // Increased for testing
  };

  constructor() {
    this.initializeFoundationPool();
  }

  private initializeFoundationPool(): void {
    // Reset daily budget if needed
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (now - this.lastBudgetReset > dayInMs) {
      this.foundationCurrentBudget = this.foundationDailyBudget;
      this.lastBudgetReset = now;
    }
  }

  /**
   * Get user's current quota status
   */
  getUserQuota(userAddress: string): UserQuota {
    const existing = this.userQuotas.get(userAddress);
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    // Reset quota if it's a new day
    if (!existing || now - existing.lastResetTime > dayInMs) {
      const quota: UserQuota = {
        messagesUsed: 0,
        emailsUsed: 0,
        videoMinutesUsed: 0,
        searchesUsed: 0,
        lastResetTime: now,
        dailyLimits: { ...this.freeLimits }
      };
      this.userQuotas.set(userAddress, quota);
      return quota;
    }

    return existing;
  }

  /**
   * Check if user can perform operation with free tier
   */
  canUseFreeQuota(userAddress: string, operation: keyof typeof this.gasCosts): boolean {
    const quota = this.getUserQuota(userAddress);
    
    switch (operation) {
      case 'message':
        return quota.messagesUsed < quota.dailyLimits.messages;
      case 'email':
        return quota.emailsUsed < quota.dailyLimits.emails;
      case 'video':
        return quota.videoMinutesUsed < quota.dailyLimits.videoMinutes;
      case 'search':
        return quota.searchesUsed < quota.dailyLimits.searches;
      case 'domain':
        return false; // Domain registration not included in free tier
      default:
        return false;
    }
  }

  /**
   * Process gas fee payment with test wallet sponsorship
   */
  async processGasFee(
    userAddress: string,
    operation: keyof typeof this.gasCosts,
    preferredPayment: 'auto' | 'test_wallet' | 'foundation' | 'premium' | 'direct' = 'auto'
  ): Promise<GasTransaction> {
    const gasCost = this.gasCosts[operation];
    const transactionId = this.generateTransactionId();

    try {
      let paymentMethod: 'test_wallet' | 'foundation' | 'premium' | 'direct';
      let success = false;
      let sponsorWallet: string | undefined;

      // Determine payment method with test wallet priority
      if (preferredPayment === 'auto') {
        // Priority: test wallet > foundation > premium > direct
        if (this.testWalletCanCover(gasCost)) {
          paymentMethod = 'test_wallet';
          sponsorWallet = TEST_WALLET_ADDRESS;
        } else if (this.canUseFreeQuota(userAddress, operation) && this.foundationCanCover(gasCost)) {
          paymentMethod = 'foundation';
        } else if (this.hasPremiumSubscription(userAddress)) {
          paymentMethod = 'premium';
        } else {
          paymentMethod = 'direct';
        }
      } else {
        paymentMethod = preferredPayment;
        if (paymentMethod === 'test_wallet') {
          sponsorWallet = TEST_WALLET_ADDRESS;
        }
      }

      // Process payment based on method
      switch (paymentMethod) {
        case 'test_wallet':
          success = await this.processTestWalletPayment(userAddress, operation, gasCost);
          break;
        case 'foundation':
          success = await this.processFoundationPayment(userAddress, operation, gasCost);
          break;
        case 'premium':
          success = await this.processPremiumPayment(userAddress, gasCost);
          break;
        case 'direct':
          success = await this.processDirectPayment(userAddress, gasCost);
          break;
      }

      const transaction: GasTransaction = {
        id: transactionId,
        userAddress,
        operation,
        gasCost,
        paymentMethod,
        sponsorWallet,
        timestamp: Date.now(),
        success,
        errorReason: success ? undefined : 'Payment failed'
      };

      this.gasTransactions.push(transaction);
      return transaction;

    } catch (error) {
      const transaction: GasTransaction = {
        id: transactionId,
        userAddress,
        operation,
        gasCost,
        paymentMethod: 'direct',
        timestamp: Date.now(),
        success: false,
        errorReason: error instanceof Error ? error.message : 'Unknown error'
      };

      this.gasTransactions.push(transaction);
      return transaction;
    }
  }

  /**
   * Process test wallet sponsored payment
   */
  private async processTestWalletPayment(
    userAddress: string,
    operation: keyof typeof this.gasCosts,
    gasCost: bigint
  ): Promise<boolean> {
    if (!this.testWalletCanCover(gasCost)) {
      throw new Error('Test wallet budget depleted');
    }

    // Deduct from test wallet budget
    this.testWalletBudget -= gasCost;

    // Log test wallet transaction for monitoring
    console.log(`Test wallet sponsored ${operation} for ${userAddress}: ${gasCost} PRIV`);
    console.log(`Remaining test wallet budget: ${this.testWalletBudget} PRIV`);

    return true;
  }

  /**
   * Process foundation-sponsored payment
   */
  private async processFoundationPayment(
    userAddress: string,
    operation: keyof typeof this.gasCosts,
    gasCost: bigint
  ): Promise<boolean> {
    if (!this.canUseFreeQuota(userAddress, operation)) {
      throw new Error('Daily quota exceeded');
    }

    if (!this.foundationCanCover(gasCost)) {
      throw new Error('Foundation budget depleted');
    }

    // Deduct from foundation budget
    this.foundationCurrentBudget -= gasCost;

    // Update user quota
    const quota = this.getUserQuota(userAddress);
    switch (operation) {
      case 'message':
        quota.messagesUsed++;
        break;
      case 'email':
        quota.emailsUsed++;
        break;
      case 'video':
        quota.videoMinutesUsed += 10; // Assuming 10-minute session
        break;
      case 'search':
        quota.searchesUsed++;
        break;
    }
    this.userQuotas.set(userAddress, quota);

    return true;
  }

  /**
   * Process premium subscription payment
   */
  private async processPremiumPayment(userAddress: string, gasCost: bigint): Promise<boolean> {
    const subscription = this.premiumSubscriptions.get(userAddress);
    if (!subscription) {
      throw new Error('No premium subscription found');
    }

    if (Date.now() > subscription.expiryTime) {
      throw new Error('Premium subscription expired');
    }

    if (subscription.prepaidBalance < gasCost) {
      if (subscription.autoRefill) {
        await this.refillPremiumBalance(userAddress);
      } else {
        throw new Error('Insufficient prepaid balance');
      }
    }

    // Deduct from prepaid balance
    subscription.prepaidBalance -= gasCost;
    this.premiumSubscriptions.set(userAddress, subscription);

    return true;
  }

  /**
   * Process direct PRIV token payment
   */
  private async processDirectPayment(userAddress: string, gasCost: bigint): Promise<boolean> {
    const balance = privToken.getBalance(userAddress);
    if (balance.balance < gasCost) {
      throw new Error('Insufficient PRIV balance');
    }

    // Transfer to gas fee pool
    await privToken.transfer(userAddress, 'gas-pool', gasCost);
    return true;
  }

  /**
   * Subscribe user to premium plan
   */
  async subscribeToPremium(
    userAddress: string,
    duration: number = 30, // days
    autoRefill: boolean = true
  ): Promise<boolean> {
    const monthlyPrice = privToken.parseAmount('100'); // 100 PRIV per month
    const totalCost = monthlyPrice * BigInt(duration) / BigInt(30);

    // Process payment
    await this.processDirectPayment(userAddress, totalCost);

    // Create subscription
    const subscription: PremiumSubscription = {
      userAddress,
      prepaidBalance: privToken.parseAmount('1000'), // 1000 PRIV initial balance
      expiryTime: Date.now() + (duration * 24 * 60 * 60 * 1000),
      autoRefill,
      monthlyLimit: privToken.parseAmount('1000') // 1000 PRIV monthly limit
    };

    this.premiumSubscriptions.set(userAddress, subscription);
    return true;
  }

  /**
   * Refill premium subscription balance
   */
  private async refillPremiumBalance(userAddress: string): Promise<void> {
    const subscription = this.premiumSubscriptions.get(userAddress);
    if (!subscription) return;

    const refillAmount = privToken.parseAmount('1000'); // 1000 PRIV
    await this.processDirectPayment(userAddress, refillAmount);
    
    subscription.prepaidBalance += refillAmount;
    this.premiumSubscriptions.set(userAddress, subscription);
  }

  /**
   * Check if test wallet can cover gas cost
   */
  private testWalletCanCover(gasCost: bigint): boolean {
    return this.testWalletBudget >= gasCost;
  }

  /**
   * Check if foundation can cover gas cost
   */
  private foundationCanCover(gasCost: bigint): boolean {
    return this.foundationCurrentBudget >= gasCost;
  }

  /**
   * Check if user has active premium subscription
   */
  private hasPremiumSubscription(userAddress: string): boolean {
    const subscription = this.premiumSubscriptions.get(userAddress);
    return subscription ? Date.now() < subscription.expiryTime : false;
  }

  /**
   * Get user's payment status and recommendations
   */
  getPaymentStatus(userAddress: string) {
    const quota = this.getUserQuota(userAddress);
    const premium = this.premiumSubscriptions.get(userAddress);
    const balance = privToken.getBalance(userAddress);

    return {
      freeQuotaRemaining: {
        messages: quota.dailyLimits.messages - quota.messagesUsed,
        emails: quota.dailyLimits.emails - quota.emailsUsed,
        videoMinutes: quota.dailyLimits.videoMinutes - quota.videoMinutesUsed,
        searches: quota.dailyLimits.searches - quota.searchesUsed,
      },
      premiumStatus: premium ? {
        active: Date.now() < premium.expiryTime,
        balance: privToken.formatAmount(premium.prepaidBalance),
        expiryDate: new Date(premium.expiryTime),
        autoRefill: premium.autoRefill
      } : null,
      directBalance: privToken.formatAmount(balance.balance),
      recommendedAction: this.getRecommendedAction(userAddress)
    };
  }

  /**
   * Get recommended payment action for user
   */
  private getRecommendedAction(userAddress: string): string {
    const quota = this.getUserQuota(userAddress);
    const premium = this.premiumSubscriptions.get(userAddress);
    const balance = privToken.getBalance(userAddress);

    // Check if user is approaching limits
    const quotaUsage = Math.max(
      quota.messagesUsed / quota.dailyLimits.messages,
      quota.emailsUsed / quota.dailyLimits.emails,
      quota.videoMinutesUsed / quota.dailyLimits.videoMinutes
    );

    if (quotaUsage > 0.8) {
      if (!premium) {
        return 'Consider upgrading to Premium for unlimited usage';
      } else if (Date.now() > premium.expiryTime) {
        return 'Renew your Premium subscription';
      } else if (premium.prepaidBalance < this.gasCosts.video) {
        return 'Top up your Premium balance';
      }
    }

    if (balance.balance < this.gasCosts.email * BigInt(10)) {
      return 'Consider adding PRIV tokens for direct payments';
    }

    return 'You have sufficient access for current usage';
  }

  /**
   * Get gas fee statistics
   */
  getGasStats() {
    const totalTransactions = this.gasTransactions.length;
    const testWalletSponsored = this.gasTransactions.filter(tx => tx.paymentMethod === 'test_wallet').length;
    const foundationSponsored = this.gasTransactions.filter(tx => tx.paymentMethod === 'foundation').length;
    const premiumPayments = this.gasTransactions.filter(tx => tx.paymentMethod === 'premium').length;
    const directPayments = this.gasTransactions.filter(tx => tx.paymentMethod === 'direct').length;

    return {
      totalTransactions,
      testWalletSponsored,
      foundationSponsored,
      premiumPayments,
      directPayments,
      testWalletAddress: TEST_WALLET_ADDRESS,
      testWalletBudgetRemaining: privToken.formatAmount(this.testWalletBudget),
      foundationBudgetRemaining: privToken.formatAmount(this.foundationCurrentBudget),
      activePremiumUsers: this.premiumSubscriptions.size,
      averageGasCost: totalTransactions > 0 
        ? this.gasTransactions.reduce((sum, tx) => sum + Number(tx.gasCost), 0) / totalTransactions
        : 0
    };
  }

  private generateTransactionId(): string {
    return `gas_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
export const gasFeeManager = new GasFeeManager();