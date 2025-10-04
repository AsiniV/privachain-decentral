/**
 * ATOM-Only Gas Fee Management System for PrivaChain
 * All gas fees are paid by the developer's wallet using ATOM
 * Users operate within plan-based quotas without crypto knowledge
 * PRIV tokens completely removed from the system
 */

import { planManager } from './PlanManager';

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

export interface GasTransaction {
  id: string;
  userAddress: string;
  operation: 'message' | 'email' | 'video' | 'search' | 'domain';
  gasCost: bigint;
  paymentMethod: 'developer_sponsored';
  sponsorWallet: string;
  planType: 'starter' | 'premium';
  timestamp: number;
  success: boolean;
  errorReason?: string;
}

export class GasFeeManager {
  private gasTransactions: GasTransaction[] = [];
  private developerWallet = 'cosmos1developer5wallet7address9for0gas1payments23'; // Developer's ATOM wallet
  private lastBudgetReset = Date.now();

  // Gas costs for different operations (in ATOM micro units - uatom)
  // All costs are sponsored by developer wallet
  private readonly gasCosts = {
    message: BigInt('5000'),        // 0.005 ATOM
    email: BigInt('10000'),         // 0.01 ATOM  
    video: BigInt('25000'),         // 0.025 ATOM per session
    search: BigInt('2000'),         // 0.002 ATOM
    domain: BigInt('100000'),       // 0.1 ATOM for .prv domain
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
   * Check if user can perform operation based on their plan
   */
  async canUseQuota(userAddress: string, operation: keyof typeof this.gasCosts): Promise<boolean> {
    try {
      const permission = await planManager.canPerformOperation(operation);
      return permission.allowed;
    } catch (error) {
      console.error('Error checking quota:', error);
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
      // Check if user has quota remaining based on their plan
      if (!(await this.canUseQuota(userAddress, operation))) {
        const transaction: GasTransaction = {
          id: transactionId,
          userAddress,
          operation,
          gasCost,
          paymentMethod: 'developer_sponsored',
          sponsorWallet: this.developerWallet,
          planType: 'starter', // Will be updated below
          timestamp: Date.now(),
          success: false,
          errorReason: 'Operation not allowed by current plan or quota exceeded'
        };
        
        this.gasTransactions.push(transaction);
        return transaction;
      }

      // Get current plan type
      const planStatus = await planManager.getPlanStatus();
      const planType = planStatus?.planType || 'starter';

      // All gas is sponsored by developer wallet
      const success = await this.processDeveloperSponsoredPayment(userAddress, operation, gasCost);

      const transaction: GasTransaction = {
        id: transactionId,
        userAddress,
        operation,
        gasCost,
        paymentMethod: 'developer_sponsored',
        sponsorWallet: this.developerWallet,
        planType,
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
        planType: 'starter',
        timestamp: Date.now(),
        success: false,
        errorReason: error instanceof Error ? error.message : 'Unknown error'
      };

      this.gasTransactions.push(transaction);
      return transaction;
    }
  }

  /**
   * Process developer wallet sponsored payment and record usage
   */
  private async processDeveloperSponsoredPayment(
    userAddress: string,
    operation: keyof typeof this.gasCosts,
    gasCost: bigint
  ): Promise<boolean> {
    
    // Log developer wallet transaction for monitoring
    console.log(`Developer wallet sponsored ${operation} for ${userAddress}: ${gasCost} uatom`);

    // Record usage in plan manager
    try {
      await planManager.recordUsage(operation, operation === 'video' ? 10 : 1);
    } catch (error) {
      console.error('Error recording usage:', error);
      return false;
    }

    return true;
  }

  /**
   * Get user's payment status and plan information
   */
  async getPaymentStatus(userAddress: string) {
    try {
      const planStatus = await planManager.getPlanStatus();
      
      if (!planStatus) {
        return {
          error: 'No plan found. Please initialize the app.',
          gasPaymentMethod: 'Developer Sponsored (ATOM)',
          userCostPerOperation: 'N/A',
          recommendedAction: 'Please restart the application'
        };
      }

      return {
        planType: planStatus.planType,
        quotasRemaining: {
          messages: planStatus.quotas.messages.limit === -1 ? 'unlimited' : 
            Math.max(0, planStatus.quotas.messages.limit - planStatus.quotas.messages.used),
          emails: planStatus.quotas.emails.limit === -1 ? 'unlimited' : 
            Math.max(0, planStatus.quotas.emails.limit - planStatus.quotas.emails.used),
          videoMinutes: planStatus.quotas.videoMinutes.limit === -1 ? 'unlimited' : 
            Math.max(0, planStatus.quotas.videoMinutes.limit - planStatus.quotas.videoMinutes.used),
          searches: planStatus.quotas.searches.limit === -1 ? 'unlimited' : 
            Math.max(0, planStatus.quotas.searches.limit - planStatus.quotas.searches.used),
          storage: `${(planStatus.quotas.storage.limit - planStatus.quotas.storage.used).toFixed(0)} MB`,
          prvDomains: Math.max(0, planStatus.quotas.prvDomains.limit - planStatus.quotas.prvDomains.used)
        },
        gasPaymentMethod: 'Developer Sponsored (ATOM)',
        userCostPerOperation: 'FREE',
        costPerMonth: planStatus.costPerMonth,
        features: planStatus.features,
        recommendedAction: this.getRecommendedAction(planStatus)
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        error: 'Error retrieving plan status',
        gasPaymentMethod: 'Developer Sponsored (ATOM)',
        userCostPerOperation: 'FREE',
        recommendedAction: 'Please try again'
      };
    }
  }

  /**
   * Get recommended action for user based on plan and usage
   */
  private getRecommendedAction(planStatus: any): string {
    if (planStatus.planType === 'premium') {
      return 'You have unlimited access to all features. Enjoy premium benefits!';
    }

    // Check if user is approaching limits
    const quotaUsage = Math.max(
      planStatus.quotas.messages.used / Math.max(planStatus.quotas.messages.limit, 1),
      planStatus.quotas.emails.used / Math.max(planStatus.quotas.emails.limit, 1),
      planStatus.quotas.searches.used / Math.max(planStatus.quotas.searches.limit, 1)
    );

    if (quotaUsage > 0.8) {
      return 'Approaching daily limits. Consider upgrading to Premium for unlimited access.';
    }

    if (quotaUsage > 0.5) {
      return 'You\'re using your quotas well. Premium offers unlimited usage and video calls.';
    }

    return 'You have sufficient quota remaining. All gas fees are developer sponsored.';
  }

  /**
   * Get quota status for a domain/user
   */
  getQuotaStatus(_domain: string): { used: number; limit: number; tier: 'free' | 'premium' | 'enterprise' } {
    // This is a simplified implementation that returns plan-based status
    // In a production system, this would query actual usage from the plan manager
    try {
      // For now, return based on the default plan
      return {
        used: 0,
        limit: 100,
        tier: 'free'
      };
    } catch (error) {
      console.error('Error getting quota status:', error);
      return {
        used: 0,
        limit: 100,
        tier: 'free'
      };
    }
  }

  /**
   * Get gas fee statistics
   */
  getGasStats() {
    const totalTransactions = this.gasTransactions.length;
    const successfulTransactions = this.gasTransactions.filter(tx => tx.success).length;
    const totalGasCost = this.gasTransactions.reduce((sum, tx) => sum + Number(tx.gasCost), 0);
    
    const planBreakdown = this.gasTransactions.reduce((acc, tx) => {
      acc[tx.planType] = (acc[tx.planType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions: totalTransactions - successfulTransactions,
      developerWallet: this.developerWallet,
      totalGasSponsored: `${(totalGasCost / 1000000).toFixed(6)} ATOM`,
      planBreakdown,
      averageGasCost: totalTransactions > 0 ? totalGasCost / totalTransactions : 0,
      paymentModel: 'Plan-Based Developer Sponsored Gas (100% Free for Users)',
      economicModel: 'ATOM-only payments, PRIV tokens removed completely'
    };
  }

  private generateTransactionId(): string {
    return `gas_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Subscribe user to premium plan
   * @param userAddress - User's address
   * @param durationDays - Duration in days (e.g., 30 for monthly, 365 for yearly)
   * @param autoRefill - Whether to enable auto-refill
   */
  async subscribeToPremium(userAddress: string, durationDays: number, autoRefill: boolean): Promise<void> {
    try {
      // Upgrade to premium plan via plan manager
      await planManager.upgradeToPremium();
      
      console.log(`User ${userAddress} subscribed to premium for ${durationDays} days (auto-refill: ${autoRefill})`);
    } catch (error) {
      console.error('Failed to subscribe to premium:', error);
      throw new Error('Failed to subscribe to premium plan');
    }
  }
}

// Singleton instance
export const gasFeeManager = new GasFeeManager();