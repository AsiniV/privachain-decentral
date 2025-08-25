# Cosmos Testnet Deployment Guide

This document provides comprehensive instructions for deploying PrivaChain to the Cosmos testnet environment, based on the current codebase and infrastructure.

## Overview

PrivaChain is a decentralized blockchain platform built on Cosmos SDK that provides:
- Anonymous email system with .prv domains
- WebRTC-based video calling with blockchain signaling
- ZK-proof based identity management
- IPFS-based decentralized storage
- Economic incentives for network participants

## Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows with WSL2
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: At least 10GB free space
- **Network**: Stable internet connection

### Required Software

1. **Node.js v18+**
   ```bash
   node --version  # Should show v18+
   npm --version   # Should show v9+
   ```

2. **Rust and Cargo** (for smart contracts)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   rustup target add wasm32-unknown-unknown
   cargo --version  # Should show cargo 1.70+
   ```

3. **Git**
   ```bash
   git --version
   ```

## Installation and Setup

### 1. Clone Repository
```bash
git clone https://github.com/AsiniV/privachain-decentral.git
cd privachain-decentral
```

### 2. Install Dependencies
```bash
# Install npm dependencies
npm install

# Verify installation
npm run test:build
```

### 3. Environment Configuration

Create environment file from template:
```bash
cp .env.template .env.local
```

Edit `.env.local` with your configuration:
```bash
# Deployment wallet mnemonic (required for testnet deployment)
DEPLOYER_MNEMONIC="your twelve or twenty four word mnemonic phrase here"

# Cosmos testnet configuration
COSMOS_TESTNET_RPC="https://rpc.theta-testnet.polypore.xyz"
COSMOS_TESTNET_REST="https://rest.theta-testnet.polypore.xyz:1317"
COSMOS_TESTNET_CHAIN_ID="theta-testnet-001"

# Gas configuration (optional)
GAS_PRICE="0.025uatom"
GAS_ADJUSTMENT="1.3"

# Test wallet with pre-funded tokens
TEST_WALLET_ADDRESS="cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k"
```

## Smart Contract Deployment

### 1. Build Contracts

Build all smart contracts for deployment:
```bash
# Test contracts first
npm run test:contracts

# Build for deployment
npm run contracts:build
```

This builds:
- **Mail Contract**: Anonymous email system with proof-of-work
- **Domain Registry**: .prv domain registration with ZK-proofs

### 2. Deploy to Testnet

#### Option A: Quick Deployment (Recommended)
```bash
# Set environment variables
export DEPLOYER_MNEMONIC="your mnemonic here"

# Deploy all contracts
npm run deploy:testnet
```

#### Option B: Step-by-Step Deployment
```bash
# 1. Estimate costs
npm run deploy:estimate testnet

# 2. Deploy contracts
npm run deploy:testnet

# 3. Verify deployment
npm run deploy:verify testnet

# 4. Check status
npm run deploy:status testnet
```

#### Option C: Manual Deployment with Scripts
```bash
# Deploy using deployment scripts
cd src/blockchain/deployment
./deploy.sh deploy testnet
```

### 3. Verify Deployment

Check that contracts are deployed correctly:
```bash
# Verify contract addresses
npm run deploy:status testnet

# Test contract functionality
npm run example:cosmos-connection
```

## Frontend Deployment

### 1. Build Frontend Application

```bash
# Build for production
npm run build

# Test build locally
npm run preview
```

### 2. Deploy to Hosting Platform

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify Deployment
```bash
# Build and deploy
npm run build
# Upload dist/ folder to Netlify
```

#### Self-Hosted Deployment
```bash
# Serve built files
npm run build
npx serve dist -p 3000
```

### 3. Configure Environment for Production

Update environment variables for your hosting platform:
```bash
# Required environment variables
VITE_COSMOS_RPC_ENDPOINT="https://rpc.theta-testnet.polypore.xyz"
VITE_COSMOS_REST_ENDPOINT="https://rest.theta-testnet.polypore.xyz:1317"
VITE_COSMOS_CHAIN_ID="theta-testnet-001"

