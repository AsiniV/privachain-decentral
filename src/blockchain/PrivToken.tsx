import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useKV } from '../hooks/useKV'
import { useCosmos } from './CosmosBlockchain'
import { toast } from 'sonner'

// PRIV Token Implementation
interface TokenState {
  totalSupply: string
  circulatingSupply: string
  stakedAmount: string
  burnedAmount: string
  inflationRate: number
  stakingReward: number
}

interface TokenHolder {
  address: string
  balance: string
  staked: string
  rewards: string
  lastClaim: number
}

interface StakingPool {
  validator: string
  totalStaked: string
  apy: number
  commission: number
  delegators: number
}

interface GasEstimate {
  low: number
  medium: number
  high: number
  current: number
}

interface TokenContextType {
  tokenState: TokenState
  gasEstimate: GasEstimate
  stakingPools: StakingPool[]
  userTokens: TokenHolder
  transfer: (to: string, amount: string) => Promise<string>
  stake: (validator: string, amount: string) => Promise<void>
  unstake: (validator: string, amount: string) => Promise<void>
  claimRewards: () => Promise<void>
  estimateGas: (txType: string) => number
  burnTokens: (amount: string) => Promise<void>
  mint: (to: string, amount: string) => Promise<void> // Only for governance
}

const TokenContext = createContext<TokenContextType | null>(null)

