# PrivaChain Test Network Deployment and Testing Guide

This document provides detailed instructions for deploying smart contracts to the Cosmos test network via the GitHub Codespace console, as well as a comprehensive guide for fully testing the application after deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setting Up GitHub Codespace](#setting-up-github-codespace)
3. [Deploying Contracts to Test Network](#deploying-contracts-to-test-network)
4. [Post-Deployment Testing Guide](#post-deployment-testing-guide)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- A GitHub account with access to the PrivaChain repository
- A Cosmos testnet wallet with test tokens (ATOM)
- Basic familiarity with command-line operations

### Required Software (Auto-installed in Codespace)

The following will be available or installed in GitHub Codespace:

- **Node.js v18+** - JavaScript runtime
- **Rust & Cargo** - For smart contract compilation
- **Git** - Version control

---

## Setting Up GitHub Codespace

### Step 1: Open the Repository in Codespace

1. Navigate to the PrivaChain repository on GitHub
2. Click the green **Code** button
3. Select the **Codespaces** tab
4. Click **Create codespace on main** (or your target branch)

The Codespace will automatically set up with all necessary dependencies.

### Step 2: Verify Environment

Once the Codespace is ready, open the terminal and verify the environment:

```bash
# Verify Node.js installation
node --version
# Expected: v18.x.x or higher

# Verify npm installation
npm --version
# Expected: v9.x.x or higher

# Verify Rust/Cargo installation
cargo --version
# Expected: cargo 1.70+

# Verify Git installation
git --version
```

### Step 3: Install Project Dependencies

```bash
# Navigate to project root (usually automatic in Codespace)
cd /workspaces/privachain-decentral

# Install npm dependencies
npm install

# Add WebAssembly target for Rust (if not already added)
rustup target add wasm32-unknown-unknown
```

---

## Deploying Contracts to Test Network

### Step 1: Configure Environment Variables

Create your environment file with deployment credentials:

```bash
# Copy the template
cp .env.template .env.local

# Edit the environment file
nano .env.local
```

Add the following configuration to `.env.local`:

```bash
# Deployment wallet mnemonic (REQUIRED - use a test wallet!)
DEPLOYER_MNEMONIC="your twelve or twenty-four word mnemonic phrase here"

# Cosmos testnet configuration
COSMOS_TESTNET_RPC="https://rpc.theta-testnet.polypore.xyz"
COSMOS_TESTNET_REST="https://rest.theta-testnet.polypore.xyz:1317"
COSMOS_TESTNET_CHAIN_ID="theta-testnet-001"

# Gas configuration
GAS_PRICE="0.025uatom"
GAS_ADJUSTMENT="1.3"

# Test wallet with pre-funded tokens (example placeholder - use your own test wallet)
TEST_WALLET_ADDRESS="cosmos1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

> ⚠️ **Security Warning**: Never commit real wallet mnemonics to version control. Use test wallets only!

### Step 2: Build Smart Contracts

Build the smart contracts for deployment:

```bash
# Test contracts first
npm run test:contracts

# Build all contracts for WASM target
npm run contracts:build

# Verify WASM files are generated
ls -la contracts/mail/target/wasm32-unknown-unknown/release/
```

Expected output:
```
privachain_mail.wasm
```

### Step 3: Deploy to Testnet

#### Option A: Quick Deployment (Recommended)

```bash
# Set the mnemonic environment variable
# WARNING: Environment variables may be visible in process lists and shell history.
# For enhanced security, consider using a secrets management tool or .env file.
export DEPLOYER_MNEMONIC="your mnemonic phrase here"

# Deploy all contracts to testnet
npm run deploy:testnet
```

#### Option B: Step-by-Step Deployment

```bash
# Step 1: Estimate deployment costs
npm run deploy:estimate testnet

# Step 2: Deploy contracts
npm run deploy:testnet

# Step 3: Verify deployment
npm run deploy:verify testnet

# Step 4: Check deployment status
npm run deploy:status testnet
```

#### Option C: Manual Script Deployment

```bash
# Navigate to scripts directory and run deployment
bash ./scripts/deploy-contracts.sh testnet
```

### Step 4: Verify Contract Deployment

After deployment, verify the contracts are deployed correctly:

```bash
# Check deployment status
npm run deploy:status testnet

# Test connection to Cosmos
npm run example:cosmos-connection
```

Expected output:
```
🧪 Testing Cosmos Hub testnet connection...
✅ Wallet created successfully
Address: cosmos1kt0vh0ttjzzp8pl6aadmf0ra3s6xvhgd5z3qh5
✅ Connected to chain: theta-testnet-001
✅ Balance query successful
🎉 All tests passed! Cosmos Hub testnet integration working correctly.
```

### Step 5: Record Contract Addresses

After successful deployment, record the contract addresses from the output:

```bash
# Deployment output will show:
# ✅ Mail Contract Code ID: <code_id>
# ✅ Mail Contract Address: cosmos1...
```

Update your `.env.local` with the deployed contract addresses:

```bash
# Contract addresses (from deployment output)
VITE_MAIL_CONTRACT_ADDRESS="cosmos1abc..."
VITE_DOMAIN_CONTRACT_ADDRESS="cosmos1def..."
```

---

## Post-Deployment Testing Guide

### Phase 1: Automated Testing Suite

#### 1.1 Smart Contract Tests

```bash
# Run all contract tests
npm run test:contracts
```

Expected output:
```
Testing PrivaChain smart contracts...
Testing mail contract...
running 2 tests
test contract::tests::test_pow_verification ... ok
test contract::tests::proper_instantiation ... ok
All tests passed!
```

#### 1.2 Frontend Build Tests

```bash
# Test TypeScript compilation
npm run test:build

# Test code linting
npm run test:lint

# Test dependency installation
npm run test:secrets
```

#### 1.3 Cosmos Integration Tests

```bash
# Test Cosmos Hub connection
npm run example:cosmos-connection

# Validate configuration
npm run validate:cosmos-config
```

#### 1.4 Feature Verification

```bash
# Verify all 16 core features
npm run verify-features

# Get detailed report
npm run verify-features:verbose

# Get JSON output for CI/CD
npm run verify-features:json
```

#### 1.5 Complete Test Suite

```bash
# Run everything
npm run test:all
```

This runs:
1. Smart contract tests
2. Code linting
3. TypeScript compilation
4. Development server validation

### Phase 2: Manual Testing Procedures

#### 2.1 Start the Development Server

```bash
# Start the dev server
npm run dev
```

The application will be available at `http://localhost:5173` (or the Codespace forwarded port).

> **Note**: In production environments, always use HTTPS to protect sensitive data.

#### 2.2 Network Connection Testing

**Test Cosmos Testnet Connectivity:**

```bash
# Test RPC endpoint
curl -s https://rpc.theta-testnet.polypore.xyz/status | jq .result.sync_info

# Test REST API
curl -s https://rest.theta-testnet.polypore.xyz:1317/cosmos/base/node/v1beta1/config
```

#### 2.3 Frontend Component Testing

Open the application in your browser and verify:

1. **Initial Load**
   - [ ] Application loads without console errors
   - [ ] All UI components render correctly
   - [ ] Navigation links work properly

2. **Wallet Connection**
   - [ ] Connect wallet section is visible
   - [ ] Wallet address displays correctly
   - [ ] Balance query returns correct data

3. **Domain Registration**
   - [ ] Navigate to "Register Domain" section
   - [ ] Enter a test domain (e.g., "test.prv")
   - [ ] Submit registration transaction
   - [ ] Verify transaction success

4. **Email System**
   - [ ] Navigate to "Send Email" section
   - [ ] Compose and send a test email
   - [ ] Verify email appears in inbox

5. **Search Functionality**
   - [ ] Test search queries
   - [ ] Verify results are returned
   - [ ] Test bang commands (!prv, !mail, etc.)

#### 2.4 Smart Contract Interaction Testing

```bash
# Populate search index
npm run populate-search:testnet

# Test search performance
npm run populate-search:full
```

### Phase 3: Performance and Security Testing

#### 3.1 Performance Validation

Run performance checks:

```bash
# Measure transaction confirmation times
time npm run example:cosmos-connection
```

Validation checklist:
- [ ] Transaction confirmation times < 10 seconds
- [ ] UI response times < 2 seconds
- [ ] Search queries complete < 1 second
- [ ] Application loads in < 5 seconds

#### 3.2 Security Validation

- [ ] No private keys exposed in logs
- [ ] Input validation prevents injection
- [ ] HTTPS used for all connections
- [ ] No sensitive data in local storage

### Phase 4: End-to-End User Journey Testing

#### 4.1 New User Registration Workflow

1. **Initial Setup**
   - User visits application
   - Connects to Cosmos testnet
   - Wallet address is generated/displayed

2. **Domain Registration**
   - User registers a .prv domain
   - Transaction is submitted and confirmed
   - Domain ownership is verified

3. **First Email**
   - User composes an email
   - Recipient domain is validated
   - Email is encrypted and sent
   - Transaction confirmation received

#### 4.2 Advanced Testing Scenarios

- Multiple domain registration
- Bulk email operations
- Complex search queries
- Error handling and recovery

---

## Troubleshooting

### Common Issues and Solutions

#### "vite: not found"

```bash
# Solution: Install dependencies
npm install
```

#### "cargo: not found"

```bash
# Solution: Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### Contract Build Failure

```bash
# Add wasm target
rustup target add wasm32-unknown-unknown

# Clean and rebuild
cd contracts/mail
cargo clean
cargo build --release --target wasm32-unknown-unknown
```

#### Network Connection Issues

```bash
# Test network connectivity
curl -s https://rpc.theta-testnet.polypore.xyz/status

# Verify environment variables
echo $COSMOS_TESTNET_RPC
```

#### Frontend Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run test:build
```

#### Port Already in Use

```bash
# Kill existing process on port 5173
npm run kill

# Or use a different port
npm run dev -- --port 3000
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Enable debug output
DEBUG=1 npm run deploy:testnet

# Verbose output
npm run verify-features:verbose

# Check logs
tail -f error_logs.txt
```

### Getting Help

If you encounter issues not covered here:

1. Check the project issues on GitHub
2. Review the troubleshooting section in [LOCAL_TESTING.md](./LOCAL_TESTING.md)
3. Review [docs/COSMOS_TESTNET_DEPLOYMENT.md](./docs/COSMOS_TESTNET_DEPLOYMENT.md)
4. Create a new issue with:
   - Your environment details
   - Steps to reproduce
   - Error messages
   - Expected vs actual behavior

---

## Quick Reference Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run test:all` | Run complete test suite |
| `npm run test:contracts` | Test smart contracts |
| `npm run contracts:build` | Build contracts for deployment |
| `npm run deploy:testnet` | Deploy to Cosmos testnet |
| `npm run deploy:status testnet` | Check deployment status |
| `npm run dev` | Start development server |
| `npm run verify-features` | Verify all core features |
| `npm run example:cosmos-connection` | Test Cosmos connection |
| `npm run populate-search:testnet` | Populate search index |

---

## Summary

This guide covers:

1. **Codespace Setup** - How to configure your GitHub Codespace environment
2. **Contract Deployment** - Step-by-step instructions for deploying to Cosmos testnet
3. **Automated Testing** - Running the complete test suite
4. **Manual Testing** - Verifying UI and functionality
5. **Performance & Security** - Validation checklists
6. **Troubleshooting** - Common issues and solutions

For additional documentation, refer to:
- [LOCAL_TESTING.md](./LOCAL_TESTING.md) - Local development guide
- [docs/COSMOS_TESTNET_DEPLOYMENT.md](./docs/COSMOS_TESTNET_DEPLOYMENT.md) - Detailed deployment docs
- [docs/COSMOS_TESTNET_TESTING.md](./docs/COSMOS_TESTNET_TESTING.md) - Detailed testing procedures
