import { useState, useEffect } from 'react'
import { useState, useEffect } from 'react'
import { cosmosClient, CosmosAccount, COSMOS_CONFIG } from '@/lib/cosmos'
import { toast } from 'sonner'

export interface CosmosState {
  isConnected: boolean
  isConnecting: boolean
  account: CosmosAccount | null
  error: string | null
  mnemonic: string | null
}

/**
 * Hook for managing Cosmos blockchain connection and account state
 */
export function useCosmos() {
  const [state, setState] = useState<CosmosState>({
    isConnected: false,
    isConnecting: false,
    account: null,
    error: null,
    mnemonic: null
  })

  // Persist wallet mnemonic securely
  const [storedMnemonic, setStoredMnemonic] = useState<string | null>(null)

  useEffect(() => {
    initializeConnection()
  }, [])

  const initializeConnection = async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      // Connect to Cosmos RPC
      const connected = await cosmosClient.connect()
      if (!connected) {
        throw new Error('Failed to connect to Cosmos testnet')
      }

      // Try to restore wallet if mnemonic exists
      if (storedMnemonic) {
        await restoreWallet(storedMnemonic)
      }

      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false 
      }))

    } catch (error) {
      console.error('Cosmos initialization failed:', error)
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      }))
    }
  }

  const createWallet = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const address = await cosmosClient.createWallet()
      const signingClient = await cosmosClient.connectWallet()
      
      if (!signingClient) {
        throw new Error('Failed to connect signing client')
      }

      const mnemonic = cosmosClient.getMnemonic()
      if (mnemonic) {
        setStoredMnemonic(mnemonic)
        setState(prev => ({ ...prev, mnemonic }))
      }

      const account = await cosmosClient.getAccount()
      
      setState(prev => ({ 
        ...prev, 
        account, 
        isConnecting: false 
      }))

      toast.success('Cosmos wallet created successfully!')
      return true

    } catch (error) {
      console.error('Failed to create wallet:', error)
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Failed to create wallet' 
      }))
      toast.error('Failed to create Cosmos wallet')
      return false
    }
  }

  const restoreWallet = async (mnemonic: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const address = await cosmosClient.createWallet(mnemonic)
      const signingClient = await cosmosClient.connectWallet()
      
      if (!signingClient) {
        throw new Error('Failed to connect signing client')
      }

      const account = await cosmosClient.getAccount()
      
      setState(prev => ({ 
        ...prev, 
        account, 
        mnemonic,
        isConnecting: false 
      }))

      return true

    } catch (error) {
      console.error('Failed to restore wallet:', error)
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Failed to restore wallet' 
      }))
      return false
    }
  }

  const importWallet = async (mnemonic: string): Promise<boolean> => {
    const success = await restoreWallet(mnemonic)
    if (success) {
      setStoredMnemonic(mnemonic)
      toast.success('Wallet imported successfully!')
    } else {
      toast.error('Failed to import wallet')
    }
    return success
  }

  const refreshAccount = async (): Promise<void> => {
    try {
      const account = await cosmosClient.getAccount()
      setState(prev => ({ ...prev, account }))
    } catch (error) {
      console.error('Failed to refresh account:', error)
    }
  }

  const registerZKIdentity = async (publicHash: string, zkProof: string, ephemeralKey: string): Promise<string | null> => {
    if (!state.account) {
      toast.error('No Cosmos account connected')
      return null
    }

    try {
      const txHash = await cosmosClient.registerZKIdentity(publicHash, zkProof, ephemeralKey)
      if (txHash) {
        toast.success('ZK Identity registered on blockchain!')
        await refreshAccount() // Refresh balance after transaction
      }
      return txHash
    } catch (error) {
      console.error('Failed to register ZK identity:', error)
      toast.error('Failed to register ZK identity on blockchain')
      return null
    }
  }

  const registerDomain = async (domainName: string, zkProofHash: string, publicKey: string): Promise<string | null> => {
    if (!state.account) {
      toast.error('No Cosmos account connected')
      return null
    }

    try {
      const txHash = await cosmosClient.registerDomain(domainName, zkProofHash, publicKey)
      if (txHash) {
        toast.success(`Domain ${domainName}.prv registered on blockchain!`)
        await refreshAccount() // Refresh balance after transaction
      }
      return txHash
    } catch (error) {
      console.error('Failed to register domain:', error)
      toast.error('Failed to register domain on blockchain')
      return null
    }
  }

  const startVideoSession = async (receiver: string, stunTurnServer: string): Promise<string | null> => {
    if (!state.account) {
      toast.error('No Cosmos account connected')
      return null
    }

    try {
      const txHash = await cosmosClient.startVideoSession(receiver, stunTurnServer)
      if (txHash) {
        toast.success('VideoCamera session started on blockchain!')
        await refreshAccount() // Refresh balance after transaction
      }
      return txHash
    } catch (error) {
      console.error('Failed to start video session:', error)
      toast.error('Failed to start video session on blockchain')
      return null
    }
  }

  const queryDomain = async (domainName: string): Promise<any> => {
    try {
      return await cosmosClient.queryDomain(domainName)
    } catch (error) {
      console.error('Failed to query domain:', error)
      return null
    }
  }

  const disconnect = async (): Promise<void> => {
    await cosmosClient.disconnect()
    setStoredMnemonic(null)
    setState({
      isConnected: false,
      isConnecting: false,
      account: null,
      error: null,
      mnemonic: null
    })
    toast.info('Disconnected from Cosmos')
  }

  const getFaucetInfo = () => {
    return cosmosClient.getFaucetInfo()
  }

  return {
    ...state,
    createWallet,
    importWallet,
    refreshAccount,
    registerZKIdentity,
    registerDomain,
    startVideoSession,
    queryDomain,
    disconnect,
    getFaucetInfo,
    config: COSMOS_CONFIG
  }
}