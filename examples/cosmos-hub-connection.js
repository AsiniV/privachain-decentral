/**
 * Example: Connect to Cosmos Hub testnet and get wallet balance
 * 
 * This example demonstrates how to connect to the Cosmos Hub testnet (theta-testnet-001)
 * without running your own node, using the provided public RPC endpoint.
 * 
 * To use this example:
 * 1. Replace "your mnemonic here" with your actual 24-word mnemonic phrase
 * 2. Run: node examples/cosmos-hub-connection.js
 */

const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");

const rpcEndpoint = "https://rpc.theta-testnet.polypore.xyz"; // Public RPC node
const restEndpoint = "https://rest.theta-testnet.polypore.xyz:1317"; // REST endpoint

// Insert your mnemonic here!
const mnemonic = "your mnemonic here";

// Test address with ATOM tokens on testnet
const testAddress = "cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k";

async function main() {
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
    const chainId = await client.getChainId();
    console.log("🔗 Chain Information:");
    console.log("Chain ID:", chainId);
    
    // Get height
    const height = await client.getHeight();
    console.log("Block Height:", height);
    console.log("");

    // Get wallet balance
    const balance = await client.getBalance(account.address, "uatom");
    console.log("💰 Wallet Balance:");
    console.log(`${account.address}:`, balance);
    
    // Convert microatom to ATOM for readability
    const atomBalance = parseFloat(balance.amount) / 1000000;
    console.log(`Balance: ${atomBalance} ATOM (${balance.amount} uatom)`);
    console.log("");

    // Query test address balance for reference
    console.log("🧪 Test Address Balance:");
    try {
      const testBalance = await client.getBalance(testAddress, "uatom");
      const testAtomBalance = parseFloat(testBalance.amount) / 1000000;
      console.log(`${testAddress}:`, testBalance);
      console.log(`Balance: ${testAtomBalance} ATOM (${testBalance.amount} uatom)`);
    } catch (error) {
      console.log("Could not query test address:", error.message);
    }
    console.log("");

    // If wallet has no balance, show faucet information
    if (parseFloat(balance.amount) === 0) {
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

  } catch (error) {
    console.error("❌ Error connecting to Cosmos Hub testnet:", error.message);
    console.log("");
    console.log("💡 Troubleshooting:");
    console.log("- Make sure your mnemonic is correct (24 words)");
    console.log("- Check your internet connection");
    console.log("- Verify the RPC endpoint is accessible");
  }
}

main().catch(console.error);