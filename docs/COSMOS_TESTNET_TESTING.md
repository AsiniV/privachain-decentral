# Cosmos Testnet Testing Guide

This document provides detailed instructions for testing PrivaChain functionality in the Cosmos testnet environment, including automated tests, manual testing procedures, and validation checklists.

## Overview

PrivaChain testing on Cosmos testnet involves multiple layers:
- **Smart Contract Testing**: Verify CosmWasm contracts work correctly
- **Frontend Integration Testing**: Test UI components with live blockchain
- **End-to-End Testing**: Validate complete user workflows
- **Performance Testing**: Monitor transaction throughput and costs
- **Security Testing**: Verify cryptographic implementations

## Prerequisites

Before running tests, ensure you have completed the deployment setup from [COSMOS_TESTNET_DEPLOYMENT.md](./COSMOS_TESTNET_DEPLOYMENT.md).

### Required Environment
- Deployed contracts on Cosmos testnet
- Frontend application built and running
- Test wallet with sufficient ATOM tokens
- Network access to Cosmos testnet endpoints

### Test Configuration

Ensure your `.env.local` file contains:
```bash
# Cosmos testnet configuration
COSMOS_TESTNET_RPC="https://rpc.theta-testnet.polypore.xyz"
COSMOS_TESTNET_REST="https://rest.theta-testnet.polypore.xyz:1317"
COSMOS_TESTNET_CHAIN_ID="theta-testnet-001"

# Test wallet with pre-funded tokens
TEST_WALLET_ADDRESS="cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k"
TEST_WALLET_MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

# Contract addresses (update after deployment)
MAIL_CONTRACT_ADDRESS="cosmos1..."
DOMAIN_CONTRACT_ADDRESS="cosmos1..."
```

## Automated Testing Suite

### 1. Smart Contract Tests

Test the deployed smart contracts:

```bash
# Run all contract tests
npm run test:contracts

# Test specific contract
cd contracts/mail && cargo test
cd contracts/domain-registry && cargo test
```

**Expected Output:**
```
Testing PrivaChain smart contracts...
Testing mail contract...
running 2 tests
test contract::tests::test_pow_verification ... ok
test contract::tests::proper_instantiation ... ok

Testing domain registry contract...
running 4 tests
test crypto::tests::test_domain_hash ... ok
test crypto::tests::test_domain_commitment ... ok
test crypto::tests::test_signature_verification ... ok
test crypto::tests::test_zk_proof_verification ... ok

All tests passed!
```

### 2. Frontend Build Tests

Verify the frontend builds correctly:

```bash
# Test TypeScript compilation
npm run test:build

# Test code quality
npm run test:lint

# Test dependency installation
npm run test:secrets
```

### 3. Cosmos Integration Tests

Test connection to Cosmos testnet:

```bash
# Test Cosmos Hub connection
npm run example:cosmos-connection

# Validate configuration
npm run validate:cosmos-config
```

**Expected Output:**
```
🧪 Testing Cosmos Hub testnet connection...
✅ Wallet created successfully
Address: cosmos1kt0vh0ttjzzp8pl6aadmf0ra3s6xvhgd5z3qh5
✅ Connected to chain: theta-testnet-001
✅ Balance query successful: {"denom":"uatom","amount":"1000000"}
🎉 All tests passed! Cosmos Hub testnet integration working correctly.
```

### 4. Feature Verification Tests

Run comprehensive feature verification:

```bash
# Verify all 16 core features
npm run verify-features

# Get detailed report
npm run verify-features:verbose

# Get JSON output for CI/CD
npm run verify-features:json
```

### 5. Development Server Tests

Test the complete application stack:

```bash
# Test development server startup
npm run test:dev-server

# Run full test suite
npm run test:all
```

## Manual Testing Procedures

### 1. Network Connection Testing

#### Test Cosmos Testnet Connectivity

1. **RPC Endpoint Test**:
   ```bash
   curl -s https://rpc.theta-testnet.polypore.xyz/status | jq .result.sync_info
   ```
   Should return current block height and sync status.

2. **REST API Test**:
   ```bash
   curl -s https://rest.theta-testnet.polypore.xyz:1317/cosmos/base/node/v1beta1/config
   ```
   Should return node configuration.

3. **WebSocket Test** (optional):
   ```bash
   # Test WebSocket connection for real-time updates
   wscat -c wss://rpc.theta-testnet.polypore.xyz/websocket
   ```

#### Test Wallet Connection

1. Start the development server: `npm run dev`
2. Open browser to `http://localhost:5173`
3. Navigate to "Connect Wallet" or blockchain section
4. Verify wallet address displays correctly
5. Check balance query shows ATOM balance

### 2. Smart Contract Interaction Testing

#### Mail Contract Testing