# Contract addresses (from deployment)
VITE_MAIL_CONTRACT_ADDRESS="cosmos1abc..."
VITE_DOMAIN_CONTRACT_ADDRESS="cosmos1def..."

# IPFS configuration
VITE_IPFS_GATEWAY="https://ipfs.io/ipfs/"
VITE_IPFS_API_URL="https://api.ipfs.io"
```

## Network Configuration

### Cosmos Hub Testnet Details

- **Chain ID**: `theta-testnet-001`
- **RPC Endpoint**: `https://rpc.theta-testnet.polypore.xyz`
- **REST Endpoint**: `https://rest.theta-testnet.polypore.xyz:1317`
- **Explorer**: `https://explorer.theta-testnet.polypore.xyz`
- **Native Token**: `uatom` (micro ATOM)

### Gas Configuration

```javascript
const gasConfig = {
  gasPrice: "0.025uatom",
  gasAdjustment: 1.3,
  gasPriceStep: {
    low: 0.001,
    average: 0.0025,
    high: 0.004
  }
}
```

### Faucet and Test Tokens

1. **Test Wallet with Tokens**: `cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k`
2. **Cosmos Hub Testnet Faucet**: Ask in Cosmos Discord for tokens
3. **Alternative Faucets**: Check Cosmos Hub documentation

## Testing Deployment

### 1. Contract Testing
```bash
# Test smart contracts
npm run test:contracts

# Test deployment scripts
npm run deploy:estimate testnet
```

### 2. Frontend Testing
```bash
# Run feature verification
npm run verify-features

# Test Cosmos connection
npm run example:cosmos-connection

# Test development server
npm run test:dev-server
```

### 3. Integration Testing
```bash
# Run complete test suite
npm run test:all
```

### 4. Manual Testing Checklist

After deployment, verify these features work:

- [ ] Connect to Cosmos testnet
- [ ] Display wallet address and balance
- [ ] Send transactions with sponsored gas
- [ ] Register .prv domain
- [ ] Send encrypted email
- [ ] Initiate video call session
- [ ] Query network statistics
- [ ] Search functionality
- [ ] IPFS file upload/download

## Post-Deployment Configuration

### 1. Initialize Contract State

After deployment, initialize contracts with test data:

```bash
# Populate search index
npm run populate-search:testnet

# Setup test domains and emails
# (This would need to be done through the UI or additional scripts)
```

### 2. Configure TURN Servers (Optional)

For video calling functionality, configure TURN servers:

```javascript
const turnConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    },
    {
      urls: "turn:your-turn-server.com:3478",
      username: "your-username",
      credential: "your-password"
    }
  ]
}
```

### 3. Monitor Deployment

Set up monitoring for:
- Contract transaction counts
- Gas usage patterns
- Error rates
- User adoption metrics

## Security Considerations

### 1. Wallet Security
- **Never commit mnemonics to git**
- Use environment variables for sensitive data
- Consider hardware wallets for mainnet
- Regular security audits

### 2. Contract Security
- Contracts use mock/placeholder implementations for ZK-proofs
- Review all cryptographic implementations before mainnet
- Test thoroughly on testnet first
- Consider formal verification

### 3. Frontend Security
- Secure API endpoints
- Validate all user inputs
- Use HTTPS in production
- Regular dependency updates

## Troubleshooting

### Common Issues

1. **Contract Build Failure**
   ```bash
   # Install wasm target
   rustup target add wasm32-unknown-unknown
   
   # Clean and rebuild
   cd contracts/mail
   cargo clean
   cargo build --release --target wasm32-unknown-unknown
   ```

