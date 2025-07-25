# PrivaChain Smart Contract Deployment Guide

This document provides comprehensive instructions for deploying PrivaChain smart contracts to various networks.

## Overview

The PrivaChain deployment system includes 8 core smart contracts:

1. **PRIV Token** - Native utility token for the ecosystem
2. **NFT Contract** - Identity and premium access NFTs  
3. **Mail Contract** - Anonymous email service with ZK-proofs
4. **Domain Contract** - Anonymous .prv domain registration
5. **Video Signaling** - WebRTC signaling for video calls
6. **Rewards Contract** - Node incentivization and micropayments
7. **Consensus Contract** - Validator management and governance
8. **ZK Rollup** - Layer 2 scaling solution

## Prerequisites

### Environment Setup

1. **Node.js 18+** - Required for running deployment scripts
2. **npm/yarn** - Package manager
3. **Deployment Wallet** - Cosmos wallet with sufficient funds

### Required Environment Variables

```bash
# Required: Deployment wallet mnemonic
export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase here"

# Optional: Custom RPC endpoints
export TESTNET_RPC="https://rpc.cosmos-testnet.priv"
export MAINNET_RPC="https://rpc.cosmos.priv"

# Optional: Custom gas settings
export GAS_PRICE="0.025upriv"
```

## Installation

```bash
# Install dependencies
npm install

# Install deployment dependencies
npm install @cosmjs/cosmwasm-stargate @cosmjs/proto-signing @cosmjs/stargate ts-node
```

## Deployment Commands

### Quick Deployment (Recommended)

Deploy all contracts with a single command:

```bash
# Deploy to testnet (default)
npm run deploy:quick

# Deploy to specific network
npm run deploy:testnet    # PrivaChain testnet
npm run deploy:mainnet    # PrivaChain mainnet
npm run deploy:local      # Local development chain
```

### Step-by-Step Deployment

```bash
# 1. Estimate deployment costs
npm run deploy:estimate testnet

# 2. Deploy all contracts
npm run deploy:testnet

# 3. Verify deployment
npm run deploy:verify testnet

# 4. Check deployment status
npm run deploy:status testnet
```

### Individual Contract Deployment

For development and testing, you can deploy individual contracts:

```typescript
import { PrivaChainDeployer } from './src/blockchain/deployment/deployer'

const deployer = new PrivaChainDeployer('testnet')
await deployer.initialize()

// Deploy individual contracts
const prvToken = await deployer.deployPRIVToken()
const mailContract = await deployer.deployMailContract()
// ... etc
```

## Network Configuration

### Testnet
- **Chain ID**: `privachain-testnet-1`
- **RPC**: `https://rpc.cosmos-testnet.priv`
- **Explorer**: `https://explorer.testnet.priv`
- **Faucet**: `https://faucet.testnet.priv`

### Mainnet
- **Chain ID**: `privachain-1`
- **RPC**: `https://rpc.cosmos.priv`
- **Explorer**: `https://explorer.priv`

### Local Development
- **Chain ID**: `privachain-local`
- **RPC**: `http://localhost:26657`
- **Explorer**: `http://localhost:3000`

## Contract Configuration

### PRIV Token
```typescript
{
  name: "PrivaChain Token",
  symbol: "PRIV", 
  decimals: 18,
  total_supply: "10000000000000000000000000000", // 10 billion
  initial_balances: [
    {
      address: deployerAddress,
      amount: "1000000000000000000000000000" // 1 billion to deployer
    }
  ]
}
```

### Mail Contract
```typescript
{
  admin: deployerAddress,
  pow_difficulty: 4,              // Proof-of-work difficulty
  max_email_size: 1048576         // 1MB max email size
}
```

### Domain Contract  
```typescript
{
  admin: deployerAddress,
  registration_fee: "10000000000000000000", // 10 PRIV
  renewal_period: 31536000                  // 1 year in seconds
}
```

### Video Signaling
```typescript
{
  admin: deployerAddress,
  session_timeout: 3600,          // 1 hour timeout
  max_participants: 50            // Max participants per session
}
```

### Rewards Contract
```typescript
{
  admin: deployerAddress,
  priv_token_address: prvTokenAddress,
  rate_per_mb: "1000000000000000",      // 0.001 PRIV per MB
  min_stake: "10000000000000000000000"   // 10,000 PRIV minimum stake
}
```

## Cost Estimation

Deployment costs vary by network:

### Testnet
- **Upload costs**: ~20 PRIV
- **Instantiate costs**: ~2 PRIV  
- **Total estimated**: ~22 PRIV

### Mainnet
- **Upload costs**: ~200 PRIV
- **Instantiate costs**: ~20 PRIV
- **Total estimated**: ~220 PRIV

Use the estimation command for current prices:
```bash
npm run deploy:estimate mainnet
```

## Verification

After deployment, verify all contracts are working:

```bash
# Verify deployment integrity
npm run deploy:verify testnet

# Check individual contract
cosmovisor query wasm contract [contract-address]

# Query contract state
cosmovisor query wasm contract-state-all [contract-address]
```

## Post-Deployment

### Frontend Integration

After successful deployment, update your frontend configuration:

