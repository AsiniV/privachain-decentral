# PrivaChain Production Deployment Checklist

This document outlines the steps required to deploy PrivaChain with real infrastructure, removing all simulation and fallback logic.

## ✅ Phase 1: Infrastructure Setup

### Cosmos Blockchain
- [ ] Deploy smart contracts to PrivaChain testnet
  - [ ] Video signaling contract
  - [ ] Storage quota contract
  - [ ] TURN relay staking contract
- [ ] Configure `DEVELOPER_MNEMONIC` with funded testnet wallet
- [ ] Verify RPC endpoints are accessible:
  - `https://rpc-testnet.privachain.network`
  - `https://api-testnet.privachain.network`

### IPFS & Filecoin
- [ ] Set up Infura IPFS project
  - [ ] Configure `INFURA_PROJECT_ID`
  - [ ] Configure `INFURA_SECRET`
- [ ] Set up Filecoin storage providers
  - [ ] Configure Lotus API endpoint
  - [ ] Configure Powergate endpoint (optional)
  - [ ] Obtain Filecoin API token
- [ ] Set up IPFS pinning service
  - [ ] Configure pinning service token

### TURN/STUN Servers
- [ ] Deploy Coturn servers
  - [ ] `turn1.privachain.network:3478`
  - [ ] `turn2.privachain.network:3478`
  - [ ] `turn3.privachain.network:3478`
- [ ] Configure TURN server credentials
- [ ] Deploy on-chain TURN registry contract

### ZK-SNARKs
- [ ] Generate circuit files using circom
  - [ ] Create `circuit.wasm`
  - [ ] Create `circuit_final.zkey`
  - [ ] Create `verification_key.json`
- [ ] Deploy circuit files to accessible URLs
- [ ] Configure circuit paths in environment

### Nym Mixnet
- [ ] Set up Nym client
- [ ] Configure Nym endpoint
- [ ] Obtain client ID for mixnet access

## ✅ Phase 2: Environment Configuration

Copy `.env.example` to `.env` and configure all required variables:

```bash
cp .env.example .env
# Edit .env with your actual values
```

### Critical Environment Variables
```bash
# Blockchain
DEVELOPER_MNEMONIC="your testnet wallet mnemonic"
VIDEO_SIGNALING_CONTRACT="cosmos1..."
QUOTA_CONTRACT_ADDR="cosmos1..."

# IPFS
INFURA_PROJECT_ID="your_project_id"
INFURA_SECRET="your_secret"

# ZK-SNARKs
ZK_CIRCUIT_WASM="https://your-domain.com/circuit.wasm"
ZK_CIRCUIT_ZKEY="https://your-domain.com/circuit_final.zkey"
ZK_VERIFICATION_KEY="https://your-domain.com/verification_key.json"

# Nym
NYM_ENDPOINT="https://validator.nymtech.net"
NYM_CLIENT_ID="your_client_id"
```

## ✅ Phase 3: Service Dependencies

### Required External Libraries
Install additional packages for production features:

```bash
# Post-quantum cryptography (when available)
npm install kyber-crystals dilithium-crystals

# Nym mixnet client (when available)
npm install @nymproject/nym-client

# Additional OrbitDB dependencies
npm install @orbitdb/core libp2p helia
```

## ✅ Phase 4: Contract Deployment

Deploy smart contracts to testnet:

```bash
# Deploy video signaling contract
npm run deploy:testnet

# Verify deployment
npm run deploy:status
```

## ✅ Phase 5: Testing & Validation

### Service Initialization Tests
```bash
# Test blockchain connection
npm run test:blockchain

# Test IPFS initialization
npm run test:ipfs

# Test ZK circuit loading
npm run test:zk

# Full integration test
npm run test:integration
```

### Manual Verification Steps
1. **Cosmos Connection**: Verify testnet RPC responds to `/status`
2. **IPFS Upload**: Test file upload and retrieval
3. **ZK Proofs**: Generate and verify a test proof
4. **Video Signaling**: Create a test video session
5. **TURN Relays**: Verify TURN server connectivity

## ✅ Phase 6: Security Considerations

### Pre-Deployment Security Checklist
- [ ] Environment variables secured and not in version control
- [ ] Smart contracts audited by third party
- [ ] ZK circuit trusted setup verified
- [ ] TURN servers properly authenticated
- [ ] IPFS content encryption enabled
- [ ] Nym transport properly configured

### Monitoring Setup
- [ ] Blockchain transaction monitoring
- [ ] IPFS pinning status monitoring
- [ ] TURN server performance monitoring
- [ ] ZK proof generation latency monitoring

## ✅ Phase 7: Production Deployment

### Build for Production
```bash
# Build optimized production bundle
npm run build

# Test production build
npm run preview
```

### Deployment Command
```bash
# Deploy to production
npm run deploy:mainnet
```

## 🚨 Removed Simulation Features

The following simulation features have been removed and now require real implementations:

### Cosmos Blockchain
- ❌ Mock testnet status generation
- ❌ Simulated blockchain transactions
- ❌ Demo wallet fallbacks
- ✅ Real RPC/API calls required
- ✅ Actual smart contract deployment required

### IPFS & Storage
- ❌ Simulated Filecoin deals
- ❌ Mock storage metrics
- ❌ Fallback IPFS modes
- ✅ Real Infura/IPFS endpoints required
- ✅ Actual Filecoin storage providers required

### ZK-SNARKs
- ❌ Simplified proof generation
- ❌ Mock verification results
- ❌ Hash-based fallback proofs
- ✅ Real circom circuits required
- ✅ snarkjs integration required

### Video/TURN
- ❌ Simulated TURN server payments
- ❌ Mock relay node management
- ❌ Fallback video signaling
- ✅ Real Coturn deployment required
- ✅ On-chain staking required

### Nym Mixnet
- ❌ Simulated anonymity proofs
- ❌ Mock mixnet topology
- ❌ Placeholder transport initialization
- ✅ Real Nym client required
- ✅ Actual mixnet routing required

### OrbitDB/Search
- ❌ Browser-only simulation mode
- ❌ Mock peer connections
- ❌ Simulated content indexing
- ✅ Real OrbitDB P2P required
- ✅ libp2p networking required

## 📋 Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   - Error: Services fail to initialize
   - Solution: Ensure all required env vars are set

2. **Smart Contracts Not Deployed**
   - Error: Contract interaction fails
   - Solution: Deploy contracts using deployment scripts

3. **ZK Circuits Not Available**
   - Error: Proof generation fails
   - Solution: Generate and host circuit files

4. **IPFS/Filecoin Access Issues**
   - Error: Storage operations fail
   - Solution: Verify API credentials and endpoints

5. **TURN Server Connectivity**
   - Error: Video calls fail to connect
   - Solution: Check TURN server deployment and firewall

### Getting Help

- Check logs in browser developer console
- Verify environment variable configuration
- Test individual service components
- Consult deployment documentation for each service

## 🎯 Success Criteria

Deployment is successful when:
- ✅ All services initialize without errors
- ✅ Blockchain transactions execute on real testnet
- ✅ IPFS uploads complete to real infrastructure
- ✅ ZK proofs generate using real circuits
- ✅ Video calls route through deployed TURN servers
- ✅ Search indexing works via OrbitDB
- ✅ No simulation/fallback modes are active