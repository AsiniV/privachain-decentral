import { useState, useEffect } from 'react'
import { useKV } from './useKV'
import { toast } from 'sonner'
import { TEST_WALLET_ADDRESS, TEST_WALLET_CONFIG } from '../blockchain/CosmosTestnet'

export interface WalletBalance {
  denom: string
  amount: string
  formatted: string
}

export interface TransactionRecord {
  hash: string
  type: string
  amount: string
  fee: string
  timestamp: string
  status: 'pending' | 'success' | 'failed'
  memo?: string
}

export interface TestWalletState {
  address: string
  isConnected: boolean
  balances: WalletBalance[]
  transactions: TransactionRecord[]
  gasBudget: string
  totalSpent: string
}

export const useTestWallet = () => {
  const [walletState, setWalletState] = useKV<TestWalletState>('test-wallet-state', {
    address: TEST_WALLET_ADDRESS,
    isConnected: false,
    balances: [],
    transactions: [],
    gasBudget: '10000000', // 10 ATOM in uatom
    totalSpent: '0'
  })

  const [isLoading, setIsLoading] = useState(false)

  // Initialize test wallet with simulated balances
  useEffect(() => {
    const initializeWallet = () => {
      if (walletState.balances.length === 0) {
        const mockBalances: WalletBalance[] = [
          {
            denom: 'uatom',
            amount: '50000000', // 50 ATOM
            formatted: '50.000000 ATOM'
          },
          {
            denom: 'upriv',
            amount: '1000000000', // 1000 PRIV tokens
            formatted: '1,000.000000 PRIV'
          }
        ]

        setWalletState(prev => ({
          ...prev,
          balances: mockBalances,
          isConnected: true
        }))
      }
    }

    initializeWallet()
  }, [setWalletState, walletState.balances.length])

  const connectWallet = async () => {
    setIsLoading(true)
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setWalletState(prev => ({
        ...prev,
        isConnected: true
      }))
      
      toast.success(`Test wallet connected: ${TEST_WALLET_ADDRESS.slice(0, 12)}...`)
    } catch (error) {
      toast.error('Failed to connect test wallet')
      console.error('Wallet connection error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setWalletState(prev => ({
      ...prev,
      isConnected: false
    }))
    toast.info('Test wallet disconnected')
  }

  const payGasFee = async (amount: string, transactionType: string, memo?: string): Promise<string> => {
    if (!walletState.isConnected) {
      throw new Error('Wallet not connected')
    }

    const atomBalance = walletState.balances.find(b => b.denom === 'uatom')
    if (!atomBalance || parseInt(atomBalance.amount) < parseInt(amount)) {
      throw new Error('Insufficient ATOM balance for gas fees')
    }

    // Create transaction record
    const transaction: TransactionRecord = {
      hash: `0x${Math.random().toString(16).slice(2, 66)}`,
      type: transactionType,
      amount: amount,
      fee: (parseInt(amount) * 0.001).toString(), // 0.1% fee
      timestamp: new Date().toISOString(),
      status: 'pending',
      memo
    }

    // Update wallet state
    setWalletState(prev => {
      const newBalances = prev.balances.map(balance => {
        if (balance.denom === 'uatom') {
          const newAmount = (parseInt(balance.amount) - parseInt(amount)).toString()
          return {
            ...balance,
            amount: newAmount,
            formatted: `${(parseInt(newAmount) / 1000000).toFixed(6)} ATOM`
          }
        }
        return balance
      })

      const newTotalSpent = (parseInt(prev.totalSpent) + parseInt(amount)).toString()

      return {
        ...prev,
        balances: newBalances,
        transactions: [transaction, ...prev.transactions],
        totalSpent: newTotalSpent
      }
    })

    // Simulate transaction processing
    setTimeout(() => {
      setWalletState(prev => ({
        ...prev,
        transactions: prev.transactions.map(tx => 
          tx.hash === transaction.hash 
            ? { ...tx, status: Math.random() > 0.1 ? 'success' : 'failed' }
            : tx
        )
      }))
    }, 2000)

    return transaction.hash
  }

  const getBalance = (denom: string): WalletBalance | undefined => {
    return walletState.balances.find(balance => balance.denom === denom)
  }

  const getGasBudgetRemaining = (): number => {
    const budget = parseInt(walletState.gasBudget)
    const spent = parseInt(walletState.totalSpent)
    return Math.max(0, budget - spent)
  }

  const canAffordGas = (amount: string): boolean => {
    const atomBalance = getBalance('uatom')
    if (!atomBalance) return false
    return parseInt(atomBalance.amount) >= parseInt(amount)
  }

  const estimateGasFee = (operationType: string): string => {
    const gasEstimates: Record<string, string> = {
      'send_message': '5000', // 0.005 ATOM
      'send_email': '10000', // 0.01 ATOM
      'register_domain': '50000', // 0.05 ATOM
      'video_call_session': '25000', // 0.025 ATOM
      'search_query': '2000', // 0.002 ATOM
      'premium_upgrade': '100000', // 0.1 ATOM
      'stake_tokens': '15000', // 0.015 ATOM
    }
    
    return gasEstimates[operationType] || '5000'
  }

  const refreshBalances = async () => {
    setIsLoading(true)
    try {
      // Simulate balance refresh
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In real implementation, fetch actual balances from blockchain
      toast.success('Balances refreshed')
    } catch {
      toast.error('Failed to refresh balances')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    wallet: walletState,
    isLoading,
    connectWallet,
    disconnectWallet,
    payGasFee,
    getBalance,
    getGasBudgetRemaining,
    canAffordGas,
    estimateGasFee,
    refreshBalances,
    config: TEST_WALLET_CONFIG
  }
}