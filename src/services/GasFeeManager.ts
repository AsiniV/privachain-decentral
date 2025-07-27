/**
 * Simplified Gas Fee Management System for PrivaChain
 * All gas fees are paid by the developer's wallet using ATOM
 * Users can use the platform immediately according to tariffs without crypto knowledge
 */

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
  paymentMethod: 'developer_sponsored';
  sponsorWallet: string;
  timestamp: number;
  success: boolean;
  errorReason?: string;
}

export class GasFeeManager {
  private userQuotas: Map<string, UserQuota> = new Map();
  private gasTransactions: GasTransaction[] = [];
  private developerWallet = 'cosmos1developer5wallet7address9for0gas1payments23'; // Developer's ATOM wallet
  private lastBudgetReset = Date.now();

  // Gas costs for different operations (in ATOM micro units - uatom)
  private readonly gasCosts = {
    message: BigInt('5000'),        // 0.005 ATOM
    email: BigInt('10000'),         // 0.01 ATOM  
    video: BigInt('25000'),         // 0.025 ATOM per session
    search: BigInt('2000'),         // 0.002 ATOM
    domain: BigInt('100000'),       // 0.1 ATOM for .prv domain
  };

  // Generous daily limits for free usage
  private readonly freeLimits = {
    messages: 200,    // Generous limit for messaging
    emails: 50,       // Sufficient for daily email needs
    videoMinutes: 120, // 2 hours of video calling per day
    searches: 500,    // Plenty of searches per day
  };

  constructor() {
    this.initializeDeveloperSponsorship();
  }

  private initializeDeveloperSponsorship(): void {
    // Reset daily budget if needed
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (now - this.lastBudgetReset > dayInMs) {
      this.lastBudgetReset = now;
      console.log('Daily gas sponsorship budget reset');
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
   * Check if user can perform operation with their quota
   */
  canUseQuota(userAddress: string, operation: keyof typeof this.gasCosts): boolean {
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
        return true; // Domain registration allowed for all users
      default:
        return false;
    }
  }

  /**
   * Process gas fee payment - all sponsored by developer wallet
   */
  async processGasFee(
    userAddress: string,
    operation: keyof typeof this.gasCosts
  ): Promise<GasTransaction> {
    const gasCost = this.gasCosts[operation];
    const transactionId = this.generateTransactionId();

    try {
      // Check if user has quota remaining
      if (!this.canUseQuota(userAddress, operation)) {
        const transaction: GasTransaction = {
          id: transactionId,
          userAddress,
          operation,
          gasCost,
          paymentMethod: 'developer_sponsored',
          sponsorWallet: this.developerWallet,
          timestamp: Date.now(),
          success: false,
          errorReason: 'Daily quota exceeded'
        };
        
        this.gasTransactions.push(transaction);
        return transaction;
      }

      // All gas is sponsored by developer wallet
      const success = await this.processDeveloperSponsoredPayment(userAddress, operation, gasCost);

      const transaction: GasTransaction = {
        id: transactionId,
        userAddress,
        operation,
        gasCost,
        paymentMethod: 'developer_sponsored',
        sponsorWallet: this.developerWallet,
        timestamp: Date.now(),
        success,
        errorReason: success ? undefined : 'Developer wallet payment failed'
      };

      this.gasTransactions.push(transaction);
      return transaction;

    } catch (error) {
      const transaction: GasTransaction = {
        id: transactionId,
        userAddress,
        operation,
        gasCost,
        paymentMethod: 'developer_sponsored',
        sponsorWallet: this.developerWallet,
        timestamp: Date.now(),
        success: false,
        errorReason: error instanceof Error ? error.message : 'Unknown error'
      };

      this.gasTransactions.push(transaction);
      return transaction;
    }
  }

  /**
   * Process developer wallet sponsored payment
   */
  private async processDeveloperSponsoredPayment(
    userAddress: string,
    operation: keyof typeof this.gasCosts,
    gasCost: bigint
  ): Promise<boolean> {
    
    // Log developer wallet transaction for monitoring
    console.log(`Developer wallet sponsored ${operation} for ${userAddress}: ${gasCost} uatom`);

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
      case 'domain':
        // Domain registration doesn't count against quotas
        break;
    }
    this.userQuotas.set(userAddress, quota);

    return true;
  }

  /**
   * Get user's payment status and recommendations
   */
  getPaymentStatus(userAddress: string) {
    const quota = this.getUserQuota(userAddress);

    return {
      quotaRemaining: {
        messages: quota.dailyLimits.messages - quota.messagesUsed,
        emails: quota.dailyLimits.emails - quota.emailsUsed,
        videoMinutes: quota.dailyLimits.videoMinutes - quota.videoMinutesUsed,
        searches: quota.dailyLimits.searches - quota.searchesUsed,
      },
      gasPaymentMethod: 'Developer Sponsored (ATOM)',
      userCostPerOperation: 'Free',
      recommendedAction: this.getRecommendedAction(userAddress)
    };
  }

  /**
   * Get recommended action for user
   */
  private getRecommendedAction(userAddress: string): string {
    const quota = this.getUserQuota(userAddress);

    // Check if user is approaching limits
    const quotaUsage = Math.max(
      quota.messagesUsed / quota.dailyLimits.messages,
      quota.emailsUsed / quota.dailyLimits.emails,
      quota.videoMinutesUsed / quota.dailyLimits.videoMinutes
    );

    if (quotaUsage > 0.8) {
      return 'Approaching daily usage limits. Quotas reset in 24 hours.';
    }

    return 'You have sufficient quota for continued usage. All gas fees sponsored.';
  }

  /**
   * Get gas fee statistics
   */
  getGasStats() {
    const totalTransactions = this.gasTransactions.length;
    const successfulTransactions = this.gasTransactions.filter(tx => tx.success).length;
    const totalGasCost = this.gasTransactions.reduce((sum, tx) => sum + Number(tx.gasCost), 0);

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions: totalTransactions - successfulTransactions,
      developerWallet: this.developerWallet,
      totalGasSponsored: `${(totalGasCost / 1000000).toFixed(6)} ATOM`,
      activeUsers: this.userQuotas.size,
      averageGasCost: totalTransactions > 0 ? totalGasCost / totalTransactions : 0,
      paymentModel: 'Developer Sponsored Gas (No User Cost)'
    };
  }

  private generateTransactionId(): string {
    return `gas_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
export const gasFeeManager = new GasFeeManager();