export function PrivTokenProvider({ children }: { children: ReactNode }) {
  const { isConnected, walletAddress, sendTransaction } = useCosmos()
  
  const [tokenState, setTokenState] = useKV<TokenState>('priv-token-state', {
    totalSupply: '1000000000', // 1 billion PRIV
    circulatingSupply: '750000000',
    stakedAmount: '450000000',
    burnedAmount: '5000000',
    inflationRate: 0.08, // 8% annual
    stakingReward: 0.12 // 12% APY
  })

  const [gasEstimate, setGasEstimate] = useState<GasEstimate>({
    low: 0.0005,
    medium: 0.001,
    high: 0.002,
    current: 0.001
  })

  const [stakingPools, setStakingPools] = useKV<StakingPool[]>('staking-pools', [
    {
      validator: 'priv1val1ator234567890abcdef',
      totalStaked: '50000000',
      apy: 12.5,
      commission: 5,
      delegators: 2847
    },
    {
      validator: 'priv1val2ator567890abcdef123',
      totalStaked: '45000000',
      apy: 11.8,
      commission: 7,
      delegators: 2156
    },
    {
      validator: 'priv1val3ator890abcdef123456',
      totalStaked: '38000000',
      apy: 13.2,
      commission: 4,
      delegators: 1923
    }
  ])

  const [userTokens, setUserTokens] = useKV<TokenHolder>('user-tokens', {
    address: '',
    balance: '1000.0',
    staked: '500.0',
    rewards: '25.75',
    lastClaim: Date.now() - 86400000 // 24 hours ago
  })

  // Update gas prices based on network congestion
  useEffect(() => {
    const interval = setInterval(() => {
      const congestion = Math.random()
      const baseGas = 0.001
      
      setGasEstimate({
        low: baseGas * (0.5 + congestion * 0.3),
        medium: baseGas * (1 + congestion * 0.5),
        high: baseGas * (2 + congestion),
        current: baseGas * (1 + congestion * 0.5)
      })
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Update user address when wallet connects
  useEffect(() => {
    if (walletAddress && userTokens.address !== walletAddress) {
      setUserTokens(prev => ({
        ...prev,
        address: walletAddress
      }))
    }
  }, [walletAddress, setUserTokens, userTokens.address])

  // Simulate staking rewards accumulation
  useEffect(() => {
    if (!isConnected || parseFloat(userTokens.staked) === 0) return

    const interval = setInterval(() => {
      const stakingAPY = tokenState.stakingReward
      const annualReward = parseFloat(userTokens.staked) * stakingAPY
      const dailyReward = annualReward / 365
      const hourlyReward = dailyReward / 24
      
      setUserTokens(prev => ({
        ...prev,
        rewards: (parseFloat(prev.rewards) + hourlyReward).toFixed(6)
      }))
    }, 3600000) // Every hour

    return () => clearInterval(interval)
  }, [isConnected, userTokens.staked, tokenState.stakingReward, setUserTokens])

  const transfer = async (to: string, amount: string): Promise<string> => {
    if (!isConnected) throw new Error('Wallet not connected')
    
    const balance = parseFloat(userTokens.balance)
    const transferAmount = parseFloat(amount)
    
    if (transferAmount > balance) {
      throw new Error('Insufficient balance')
    }

    const txHash = await sendTransaction({
      type: 'transfer',
      recipient: to,
      amount
    })

    setUserTokens(prev => ({
      ...prev,
      balance: (balance - transferAmount).toString()
    }))

    toast.success(`Transferred ${amount} PRIV`)
    return txHash
  }

  const stake = async (validator: string, amount: string) => {
    if (!isConnected) throw new Error('Wallet not connected')
    
    const balance = parseFloat(userTokens.balance)
    const stakeAmount = parseFloat(amount)
    
    if (stakeAmount > balance) {
      throw new Error('Insufficient balance')
    }

    await sendTransaction({
      type: 'delegate',
      recipient: validator,
      amount,
      data: { action: 'stake' }
    })

    setUserTokens(prev => ({
      ...prev,
      balance: (balance - stakeAmount).toString(),
      staked: (parseFloat(prev.staked) + stakeAmount).toString()
    }))

    // Update pool totals
    setStakingPools(prev => prev.map(pool => 
      pool.validator === validator 
        ? { ...pool, totalStaked: (parseFloat(pool.totalStaked) + stakeAmount).toString() }
        : pool
    ))

    toast.success(`Staked ${amount} PRIV`)
  }

  const unstake = async (validator: string, amount: string) => {
    if (!isConnected) throw new Error('Wallet not connected')
    
    const staked = parseFloat(userTokens.staked)
    const unstakeAmount = parseFloat(amount)
    
    if (unstakeAmount > staked) {
      throw new Error('Insufficient staked amount')
    }

    await sendTransaction({
      type: 'delegate',
      recipient: validator,
      amount,
      data: { action: 'unstake' }
    })

    setUserTokens(prev => ({
      ...prev,
      staked: (staked - unstakeAmount).toString(),
      balance: (parseFloat(prev.balance) + unstakeAmount).toString()
    }))

    // Update pool totals
    setStakingPools(prev => prev.map(pool => 
      pool.validator === validator 
        ? { ...pool, totalStaked: (parseFloat(pool.totalStaked) - unstakeAmount).toString() }
        : pool
    ))

    toast.success(`Unstaked ${amount} PRIV (21-day unbonding period)`)
  }

  const claimRewards = async () => {
    if (!isConnected) throw new Error('Wallet not connected')
    
    const rewards = parseFloat(userTokens.rewards)
    if (rewards === 0) {
      throw new Error('No rewards to claim')
    }

    await sendTransaction({
      type: 'transfer',
      data: { action: 'claim_rewards' }
    })

    setUserTokens(prev => ({
      ...prev,
      balance: (parseFloat(prev.balance) + rewards).toString(),
      rewards: '0',
      lastClaim: Date.now()
    }))

    toast.success(`Claimed ${rewards.toFixed(6)} PRIV rewards`)
  }

  const estimateGas = (txType: string): number => {
    const gasMap: Record<string, number> = {
      transfer: 21000,
      delegate: 50000,
      vote: 30000,
      mail: 75000,
      domain: 100000,
      video_signal: 60000,
      smart_contract: 200000
    }
    
    return gasMap[txType] || 21000
  }

  const burnTokens = async (amount: string) => {
    if (!isConnected) throw new Error('Wallet not connected')
    
    const balance = parseFloat(userTokens.balance)
    const burnAmount = parseFloat(amount)
    
    if (burnAmount > balance) {
      throw new Error('Insufficient balance')
    }

    await sendTransaction({
      type: 'transfer',
      recipient: 'priv1burn000000000000000000000',
      amount,
      data: { action: 'burn' }
    })

    setUserTokens(prev => ({
      ...prev,
      balance: (balance - burnAmount).toString()
    }))

    setTokenState(prev => ({
      ...prev,
      burnedAmount: (parseFloat(prev.burnedAmount) + burnAmount).toString(),
      circulatingSupply: (parseFloat(prev.circulatingSupply) - burnAmount).toString()
    }))

    toast.success(`Burned ${amount} PRIV tokens`)
  }

  const mint = async (to: string, amount: string) => {
    if (!isConnected) throw new Error('Wallet not connected')
    
    // Only governance can mint
    await sendTransaction({
      type: 'transfer',
      recipient: to,
      amount,
      data: { action: 'mint' }
    })

    setTokenState(prev => ({
      ...prev,
      totalSupply: (parseFloat(prev.totalSupply) + parseFloat(amount)).toString(),
      circulatingSupply: (parseFloat(prev.circulatingSupply) + parseFloat(amount)).toString()
    }))

    toast.success(`Minted ${amount} PRIV tokens`)
  }

  return (
    <TokenContext.Provider value={{
      tokenState,
      gasEstimate,
      stakingPools,
      userTokens,
      transfer,
      stake,
      unstake,
      claimRewards,
      estimateGas,
      burnTokens,
      mint
    }}>
      {children}
    </TokenContext.Provider>
  )
}

export const usePrivToken = () => {
  const context = useContext(TokenContext)
  if (!context) {
    throw new Error('usePrivToken must be used within PrivTokenProvider')
  }
  return context
}

// Gas Fee System
export interface GasFeeEstimate {
  gasLimit: number
  gasPrice: number
  totalFee: number
  estimatedTime: string
}

export function calculateGasFees(
  txType: string, 
  gasPrice: number, 
  priority: 'low' | 'medium' | 'high' = 'medium'
): GasFeeEstimate {
  const gasLimits: Record<string, number> = {
    transfer: 21000,
    mail: 75000,
    domain: 100000,
    video_signal: 60000,
    stake: 50000,
    vote: 30000,
    smart_contract: 200000
  }

  const priorityMultipliers = {
    low: 0.8,
    medium: 1.0,
    high: 1.5
  }

  const estimatedTimes = {
    low: '~30 seconds',
    medium: '~10 seconds',
    high: '~5 seconds'
  }

  const gasLimit = gasLimits[txType] || 21000
  const adjustedGasPrice = gasPrice * priorityMultipliers[priority]
  const totalFee = gasLimit * adjustedGasPrice

  return {
    gasLimit,
    gasPrice: adjustedGasPrice,
    totalFee,
    estimatedTime: estimatedTimes[priority]
  }
}