2. **Deployment Wallet Issues**
   ```bash
   # Verify mnemonic format
   echo $DEPLOYER_MNEMONIC | wc -w  # Should be 12 or 24
   
   # Check wallet balance
   # Use Cosmos wallet to verify balance
   ```

3. **Network Connection Issues**
   ```bash
   # Test RPC endpoint
   curl -s https://rpc.theta-testnet.polypore.xyz/status
   
   # Test REST endpoint
   curl -s https://rest.theta-testnet.polypore.xyz:1317/cosmos/base/node/v1beta1/config
   ```

4. **Frontend Build Issues**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Check for TypeScript errors
   npm run test:build
   ```

### Debug Mode

Enable detailed logging:
```bash
# Enable debug output
DEBUG=1 npm run deploy:testnet

# Verbose deployment
npm run deploy:testnet --verbose

# Check logs
tail -f deployment.log
```

### Recovery Procedures

If deployment fails partway:

1. **Check deployment status**:
   ```bash
   npm run deploy:status testnet
   ```

2. **Resume from checkpoint**:
   ```bash
   # Deployment system saves state in deployment-testnet.json
   # Can resume from last successful step
   ```

3. **Clean restart**:
   ```bash
   # Remove deployment state
   rm deployment-testnet.json
   npm run deploy:testnet
   ```

## Cost Estimation

### Testnet Deployment Costs

- **Contract Upload**: ~0.1 ATOM per contract
- **Contract Instantiation**: ~0.01 ATOM per contract
- **Total Estimated**: ~0.22 ATOM for full deployment

### Ongoing Costs

- **Transaction Fees**: ~0.025 uatom per transaction
- **Storage Costs**: Minimal (IPFS storage is distributed)
- **TURN Server Costs**: Variable based on usage

### Gas Optimization

```javascript
// Optimize gas usage
const optimizedGas = {
  upload: "auto",
  instantiate: "auto", 
  execute: 200000,
  query: 100000
}
```

## Support and Resources

### Documentation
- [Cosmos SDK Documentation](https://docs.cosmos.network/)
- [CosmWasm Documentation](https://docs.cosmwasm.com/)
- [PrivaChain Local Testing Guide](../LOCAL_TESTING.md)

### Community
- **Discord**: Cosmos Community Discord
- **GitHub Issues**: [Repository Issues](https://github.com/AsiniV/privachain-decentral/issues)
- **Cosmos Hub Forum**: Discussion and support

### Development Resources
- [Cosmos Academy](https://academy.cosmos.network/)
- [CosmWasm Book](https://book.cosmwasm.com/)
- [Cosmos Hub Testnet Status](https://status.cosmos.network/)

## Appendix

### Contract Addresses (Testnet)

After deployment, record contract addresses:

```bash
# Mail Contract
MAIL_CONTRACT="cosmos1..."

# Domain Registry Contract  
DOMAIN_CONTRACT="cosmos1..."

# Video Signaling Contract
VIDEO_CONTRACT="cosmos1..."
```

### Network Endpoints

```bash
# Primary endpoints
RPC_PRIMARY="https://rpc.theta-testnet.polypore.xyz"
REST_PRIMARY="https://rest.theta-testnet.polypore.xyz:1317"

# Backup endpoints (if available)
RPC_BACKUP="https://rpc-theta.cosmos.network"
REST_BACKUP="https://rest-theta.cosmos.network"
```

### Useful Commands

```bash
# Check network status
curl -s $RPC_PRIMARY/status | jq .result.sync_info

# Query account balance
curl -s "$REST_PRIMARY/cosmos/bank/v1beta1/balances/$WALLET_ADDRESS"

# Query contract info
curl -s "$REST_PRIMARY/cosmwasm/wasm/v1/contract/$CONTRACT_ADDRESS"

# Submit transaction
# (Use CosmJS or Cosmos SDK CLI tools)
```

---

This deployment guide provides comprehensive instructions for deploying PrivaChain to the Cosmos testnet. Always test thoroughly on testnet before considering mainnet deployment.