1. **Domain Registration**:
   - Navigate to "Register Domain" section
   - Enter a test domain (e.g., "test.prv")
   - Submit registration transaction
   - Verify transaction success and domain ownership

2. **Email Sending**:
   - Navigate to "Send Email" section
   - Enter recipient domain and message
   - Submit send transaction
   - Verify email appears in recipient's inbox

3. **Email Querying**:
   - Navigate to "Inbox" section
   - Query emails for a domain
   - Verify emails display correctly with metadata

#### Domain Registry Testing

1. **Domain Registration**:
   - Test domain name validation
   - Test ZK-proof generation (mock implementation)
   - Test domain ownership verification

2. **Domain Queries**:
   - Query domain by hash
   - Query domains owned by public key
   - Query expiring domains

### 3. Frontend Component Testing

#### User Interface Testing

1. **Navigation**:
   - Test all navigation links work
   - Verify responsive design on different screen sizes
   - Check accessibility features

2. **Forms and Inputs**:
   - Test all form validations
   - Verify error message display
   - Test input sanitization

3. **Real-time Updates**:
   - Test WebSocket connections for live updates
   - Verify state management works correctly
   - Test component re-rendering

#### Video Calling Testing (WebRTC)

1. **Session Creation**:
   - Start a video call session
   - Verify blockchain signaling transaction
   - Check session ID generation

2. **WebRTC Connection**:
   - Test peer-to-peer connection establishment
   - Verify audio/video streams
   - Test call controls (mute, video toggle, hang up)

3. **Blockchain Integration**:
   - Verify signaling data stored on blockchain
   - Test session timeout handling
   - Check micropayment calculations

### 4. Performance Testing

#### Transaction Performance

1. **Latency Testing**:
   ```bash
   # Measure transaction confirmation times
   time npm run example:cosmos-connection
   ```

2. **Throughput Testing**:
   - Send multiple transactions simultaneously
   - Monitor block inclusion times
   - Track gas usage patterns

3. **Load Testing**:
   - Simulate multiple concurrent users
   - Test application performance under load
   - Monitor error rates

#### Storage Performance

1. **IPFS Testing**:
   - Test file upload/download speeds
   - Verify content addressing works
   - Test file retrieval from different gateways

2. **Search Performance**:
   ```bash
   # Populate search index
   npm run populate-search:testnet
   
   # Test search performance
   npm run populate-search:full
   ```

## Test Scenarios and Workflows

### 1. Complete User Journey Testing

#### New User Registration Workflow

1. **Initial Setup**:
   - User visits application
   - Connects to Cosmos testnet
   - Wallet address is generated/displayed

2. **Domain Registration**:
   - User registers a .prv domain
   - ZK-proof is generated (mock)
   - Transaction is submitted and confirmed
   - Domain ownership is verified

3. **First Email**:
   - User composes an email
   - Recipient domain is validated
   - Email is encrypted and sent
   - Transaction confirmation received

4. **Video Call**:
   - User initiates video call
   - Session is created on blockchain
   - WebRTC connection established
   - Call quality adaptation tested

#### Advanced User Workflows

1. **Power User Scenarios**:
   - Multiple domain registration
   - Bulk email operations
   - Complex search queries
   - Video call with multiple participants

2. **Edge Cases**:
   - Network disconnection handling
   - Transaction failure recovery
   - Invalid input handling
   - Rate limiting behavior

### 2. Error Handling Testing

#### Network Error Scenarios

1. **RPC Endpoint Failure**:
   - Disconnect from network
   - Verify graceful error handling
   - Test automatic retry logic
   - Check user notification system

2. **Transaction Failures**:
   - Insufficient gas errors
   - Invalid transaction data
   - Network congestion
   - Recovery procedures

#### Application Error Scenarios

1. **Frontend Errors**:
   - JavaScript runtime errors
   - Component loading failures
   - State corruption recovery
   - User session management

2. **Contract Interaction Errors**:
   - Invalid contract calls
   - Permission denied errors
   - Contract state inconsistencies
   - Gas estimation failures

## Validation Checklists

### 1. Deployment Validation Checklist

Before proceeding with testing, verify:

- [ ] All smart contracts deployed successfully
- [ ] Contract addresses recorded and configured
- [ ] Frontend build completed without errors
- [ ] Environment variables properly set
- [ ] Network endpoints accessible
- [ ] Test wallets funded with sufficient tokens

### 2. Functionality Validation Checklist

#### Core Features
- [ ] Cosmos testnet connection works
- [ ] Wallet creation and management
- [ ] Transaction signing and submission
- [ ] Balance queries return correct data
- [ ] Gas sponsorship system functional

#### Mail System
- [ ] Domain registration works
- [ ] Email sending completes successfully
- [ ] Email querying returns correct data
- [ ] Proof-of-work verification functions
- [ ] Encryption/decryption works (if implemented)

