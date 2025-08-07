/**
 * Test the Cosmos Hub connection example with a demo mnemonic
 */

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

const rpcEndpoint = "https://rpc.theta-testnet.polypore.xyz";

// Demo mnemonic for testing (DO NOT use for real funds)
const demoMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

async function testConnection(): Promise<void> {
  try {
    console.log("🧪 Testing Cosmos Hub testnet connection...");
    
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(demoMnemonic, { prefix: "cosmos" });
    const [account] = await wallet.getAccounts();
    
    console.log("✅ Wallet created successfully");
    console.log("Address:", account.address);
    
    const client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, wallet);
    const chainId = await client.getChainId();
    
    console.log("✅ Connected to chain:", chainId);
    
    const balance = await client.getBalance(account.address, "uatom");
    console.log("✅ Balance query successful:", balance);
    
    console.log("🎉 All tests passed! Cosmos Hub testnet integration working correctly.");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Run test if this is the main module
testConnection().catch((error) => {
  console.error("Test execution failed:", error);
  process.exit(1);
});

export { testConnection };