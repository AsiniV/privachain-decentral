/**
 * TypeScript Example: Connect to Cosmos Hub testnet and get wallet balance
 * 
 * This example demonstrates how to connect to the Cosmos Hub testnet (theta-testnet-001)
 * without running your own node, using the provided public RPC endpoint.
 * 
 * To use this example:
 * 1. Replace "your mnemonic here" with your actual 24-word mnemonic phrase
 * 2. Run: tsx examples/cosmos-hub-connection.ts
 */

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Coin } from "@cosmjs/stargate";

const rpcEndpoint = "https://rpc.theta-testnet.polypore.xyz"; // Public RPC node
const restEndpoint = "https://rest.theta-testnet.polypore.xyz:1317"; // REST endpoint

// Insert your mnemonic here!
const mnemonic = "your mnemonic here";

// Test address with ATOM tokens on testnet
const testAddress = "cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k";

interface ChainInfo {
  chainId: string;
  height: number;
  rpcEndpoint: string;
  restEndpoint: string;
}

interface WalletInfo {
  address: string;
  balance: Coin;
  atomBalance: number;
}

async function getChainInfo(client: SigningCosmWasmClient): Promise<ChainInfo> {
  const chainId = await client.getChainId();
  const height = await client.getHeight();
  
  return {
    chainId,
    height,
    rpcEndpoint,
    restEndpoint
  };
}

async function getWalletInfo(client: SigningCosmWasmClient, address: string): Promise<WalletInfo> {
  const balance = await client.getBalance(address, "uatom");
  const atomBalance = parseFloat(balance.amount) / 1000000;
  
  return {
    address,
    balance,
    atomBalance
  };
}

async function main(): Promise<void> {
  try {
    console.log("🚀 Connecting to Cosmos Hub testnet (theta-testnet-001)...");
    console.log("RPC Endpoint:", rpcEndpoint);
    console.log("REST Endpoint:", restEndpoint);
    console.log("");

    // Create wallet from mnemonic
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "cosmos" });
    const [account] = await wallet.getAccounts();

    console.log("📋 Wallet Information:");
    console.log("Address:", account.address);
    console.log("");

    // Connect to the Cosmos Hub testnet
    const client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, wallet);
    
    // Get chain information
    const chainInfo = await getChainInfo(client);
    console.log("🔗 Chain Information:");
    console.log("Chain ID:", chainInfo.chainId);
    console.log("Block Height:", chainInfo.height);
    console.log("");

    // Get wallet balance
    const walletInfo = await getWalletInfo(client, account.address);
    console.log("💰 Wallet Balance:");
    console.log(`${walletInfo.address}:`, walletInfo.balance);
    console.log(`Balance: ${walletInfo.atomBalance} ATOM (${walletInfo.balance.amount} uatom)`);
    console.log("");

    // Query test address balance for reference
    console.log("🧪 Test Address Balance:");
    try {
      const testWalletInfo = await getWalletInfo(client, testAddress);
      console.log(`${testWalletInfo.address}:`, testWalletInfo.balance);
      console.log(`Balance: ${testWalletInfo.atomBalance} ATOM (${testWalletInfo.balance.amount} uatom)`);
    } catch (error) {
      console.log("Could not query test address:", (error as Error).message);
    }
    console.log("");

    // If wallet has no balance, show faucet information
    if (walletInfo.atomBalance === 0) {
      console.log("💧 Need test tokens?");
      console.log("Your address has no ATOM tokens. You can:");
      console.log("1. Use the Cosmos Hub testnet faucet (if available)");
      console.log("2. Ask in the Cosmos Discord for testnet tokens");
      console.log("3. Use the test address provided: cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k");
      console.log("");
    }

    console.log("✅ Successfully connected to Cosmos Hub testnet!");
    console.log("");
    console.log("🛠️  You can now:");
    console.log("- Send transactions to the network");
    console.log("- Deploy and interact with CosmWasm smart contracts");
    console.log("- Build dApps using this connection");

    // Demonstrate additional functionality
    console.log("");
    console.log("🔍 Additional Network Information:");
    
    // Get all balances
    try {
      const allBalances = await client.getAllBalances(account.address);
      console.log("All token balances:", allBalances);
    } catch (error) {
      console.log("Could not get all balances:", (error as Error).message);
    }

  } catch (error) {
    console.error("❌ Error connecting to Cosmos Hub testnet:", (error as Error).message);
    console.log("");
    console.log("💡 Troubleshooting:");
    console.log("- Make sure your mnemonic is correct (24 words)");
    console.log("- Check your internet connection");
    console.log("- Verify the RPC endpoint is accessible");
    console.log("- Ensure you have the required dependencies installed");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { main, getChainInfo, getWalletInfo };
export type { ChainInfo, WalletInfo };