/**
 * Test script to validate Cosmos Hub configuration without network access
 */

import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { COSMOS_TESTNET_CONFIGS } from "../src/lib/cosmos-utils";

async function validateConfiguration(): Promise<void> {
  console.log("🧪 Validating Cosmos Hub testnet configuration...");
  
  // Test 1: Validate configuration structure
  const cosmosConfig = COSMOS_TESTNET_CONFIGS['cosmos-testnet'];
  console.log("✅ Configuration loaded:", {
    chainId: cosmosConfig.chainId,
    rpc: cosmosConfig.rpc,
    rest: cosmosConfig.rest,
    gasPrice: cosmosConfig.gasPrice,
    addressPrefix: cosmosConfig.addressPrefix
  });
  
  // Test 2: Validate chain ID
  if (cosmosConfig.chainId !== 'theta-testnet-001') {
    throw new Error(`Expected chain ID 'theta-testnet-001', got '${cosmosConfig.chainId}'`);
  }
  console.log("✅ Chain ID validation passed");
  
  // Test 3: Validate RPC endpoint
  if (cosmosConfig.rpc !== 'https://rpc.theta-testnet.polypore.xyz') {
    throw new Error(`Expected RPC 'https://rpc.theta-testnet.polypore.xyz', got '${cosmosConfig.rpc}'`);
  }
  console.log("✅ RPC endpoint validation passed");
  
  // Test 4: Validate REST endpoint
  if (cosmosConfig.rest !== 'https://rest.theta-testnet.polypore.xyz:1317') {
    throw new Error(`Expected REST 'https://rest.theta-testnet.polypore.xyz:1317', got '${cosmosConfig.rest}'`);
  }
  console.log("✅ REST endpoint validation passed");
  
  // Test 5: Validate address prefix
  if (cosmosConfig.addressPrefix !== 'cosmos') {
    throw new Error(`Expected address prefix 'cosmos', got '${cosmosConfig.addressPrefix}'`);
  }
  console.log("✅ Address prefix validation passed");
  
  // Test 6: Validate wallet creation
  const demoMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(demoMnemonic, { prefix: cosmosConfig.addressPrefix });
  const [account] = await wallet.getAccounts();
  
  if (!account.address.startsWith('cosmos1')) {
    throw new Error(`Expected address to start with 'cosmos1', got '${account.address}'`);
  }
  console.log("✅ Wallet creation validation passed");
  console.log(`   Demo address: ${account.address}`);
  
  // Test 7: Validate CosmJS imports
  console.log("✅ All CosmJS dependencies imported successfully");
  
  console.log("");
  console.log("🎉 All configuration validations passed!");
  console.log("✅ Ready to connect to Cosmos Hub testnet (theta-testnet-001)");
  console.log("");
  console.log("📋 Summary:");
  console.log(`   Chain ID: ${cosmosConfig.chainId}`);
  console.log(`   RPC: ${cosmosConfig.rpc}`);
  console.log(`   REST: ${cosmosConfig.rest}`);
  console.log(`   Gas Price: ${cosmosConfig.gasPrice}`);
  console.log(`   Address Prefix: ${cosmosConfig.addressPrefix}`);
  console.log("");
  console.log("📚 Next steps:");
  console.log("   1. Add your mnemonic to the example files");
  console.log("   2. Get test tokens from the faucet or test address");
  console.log("   3. Run: npm run example:cosmos-connection");
}

validateConfiguration().catch((error) => {
  console.error("❌ Configuration validation failed:", error);
  process.exit(1);
});