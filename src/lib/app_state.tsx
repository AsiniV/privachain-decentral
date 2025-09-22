// app_state.ts - Application State Management for Wallet
//
// Manages global application state including connected wallet address
// Uses React Context for state management across components

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { kvStorage } from './kvStorage'

interface AppState {
  cosmosAddress: string | null
  isKeplrConnected: boolean
  setAddress: (address: string | null) => void
  setKeplrConnected: (connected: boolean) => void
  clearWallet: () => void
}

const AppStateContext = createContext<AppState | null>(null)

export function useAppState(): AppState {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }
  return context
}

interface AppStateProviderProps {
  children: ReactNode
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [cosmosAddress, setCosmosAddress] = useState<string | null>(null)
  const [isKeplrConnected, setIsKeplrConnected] = useState<boolean>(false)

  // Load saved address from storage on mount
  useEffect(() => {
    const loadSavedAddress = async () => {
      try {
        const savedAddress = await kvStorage.get('cosmos_address')
        const savedConnectionState = await kvStorage.get('keplr_connected')
        
        if (savedAddress) {
          setCosmosAddress(savedAddress)
        }
        if (savedConnectionState) {
          setIsKeplrConnected(savedConnectionState === 'true')
        }
      } catch (error) {
        console.error('Failed to load saved wallet state:', error)
      }
    }

    loadSavedAddress()
  }, [])

  const setAddress = async (address: string | null) => {
    setCosmosAddress(address)
    
    // Persist to storage
    try {
      if (address) {
        await kvStorage.set('cosmos_address', address)
      } else {
        await kvStorage.remove('cosmos_address')
      }
    } catch (error) {
      console.error('Failed to save address to storage:', error)
    }
  }

  const setKeplrConnected = async (connected: boolean) => {
    setIsKeplrConnected(connected)
    
    // Persist to storage
    try {
      await kvStorage.set('keplr_connected', connected.toString())
    } catch (error) {
      console.error('Failed to save connection state to storage:', error)
    }
  }

  const clearWallet = async () => {
    setCosmosAddress(null)
    setIsKeplrConnected(false)
    
    // Clear from storage
    try {
      await kvStorage.remove('cosmos_address')
      await kvStorage.remove('keplr_connected')
    } catch (error) {
      console.error('Failed to clear wallet data from storage:', error)
    }
  }

  const value: AppState = {
    cosmosAddress,
    isKeplrConnected,
    setAddress,
    setKeplrConnected,
    clearWallet,
  }

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}