# PrivaChain Cosmos Testnet Setup Guide

## Overview

This guide implements the Cosmos testnet setup requirements from the technical specification. It provides step-by-step instructions for deploying PrivaChain to a Cosmos testnet environment.

## Prerequisites

### Software Requirements
- **Ignite CLI**: `curl https://get.ignite.com/cli! | bash`
- **Go**: v1.21+ for Cosmos SDK development
- **Docker**: For containerized node deployment
- **Node.js**: v18+ for frontend integration
- **Rust**: For CosmWasm smart contracts

### Hardware Requirements
- **Memory**: 8GB RAM minimum (16GB recommended)
- **Storage**: 50GB SSD storage
- **Network**: Stable internet connection
- **CPU**: 4 cores minimum

## Step 1: Preparation Tasks

### 1.1 Update Dependencies
```bash
# Update Cosmos SDK dependencies
cargo update

# Update frontend dependencies
npm update

# Ensure WebAssembly target is available
rustup target add wasm32-unknown-unknown
```

### 1.2 Security Audit
```bash
# Audit smart contracts
npm run contracts:test

# Check for vulnerabilities
npm audit

# Verify contract compilation
npm run contracts:build
```

### 1.3 Extend Documentation
This document extends LOCAL_TESTING.md with testnet-specific procedures as required.

## Step 2: Chain Initialization and Configuration

### 2.1 Install Ignite CLI
```bash
# Install Ignite CLI
curl https://get.ignite.com/cli! | bash

# Verify installation
ignite version
```

### 2.2 Initialize Chain
```bash
# Initialize PrivaChain testnet
ignite chain init --chain-id=privachain-testnet

# Configure chain parameters
cd ~/.privachain
```

### 2.3 Configure Genesis
Edit `~/.privachain/config/genesis.json`:

```json
{
  "chain_id": "privachain-testnet",
  "initial_height": "1",
  "genesis_time": "2025-01-01T00:00:00Z",
  "app_state": {
    "bank": {
      "balances": [
        {
          "address": "cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k",
          "coins": [
            {
              "denom": "uatom",
              "amount": "1000000000000"
            }
          ]
        }
      ]
    },
    "staking": {
      "validators": [],
      "delegations": [],
      "unbonding_delegations": [],
      "redelegations": [],
      "exported": false
    }
  }
}
```

### 2.4 Configure Node Settings
Edit `~/.privachain/config/config.toml`:

```toml
# RPC Settings
[rpc]
laddr = "tcp://0.0.0.0:26657"
grpc_laddr = ""
grpc_max_open_connections = 900
unsafe = false
max_open_connections = 900

# P2P Configuration
[p2p]
laddr = "tcp://0.0.0.0:26656"
external_address = ""
seeds = ""
persistent_peers = ""
upnp = false
addr_book_strict = false
max_num_inbound_peers = 40
max_num_outbound_peers = 10
flush_throttle_timeout = "100ms"
max_packet_msg_payload_size = 1024
send_rate = 5120000
recv_rate = 5120000

# Consensus Configuration
[consensus]
wal_file = "data/cs.wal/wal"
timeout_propose = "3s"
timeout_propose_delta = "500ms"
timeout_prevote = "1s"
timeout_prevote_delta = "500ms"
timeout_precommit = "1s"
timeout_precommit_delta = "500ms"
timeout_commit = "5s"
```

Edit `~/.privachain/config/app.toml`:

```toml
# API Configuration
[api]
enable = true
swagger = true
address = "tcp://0.0.0.0:1317"
max-open-connections = 1000
rpc-read-timeout = 10
rpc-write-timeout = 0
rpc-max-body-bytes = 1000000

# gRPC Configuration
[grpc]
enable = true
address = "0.0.0.0:9090"

# State Sync Configuration
[state-sync]
snapshot-interval = 1000
snapshot-keep-recent = 10
```

## Step 3: Smart Contract Deployment

