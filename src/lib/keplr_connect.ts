// keplr_connect.ts - Keplr Wallet Integration for Browser
//
// Provides functions for connecting to Keplr wallet extension and managing
// Cosmos blockchain operations directly from the browser

// Keplr wallet interface extension
interface KeplrWindow extends Window {
  keplr?: {
    enable: (chainId: string) => Promise<void>
    getOfflineSigner: (chainId: string) => {
      getAccounts: () => Promise<Array<{ address: string; algo: string; pubkey: Uint8Array }>>
    }
    signAndBroadcast: (
      chainId: string,
      msgs: any[],
      fee: { amount: Array<{ denom: string; amount: string }>; gas: string }
    ) => Promise<{ transactionHash: string }>
    experimentalSuggestChain: (chainInfo: any) => Promise<void>
  }
}

declare const window: KeplrWindow

// Chain configuration - matches priva-config.toml
const CHAIN_CONFIG = {
  chainId: "provider-testnet",
  chainName: "Provider Testnet",
  rpc: "https://rpc.provider-testnet.cosmoshub.strange.love",
  rest: "https://api.provider-testnet.cosmoshub.strange.love",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "cosmos",
    bech32PrefixAccPub: "cosmospub",
    bech32PrefixValAddr: "cosmosvaloper",
    bech32PrefixValPub: "cosmosvaloperpub",
    bech32PrefixConsAddr: "cosmosvalcons",
    bech32PrefixConsPub: "cosmosvalconspub",
  },
  currencies: [
    {
      coinDenom: "ATOM",
      coinMinimalDenom: "uatom",
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "ATOM",
      coinMinimalDenom: "uatom",
      coinDecimals: 6,
      gasPriceStep: {
        low: 0.025,
        average: 0.025,
        high: 0.04,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: "ATOM",
    coinMinimalDenom: "uatom",
    coinDecimals: 6,
  },
}

/**
 * Check if Keplr extension is installed
 */
export function isKeplrInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.keplr
}

/**
 * Connect to Keplr wallet and return the user's address
 * @returns Promise<string> - The cosmos address (e.g., cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k)
 */
export async function connectKeplr(): Promise<string> {
  if (!isKeplrInstalled()) {
    throw new Error("Please install Keplr extension")
  }

  try {
    // Suggest chain to Keplr if it's not already added
    try {
      await window.keplr!.experimentalSuggestChain(CHAIN_CONFIG)
    } catch (error) {
      console.log("Chain already exists in Keplr or user rejected")
    }

    // Enable the chain
    await window.keplr!.enable(CHAIN_CONFIG.chainId)
    
    // Get the offline signer
    const offlineSigner = window.keplr!.getOfflineSigner(CHAIN_CONFIG.chainId)
    const accounts = await offlineSigner.getAccounts()
    
    if (accounts.length === 0) {
      throw new Error("No accounts found in Keplr wallet")
    }
    
    return accounts[0].address  // Returns cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k
  } catch (error) {
    console.error('Failed to connect to Keplr:', error)
    throw error
  }
}

/**
 * Get the current connected address from Keplr
 * @returns Promise<string | null> - The cosmos address or null if not connected
 */
export async function getCurrentKeplrAddress(): Promise<string | null> {
  if (!isKeplrInstalled()) {
    return null
  }

  try {
    const offlineSigner = window.keplr!.getOfflineSigner(CHAIN_CONFIG.chainId)
    const accounts = await offlineSigner.getAccounts()
    return accounts.length > 0 ? accounts[0].address : null
  } catch (error) {
    console.error('Failed to get current Keplr address:', error)
    return null
  }
}

/**
 * Sign and broadcast a transaction using Keplr
 * @param msgs - Array of Cosmos messages
 * @param memo - Optional memo for the transaction
 * @returns Promise<string> - Transaction hash
 */
export async function signAndBroadcastKeplr(msgs: any[], memo: string = ""): Promise<string> {
  if (!isKeplrInstalled()) {
    throw new Error("Keplr extension not found")
  }

  try {
    const result = await window.keplr!.signAndBroadcast(
      CHAIN_CONFIG.chainId,
      msgs,
      { 
        amount: [{ denom: "uatom", amount: "1000" }], 
        gas: "500000" 
      }
    )
    
    return result.transactionHash
  } catch (error) {
    console.error('Failed to sign and broadcast transaction:', error)
    throw error
  }
}