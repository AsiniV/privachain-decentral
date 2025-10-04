import { ReactNode } from 'react'
import { CosmosProvider } from './CosmosBlockchain'
import { CosmosTestnetProvider } from './CosmosTestnet'
import { PrivTokenProvider } from './PrivToken'

interface BlockchainProviderProps {
  children: ReactNode
}

export function BlockchainProvider({ children }: BlockchainProviderProps) {
  return (
    <CosmosProvider>
      <CosmosTestnetProvider>
        <PrivTokenProvider>
          {children}
        </PrivTokenProvider>
      </CosmosTestnetProvider>
    </CosmosProvider>
  )
}

// Re-export all blockchain hooks and utilities
export { useCosmos } from './CosmosBlockchain'
export { useCosmosTestnet } from './CosmosTestnet'
export { usePrivToken } from './PrivToken'
export { useSmartContracts, useZKRollup } from './SmartContracts'
export type { 
  BlockchainState, 
  Validator, 
  Transaction, 
  ConsensusState 
} from './CosmosBlockchain'
export type { 
  Email, 
  VideoSession, 
  Domain, 
  MailContract,
  DomainContract,
  VideoSignalingContract,
  RewardsContract,
  ConsensusContract,
  ZKRollup
} from './SmartContracts'
export type { 
  TokenState, 
  TokenHolder, 
  StakingPool, 
  GasFeeEstimate 
} from './PrivToken'
export { calculateGasFees } from './PrivToken'