```typescript
// src/config/contracts.ts
export const PRIVACHAIN_CONTRACTS = {
  prvToken: 'cosmos1abc...',
  nft: 'cosmos1def...',
  mail: 'cosmos1ghi...',
  domain: 'cosmos1jkl...',
  videoSignaling: 'cosmos1mno...',
  rewards: 'cosmos1pqr...',
  consensus: 'cosmos1stu...',
  zkRollup: 'cosmos1vwx...'
}
```

### Initial Setup

1. **Mint initial tokens** for testing
2. **Register test domains** (.prv addresses)
3. **Setup validator nodes** for consensus
4. **Configure TURN servers** for video calls

### Example Initial Setup Script

```typescript
// Initial setup after deployment
async function initializeContracts() {
  // Mint tokens for testing
  await prvToken.mint({
    recipient: testUserAddress,
    amount: "1000000000000000000000" // 1000 PRIV
  })
  
  // Register test domain
  await domainContract.registerDomain({
    domain_name: "alice.prv",
    zk_proof: "0x...", 
    public_key: "-----BEGIN PGP PUBLIC KEY BLOCK-----..."
  })
  
  // Setup validator
  await consensusContract.registerValidator({
    stake_amount: "100000000000000000000000", // 100k PRIV
    validator_key: "cosmosvalcons1...",
    commission: 10 // 10%
  })
}
```

## Troubleshooting

### Common Issues

1. **Insufficient Funds**
   ```
   Error: insufficient funds for gas
   ```
   Solution: Ensure deployer wallet has enough tokens for gas fees

2. **Mnemonic Error**
   ```
   Error: Invalid mnemonic
   ```
   Solution: Verify DEPLOYER_MNEMONIC is 12 or 24 words

3. **Network Connection**
   ```
   Error: connect ECONNREFUSED
   ```
   Solution: Check RPC endpoint is accessible

4. **Contract Upload Failed**
   ```
   Error: upload failed
   ```
   Solution: Verify WASM code is valid and under size limits

### Debug Mode

Enable debug logging:
```bash
DEBUG=1 npm run deploy:testnet
```

### Recovery

If deployment fails partway through:

1. Check deployment status:
   ```bash
   npm run deploy:status testnet
   ```

2. Resume from last successful step:
   ```typescript
   const deployer = new PrivaChainDeployer('testnet')
   await deployer.loadExistingDeployment()
   // Continue with remaining contracts
   ```

## Security Considerations

### Deployment Security

1. **Use hardware wallets** for mainnet deployments
2. **Verify contract code** before deployment
3. **Test on testnet first** before mainnet
4. **Backup deployment state** files
5. **Use multi-sig** for contract admin functions

### Contract Security

1. **Admin privileges** are granted to deployer initially
2. **Transfer admin rights** to DAO after testing
3. **Implement timelock** for critical functions
4. **Regular security audits** recommended

### Environment Security

```bash
# Use environment files (never commit to git)
echo "DEPLOYER_MNEMONIC=..." > .env.local

# Set restrictive permissions
chmod 600 .env.local

# Use secure key management
export DEPLOYER_MNEMONIC=$(security find-generic-password -a myapp -s deployer -w)
```

## Monitoring

### Deployment Monitoring

```bash
# Monitor deployment progress
tail -f deployment.log

# Check contract events
cosmovisor query wasm contract-history [contract-address]

# Monitor gas usage
cosmovisor query tx [tx-hash]
```

### Production Monitoring

1. **Contract state monitoring**
2. **Gas price tracking**
3. **Node performance metrics**
4. **User adoption metrics**

## Upgrades

### Contract Upgrades

```typescript
// Upload new contract code
const uploadResult = await client.upload(deployer, newWasmCode, 'auto')

// Migrate existing contract
await client.migrate(
  deployer,
  contractAddress, 
  uploadResult.codeId,
  migrateMsg,
  'auto'
)
```

### Migration Scripts

Prepare migration scripts for contract upgrades:

```typescript
export function buildMigrateMsg(fromVersion: string, toVersion: string) {
  return {
    migrate: {
      from_version: fromVersion,
      to_version: toVersion,
      // Migration-specific data
    }
  }
}
```

## Support

For deployment support:

- **Documentation**: https://docs.privachain.com/deployment
- **Discord**: https://discord.gg/privachain
- **GitHub Issues**: https://github.com/privachain/contracts/issues
- **Email**: devops@privachain.com

## Appendix

### Contract Addresses (Testnet)

```
PRIV Token:       cosmos1...
NFT Contract:     cosmos1...
Mail Contract:    cosmos1...
Domain Contract:  cosmos1...
Video Signaling:  cosmos1...
Rewards:          cosmos1...
Consensus:        cosmos1...
ZK Rollup:        cosmos1...
```

### Useful Commands

```bash
# Check account balance
cosmovisor query bank balances [address]

# List all contracts by code ID
cosmovisor query wasm list-contracts-by-code [code-id]

# Execute contract function
cosmovisor tx wasm execute [contract-addr] '[msg]' --from [key]

# Query contract state
cosmovisor query wasm smart [contract-addr] '[query]'
```