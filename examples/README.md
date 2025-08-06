# Cosmos Hub Testnet Examples

This directory contains examples for connecting to and interacting with the Cosmos Hub testnet (theta-testnet-001) without running your own node.

## Prerequisites

1. **Install Dependencies**: The required CosmJS packages are already included in the project dependencies:
   - `@cosmjs/cosmwasm-stargate`
   - `@cosmjs/proto-signing`
   - `@cosmjs/amino`
   - `@cosmjs/stargate`

2. **Get Test Tokens**: You'll need test ATOM tokens to interact with the network:
   - Test address with ATOM tokens: `cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k`
   - Cosmos Hub testnet faucet (if available)
   - Ask in the Cosmos Discord for testnet tokens

3. **Network Endpoints**:
   - RPC: `https://rpc.theta-testnet.polypore.xyz`
   - REST: `https://rest.theta-testnet.polypore.xyz:1317`

## Examples

### Basic Connection Example

Connect to the Cosmos Hub testnet and check wallet balance.

#### TypeScript Version
```bash
npm run example:cosmos-connection
```

#### JavaScript Version
```bash
npm run example:cosmos-connection:js
```

### Manual Execution

You can also run the examples directly:

```bash
# TypeScript
tsx examples/cosmos-hub-connection.ts

# JavaScript
node examples/cosmos-hub-connection.js
```

## Configuration

Before running the examples, update the mnemonic in the example files:

1. Open `examples/cosmos-hub-connection.ts` or `examples/cosmos-hub-connection.js`
2. Replace `"your mnemonic here"` with your actual 24-word mnemonic phrase

Example:
```javascript
const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
```

## What the Examples Do

The examples demonstrate:

1. **Connection**: Connect to the Cosmos Hub testnet using public RPC
2. **Wallet Setup**: Create a wallet from a mnemonic phrase
3. **Account Info**: Get wallet address and account details
4. **Balance Query**: Check ATOM balance in both uatom and ATOM units
5. **Chain Info**: Display chain ID and current block height
6. **Test Address**: Query the test address balance for reference

## Expected Output

```
🚀 Connecting to Cosmos Hub testnet (theta-testnet-001)...
RPC Endpoint: https://rpc.theta-testnet.polypore.xyz
REST Endpoint: https://rest.theta-testnet.polypore.xyz:1317

📋 Wallet Information:
Address: cosmos1abc123...

🔗 Chain Information:
Chain ID: theta-testnet-001
Block Height: 12345678

💰 Wallet Balance:
cosmos1abc123...: { amount: "1000000", denom: "uatom" }
Balance: 1 ATOM (1000000 uatom)

🧪 Test Address Balance:
cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k: { amount: "5000000", denom: "uatom" }
Balance: 5 ATOM (5000000 uatom)

✅ Successfully connected to Cosmos Hub testnet!

🛠️  You can now:
- Send transactions to the network
- Deploy and interact with CosmWasm smart contracts
- Build dApps using this connection
```

## Troubleshooting

If you encounter issues:

1. **Invalid mnemonic**: Ensure your mnemonic is exactly 24 words and valid
2. **Network issues**: Check internet connection and RPC endpoint accessibility
3. **No tokens**: Get test tokens from the faucet or test address
4. **Dependencies**: Run `npm install` to ensure all packages are installed

## Next Steps

Once you've successfully connected to the testnet, you can:

1. **Send Transactions**: Transfer ATOM tokens between addresses
2. **Deploy Contracts**: Upload and instantiate CosmWasm smart contracts
3. **Build dApps**: Use this connection in your decentralized applications
4. **Interact with Contracts**: Execute contract functions and query state

For more advanced usage, see the main application's Cosmos integration files:
- `src/lib/cosmos.ts` - Main Cosmos client
- `src/lib/cosmos-utils.ts` - Utility functions
- `src/hooks/useCosmos.ts` - React hook for Cosmos operations