### 3.1 Build Contracts
```bash
# Build all contracts for deployment
npm run contracts:build

# Verify WASM files are created
ls -la contracts/mail/target/wasm32-unknown-unknown/release/
```

### 3.2 Deploy Contracts
```bash
# Store mail contract
simd tx wasm store \
  contracts/mail/target/wasm32-unknown-unknown/release/privachain_mail.wasm \
  --from=dev-sponsor \
  --chain-id=privachain-testnet \
  --gas=auto \
  --gas-adjustment=1.3 \
  --fees=1000uatom \
  --yes

# Get code ID from transaction result
CODE_ID=$(simd query wasm list-code --output json | jq -r '.code_infos[-1].code_id')

# Instantiate mail contract
simd tx wasm instantiate $CODE_ID \
  '{"admin": "cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k"}' \
  --from=dev-sponsor \
  --chain-id=privachain-testnet \
  --label="PrivaChain Mail Contract" \
  --gas=auto \
  --gas-adjustment=1.3 \
  --fees=1000uatom \
  --yes
```

### 3.3 Configure Frontend Integration
Update frontend configuration in `src/config/testnet.ts`:

```typescript
export const TESTNET_CONFIG = {
  chainId: 'privachain-testnet',
  rpcEndpoint: 'http://localhost:26657',
  restEndpoint: 'http://localhost:1317',
  contracts: {
    mail: 'cosmos1...', // Contract address from instantiation
    identity: 'cosmos1...',
    video: 'cosmos1...'
  },
  gasPrice: '0.025uatom',
  sponsorWallet: 'cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k'
}
```

## Step 4: Node Launch

### 4.1 Local Multi-Node Setup
```bash
# Start local testnet with Ignite
ignite chain serve --reset-once

# Verify nodes are running
curl http://localhost:26657/status
curl http://localhost:1317/cosmos/base/tendermint/v1beta1/node_info
```

### 4.2 Dockerized Deployment
Create `docker-compose.testnet.yml`:

```yaml
version: '3.8'
services:
  privachain-node-1:
    image: privachain/node:testnet
    ports:
      - "26657:26657"
      - "26656:26656"
      - "1317:1317"
      - "9090:9090"
    volumes:
      - ./testnet/node1:/root/.privachain
    environment:
      - CHAIN_ID=privachain-testnet
      - MONIKER=validator1

  privachain-node-2:
    image: privachain/node:testnet
    ports:
      - "26658:26657"
      - "26659:26656"
      - "1318:1317"
      - "9091:9090"
    volumes:
      - ./testnet/node2:/root/.privachain
    environment:
      - CHAIN_ID=privachain-testnet
      - MONIKER=validator2

  privachain-frontend:
    image: privachain/frontend:testnet
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_CHAIN_ID=privachain-testnet
      - REACT_APP_RPC_ENDPOINT=http://privachain-node-1:26657
      - REACT_APP_REST_ENDPOINT=http://privachain-node-1:1317
```

### 4.3 Deploy to Cloud Infrastructure
```bash
# Build and push Docker images
docker build -t privachain/node:testnet .
docker push privachain/node:testnet

# Deploy to AWS/DigitalOcean using docker-compose
docker-compose -f docker-compose.testnet.yml up -d
```

## Step 5: IBC and Advanced Setup (Optional)

### 5.1 IBC Channel Creation
```bash
# Create IBC connection to Cosmos Hub testnet
# This requires running Hermes relayer

# Configure relayer
hermes config auto \
  --output ~/.hermes/config.toml \
  --chain privachain-testnet \
  --chain cosmoshub-testnet

# Create connection
hermes create connection \
  --a-chain privachain-testnet \
  --b-chain cosmoshub-testnet

# Create channel for token transfers
hermes create channel \
  --a-chain privachain-testnet \
  --a-connection connection-0 \
  --a-port transfer \
  --b-port transfer
```

## Step 6: Frontend Integration

