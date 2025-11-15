import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useKV } from '../hooks/useKV'
import { toast } from 'sonner'

// Cosmos Testnet Configuration
interface TestnetConfig {
  chainId: string
  chainName: string
  rpc: string
  rest: string
  stakeCurrency: {
    coinDenom: string
    coinMinimalDenom: string
    coinDecimals: number
  }
  bip44: {
    coinType: number
  }
  bech32Config: {
    bech32PrefixAccAddr: string
    bech32PrefixAccPub: string
    bech32PrefixValAddr: string
    bech32PrefixValPub: string
    bech32PrefixConsAddr: string
    bech32PrefixConsPub: string
  }
  currencies: Array<{
    coinDenom: string
    coinMinimalDenom: string
    coinDecimals: number
  }>
  feeCurrencies: Array<{
    coinDenom: string
    coinMinimalDenom: string
    coinDecimals: number
    gasPriceStep: {
      low: number
      average: number
      high: number
    }
  }>
}

interface TestnetContextType {
  config: TestnetConfig
  isTestnetConnected: boolean
  testnetEndpoint: string
  connectToTestnet: () => Promise<void>
  disconnectFromTestnet: () => void
  switchTestnet: (endpoint: string) => Promise<void>
  validateTestnetConnection: () => Promise<boolean>
  getTestnetStatus: () => Promise<TestnetStatus>
}

interface TestnetStatus {
  chainId: string
  latestBlockHeight: number
  latestBlockTime: string
  catchingUp: boolean
  validatorCount: number
  bondedTokens: string
  totalSupply: string
}

// Test wallet configuration
export const TEST_WALLET_ADDRESS = 'cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k'
export const TEST_WALLET_CONFIG = {
  address: TEST_WALLET_ADDRESS,
  provider: 'Cosmoshub',
  network: 'testnet',
  purpose: 'Platform testing and gas fee sponsorship'
}

const PRIVACHAIN_TESTNET_CONFIG: TestnetConfig = {
  chainId: 'privachain-testnet-1',
  chainName: 'PrivaChain Testnet',
  rpc: 'https://rpc-testnet.privachain.network',
  rest: 'https://api-testnet.privachain.network',
  stakeCurrency: {
    coinDenom: 'ATOM',
    coinMinimalDenom: 'uatom',
    coinDecimals: 6
  },
  bip44: {
    coinType: 118
  },
  bech32Config: {
    bech32PrefixAccAddr: 'cosmos',
    bech32PrefixAccPub: 'cosmospub',
    bech32PrefixValAddr: 'cosmosvaloper',
    bech32PrefixValPub: 'cosmosvaloperpub',
    bech32PrefixConsAddr: 'cosmosvalcons',
    bech32PrefixConsPub: 'cosmosvalconspub'
  },
  currencies: [
    {
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6
    }
  ],
  feeCurrencies: [
    {
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
      gasPriceStep: {
        low: 0.001,
        average: 0.0025,
        high: 0.004
      }
    }
  ]
}

const TestnetContext = createContext<TestnetContextType | null>(null)

