// keplr_connect.ts - Keplr Wallet Integration for Browser
//
// Provides functions for connecting to Keplr wallet extension and managing
// Cosmos blockchain operations directly from the browser

// Environment-based configuration
const CHAIN_ID = import.meta.env.VITE_COSMOS_CHAIN_ID || 'provider';
const RPC = import.meta.env.VITE_COSMOS_RPC || 'https://cosmoshub-testnet.rpc.kjnodes.com';
const LCD = import.meta.env.VITE_COSMOS_LCD || 'https://cosmoshub-testnet.api.kjnodes.com';
const IS_PROD = import.meta.env.PROD;
const DEV_RELAYER = import.meta.env.VITE_COSMOS_RELAYER_MNEMONIC;

// DEPRECATED: Direct mnemonic access is deprecated in favor of Keplr integration
// Use the new useKeplr hook and ConnectKeplr component instead
if (IS_PROD && DEV_RELAYER) {
  throw new Error('Prod build must not include dev relayer mnemonic');
}

if (DEV_RELAYER) {
  console.warn('[DEPRECATED] VITE_COSMOS_RELAYER_MNEMONIC is deprecated. Please use Keplr wallet integration instead.');
}

// Chain configuration - matches priva-config.toml
const CHAIN_CONFIG = {
  chainId: CHAIN_ID,
  chainName: "Provider Testnet",
  rpc: RPC,
  rest: LCD,
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
 * Enable Keplr for a specific chain
 * @returns Promise<void>
 * @throws Error if Keplr is not installed or failed to enable
 */
export async function keplrEnable(): Promise<void> {
  if (!window.keplr) {
    throw new Error('Keplr not installed');
  }
  try {
    await window.keplr.enable(CHAIN_ID);
  } catch (error) {
    throw new Error(`Failed to enable Keplr: ${(error as Error).message}`);
  }
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
 * @deprecated Use the useKeplr hook and sendWithSponsor instead
 */
export async function signAndBroadcastKeplr(msgs: unknown[], memo: string = ""): Promise<string> {
  if (!isKeplrInstalled()) {
    throw new Error("Keplr extension not found")
  }

  console.warn('[DEPRECATED] signAndBroadcastKeplr is deprecated. Use useKeplr hook and sendWithSponsor instead.');

  try {
    // This is a legacy function that should be replaced with proper CosmJS integration
    // For now, we'll throw an error directing users to the new approach
    throw new Error("Please use the useKeplr hook and sendWithSponsor function for transaction signing");
  } catch (error) {
    console.error('Failed to sign and broadcast transaction:', error)
    throw error
  }
}