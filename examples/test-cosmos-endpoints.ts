/**
 * Test Cosmos connection with multiple endpoints
 */

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

// Demo mnemonic for testing (DO NOT use for real funds)
const demoMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

// Multiple testnet endpoints to try
const testnetEndpoints = [
  "https://rpc.theta-testnet.polypore.xyz",
  "https://rpc-cosmoshub-testnet.cosmos.directory",
  "https://cosmos-testnet-rpc.allthatnode.com:26657",
  "https://rpc.state-sync-01.theta-testnet.polypore.xyz"
];

async function testCosmosConnection(): Promise<void> {
  console.log("🧪 Testing Cosmos Hub testnet connection...");
  console.log("Using demo mnemonic (safe for testing)");
  
  // Create wallet from demo mnemonic
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(demoMnemonic, { prefix: "cosmos" });
  const [account] = await wallet.getAccounts();
  
  console.log("✅ Wallet created successfully");
  console.log("Address:", account.address);
  console.log("");

  // Try each endpoint until one works
  for (const endpoint of testnetEndpoints) {
    try {
      console.log(`🔍 Testing endpoint: ${endpoint}`);
      
      const client = await SigningCosmWasmClient.connectWithSigner(endpoint, wallet);
      const chainId = await client.getChainId();
      
      console.log("✅ Connected to chain:", chainId);
      
      const balance = await client.getBalance(account.address, "uatom");
      console.log("✅ Balance query successful:", balance);
      
      const height = await client.getHeight();
      console.log("✅ Current block height:", height);
      
      console.log("🎉 Cosmos Hub testnet connection working correctly!");
      console.log(`🔗 Working endpoint: ${endpoint}`);
      
      return; // Success, exit
      
    } catch (error) {
      console.log(`❌ Failed with ${endpoint}:`, (error as Error).message);
      console.log("");
    }
  }
  
  console.error("❌ All endpoints failed. Possible issues:");
  console.log("- Network connectivity problems");
  console.log("- All testnet endpoints are down");
  console.log("- DNS resolution issues");
  console.log("- Firewall blocking connections");
  
  throw new Error("No working Cosmos testnet endpoints found");
}

// Run test if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  testCosmosConnection().catch((error) => {
    console.error("Test execution failed:", error.message);
    process.exit(1);
  });
}

export { testCosmosConnection };