### 6.1 Update Service Configuration
Update `src/services/cosmosService.ts`:

```typescript
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { TESTNET_CONFIG } from '../config/testnet'

export class CosmosTestnetService {
  private client: SigningCosmWasmClient | null = null

  async connect() {
    this.client = await SigningCosmWasmClient.connectWithSigner(
      TESTNET_CONFIG.rpcEndpoint,
      // Signer configuration
    )
  }

  async executeContract(contractAddress: string, msg: any) {
    if (!this.client) throw new Error('Client not connected')
    
    return await this.client.execute(
      TESTNET_CONFIG.sponsorWallet,
      contractAddress,
      msg,
      'auto'
    )
  }
}
```

### 6.2 Test Frontend Connection
```bash
# Start development server with testnet configuration
REACT_APP_NETWORK=testnet npm run dev

# Verify connection in browser console
# Should show successful connection to testnet RPC
```

## Step 7: Testing and Validation

### 7.1 Smart Contract Tests
```bash
# Test contract deployment
npm run test:contracts

# Test contract interactions
simd query wasm contract-state all cosmos1... --output json
```

### 7.2 Frontend Integration Tests
```bash
# Test with populated search data
npm run populate-search:testnet

# Run full test suite
npm run test:all
```

### 7.3 End-to-End Workflow Tests
```bash
# Test email sending
curl -X POST http://localhost:1317/cosmos/wasm/v1/contract/cosmos1.../smart \
  -d '{"send_email": {"to": "test@example.prv", "subject": "Test", "content": "encrypted_content"}}'

# Test domain registration
curl -X POST http://localhost:1317/cosmos/wasm/v1/contract/cosmos1.../smart \
  -d '{"register_domain": {"domain": "test.prv", "owner": "cosmos1..."}}'
```

## Step 8: Monitoring and Maintenance

### 8.1 Node Monitoring
```bash
# Check node status
curl http://localhost:26657/status | jq .

# Monitor logs
docker logs privachain-node-1 -f

# Check validator status
simd query staking validators --output json
```

### 8.2 Performance Metrics
```bash
# Monitor transaction throughput
curl http://localhost:26657/blockchain | jq '.result.block_metas | length'

# Check memory usage
docker stats privachain-node-1
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Kill existing processes
   sudo lsof -ti:26657 | xargs kill -9
   sudo lsof -ti:26656 | xargs kill -9
   ```

2. **Genesis File Issues**
   ```bash
   # Reset chain data
   ignite chain init --chain-id=privachain-testnet --reset
   ```

3. **Contract Deployment Failures**
   ```bash
   # Check account balance
   simd query bank balances cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k
   
   # Verify WASM file
   file contracts/mail/target/wasm32-unknown-unknown/release/privachain_mail.wasm
   ```

4. **RPC Connection Issues**
   ```bash
   # Check if RPC is responding
   curl -s http://localhost:26657/health
   
   # Verify CORS settings in config.toml
   grep -A 5 "\[rpc\]" ~/.privachain/config/config.toml
   ```

## Security Considerations

### Testnet Security
- Use separate keys for testnet (never use mainnet keys)
- Enable firewall rules for production deployment
- Regularly backup validator keys and node data
- Monitor for unusual network activity

### Gas Management
- Configure appropriate gas limits
- Set up gas fee monitoring
- Implement automatic fee adjustment based on network congestion

## Next Steps

1. **Mainnet Preparation**: Use testnet experience to prepare mainnet deployment
2. **Community Testing**: Invite community members to test features
3. **Security Audits**: Conduct thorough security audits before mainnet
4. **Documentation Updates**: Keep documentation updated based on testnet learnings

## Resources

- [Cosmos SDK Documentation](https://docs.cosmos.network/)
- [Ignite CLI Documentation](https://docs.ignite.com/)
- [CosmWasm Documentation](https://docs.cosmwasm.com/)
- [IBC Documentation](https://ibc.cosmos.network/)