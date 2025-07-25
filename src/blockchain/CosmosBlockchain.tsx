import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useKV } from '../hooks/useKV'
import { toast } from 'sonner'

// Cosmos SDK blockchain implementation
interface BlockchainState {
  blockHeight: number
  validators: Validator[]
  transactions: Transaction[]
  consensus: ConsensusState
  gasPrice: number
  totalSupply: string
}

interface Validator {
  address: string
  votingPower: number
  stake: string
  commission: number
  isActive: boolean
  lastSignedBlock: number
}

interface Transaction {
  hash: string
  type: TransactionType
  sender: string
  recipient?: string
  amount?: string
  gasUsed: number
  gasPrice: number
  timestamp: number
  blockHeight: number
  data?: any
}

interface ConsensusState {
  type: 'DPoS'
  blockTime: number // 2 seconds
  finality: number // 1 block
  throughput: number // 5000 TPS
  activeValidators: number
}

type TransactionType = 'transfer' | 'delegate' | 'vote' | 'mail' | 'domain' | 'video_signal'

interface CosmosContextType {
  state: BlockchainState
  isConnected: boolean
  walletAddress: string | null
  privBalance: string
  connect: () => Promise<void>
  disconnect: () => void
  sendTransaction: (tx: Partial<Transaction>) => Promise<string>
  stakeTokens: (amount: string, validator: string) => Promise<void>
  unstakeTokens: (amount: string, validator: string) => Promise<void>
  delegateVote: (proposal: string, vote: 'yes' | 'no' | 'abstain') => Promise<void>
}

const CosmosContext = createContext<CosmosContextType | null>(null)

export function CosmosProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useKV<BlockchainState>('blockchain-state', {
    blockHeight: 1234567,
    validators: generateValidators(),
    transactions: [],
    consensus: {
      type: 'DPoS',
      blockTime: 2,
      finality: 1,
      throughput: 5000,
      activeValidators: 21
    },
    gasPrice: 0.001,
    totalSupply: '1000000000'
  })
  
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useKV<string | null>('wallet-address', null)
  const [privBalance, setPrivBalance] = useKV<string>('priv-balance', '1000.0')

  // Initialize state if it's incomplete
  const initializeState = () => {
    if (!state || !state.consensus) {
      setState({
        blockHeight: 1234567,
        validators: generateValidators(),
        transactions: [],
        consensus: {
          type: 'DPoS',
          blockTime: 2,
          finality: 1,
          throughput: 5000,
          activeValidators: 21
        },
        gasPrice: 0.001,
        totalSupply: '1000000000'
      })
    }
  }

  // Initialize on mount
  useEffect(() => {
    initializeState()
  }, [])

  // Simulate blockchain progression
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        blockHeight: prev.blockHeight + 1
      }))
    }, 2000) // 2-second block time

    return () => clearInterval(interval)
  }, [isConnected, setState])

  const connect = async () => {
    try {
      // Simulate wallet connection
      const mockAddress = generateCosmosAddress()
      setWalletAddress(mockAddress)
      setIsConnected(true)
      toast.success('Connected to PrivaChain network')
    } catch (error) {
      toast.error('Failed to connect to blockchain')
      throw error
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setWalletAddress(null)
    toast.info('Disconnected from blockchain')
  }

  const sendTransaction = async (tx: Partial<Transaction>): Promise<string> => {
    if (!isConnected || !walletAddress) {
      throw new Error('Wallet not connected')
    }

    const txHash = generateTxHash()
    const gasUsed = calculateGasUsed(tx.type || 'transfer')
    const fee = gasUsed * state.gasPrice

    if (parseFloat(privBalance) < fee) {
      throw new Error('Insufficient PRIV for gas fees')
    }

    const newTx: Transaction = {
      hash: txHash,
      type: tx.type || 'transfer',
      sender: walletAddress,
      recipient: tx.recipient,
      amount: tx.amount,
      gasUsed,
      gasPrice: state.gasPrice,
      timestamp: Date.now(),
      blockHeight: state.blockHeight + 1,
      data: tx.data
    }

    setState(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions.slice(0, 99)] // Keep last 100 transactions
    }))

    setPrivBalance(prev => (parseFloat(prev) - fee).toString())
    toast.success(`Transaction submitted: ${txHash.slice(0, 8)}...`)
    
    return txHash
  }

  const stakeTokens = async (amount: string, validatorAddress: string) => {
    await sendTransaction({
      type: 'delegate',
      recipient: validatorAddress,
      amount,
      data: { action: 'stake' }
    })
    toast.success(`Staked ${amount} PRIV to validator`)
  }

  const unstakeTokens = async (amount: string, validatorAddress: string) => {
    await sendTransaction({
      type: 'delegate',
      recipient: validatorAddress,
      amount,
      data: { action: 'unstake' }
    })
    toast.success(`Unstaked ${amount} PRIV from validator`)
  }

  const delegateVote = async (proposal: string, vote: 'yes' | 'no' | 'abstain') => {
    await sendTransaction({
      type: 'vote',
      data: { proposal, vote }
    })
    toast.success(`Vote cast: ${vote}`)
  }

  return (
    <CosmosContext.Provider value={{
      state,
      isConnected,
      walletAddress,
      privBalance,
      connect,
      disconnect,
      sendTransaction,
      stakeTokens,
      unstakeTokens,
      delegateVote
    }}>
      {children}
    </CosmosContext.Provider>
  )
}

export const useCosmos = () => {
  const context = useContext(CosmosContext)
  if (!context) {
    throw new Error('useCosmos must be used within CosmosProvider')
  }
  return context
}

// Helper functions
function generateValidators(): Validator[] {
  const validators: Validator[] = []
  const validatorNames = ['Cosmos Hub', 'Tendermint', 'Osmosis', 'Juno', 'Secret Network', 'Akash']
  
  for (let i = 0; i < 21; i++) {
    validators.push({
      address: generateCosmosAddress(),
      votingPower: Math.floor(Math.random() * 1000) + 100,
      stake: (Math.random() * 1000000 + 100000).toFixed(0),
      commission: Math.random() * 0.1,
      isActive: Math.random() > 0.1,
      lastSignedBlock: Math.floor(Math.random() * 1000)
    })
  }
  
  return validators.sort((a, b) => b.votingPower - a.votingPower)
}

function generateCosmosAddress(): string {
  const prefix = 'priv'
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let address = ''
  for (let i = 0; i < 39; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}1${address}`
}

function generateTxHash(): string {
  const chars = '0123456789abcdef'
  let hash = ''
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return hash
}

function calculateGasUsed(txType: TransactionType): number {
  const gasMap = {
    'transfer': 21000,
    'delegate': 50000,
    'vote': 30000,
    'mail': 75000,
    'domain': 100000,
    'video_signal': 60000
  }
  return gasMap[txType] || 21000
}