/**
 * Hook for handling gas fees in PrivaChain operations
 * Integrated with plan-based system and ATOM-only payments
 */

import { useState, useCallback, useEffect } from 'react';
import { useKV } from './useKV';
import { gasFeeManager } from '../services/GasFeeManager';
import { planManager } from '../services/PlanManager';
import { toast } from 'sonner';

export interface GasTransaction {
  id: string;
  userAddress: string;
  operation: 'message' | 'email' | 'video' | 'search' | 'domain';
  gasCost: bigint;
  paymentMethod: 'developer_sponsored';
  planType: 'starter' | 'premium';
  timestamp: number;
  success: boolean;
  errorReason?: string;
}

export function useGasFees() {
  const [userAddress] = useKV('user-address', 'cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<GasTransaction | null>(null);
  const [planStatus, setPlanStatus] = useState<any>(null);

  // Initialize plan on first load
  useEffect(() => {
    const initializePlan = async () => {
      try {
        await planManager.initializePlan();
        const status = await planManager.getPlanStatus();
        setPlanStatus(status);
      } catch (error) {
        console.error('Error initializing plan:', error);
      }
    };

    initializePlan();
  }, []);

  // Listen for premium activation events
  useEffect(() => {
    const handlePremiumActivated = async () => {
      const status = await planManager.getPlanStatus();
      setPlanStatus(status);
      toast.success('🎉 Premium plan activated! You now have unlimited access to all features.');
    };

    window.addEventListener('premium-activated', handlePremiumActivated);
    return () => window.removeEventListener('premium-activated', handlePremiumActivated);
  }, []);

  /**
   * Process gas fee for an operation
   */
  const processGasFee = useCallback(async (
    operation: 'message' | 'email' | 'video' | 'search' | 'domain'
  ): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      const transaction = await gasFeeManager.processGasFee(userAddress, operation);
      setLastTransaction(transaction);
      
      if (transaction.success) {
        // Show success message
        const planName = transaction.planType === 'premium' ? 'Premium' : 'Starter';
        toast.success(`${operation} completed using ${planName} plan (Developer sponsored)`);
        
        // Update plan status to reflect new usage
        const status = await planManager.getPlanStatus();
        setPlanStatus(status);
        
        return true;
      } else {
        // Handle different error scenarios
        if (transaction.errorReason?.includes('not allowed by current plan')) {
          if (operation === 'video' && planStatus?.planType === 'starter') {
            toast.error('Video calls require Premium plan. Upgrade to unlock unlimited video calling.', {
              action: {
                label: 'Upgrade',
                onClick: () => {
                  window.dispatchEvent(new CustomEvent('show-premium-upgrade'));
                }
              }
            });
          } else if (transaction.errorReason?.includes('quota exceeded')) {
            toast.error(`Daily ${operation} quota reached. Upgrade to Premium for unlimited access.`, {
              action: {
                label: 'Upgrade',
                onClick: () => {
                  window.dispatchEvent(new CustomEvent('show-premium-upgrade'));
                }
              }
            });
          } else {
            toast.error(`${operation} not allowed: ${transaction.errorReason}`);
          }
        } else {
          toast.error(`Failed to process ${operation}: ${transaction.errorReason}`);
        }
        return false;
      }
    } catch (error) {
      console.error('Gas fee processing error:', error);
      toast.error(`Failed to process gas fee for ${operation}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [userAddress, planStatus]);

  /**
   * Check if user can perform operation
   */
  const canPerformOperation = useCallback(async (operation: 'message' | 'email' | 'video' | 'search' | 'domain'): Promise<{
    canUse: boolean;
    reason?: string;
    remainingQuota?: number;
    planType?: string;
  }> => {
    try {
      const permission = await planManager.canPerformOperation(operation);
      const currentPlan = await planManager.getPlanStatus();
      
      return {
        canUse: permission.allowed,
        reason: permission.reason,
        remainingQuota: permission.remainingQuota,
        planType: currentPlan?.planType || 'starter'
      };
    } catch (error) {
      console.error('Error checking operation capability:', error);
      return { 
        canUse: false, 
        reason: 'Error checking plan status' 
      };
    }
  }, []);

  /**
   * Get user's current payment status and plan information
   */
  const getPaymentStatus = useCallback(async () => {
    try {
      const status = await gasFeeManager.getPaymentStatus(userAddress);
      const planInfo = await planManager.getPlanStatus();
      
      return {
        ...status,
        planInfo
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }, [userAddress]);

  /**
   * Get gas cost for operation (always free for users)
   */
  const getGasCost = useCallback((operation: 'message' | 'email' | 'video' | 'search' | 'domain'): string => {
    return 'FREE'; // All operations are free for users
  }, []);

  /**
   * Trigger premium upgrade flow
   */
  const upgradeToPremium = useCallback(async (): Promise<void> => {
    // Dispatch event to show upgrade dialog
    window.dispatchEvent(new CustomEvent('show-premium-upgrade'));
  }, []);

  /**
   * Get plan upgrade recommendation
   */
  const getUpgradeRecommendation = useCallback((): {
    shouldUpgrade: boolean;
    reason: string;
    benefits: string[];
  } => {
    if (!planStatus) {
      return {
        shouldUpgrade: false,
        reason: 'Plan status not loaded',
        benefits: []
      };
    }

    if (planStatus.planType === 'premium') {
      return {
        shouldUpgrade: false,
        reason: 'Already have Premium plan',
        benefits: []
      };
    }

    // Check usage patterns
    const totalUsage = (
      (planStatus.quotas.messages.used / Math.max(planStatus.quotas.messages.limit, 1)) +
      (planStatus.quotas.emails.used / Math.max(planStatus.quotas.emails.limit, 1)) +
      (planStatus.quotas.searches.used / Math.max(planStatus.quotas.searches.limit, 1))
    ) / 3;

    if (totalUsage > 0.7) {
      return {
        shouldUpgrade: true,
        reason: 'You\'re using most of your daily quotas',
        benefits: [
          'Unlimited messaging and emails',
          'Unlimited video calls',
          'Unlimited searches',
          '1TB storage vs 500MB',
          '5 custom .prv domains'
        ]
      };
    }

    return {
      shouldUpgrade: false,
      reason: 'Current plan meets your usage',
      benefits: []
    };
  }, [planStatus]);

  return {
    processGasFee,
    canPerformOperation,
    getPaymentStatus,
    getGasCost,
    upgradeToPremium,
    getUpgradeRecommendation,
    isProcessing,
    lastTransaction,
    userAddress,
    planStatus
  };
}