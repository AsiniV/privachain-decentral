/**
 * Plan Management Service for PrivaChain
 * Handles local plan key generation, plan binding, and usage tracking
 * Plans are bound to device installation and stored locally only
 */

import '../lib/kvStorage'; // Initialize KV storage
import { useKV } from '../hooks/useKV';

export type PlanType = 'starter' | 'premium';

export interface PlanKey {
  id: string;
  type: PlanType;
  createdAt: number;
  activatedAt: number | null;
  expiresAt: number | null;
  isActive: boolean;
}

export interface PlanLimits {
  storage: number; // in MB
  traffic: number; // in MB, -1 for unlimited
  prvDomains: number;
  videoCallsAllowed: boolean;
  dailyQuotas: {
    messages: number;
    emails: number;
    videoMinutes: number;
    searches: number;
  };
}

export interface PlanUsage {
  storageUsed: number; // in MB
  trafficUsed: number; // in MB
  prvDomainsUsed: number;
  dailyUsage: {
    messages: number;
    emails: number;
    videoMinutes: number;
    searches: number;
    lastResetTime: number;
  };
}

export interface Plan {
  key: PlanKey;
  limits: PlanLimits;
  usage: PlanUsage;
  costPerMonth: number; // in USD
  features: string[];
}

class PlanManager {
  private readonly PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    starter: {
      storage: 500, // 500 MB
      traffic: 1024, // 1 GB
      prvDomains: 0,
      videoCallsAllowed: false,
      dailyQuotas: {
        messages: 50,
        emails: 10,
        videoMinutes: 0,
        searches: 100,
      }
    },
    premium: {
      storage: 1024 * 1024, // 1 TB (1,048,576 MB)
      traffic: -1, // Unlimited
      prvDomains: 5,
      videoCallsAllowed: true,
      dailyQuotas: {
        messages: -1, // Unlimited
        emails: -1, // Unlimited
        videoMinutes: -1, // Unlimited
        searches: -1, // Unlimited
      }
    }
  };

  private readonly PLAN_FEATURES: Record<PlanType, string[]> = {
    starter: [
      '500MB encrypted storage',
      '1GB monthly traffic',
      'Basic messaging (50/day)',
      'Basic email (10/day)',
      'Search functionality (100/day)',
      'End-to-end encryption',
      'Zero-knowledge authentication'
    ],
    premium: [
      '1TB encrypted storage',
      'Unlimited traffic',
      '5 custom .prv domains',
      'Unlimited messaging',
      'Unlimited email',
      'Unlimited video calls',
      'Unlimited searches',
      'Priority support',
      'Advanced analytics',
      'API access'
    ]
  };

  private readonly PLAN_COSTS: Record<PlanType, number> = {
    starter: 0,
    premium: 10
  };

  /**
   * Initialize plan on app install - creates local key and assigns free plan
   */
  async initializePlan(): Promise<Plan> {
    // Check if plan already exists
    const existingPlan = await this.getCurrentPlan();
    if (existingPlan) {
      return existingPlan;
    }

    // Generate new local plan key
    const planKey = this.generatePlanKey('starter');
    
    // Create initial plan with starter benefits
    const plan: Plan = {
      key: planKey,
      limits: { ...this.PLAN_LIMITS.starter },
      usage: this.createInitialUsage(),
      costPerMonth: this.PLAN_COSTS.starter,
      features: [...this.PLAN_FEATURES.starter]
    };

    // Store plan locally (not synced anywhere)
    await spark.kv.set('user_plan', plan);
    
    console.log('🎯 Plan initialized:', plan.key.type, 'Plan ID:', plan.key.id);
    return plan;
  }

  /**
   * Get current user plan
   */
  async getCurrentPlan(): Promise<Plan | null> {
    try {
      const plan = await spark.kv.get<Plan>('user_plan');
      if (!plan) return null;

      // Check if plan needs daily quota reset
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      if (now - plan.usage.dailyUsage.lastResetTime > dayInMs) {
        plan.usage.dailyUsage = {
          messages: 0,
          emails: 0,
          videoMinutes: 0,
          searches: 0,
          lastResetTime: now
        };
        await spark.kv.set('user_plan', plan);
      }

      return plan;
    } catch (error) {
      console.error('Error getting current plan:', error);
      return null;
    }
  }

  /**
   * Upgrade to premium plan (triggered by smart contract payment confirmation)
   */
  async upgradeToPremium(transactionHash?: string): Promise<Plan> {
    const currentPlan = await this.getCurrentPlan();
    if (!currentPlan) {
      throw new Error('No current plan found. Please initialize app first.');
    }

    // Update plan key
    currentPlan.key.type = 'premium';
    currentPlan.key.activatedAt = Date.now();
    currentPlan.key.expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
    currentPlan.key.isActive = true;

    // Update limits and features
    currentPlan.limits = { ...this.PLAN_LIMITS.premium };
    currentPlan.features = [...this.PLAN_FEATURES.premium];
    currentPlan.costPerMonth = this.PLAN_COSTS.premium;

    // Store transaction reference if provided
    if (transactionHash) {
      await spark.kv.set('premium_transaction', {
        hash: transactionHash,
        timestamp: Date.now(),
        planId: currentPlan.key.id
      });
    }

    await spark.kv.set('user_plan', currentPlan);
    
    console.log('🎉 Plan upgraded to Premium! Plan ID:', currentPlan.key.id);
    return currentPlan;
  }

  /**
   * Check if user can perform an operation
   */
  async canPerformOperation(operation: 'message' | 'email' | 'video' | 'search' | 'domain' | 'storage' | 'traffic'): Promise<{
    allowed: boolean;
    reason?: string;
    remainingQuota?: number;
  }> {
    const plan = await this.getCurrentPlan();
    if (!plan) {
      return { allowed: false, reason: 'No plan found. Please reinstall app.' };
    }

    const limits = plan.limits;
    const usage = plan.usage;

    switch (operation) {
      case 'message': {
        const remainingMessages = limits.dailyQuotas.messages === -1 ? 'unlimited' : 
          Math.max(0, limits.dailyQuotas.messages - usage.dailyUsage.messages);
        return {
          allowed: limits.dailyQuotas.messages === -1 || usage.dailyUsage.messages < limits.dailyQuotas.messages,
          reason: limits.dailyQuotas.messages !== -1 && usage.dailyUsage.messages >= limits.dailyQuotas.messages 
            ? 'Daily message limit reached' : undefined,
          remainingQuota: typeof remainingMessages === 'number' ? remainingMessages : undefined
        };
      }

      case 'email': {
        const remainingEmails = limits.dailyQuotas.emails === -1 ? 'unlimited' : 
          Math.max(0, limits.dailyQuotas.emails - usage.dailyUsage.emails);
        return {
          allowed: limits.dailyQuotas.emails === -1 || usage.dailyUsage.emails < limits.dailyQuotas.emails,
          reason: limits.dailyQuotas.emails !== -1 && usage.dailyUsage.emails >= limits.dailyQuotas.emails 
            ? 'Daily email limit reached' : undefined,
          remainingQuota: typeof remainingEmails === 'number' ? remainingEmails : undefined
        };
      }

      case 'video': {
        if (!limits.videoCallsAllowed) {
          return { allowed: false, reason: 'Video calls not available in Starter plan' };
        }
        const remainingVideo = limits.dailyQuotas.videoMinutes === -1 ? 'unlimited' : 
          Math.max(0, limits.dailyQuotas.videoMinutes - usage.dailyUsage.videoMinutes);
        return {
          allowed: limits.dailyQuotas.videoMinutes === -1 || usage.dailyUsage.videoMinutes < limits.dailyQuotas.videoMinutes,
          reason: limits.dailyQuotas.videoMinutes !== -1 && usage.dailyUsage.videoMinutes >= limits.dailyQuotas.videoMinutes 
            ? 'Daily video limit reached' : undefined,
          remainingQuota: typeof remainingVideo === 'number' ? remainingVideo : undefined
        };
      }

      case 'search': {
        const remainingSearches = limits.dailyQuotas.searches === -1 ? 'unlimited' : 
          Math.max(0, limits.dailyQuotas.searches - usage.dailyUsage.searches);
        return {
          allowed: limits.dailyQuotas.searches === -1 || usage.dailyUsage.searches < limits.dailyQuotas.searches,
          reason: limits.dailyQuotas.searches !== -1 && usage.dailyUsage.searches >= limits.dailyQuotas.searches 
            ? 'Daily search limit reached' : undefined,
          remainingQuota: typeof remainingSearches === 'number' ? remainingSearches : undefined
        };
      }

      case 'domain': {
        const remainingDomains = Math.max(0, limits.prvDomains - usage.prvDomainsUsed);
        return {
          allowed: remainingDomains > 0,
          reason: remainingDomains <= 0 ? '.prv domain limit reached' : undefined,
          remainingQuota: remainingDomains
        };
      }

      case 'storage': {
        const remainingStorage = Math.max(0, limits.storage - usage.storageUsed);
        return {
          allowed: remainingStorage > 0,
          reason: remainingStorage <= 0 ? 'Storage limit reached' : undefined,
          remainingQuota: remainingStorage
        };
      }

      case 'traffic': {
        if (limits.traffic === -1) {
          return { allowed: true }; // Unlimited
        }
        const remainingTraffic = Math.max(0, limits.traffic - usage.trafficUsed);
        return {
          allowed: remainingTraffic > 0,
          reason: remainingTraffic <= 0 ? 'Traffic limit reached' : undefined,
          remainingQuota: remainingTraffic
        };
      }

      default:
        return { allowed: false, reason: 'Unknown operation' };
    }
  }

  /**
   * Record usage for an operation
   */
  async recordUsage(operation: 'message' | 'email' | 'video' | 'search' | 'domain' | 'storage' | 'traffic', amount: number = 1): Promise<void> {
    const plan = await this.getCurrentPlan();
    if (!plan) return;

    switch (operation) {
      case 'message':
        plan.usage.dailyUsage.messages += amount;
        break;
      case 'email':
        plan.usage.dailyUsage.emails += amount;
        break;
      case 'video':
        plan.usage.dailyUsage.videoMinutes += amount;
        break;
      case 'search':
        plan.usage.dailyUsage.searches += amount;
        break;
      case 'domain':
        plan.usage.prvDomainsUsed += amount;
        break;
      case 'storage':
        plan.usage.storageUsed += amount;
        break;
      case 'traffic':
        plan.usage.trafficUsed += amount;
        break;
    }

    await spark.kv.set('user_plan', plan);
  }

  /**
   * Get plan status for UI display
   */
  async getPlanStatus(): Promise<{
    planType: PlanType;
    isActive: boolean;
    features: string[];
    quotas: {
      messages: { used: number; limit: number };
      emails: { used: number; limit: number };
      videoMinutes: { used: number; limit: number };
      searches: { used: number; limit: number };
      storage: { used: number; limit: number };
      traffic: { used: number; limit: number };
      prvDomains: { used: number; limit: number };
    };
    costPerMonth: number;
    expiresAt: number | null;
  } | null> {
    const plan = await this.getCurrentPlan();
    if (!plan) return null;

    return {
      planType: plan.key.type,
      isActive: plan.key.isActive,
      features: plan.features,
      quotas: {
        messages: {
          used: plan.usage.dailyUsage.messages,
          limit: plan.limits.dailyQuotas.messages
        },
        emails: {
          used: plan.usage.dailyUsage.emails,
          limit: plan.limits.dailyQuotas.emails
        },
        videoMinutes: {
          used: plan.usage.dailyUsage.videoMinutes,
          limit: plan.limits.dailyQuotas.videoMinutes
        },
        searches: {
          used: plan.usage.dailyUsage.searches,
          limit: plan.limits.dailyQuotas.searches
        },
        storage: {
          used: plan.usage.storageUsed,
          limit: plan.limits.storage
        },
        traffic: {
          used: plan.usage.trafficUsed,
          limit: plan.limits.traffic
        },
        prvDomains: {
          used: plan.usage.prvDomainsUsed,
          limit: plan.limits.prvDomains
        }
      },
      costPerMonth: plan.costPerMonth,
      expiresAt: plan.key.expiresAt
    };
  }

  /**
   * Reset app plan (for testing or app reinstall)
   */
  async resetPlan(): Promise<void> {
    await spark.kv.delete('user_plan');
    await spark.kv.delete('premium_transaction');
    console.log('Plan reset completed');
  }

  /**
   * Generate a unique plan key bound to device installation
   */
  private generatePlanKey(type: PlanType): PlanKey {
    const id = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    return {
      id,
      type,
      createdAt: Date.now(),
      activatedAt: type === 'starter' ? Date.now() : null,
      expiresAt: null, // Starter never expires, Premium gets set on upgrade
      isActive: type === 'starter'
    };
  }

  /**
   * Create initial usage tracking object
   */
  private createInitialUsage(): PlanUsage {
    return {
      storageUsed: 0,
      trafficUsed: 0,
      prvDomainsUsed: 0,
      dailyUsage: {
        messages: 0,
        emails: 0,
        videoMinutes: 0,
        searches: 0,
        lastResetTime: Date.now()
      }
    };
  }
}

// Singleton instance
export const planManager = new PlanManager();