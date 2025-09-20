import { useState, useEffect } from 'react'
import { cosmosClient, CosmosAccount, COSMOS_CONFIG } from '@/lib/cosmos'
import { toast } from 'sonner'
import * as sodium from 'libsodium-wrappers'

export interface CosmosState {
  isConnected: boolean
  isConnecting: boolean
  account: CosmosAccount | null
  error: string | null
  mnemonic: string | null
}

/**
 * Encrypted storage utilities for secure mnemonic handling
 */
class SecureMnemonicStorage {
  private static readonly DB_NAME = 'PrivachainSecureDB'
  private static readonly DB_VERSION = 1
  private static readonly STORE_NAME = 'encryptedWallets'
  
  static async init(): Promise<void> {
    await sodium.ready
  }
  
  static async encryptMnemonic(mnemonic: string, passphrase: string): Promise<string> {
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      passphrase,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT
    )
    
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
    const encrypted = sodium.crypto_secretbox_easy(mnemonic, nonce, key)
    
    // Combine salt + nonce + encrypted data
    const combined = new Uint8Array(salt.length + nonce.length + encrypted.length)
    combined.set(salt, 0)
    combined.set(nonce, salt.length)
    combined.set(encrypted, salt.length + nonce.length)
    
    return sodium.to_base64(combined)
  }
  
  static async decryptMnemonic(encryptedData: string, passphrase: string): Promise<string> {
    const combined = sodium.from_base64(encryptedData)
    
    const salt = combined.slice(0, sodium.crypto_pwhash_SALTBYTES)
    const nonce = combined.slice(sodium.crypto_pwhash_SALTBYTES, sodium.crypto_pwhash_SALTBYTES + sodium.crypto_secretbox_NONCEBYTES)
    const encrypted = combined.slice(sodium.crypto_pwhash_SALTBYTES + sodium.crypto_secretbox_NONCEBYTES)
    
    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      passphrase,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT
    )
    
    const decrypted = sodium.crypto_secretbox_open_easy(encrypted, nonce, key)
    return sodium.to_string(decrypted)
  }
  
  static async storeEncryptedMnemonic(encryptedMnemonic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => reject(new Error('Failed to open database'))
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME)
        }
      }
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction([this.STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)
        
        const putRequest = store.put(encryptedMnemonic, 'wallet')
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(new Error('Failed to store encrypted mnemonic'))
      }
    })
  }
  
  static async getEncryptedMnemonic(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => reject(new Error('Failed to open database'))
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          resolve(null)
          return
        }
        
        const transaction = db.transaction([this.STORE_NAME], 'readonly')
        const store = transaction.objectStore(this.STORE_NAME)
        
        const getRequest = store.get('wallet')
        getRequest.onsuccess = () => resolve(getRequest.result || null)
        getRequest.onerror = () => reject(new Error('Failed to retrieve encrypted mnemonic'))
      }
    })
  }
  
  static async clearStoredMnemonic(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => reject(new Error('Failed to open database'))
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          resolve()
          return
        }
        
        const transaction = db.transaction([this.STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)
        
        const deleteRequest = store.delete('wallet')
        deleteRequest.onsuccess = () => resolve()
        deleteRequest.onerror = () => reject(new Error('Failed to clear stored mnemonic'))
      }
    })
  }
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

  // Initialize secure storage and check for stored wallets
  useEffect(() => {
    const initialize = async () => {
      await SecureMnemonicStorage.init()
      
      // Check if there's a stored wallet and notify user
      try {
        const hasWallet = await hasStoredWallet()
        if (hasWallet) {
          toast.info('Encrypted wallet found. Enter your passphrase to recover it.')
        }
      } catch (error) {
        console.error('Error checking for stored wallet:', error)
      }
    }
    
    initialize().catch(console.error)
  }, [])

  // Persist wallet mnemonic securely
  const [storedMnemonic, setStoredMnemonic] = useState<string | null>(null)
  const [userPassphrase, setUserPassphrase] = useState<string | null>(null)

  useEffect(() => {
    const initializeConnection = async () => {
      setState(prev => ({ ...prev, isConnecting: true, error: null }))
      
      try {
        // Clear any existing state
        setState(prev => ({ 
          ...prev, 
          client: null, 
          signingClient: null, 
          address: null,
          isConnected: false 
        }))
        
        const config = getCurrentConfig()
        
        // Connect to read-only client
        const client = await StargateClient.connect(config.rpcEndpoint)
        setState(prev => ({ ...prev, client }))
        
        // Check for existing encrypted wallet
        const encryptedMnemonic = await SecureMnemonicStorage.getEncryptedMnemonic()
        if (encryptedMnemonic && userPassphrase) {
          try {
            const decryptedMnemonic = await SecureMnemonicStorage.decryptMnemonic(encryptedMnemonic, userPassphrase)
            const wallet = await DirectSecp256k1HdWallet.fromMnemonic(decryptedMnemonic, {
              prefix: config.addressPrefix
            })
            
            const [firstAccount] = await wallet.getAccounts()
            const address = firstAccount.address
            
            const signingClient = await SigningStargateClient.connectWithSigner(
              config.rpcEndpoint,
              wallet,
              { gasPrice: GasPrice.fromString(`0.025${config.feeToken}`) }
            )
            
            setState(prev => ({
              ...prev,
              wallet,
              signingClient,
              address,
              isConnected: true,
              mnemonic: decryptedMnemonic
            }))
          } catch (decryptError) {
            console.error('Failed to decrypt stored mnemonic:', decryptError)
            // Clear invalid encrypted data
            await SecureMnemonicStorage.clearStoredMnemonic()
          }
        }
        
      } catch (error) {
        console.error('Failed to initialize Cosmos connection:', error)
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Connection failed' 
        }))
      } finally {
        setState(prev => ({ ...prev, isConnecting: false }))
      }
    }
    
    initializeConnection()
  }, [userPassphrase])

  const setPassphrase = (passphrase: string) => {
    setUserPassphrase(passphrase)
  }

  const recoverStoredWallet = async (passphrase: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const encryptedMnemonic = await SecureMnemonicStorage.getEncryptedMnemonic()
      if (!encryptedMnemonic) {
        throw new Error('No stored wallet found')
      }

      const mnemonic = await SecureMnemonicStorage.decryptMnemonic(encryptedMnemonic, passphrase)
      return await importWallet(mnemonic, passphrase)

    } catch (error) {
      console.error('Failed to recover stored wallet:', error)
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Failed to recover wallet' 
      }))
      toast.error('Failed to recover stored wallet - check your passphrase')
      return false
    }
  }

  const hasStoredWallet = async (): Promise<boolean> => {
    try {
      const encryptedMnemonic = await SecureMnemonicStorage.getEncryptedMnemonic()
      return !!encryptedMnemonic
    } catch {
      return false
    }
  }

  const createWallet = async (passphrase?: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      // Prompt for passphrase if not provided
      const actualPassphrase = passphrase || userPassphrase || await promptPassphrase('Enter a passphrase to encrypt your wallet:')
      if (!actualPassphrase) {
        throw new Error('Passphrase is required for secure wallet storage')
      }

      await cosmosClient.createWallet()
      const signingClient = await cosmosClient.connectWallet()
      
      if (!signingClient) {
        throw new Error('Failed to connect signing client')
      }

      const mnemonic = cosmosClient.getMnemonic()
      if (mnemonic) {
        // Encrypt and store mnemonic securely
        const encryptedMnemonic = await SecureMnemonicStorage.encryptMnemonic(mnemonic, actualPassphrase)
        await SecureMnemonicStorage.storeEncryptedMnemonic(encryptedMnemonic)
        setUserPassphrase(actualPassphrase)
        setState(prev => ({ ...prev, mnemonic }))
      }

      const account = await cosmosClient.getAccount()
      
      setState(prev => ({ 
        ...prev, 
        account, 
        isConnecting: false 
      }))

      toast.success('Cosmos wallet created and encrypted successfully!')
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

  const importWallet = async (mnemonic: string, passphrase?: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      // Prompt for passphrase if not provided
      const actualPassphrase = passphrase || await promptPassphrase('Enter a passphrase to encrypt your imported wallet:')
      if (!actualPassphrase) {
        throw new Error('Passphrase is required for secure wallet storage')
      }

      await cosmosClient.createWallet(mnemonic)
      const signingClient = await cosmosClient.connectWallet()
      
      if (!signingClient) {
        throw new Error('Failed to connect signing client')
      }

      // Encrypt and store mnemonic securely
      const encryptedMnemonic = await SecureMnemonicStorage.encryptMnemonic(mnemonic, actualPassphrase)
      await SecureMnemonicStorage.storeEncryptedMnemonic(encryptedMnemonic)
      setUserPassphrase(actualPassphrase)

      const account = await cosmosClient.getAccount()
      
      setState(prev => ({ 
        ...prev, 
        account,
        mnemonic,
        isConnecting: false 
      }))

      toast.success('Wallet imported and encrypted successfully!')
      return true

    } catch (error) {
      console.error('Failed to import wallet:', error)
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Failed to import wallet' 
      }))
      toast.error('Failed to import wallet')
      return false
    }
  }

  // Helper function to prompt for passphrase (can be replaced with a proper UI component)
  const promptPassphrase = async (message: string): Promise<string | null> => {
    // In a real app, this should be replaced with a proper modal/dialog
    return prompt(message)
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

  const queryDomain = async (domainName: string): Promise<unknown> => {
    try {
      return await cosmosClient.queryDomain(domainName)
    } catch (error) {
      console.error('Failed to query domain:', error)
      return null
    }
  }

  const disconnect = async (): Promise<void> => {
    await cosmosClient.disconnect()
    // Clear encrypted storage on disconnect
    await SecureMnemonicStorage.clearStoredMnemonic()
    setUserPassphrase(null)
    setState({
      isConnected: false,
      isConnecting: false,
      account: null,
      error: null,
      mnemonic: null
    })
    toast.info('Disconnected from Cosmos and cleared encrypted storage')
  }

  const getFaucetInfo = () => {
    return cosmosClient.getFaucetInfo()
  }

  return {
    ...state,
    createWallet,
    importWallet,
    recoverStoredWallet,
    hasStoredWallet,
    setPassphrase,
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