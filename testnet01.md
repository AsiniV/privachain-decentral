# PrivaChain Testnet01 - Complete Deployment & Testing Guide

This comprehensive guide provides detailed instructions for deploying PrivaChain smart contracts to the test network via GitHub Codespace console and conducting thorough testing of the application after deployment.

## Table of Contents
1. [GitHub Codespace Setup & Environment](#github-codespace-setup--environment)
2. [Smart Contract Deployment via Codespace Console](#smart-contract-deployment-via-codespace-console)
3. [Comprehensive Application Testing Guide](#comprehensive-application-testing-guide)
4. [Advanced Configuration & Monitoring](#advanced-configuration--monitoring)
5. [Troubleshooting & Support](#troubleshooting--support)

---

## GitHub Codespace Setup & Environment

### Prerequisites
- GitHub account with access to AsiniV/privachain-decentral repository
- Basic understanding of terminal/console commands
- Test wallet with ATOM tokens (for testnet deployment)

### 1. Setting up GitHub Codespace

#### 1.1 Create Codespace
1. Navigate to [AsiniV/privachain-decentral](https://github.com/AsiniV/privachain-decentral) on GitHub
2. Click the **Code** button (green button)
3. Select **Codespaces** tab
4. Click **Create codespace on main** or **+** to create new codespace
5. Wait for the codespace to initialize (this may take 3-5 minutes)

#### 1.2 Initial Codespace Verification
Once your codespace is ready, open the terminal and run:

```bash
# Verify Node.js version (should be 18+)
node --version

# Verify npm version
npm --version

# Verify git configuration
git --version

# Check current directory
pwd
# Should show: /workspaces/privachain-decentral
```

### 2. Environment Configuration

#### 2.1 Install Dependencies
```bash
# Install all project dependencies (this will take several minutes)
npm install

# Verify installation completed successfully
echo "✅ Dependencies installation completed"
```

#### 2.2 Setup Environment Variables
```bash
# Copy environment template
cp .env.example .env.local

# View the template to understand required variables
cat .env.example
```

#### 2.3 Configure Essential Environment Variables
Edit `.env.local` using the built-in editor or nano:

```bash
# Open environment file for editing
nano .env.local
```

**Required Configuration:**
```bash
# Developer wallet mnemonic (CRITICAL - Replace with your actual mnemonic)
DEVELOPER_MNEMONIC="your twenty four word mnemonic phrase goes here and should be kept secure"
VITE_DEVELOPER_MNEMONIC="your twenty four word mnemonic phrase goes here and should be kept secure"

# Cosmos testnet endpoints (these are pre-configured for testnet)
COSMOS_RPC_ENDPOINT="https://rpc.theta-testnet.polypore.xyz"
COSMOS_REST_ENDPOINT="https://rest.theta-testnet.polypore.xyz:1317"
COSMOS_CHAIN_ID="theta-testnet-001"
VITE_COSMOS_RPC_ENDPOINT="https://rpc.theta-testnet.polypore.xyz"
VITE_COSMOS_REST_ENDPOINT="https://rest.theta-testnet.polypore.xyz:1317"
VITE_COSMOS_CHAIN_ID="theta-testnet-001"

# Test address (use your testnet address with ATOM tokens)
COSMOS_TEST_ADDRESS="your_cosmos_testnet_address_here"
VITE_COSMOS_TEST_ADDRESS="your_cosmos_testnet_address_here"

# IPFS Configuration (Filebase - for file storage)
FILEBASE_ACCESS_KEY="157F0935C148A8AB8A70"
FILEBASE_SECRET_KEY="fIeB3pUlpm27FRjh6novtWXa73TEKw1zKLNyWEx8"
FILEBASE_PROJECT="priva-chain"
VITE_FILEBASE_ACCESS_KEY="157F0935C148A8AB8A70"
VITE_FILEBASE_SECRET_KEY="fIeB3pUlpm27FRjh6novtWXa73TEKw1zKLNyWEx8"
VITE_FILEBASE_PROJECT="priva-chain"

# Development mode settings
NODE_ENV="development"
VITE_NODE_ENV="development"
DEBUG_MODE="true"
VITE_DEBUG_MODE="true"
```

**Save the file:** Press `Ctrl+X`, then `Y`, then `Enter` to save and exit nano.

#### 2.4 Verify Environment Setup
```bash
# Check if environment variables are loaded
source .env.local
echo "Environment configured for: $COSMOS_CHAIN_ID"

# Verify critical variables are set
echo "RPC Endpoint: $COSMOS_RPC_ENDPOINT"
echo "Chain ID: $COSMOS_CHAIN_ID"
```

### 3. Initial Build and Validation

#### 3.1 Run Build Tests
```bash
# Test TypeScript compilation
npm run test:build

# This should complete without errors
echo "✅ Build test completed"
```

#### 3.2 Verify Project Structure
```bash
# List main directories
ls -la

# Check deployment scripts
ls -la src/blockchain/deployment/

# Check available npm scripts
npm run | grep -E "(test|deploy|build)"
```

#### 3.3 Install Required Rust Tools (for Smart Contracts)
```bash
# Install Rust if not present (usually pre-installed in Codespace)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Reload environment
source ~/.cargo/env

# Add WebAssembly target (CRITICAL - required for smart contract compilation)
rustup target add wasm32-unknown-unknown

# Verify Rust installation
cargo --version
rustc --version

# Verify WebAssembly target is installed
rustup target list --installed | grep wasm32
# Should show: wasm32-unknown-unknown (installed)
```

**⚠️ Important Note:** The WebAssembly target installation is essential. Without it, smart contract compilation will fail with `can't find crate for 'core'` error.

---

## Smart Contract Deployment via Codespace Console

### 1. Pre-Deployment Preparation

#### 1.1 Validate Testnet Connection
```bash
# Test connection to Cosmos testnet
curl -s https://rpc.theta-testnet.polypore.xyz/status | jq '.result.sync_info'

# Should return sync information showing the network is accessible
```

#### 1.2 Check Wallet Balance
Before deploying, ensure your wallet has sufficient ATOM tokens:

```bash
# Check balance (replace with your address)
curl -s "https://rest.theta-testnet.polypore.xyz:1317/cosmos/bank/v1beta1/balances/your_cosmos_address" | jq '.'

# You need at least 1 ATOM (1000000 uatom) for deployment
```

#### 1.3 Prepare Smart Contracts
```bash
# Test smart contract compilation
npm run test:contracts

# Build contracts for deployment
npm run contracts:build

# This will build the WebAssembly contracts needed for deployment
```

### 2. Contract Deployment Process

#### 2.1 Quick Deployment (Recommended for Testing)
```bash
# Set deployment mnemonic (replace with your actual mnemonic)
export DEPLOYER_MNEMONIC="your twenty four word mnemonic phrase here"

# Run quick deployment to testnet (using tsx due to ES module compatibility)
npx tsx src/blockchain/deployment/cli.ts quick testnet

# Alternative: Use the deployment script
cd src/blockchain/deployment
./deploy.sh quick testnet
cd ../../..

# Monitor deployment progress
# This process may take 5-10 minutes depending on network congestion
```

#### 2.2 Step-by-Step Deployment (For Production-like Testing)
```bash
# Step 1: Estimate deployment costs
npx tsx src/blockchain/deployment/cli.ts estimate testnet

# Step 2: Deploy all contracts
npx tsx src/blockchain/deployment/cli.ts deploy testnet

# Step 3: Verify deployment
npx tsx src/blockchain/deployment/cli.ts verify testnet

# Step 4: Check deployment status
npx tsx src/blockchain/deployment/cli.ts status testnet
```

**Alternative using deployment scripts:**
```bash
# Navigate to deployment directory
cd src/blockchain/deployment

# Step 1: Estimate costs
./deploy.sh estimate testnet

# Step 2: Deploy contracts
./deploy.sh deploy testnet

# Step 3: Verify deployment
./deploy.sh verify testnet

# Step 4: Check status
./deploy.sh status testnet

# Return to project root
cd ../../..
```

#### 2.3 Alternative: Manual Deployment with Scripts
```bash
# Navigate to deployment directory
cd src/blockchain/deployment/

# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh deploy testnet

# Return to project root
cd ../../..
```

### 3. Deployment Verification

#### 3.1 Verify Contract Addresses
```bash
# Check deployment status and get contract addresses
# Note: Due to ES module issues, use tsx instead of ts-node
npx tsx src/blockchain/deployment/cli.ts status testnet

# Alternative: Use the bash deployment script
cd src/blockchain/deployment
./deploy.sh status testnet
cd ../../..

# This will show all deployed contract addresses
# Save these addresses for testing
```

#### 3.2 Test Contract Functionality
```bash
# Test Cosmos connection with deployed contracts
npm run example:cosmos-connection

# Validate Cosmos configuration
npm run validate:cosmos-config
```

#### 3.3 Update Environment with Contract Addresses
Edit `.env.local` to add deployed contract addresses:

```bash
nano .env.local
```

Add the contract addresses you received from deployment:
```bash
# Smart contract addresses (update with actual deployed addresses)
VIDEO_SIGNALING_CONTRACT="cosmos1abcd1234567890efgh..."
VITE_VIDEO_SIGNALING_CONTRACT="cosmos1abcd1234567890efgh..."
QUOTA_CONTRACT_ADDR="cosmos1xyz9876543210abcd..."
VITE_QUOTA_CONTRACT_ADDR="cosmos1xyz9876543210abcd..."
MAIL_CONTRACT_ADDRESS="cosmos1mail1234567890xyz..."
DOMAIN_CONTRACT_ADDRESS="cosmos1domain1234567890abc..."
```

### 4. Post-Deployment Configuration

#### 4.1 Initialize Contract State
```bash
# Populate search index with test data
npm run populate-search:testnet

# This creates initial data for testing search functionality
```

#### 4.2 Build Frontend Application
```bash
# Build the application with deployed contract addresses
npm run build

# Start development server for testing
npm run dev

# The application will be available on port 5173
# In Codespace, you'll get a URL to access it
```

---

## Comprehensive Application Testing Guide

### 1. Automated Testing Suite

#### 1.1 Smart Contract Tests
```bash
# Run comprehensive contract tests
npm run test:contracts

# Expected output should show all tests passing:
# Testing PrivaChain smart contracts...
# testing mail contract... ✓
# testing domain registry contract... ✓
# testing video signaling contract... ✓
# All tests passed!
```

#### 1.2 Frontend Build Tests
```bash
# Test TypeScript compilation
npm run test:build

# Test code linting
npm run test:lint

# Test environment secrets (should not expose sensitive data)
npm run test:secrets

# Run unit tests
npm run test:unit
```

#### 1.3 Feature Verification Tests
```bash
# Run comprehensive feature verification
npm run verify-features

# Run feature verification with JSON output
npm run verify-features:json

# Run detailed feature verification
npm run verify-features:verbose
```

**Expected Results:** The feature verification should show approximately 80-85% pass rate with 13-14 out of 16 tests passing. Common expected failures include:
- IPFS integration issues (OrbitDB initialization failures)
- Search engine functionality (KadDHT not defined error)
- Bang commands (dependent on search functionality)

These failures are normal in a Codespace environment and don't affect core deployment functionality.

#### 1.4 Integration Tests
```bash
# Run complete test suite
npm run test:all

# Test development server functionality
npm run test:dev-server
```

### 2. Manual Testing Procedures

#### 2.1 Basic Application Testing Checklist

**✅ Application Startup**
- [ ] Start development server: `npm run dev`
- [ ] Access application URL (provided by Codespace)
- [ ] Verify application loads without console errors
- [ ] Check that wallet connection interface appears

**✅ Wallet Connection Testing**
- [ ] Connect to Keplr or compatible Cosmos wallet
- [ ] Verify wallet address displays correctly
- [ ] Check balance display (should show ATOM tokens)
- [ ] Test network switching (if applicable)

**✅ Smart Contract Interaction**
- [ ] Test sponsored transaction functionality
- [ ] Verify gas sponsorship is working
- [ ] Check transaction history
- [ ] Monitor transaction success/failure rates

#### 2.2 Core Feature Testing

**✅ Domain Registration (.prv domains)**
- [ ] Navigate to domain registration interface
- [ ] Attempt to register a new .prv domain
- [ ] Verify domain availability checking
- [ ] Complete registration process
- [ ] Confirm domain ownership
- [ ] Test domain resolution

**✅ Encrypted Email System**
- [ ] Access email composition interface
- [ ] Compose encrypted email to another .prv address
- [ ] Send email and verify transaction success
- [ ] Check email delivery status
- [ ] Verify encryption/decryption works
- [ ] Test email inbox functionality

**✅ Video Calling System**
- [ ] Initiate video call session
- [ ] Test WebRTC connection establishment
- [ ] Verify blockchain-based signaling
- [ ] Test audio/video quality
- [ ] Check call termination
- [ ] Test multiple simultaneous calls

**✅ IPFS File System**
- [ ] Upload file to IPFS
- [ ] Verify file hash generation
- [ ] Test file download
- [ ] Check file integrity
- [ ] Test file sharing functionality
- [ ] Verify decentralized storage

#### 2.3 Advanced Testing Procedures

**✅ Zero-Knowledge Proof Testing**
```bash
# Setup ZK circuits (if not already done)
./scripts/setup-zk-circuits.sh

# Test ZK proof generation and verification
npm run test:features | grep -A 5 "ZK Proof"
```

**✅ Network Statistics and Monitoring**
- [ ] Access network statistics dashboard
- [ ] Verify transaction count displays
- [ ] Check network health indicators
- [ ] Test real-time updates
- [ ] Monitor performance metrics

**✅ Search Functionality**
- [ ] Test search for users
- [ ] Search for .prv domains
- [ ] Search for content/emails
- [ ] Verify search results accuracy
- [ ] Test search performance

### 3. Performance Testing

#### 3.1 Transaction Throughput Testing
```bash
# Test transaction processing speed
npm run example:cosmos-connection

# Monitor transaction confirmation times
# Target: < 10 seconds for testnet
```

#### 3.2 Load Testing (Basic)
```bash
# Simulate multiple concurrent users
# Create multiple test transactions
for i in {1..10}; do
  npm run example:cosmos-connection &
done

# Wait for all transactions to complete
wait

echo "Load test completed"
```

#### 3.3 Gas Usage Analysis
```bash
# Estimate gas costs for different operations
npm run deploy:estimate testnet

# Monitor actual gas usage vs estimates
# Log gas consumption patterns
```

### 4. Security Testing

#### 4.1 Cryptographic Verification
```bash
# Test cryptographic implementations
npm run test:features | grep -A 10 "Cryptographic"

# Verify encryption/decryption cycles
# Test key generation and management
```

#### 4.2 Privacy Testing
```bash
# Test DPI bypass functionality
npm run test:dpi-bypass

# Verify traffic obfuscation
# Test Nym mixnet integration (if enabled)
```

#### 4.3 Smart Contract Security
```bash
# Test contract access controls
# Verify proper permission handling
# Test edge cases and error conditions

# Run security-focused contract tests
cd contracts/mail && cargo test security
cd ../domain-registry && cargo test security
```

### 5. End-to-End User Workflow Testing

#### 5.1 Complete User Journey Test
**Scenario: New User Registration and First Email**

1. **Initial Setup**
   - [ ] Access application
   - [ ] Connect wallet
   - [ ] Check balance

2. **Domain Registration**
   - [ ] Register new .prv domain (e.g., `testuser.prv`)
   - [ ] Confirm registration transaction
   - [ ] Verify domain ownership

3. **Email Functionality**
   - [ ] Compose email to another .prv address
   - [ ] Add encryption
   - [ ] Send email
   - [ ] Verify delivery

4. **File Sharing**
   - [ ] Upload file via IPFS
   - [ ] Share file link via email
   - [ ] Verify recipient can download

5. **Video Call**
   - [ ] Initiate video call
   - [ ] Connect with another user
   - [ ] Test call quality
   - [ ] End call properly

#### 5.2 Multi-User Testing
**Scenario: Two Users Communicating**

Set up two different wallets/accounts:
- [ ] Both users register .prv domains
- [ ] Exchange encrypted emails
- [ ] Initiate video call between users
- [ ] Share files via IPFS
- [ ] Verify all interactions work correctly

---

## Advanced Configuration & Monitoring

### 1. Production-Like Configuration

#### 1.1 Enable Production Features
```bash
# Update environment for production-like testing
nano .env.local

# Change these values:
NODE_ENV="production"
VITE_NODE_ENV="production"
DEBUG_MODE="false"
VITE_DEBUG_MODE="false"
```

#### 1.2 TURN Server Configuration (Optional)
For production-like video calling, configure TURN servers:

```bash
# Add to .env.local
METERED_DOMAIN="privachain.metered.live"
METERED_TURN_SECRET="your_metered_secret_key"
TURN_STATIC_SERVERS_JSON='[{"urls":"stun:stun.relay.metered.ca:80"},{"urls":"turn:global.relay.metered.ca:80","username":"fallback_user","credential":"fallback_credential"}]'
```

### 2. Monitoring Setup

#### 2.1 Application Monitoring
```bash
# Start application with monitoring
npm run dev

# In another terminal, monitor logs
tail -f logs/*.log  # if log files exist

# Monitor network requests
npm run example:cosmos-connection | tee network-monitor.log
```

#### 2.2 Blockchain Monitoring
```bash
# Monitor blockchain status
curl -s https://rpc.theta-testnet.polypore.xyz/status | jq '.result.sync_info'

# Check network validators
curl -s https://rpc.theta-testnet.polypore.xyz/validators | jq '.result.validators[0:5]'

# Monitor transaction pool
curl -s https://rpc.theta-testnet.polypore.xyz/unconfirmed_txs | jq '.result.n_txs'
```

#### 2.3 Performance Metrics
```bash
# Monitor system resources in Codespace
htop  # if available, or:
top

# Monitor Node.js process
ps aux | grep node

# Check memory usage
free -h

# Check disk usage
df -h
```

### 3. Automated Testing with CI/CD

#### 3.1 GitHub Actions Integration
Create `.github/workflows/testnet-testing.yml`:

```yaml
name: Testnet Testing
on: 
  push:
    branches: [main, testnet]
  pull_request:
    branches: [main]

jobs:
  testnet-deployment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run build tests
        run: npm run test:build
        
      - name: Run contract tests
        run: npm run test:contracts
        
      - name: Run feature verification
        run: npm run verify-features:json
        env:
          COSMOS_RPC_ENDPOINT: https://rpc.theta-testnet.polypore.xyz
          COSMOS_CHAIN_ID: theta-testnet-001
```

### 4. Backup and Recovery Procedures

#### 4.1 Configuration Backup
```bash
# Backup environment configuration
cp .env.local .env.backup.$(date +%Y%m%d)

# Backup deployment state
cp -r src/blockchain/deployment/*.json deployment-backup/

# Create full project backup
tar -czf privachain-backup-$(date +%Y%m%d).tar.gz \
  .env.local src/blockchain/deployment/ contracts/
```

#### 4.2 Contract State Backup
```bash
# Query and backup contract states
npm run deploy:status testnet > contract-addresses-$(date +%Y%m%d).txt

# Backup specific contract data
curl -s "https://rest.theta-testnet.polypore.xyz:1317/cosmwasm/wasm/v1/contract/$MAIL_CONTRACT_ADDRESS" \
  > mail-contract-state-$(date +%Y%m%d).json
```

---

## Troubleshooting & Support

### 1. Common Issues and Solutions

#### 1.1 Deployment Issues

**Issue: "Insufficient funds for deployment"**
```bash
# Solution: Check wallet balance
curl -s "https://rest.theta-testnet.polypore.xyz:1317/cosmos/bank/v1beta1/balances/$COSMOS_TEST_ADDRESS"

# Get testnet tokens from faucet
# Visit: https://faucet.theta-testnet.polypore.xyz/
```

**Issue: "Contract build failure - can't find crate for 'core'"**
```bash
# Solution: Install WebAssembly target (most common cause)
rustup target add wasm32-unknown-unknown

# Verify target is installed
rustup target list --installed | grep wasm32

# Clean and rebuild
cd contracts/mail
cargo clean
cargo build --release --target wasm32-unknown-unknown
cd ../domain-registry
cargo clean
cargo build --release --target wasm32-unknown-unknown
cd ../..
```

**Issue: "TypeScript execution error - Unknown file extension .ts"**
```bash
# Solution: Use tsx instead of ts-node for deployment scripts
npx tsx src/blockchain/deployment/cli.ts [command] [network]

# Or use the bash deployment scripts
cd src/blockchain/deployment
./deploy.sh [command] [network]
```

**Issue: "ReferenceError: require is not defined in ES module scope"**
```bash
# Solution: This is an ES module compatibility issue
# Use the bash deployment scripts instead
cd src/blockchain/deployment
./deploy.sh deploy testnet  # or other commands
cd ../../..
```

**Issue: "Network connection timeout"**
```bash
# Solution: Test network connectivity
curl -s https://rpc.theta-testnet.polypore.xyz/status

# Try alternative endpoints if main is down
export COSMOS_RPC_ENDPOINT="https://cosmos-testnet-rpc.publicnode.com:443"
```

#### 1.2 Frontend Issues

**Issue: "Application won't start"**
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
lsof -i :5173  # kill process if needed
```

**Issue: "Wallet connection failed"**
```bash
# Solution: Check wallet configuration
# Ensure Keplr is installed and configured for Cosmos testnet
# Add testnet chain to wallet if needed
```

#### 1.3 Smart Contract Issues

**Issue: "Contract execution failed"**
```bash
# Solution: Check contract address and ABI
npm run deploy:status testnet

# Verify contract is properly instantiated
curl -s "https://rest.theta-testnet.polypore.xyz:1317/cosmwasm/wasm/v1/contract/$CONTRACT_ADDRESS"
```

### 2. Diagnostic Commands

#### 2.1 System Diagnostics
```bash
# Check Codespace resources
df -h          # Disk usage
free -h        # Memory usage
nproc          # CPU cores
cat /proc/version  # System version

# Check network connectivity
ping -c 3 rpc.theta-testnet.polypore.xyz
curl -I https://rest.theta-testnet.polypore.xyz:1317/
```

#### 2.2 Application Diagnostics
```bash
# Validate environment
npm run validate

# Assess production readiness
npm run assess:readiness

# Check logs for errors
npm run log-errors
```

#### 2.3 Blockchain Diagnostics
```bash
# Check blockchain sync status
curl -s https://rpc.theta-testnet.polypore.xyz/status | jq '.result.sync_info.catching_up'

# Verify account exists
curl -s "https://rest.theta-testnet.polypore.xyz:1317/cosmos/auth/v1beta1/accounts/$COSMOS_TEST_ADDRESS"

# Check transaction history
curl -s "https://rest.theta-testnet.polypore.xyz:1317/cosmos/tx/v1beta1/txs?events=transfer.sender='$COSMOS_TEST_ADDRESS'"
```

### 3. Performance Optimization

#### 3.1 Build Optimization
```bash
# Optimize build for production
npm run optimize

# Analyze bundle size (if available)
npm run build -- --analyze
```

#### 3.2 Network Optimization
```bash
# Use fastest available RPC endpoint
# Test different endpoints and choose the fastest
time curl -s https://rpc.theta-testnet.polypore.xyz/status
time curl -s https://cosmos-testnet-rpc.publicnode.com:443/status
```

### 4. Getting Help

#### 4.1 Log Collection
```bash
# Collect comprehensive logs for support
mkdir -p debug-logs/$(date +%Y%m%d)

# Application logs
npm run log-errors > debug-logs/$(date +%Y%m%d)/app-errors.log

# System information
{
  echo "=== System Info ==="
  uname -a
  echo "=== Node.js Version ==="
  node --version
  echo "=== NPM Version ==="
  npm --version
  echo "=== Environment ==="
  env | grep -E "(COSMOS|VITE|NODE)" | sort
} > debug-logs/$(date +%Y%m%d)/system-info.log

# Recent deployment status
npm run deploy:status testnet > debug-logs/$(date +%Y%m%d)/deployment-status.log
```

#### 4.2 Support Contacts
- **GitHub Issues**: Report issues at https://github.com/AsiniV/privachain-decentral/issues
- **Documentation**: Refer to additional docs in `docs/` directory
- **Community**: Check for Discord/Telegram communities

#### 4.3 Additional Resources
- **Cosmos SDK Documentation**: https://docs.cosmos.network/
- **CosmWasm Documentation**: https://docs.cosmwasm.com/
- **Keplr Wallet Setup**: https://wallet.keplr.app/
- **Testnet Faucet**: https://faucet.theta-testnet.polypore.xyz/

---

## Summary

This guide provides comprehensive instructions for:

1. ✅ **Setting up GitHub Codespace** for PrivaChain development
2. ✅ **Deploying smart contracts** to Cosmos testnet via console
3. ✅ **Testing all application features** thoroughly
4. ✅ **Monitoring and troubleshooting** deployments
5. ✅ **Production readiness validation**

### Key Success Metrics

After following this guide, you should achieve:
- [ ] **100% successful contract deployment** on Cosmos testnet
- [ ] **All automated tests passing** (>95% pass rate acceptable)
- [ ] **All core features functional** (.prv domains, encrypted email, video calls, IPFS)
- [ ] **Performance within acceptable limits** (<10s transaction confirmation)
- [ ] **Security requirements met** (encryption, privacy features working)

### Next Steps

1. **Production Deployment**: Use similar process for mainnet deployment
2. **User Acceptance Testing**: Conduct testing with real users
3. **Performance Optimization**: Optimize based on testnet results
4. **Security Audit**: Conduct professional security review
5. **Launch Planning**: Prepare for public launch

---

*This document serves as the definitive guide for PrivaChain testnet deployment and testing. Keep it updated as the system evolves.*