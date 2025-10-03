import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";

let client: SigningCosmWasmClient | null = null;
let wallet: DirectSecp256k1HdWallet | null = null;

export async function getSigningClient() {
  if (client) return client;
  
  // Use import.meta.env for Vite environment variables
  const mnemonic = import.meta.env.VITE_COSMOS_RELAYER_MNEMONIC || import.meta.env.COSMOS_RELAYER_MNEMONIC;
  const rpc = import.meta.env.VITE_COSMOS_RPC || import.meta.env.COSMOS_RPC || 'https://rpc.theta-testnet.polypore.xyz:443';
  
  if (!mnemonic) {
    console.warn('No COSMOS_RELAYER_MNEMONIC found, using mock client');
    return null;
  }
  
  wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    mnemonic,
    { prefix: "cosmos" }
  );
  client = await SigningCosmWasmClient.connectWithSigner(
    rpc,
    wallet,
    { gasPrice: GasPrice.fromString("0.025uatom") }
  );
  return client;
}

export async function relay(contract: string, msg: any, funds?: any[]) {
  const c = await getSigningClient();
  if (!c || !wallet) {
    console.warn('No signing client available for relay');
    return null;
  }
  const [account] = await wallet.getAccounts();
  return c.execute(account.address, contract, msg, "auto", "", funds);
}

// Export legacy interfaces and config for backward compatibility
export interface CosmosAccount {
  address: string;
  balance: string;
  sequence: number;
  accountNumber: number;
}

export const COSMOS_CONFIG = {
  rpcEndpoint: 'https://rpc.theta-testnet.polypore.xyz',
  chainId: 'theta-testnet-001',
  prefix: 'cosmos',
  gasPrice: GasPrice.fromString('0.025uatom'),
  denom: 'uatom',
  faucetUrl: 'https://faucet.cosmos.network',
  testTokenAddress: 'cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k'
};

// Create a stub legacy client for backward compatibility
export const cosmosClient = {
  connect: async () => true,
  getAccount: async () => null as CosmosAccount | null,
  disconnect: async () => {},
  createWallet: async (mnemonic?: string) => "",
  getAddress: () => null as string | null,
  connectWallet: async () => null as any,
  getMnemonic: () => null as string | null,
  registerZKIdentity: async (publicHash: string, zkProof: string, ephemeralKey: string) => null as string | null,
  registerDomain: async (domainName: string, zkProofHash: string, publicKey: string) => null as string | null,
  startVideoSession: async (receiver: string, stunTurnServer: string) => null as string | null,
  queryDomain: async (domainName: string) => null as any,
  getFaucetInfo: () => ({ url: COSMOS_CONFIG.faucetUrl, address: null as string | null })
};