#### Video System
- [ ] WebRTC sessions can be created
- [ ] Blockchain signaling works
- [ ] Peer-to-peer connections establish
- [ ] Audio/video streams function
- [ ] Call controls respond correctly

#### Search System
- [ ] Search index can be populated
- [ ] Queries return relevant results
- [ ] Ranking algorithms work
- [ ] Performance is acceptable
- [ ] Error handling is robust

### 3. Performance Validation Checklist

- [ ] Transaction confirmation times < 10 seconds
- [ ] UI response times < 2 seconds
- [ ] Video call latency < 500ms
- [ ] Search queries complete < 1 second
- [ ] File uploads complete reliably
- [ ] Application loads in < 5 seconds

### 4. Security Validation Checklist

- [ ] No private keys exposed in logs
- [ ] Input validation prevents injection
- [ ] ZK-proofs validate correctly (mock)
- [ ] Transaction signatures verify
- [ ] HTTPS used for all connections
- [ ] No sensitive data in local storage

## Continuous Integration Testing

### 1. Automated CI/CD Pipeline

Create GitHub Actions workflow for automated testing:

```yaml
name: Testnet Testing
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run contract tests
        run: npm run test:contracts
      
      - name: Run build tests
        run: npm run test:build
      
      - name: Run feature verification
        run: npm run verify-features:json
        env:
          COSMOS_TESTNET_RPC: ${{ secrets.COSMOS_TESTNET_RPC }}
```

### 2. Test Reporting

Generate comprehensive test reports:

```bash
# Generate test report
npm run verify-features:json > test-report.json

# Generate readiness assessment
npm run assess:readiness:json > readiness-report.json
```

### 3. Performance Monitoring

Set up monitoring for:
- Transaction success rates
- Average confirmation times
- Error frequencies
- User adoption metrics

## Troubleshooting Testing Issues

### 1. Common Test Failures

#### Contract Test Failures
```bash
# Rebuild contracts
npm run contracts:build

# Clear cargo cache
cd contracts && cargo clean
```

#### Network Connection Failures
```bash
# Test network connectivity
curl -s https://rpc.theta-testnet.polypore.xyz/status

# Verify environment variables
echo $COSMOS_TESTNET_RPC
```

#### Frontend Test Failures
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run test:build
```

### 2. Debug Procedures

#### Enable Debug Mode
```bash
# Enable detailed logging
DEBUG=1 npm run test:all

# Verbose output
npm run verify-features:verbose
```

#### Check Logs
```bash
# Application logs
tail -f error_logs.txt

# Browser console logs
# Open developer tools and check console
```

#### Network Debugging
```bash
# Monitor network requests
# Use browser developer tools Network tab

# Check RPC responses
curl -s https://rpc.theta-testnet.polypore.xyz/status | jq
```

## Test Data and Fixtures

### 1. Test Accounts

Standard test accounts for consistent testing:

```bash
# Primary test account
TEST_MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
TEST_ADDRESS="cosmos1kt0vh0ttjzzp8pl6aadmf0ra3s6xvhgd5z3qh5"

# Secondary test account  
TEST_MNEMONIC_2="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"
TEST_ADDRESS_2="cosmos1..."
```

### 2. Test Data Sets

Use consistent test data:

```javascript
const testDomains = [
  "alice.prv",
  "bob.prv", 
  "test.prv",
  "example.prv"
];

const testEmails = [
  {
    from: "alice.prv",
    to: "bob.prv",
    subject: "Test Email",
    content: "This is a test email"
  }
];
```

### 3. Test Fixtures

Prepare test fixtures for automated testing:

```bash
# Populate test data
npm run populate-search:testnet

# Reset test data
# (Would need custom script to clean test state)
```

## Documentation and Reporting

### 1. Test Documentation

Document all test procedures:
- Test case descriptions
- Expected outcomes
- Actual results
- Pass/fail criteria

### 2. Bug Reporting

When tests fail, document:
- Reproduction steps
- Environment details
- Error messages
- Screenshots/logs
- Suggested fixes

### 3. Test Metrics

Track key metrics:
- Test coverage percentage
- Pass/fail rates
- Performance benchmarks
- Bug discovery rates

## Support and Resources

### Getting Help

If you encounter testing issues:

1. **Check existing documentation**
2. **Review GitHub issues**
3. **Contact development team**
4. **Join community Discord**

### External Resources

- [Cosmos Hub Testnet Documentation](https://docs.cosmos.network/hub/testnet)
- [CosmWasm Testing Guide](https://docs.cosmwasm.com/docs/1.0/getting-started/unit-tests)
- [WebRTC Testing Tools](https://webrtc.github.io/samples/)

---

This comprehensive testing guide ensures PrivaChain functionality is thoroughly validated on Cosmos testnet before production deployment. Follow all procedures systematically and document any issues discovered during testing.