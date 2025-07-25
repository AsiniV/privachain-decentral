# PrivaChain Smart Contract Implementation

This directory contains the CosmWasm smart contracts for the PrivaChain testnet.

## Contract Overview

### Core Contracts
- **messaging**: E2E encrypted messaging with Signal Protocol
- **mail**: Anonymous .prv domain registry and email routing
- **identity**: ZK-SNARK identity verification and management
- **video**: Decentralized video call signaling and TURN coordination
- **staking**: PRIV token staking and validator rewards
- **governance**: DAO governance and proposal management

### Architecture
```
contracts/
├── messaging/           # Encrypted messaging contracts
├── mail/               # Anonymous email system
├── identity/           # ZK identity management
├── video/              # Video call coordination
├── staking/            # Token staking and rewards
├── governance/         # DAO governance
└── shared/             # Shared utilities and types
```

## Development Setup

```bash
# Install dependencies
cargo install cosmwasm-check
rustup target add wasm32-unknown-unknown

# Build all contracts
./scripts/build.sh

# Run tests
./scripts/test.sh

# Deploy to testnet
./scripts/deploy.sh --network testnet
```

## Testing Wallet
Primary test wallet: `cosmos1hcgd3hg6kpvsfuklsgkzjratda53vwsymrp24k`

This wallet will be pre-funded with 1M PRIV tokens for testnet operations.