export function CosmosTestnetProvider({ children }: { children: ReactNode }) {
  const [config] = useState<TestnetConfig>(PRIVACHAIN_TESTNET_CONFIG)
  const [isTestnetConnected, setIsTestnetConnected] = useKV<boolean>('testnet-connected', false)
  const [testnetEndpoint, setTestnetEndpoint] = useKV<string>('testnet-endpoint', PRIVACHAIN_TESTNET_CONFIG.rpc)

  const connectToTestnet = async () => {
    try {
      toast.info('Connecting to Cosmos Hub Testnet...')
      
      // Simulate connection to testnet with test wallet
      const isValid = await validateTestnetConnection()
      
      if (isValid) {
        setIsTestnetConnected(true)
        toast.success(`Connected to ${config.chainName} with test wallet: ${TEST_WALLET_ADDRESS.slice(0, 12)}...`)
        
        // Add testnet to Keplr wallet if available
        if (typeof window !== 'undefined' && window.keplr) {
          await suggestChainToKeplr()
        }
      } else {
        throw new Error('Testnet validation failed')
      }
    } catch (error) {
      console.error('Testnet connection error:', error)
      toast.error('Failed to connect to testnet')
      throw error
    }
  }

  const disconnectFromTestnet = () => {
    setIsTestnetConnected(false)
    toast.info('Disconnected from testnet')
  }

  const switchTestnet = async (endpoint: string) => {
    try {
      setTestnetEndpoint(endpoint)
      
      if (isTestnetConnected) {
        await connectToTestnet()
      }
      
      toast.success('Switched testnet endpoint')
    } catch (error) {
      toast.error('Failed to switch testnet')
      throw error
    }
  }

  const validateTestnetConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Real testnet validation
      const response = await fetch(`${testnetEndpoint}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Testnet validation failed:', response.status)
        return false
      }

      const status = await response.json()
      
      // Validate response has required fields
      if (status.result && status.result.node_info && status.result.sync_info) {
        console.log('✅ Testnet validation successful:', {
          chainId: status.result.node_info.network,
          latestHeight: status.result.sync_info.latest_block_height,
          catchingUp: status.result.sync_info.catching_up
        })
        return true
      }

      console.error('Invalid testnet response format')
      return false
    } catch (error) {
      console.error('Testnet validation error:', error)
      return false
    }
  }, [testnetEndpoint])

  const getTestnetStatus = async (): Promise<TestnetStatus> => {
    try {
      // Real testnet status fetch
      const response = await fetch(`${testnetEndpoint}/status`)
      if (!response.ok) {
        throw new Error(`Failed to fetch testnet status: ${response.status}`)
      }
      
      const statusData = await response.json()
      const nodeInfo = statusData.result.node_info
      const syncInfo = statusData.result.sync_info
      
      // Fetch additional network info
      const validatorsResponse = await fetch(`${testnetEndpoint.replace('rpc', 'api')}/cosmos/staking/v1beta1/validators`)
      const validatorsData = validatorsResponse.ok ? await validatorsResponse.json() : { validators: [] }
      
      return {
        chainId: nodeInfo.network,
        latestBlockHeight: parseInt(syncInfo.latest_block_height),
        latestBlockTime: syncInfo.latest_block_time,
        catchingUp: syncInfo.catching_up,
        validatorCount: validatorsData.validators?.length || 0,
        bondedTokens: '0', // Would need additional API call to get accurate data
        totalSupply: '0' // Would need additional API call to get accurate data
      }
    } catch (error) {
      console.error('Failed to get testnet status:', error)
      throw error
    }
  }

  const suggestChainToKeplr = async () => {
    try {
      if (typeof window !== 'undefined' && window.keplr) {
        await window.keplr.experimentalSuggestChain({
          chainId: config.chainId,
          chainName: config.chainName,
          rpc: config.rpc,
          rest: config.rest,
          bip44: config.bip44,
          bech32Config: config.bech32Config,
          currencies: config.currencies,
          feeCurrencies: config.feeCurrencies,
          stakeCurrency: config.stakeCurrency,
        })
        
        toast.success('Cosmos Hub Testnet added to Keplr wallet')
      }
    } catch (error) {
      console.error('Failed to suggest chain to Keplr:', error)
      toast.error('Failed to add testnet to Keplr')
    }
  }

  // Auto-connect on mount if previously connected
  useEffect(() => {
    if (isTestnetConnected) {
      validateTestnetConnection().then(isValid => {
        if (!isValid) {
          setIsTestnetConnected(false)
          toast.warning('Lost connection to testnet')
        }
      })
    }
  }, [isTestnetConnected, setIsTestnetConnected, validateTestnetConnection])

  return (
    <TestnetContext.Provider value={{
      config,
      isTestnetConnected,
      testnetEndpoint,
      connectToTestnet,
      disconnectFromTestnet,
      switchTestnet,
      validateTestnetConnection,
      getTestnetStatus
    }}>
      {children}
    </TestnetContext.Provider>
  )
}

export const useCosmosTestnet = () => {
  const context = useContext(TestnetContext)
  if (!context) {
    throw new Error('useCosmosTestnet must be used within CosmosTestnetProvider')
  }
  return context
}

// Testnet utilities
export const TESTNET_ENDPOINTS = {
  COSMOS_HUB: 'https://rpc-cosmoshub.keplr.app',
  COSMOS_HUB_LCD: 'https://lcd-cosmoshub.keplr.app',
  COSMOS_TESTNET: 'https://rpc.testnet.cosmos.network',
  LOCAL: 'http://localhost:26657'
}

export const TESTNET_EXPLORERS = {
  MINTSCAN: 'https://www.mintscan.io/cosmos',
  BIGDIPPER: 'https://cosmos.bigdipper.live'
}

export const FAUCET_ENDPOINTS = {
  COSMOS_TESTNET: 'https://faucet.testnet.cosmos.network'
}