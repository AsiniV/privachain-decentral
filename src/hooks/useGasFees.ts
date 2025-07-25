/**
 * Hook for handling gas fees in PrivaChain operations
 */

import { useState, useCallback } from 'react';
import { useKV } from './useKV';
import { gasFeeManager } from '../services/GasFeeManager';
import { toast } from 'sonner';

export interface GasTransaction {
  id: string;
  userAddress: string;
  operation: 'message' | 'email' | 'video' | 'search' | 'domain';
  gasCost: bigint;
  paymentMethod: 'foundation' | 'premium' | 'direct';
  timestamp: number;
  success: boolean;
  errorReason?: string;
}

export function useGasFees() {
  const [userAddress] = useKV('user-address', '0x1234567890123456789012345678901234567890');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<GasTransaction | null>(null);

  /**
   * Process gas fee for an operation
   */
  const processGasFee = useCallback(async (
    operation: 'message' | 'email' | 'video' | 'search' | 'domain',
    preferredPayment: 'auto' | 'foundation' | 'premium' | 'direct' = 'auto'
  ): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      const transaction = await gasFeeManager.processGasFee(
        userAddress, 
        operation, 
        preferredPayment
      );
      
      setLastTransaction(transaction);
      
      if (transaction.success) {
        // Show success message based on payment method
        const paymentMessages = {
          foundation: `${operation} sent using free quota`,
          premium: `${operation} sent using Premium subscription`,
          direct: `${operation} sent - paid with PRIV tokens`
        };
        
        toast.success(paymentMessages[transaction.paymentMethod]);
        return true;
      } else {
        // Handle different error scenarios
        if (transaction.errorReason?.includes('quota exceeded')) {
          toast.error('Daily free quota exceeded. Consider upgrading to Premium.', {
            action: {
              label: 'Upgrade',
              onClick: () => {
                // Trigger premium upgrade dialog
                window.dispatchEvent(new CustomEvent('show-premium-upgrade'));
              }
            }
          });
        } else if (transaction.errorReason?.includes('Insufficient balance')) {
          toast.error('Insufficient PRIV balance. Add tokens to continue.', {
            action: {
              label: 'Add Tokens',
              onClick: () => {
                // Trigger add tokens dialog  
                window.dispatchEvent(new CustomEvent('show-add-tokens'));
              }
            }
          });
        } else {
          toast.error(`Failed to send ${operation}: ${transaction.errorReason}`);
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
  }, [userAddress]);

  /**
   * Check if user can perform operation
   */
  const canPerformOperation = useCallback((operation: 'message' | 'email' | 'video' | 'search' | 'domain'): {
    canUse: boolean;
    method: 'foundation' | 'premium' | 'direct' | 'none';
    reason?: string;
  } => {
    try {
      const paymentStatus = gasFeeManager.getPaymentStatus(userAddress);
      
      // Check free quota first
      const quotaMap = {
        message: paymentStatus.freeQuotaRemaining.messages,
        email: paymentStatus.freeQuotaRemaining.emails,
        video: paymentStatus.freeQuotaRemaining.videoMinutes,
        search: paymentStatus.freeQuotaRemaining.searches,
        domain: 0 // Domains not included in free tier
      };
      
      if (quotaMap[operation] > 0) {
        return { canUse: true, method: 'foundation' };
      }
      
      // Check premium subscription
      if (paymentStatus.premiumStatus?.active) {
        return { canUse: true, method: 'premium' };
      }
      
      // Check direct balance
      const directBalance = parseFloat(paymentStatus.directBalance);
      const requiredAmounts = {
        message: 0.001,
        email: 0.01,
        video: 0.1,
        search: 0.0005,
        domain: 50
      };
      
      if (directBalance >= requiredAmounts[operation]) {
        return { canUse: true, method: 'direct' };
      }
      
      return { 
        canUse: false, 
        method: 'none', 
        reason: 'Insufficient funds and no available quota' 
      };
    } catch (error) {
      console.error('Error checking operation capability:', error);
      return { 
        canUse: false, 
        method: 'none', 
        reason: 'Error checking payment status' 
      };
    }
  }, [userAddress]);

  /**
   * Get user's current payment status
   */
  const getPaymentStatus = useCallback(() => {
    try {
      return gasFeeManager.getPaymentStatus(userAddress);
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }, [userAddress]);

  /**
   * Get gas cost for operation
   */
  const getGasCost = useCallback((operation: 'message' | 'email' | 'video' | 'search' | 'domain'): string => {
    const costs = {
      message: '0.001',
      email: '0.01', 
      video: '0.1',
      search: '0.0005',
      domain: '50'
    };
    return costs[operation];
  }, []);

  /**
   * Subscribe to premium
   */
  const subscribeToPremium = useCallback(async (duration: number = 30): Promise<boolean> => {
    setIsProcessing(true);
    try {
      await gasFeeManager.subscribeToPremium(userAddress, duration, true);
      toast.success('Successfully upgraded to Premium!');
      return true;
    } catch (error) {
      console.error('Premium subscription error:', error);
      toast.error('Failed to upgrade to Premium');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [userAddress]);

  return {
    processGasFee,
    canPerformOperation,
    getPaymentStatus,
    getGasCost,
    subscribeToPremium,
    isProcessing,
    lastTransaction,
    userAddress
  };
}