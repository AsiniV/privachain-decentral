import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import "dotenv/config";

let client: SigningCosmWasmClient | null = null;

export async function getSigningClient() {
  if (client) return client;
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    process.env.COSMOS_RELAYER_MNEMONIC!,
    { prefix: "cosmos" }
  );
  client = await SigningCosmWasmClient.connectWithSigner(
    process.env.COSMOS_RPC!,
    wallet,
    { gasPrice: GasPrice.fromString("0.025uatom") }
  );
  return client;
}

export async function relay(contract: string, msg: any, funds?: any[]) {
  const c = await getSigningClient();
  const [account] = await c.getAccounts();
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
  createWallet: async () => "",
  getAddress: () => null as string | null
};