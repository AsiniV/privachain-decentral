/**
 * Hook for managing plan system initialization and state
 */

import { useState, useEffect, useCallback } from 'react';
import { planManager } from '../services/PlanManager';
import { planActivationContract } from '../services/PlanActivationContract';
import { toast } from 'sonner';

export function usePlanSystem() {
  const [planStatus, setPlanStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize plan system on app start
  useEffect(() => {
    const initializePlanSystem = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize plan (creates starter plan if none exists)
        await planManager.initializePlan();
        
        // Load current plan status
        const status = await planManager.getPlanStatus();
        setPlanStatus(status);
        
        console.log('✅ Plan system initialized:', status?.planType || 'unknown');
      } catch (err) {
        console.error('❌ Error initializing plan system:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize plan system');
      } finally {
        setLoading(false);
      }
    };

    initializePlanSystem();
  }, []);

  // Listen for premium activation events
  useEffect(() => {
    const handlePremiumActivated = async (event: any) => {
      try {
        console.log('🎉 Premium activation detected:', event.detail);
        
        // Reload plan status
        const status = await planManager.getPlanStatus();
        setPlanStatus(status);
        
        toast.success('🎉 Premium plan activated! Unlimited features unlocked.');
      } catch (err) {
        console.error('Error handling premium activation:', err);
      }
    };

    const handleShowUpgrade = () => {
      // Trigger plan view or upgrade dialog
      console.log('💎 Show upgrade dialog requested');
    };

    window.addEventListener('premium-activated', handlePremiumActivated);
    window.addEventListener('show-premium-upgrade', handleShowUpgrade);
    
    return () => {
      window.removeEventListener('premium-activated', handlePremiumActivated);
      window.removeEventListener('show-premium-upgrade', handleShowUpgrade);
    };
  }, []);

  // Check if user can perform operation
  const canPerformOperation = useCallback(async (operation: string) => {
    if (!planStatus) {
      return { allowed: false, reason: 'Plan not loaded' };
    }

    try {
      return await planManager.canPerformOperation(operation as any);
    } catch (err) {
      console.error('Error checking operation permission:', err);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }, [planStatus]);

  // Record usage for an operation
  const recordUsage = useCallback(async (operation: string, amount: number = 1) => {
    try {
      await planManager.recordUsage(operation as any, amount);
      
      // Refresh plan status to show updated usage
      const status = await planManager.getPlanStatus();
      setPlanStatus(status);
    } catch (err) {
      console.error('Error recording usage:', err);
    }
  }, []);

  // Create payment invoice for premium upgrade
  const createUpgradeInvoice = useCallback(async (currency: 'ATOM' | 'USDC') => {
    if (!planStatus) {
      throw new Error('Plan not loaded');
    }

    try {
      const planId = planStatus.planId || 'default';
      return await planActivationContract.generatePaymentInvoice(planId, currency);
    } catch (err) {
      console.error('Error creating upgrade invoice:', err);
      throw err;
    }
  }, [planStatus]);

  // Refresh plan status
  const refreshPlanStatus = useCallback(async () => {
    try {
      const status = await planManager.getPlanStatus();
      setPlanStatus(status);
    } catch (err) {
      console.error('Error refreshing plan status:', err);
    }
  }, []);

  // Get upgrade recommendation
  const getUpgradeRecommendation = useCallback(() => {
    if (!planStatus || planStatus.planType === 'premium') {
      return {
        shouldUpgrade: false,
        reason: planStatus?.planType === 'premium' ? 'Already premium' : 'Plan not loaded',
        benefits: []
      };
    }

    // Calculate usage percentage
    const quotas = planStatus.quotas;
    const usagePercentages = [
      quotas.messages.limit > 0 ? quotas.messages.used / quotas.messages.limit : 0,
      quotas.emails.limit > 0 ? quotas.emails.used / quotas.emails.limit : 0,
      quotas.searches.limit > 0 ? quotas.searches.used / quotas.searches.limit : 0,
    ];
    
    const maxUsage = Math.max(...usagePercentages);

    if (maxUsage > 0.8) {
      return {
        shouldUpgrade: true,
        reason: 'You\'re approaching your daily limits',
        benefits: [
          'Unlimited messaging and emails',
          'Unlimited video calls',
          'Unlimited searches',
          '1TB storage vs 500MB',
          '5 custom .prv domains'
        ]
      };
    }

    if (maxUsage > 0.5) {
      return {
        shouldUpgrade: true,
        reason: 'Upgrade for unlimited access',
        benefits: [
          'No daily limits',
          'HD video calling',
          'Custom domains',
          'Priority support'
        ]
      };
    }

    return {
      shouldUpgrade: false,
      reason: 'Current plan meets your needs',
      benefits: []
    };
  }, [planStatus]);

  return {
    planStatus,
    loading,
    error,
    canPerformOperation,
    recordUsage,
    createUpgradeInvoice,
    refreshPlanStatus,
    getUpgradeRecommendation,
    isStarter: planStatus?.planType === 'starter',
    isPremium: planStatus?.planType === 'premium',
    features: planStatus?.features || [],
    quotas: planStatus?.quotas || {}
  };
}