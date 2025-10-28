# PrivaChain One-Button Deployment

This directory contains a comprehensive one-button orchestration system for deploying the complete PrivaChain infrastructure to production.

## Overview

The deployment system orchestrates:
1. **Cosmos smart-contracts** (ZK verifier + anon resolver) to Osmosis main-net
2. **IPFS CAR files** to Filebase (paid tier)
3. **NYM bandwidth credentials** purchase
4. **Real-endpoint smoke tests** (no stubs, no mocks)

All deployments are **idempotent** - you can run them N times without duplicating resources.

## Quick Start

### Prerequisites (One-time Setup)

```bash
# 1. Install system tools
sudo apt update && sudo apt install -y jq curl git python3 python3-venv

# 2. Install Osmosis binary (v21.0.0)
wget -q -O osmosisd https://github.com/osmosis-labs/osmosis/releases/download/v21.0.0/osmosisd-21.0.0-linux-amd64
chmod +x osmosisd && sudo mv osmosisd /usr/local/bin
osmosisd version     # Should show: 21.0.0

# 3. Install NYM wallet (AppImage)
wget https://github.com/nymtech/nym/releases/download/v1.2.0/nym-wallet_1.2.0_amd64.AppImage
chmod +x nym-wallet_1.2.0_amd64.AppImage
sudo mv nym-wallet_1.2.0_amd64.AppImage /usr/local/bin/nym-wallet

# 4. Install Filebase CLI (S3-compatible)
curl -L https://github.com/filebase/filebase-cli/releases/latest/download/filebase-linux-amd64 -o filebase
chmod +x filebase && sudo mv filebase /usr/local/bin
filebase version

# 5. Install Rust toolchain and cargo-make
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install cargo-make
```

### Environment Variables

Set these environment variables before running deployments:

```bash
# For production (keep these secret!)
export COSMOS_MNEMONIC="word1 word2 ... word24"
export FILEBASE_KEY="your-filebase-access-key"
export FILEBASE_SECRET="your-filebase-secret-key"
export NYM_BANDWIDTH_CRED="your-nym-credential"
export ZK_VERIFICATION_KEY="your-zk-verification-key"  # optional

# For local testing (safe to use)
export COSMOS_MNEMONIC="test test test test test test test test test test test junk"
export FILEBASE_KEY="test-key"
export FILEBASE_SECRET="test-secret"
export NYM_BANDWIDTH_CRED="test-cred"
```

### Deploy Everything

```bash
# Dry-run (no actual deployment, fast, free)
./scripts/full_deploy.sh --dry-run

# Deploy to testnet (osmo-test-5)
./scripts/full_deploy.sh

# Deploy to mainnet (osmosis-1)
./scripts/full_deploy.sh --mainnet
```

## Directory Structure

```
privachain-decentral/
├── cosmos/                      # Cosmos smart contracts
│   ├── contract/
│   │   ├── zk_verifier.wasm
│   │   └── anon_resolver.wasm
│   └── scripts/
│       ├── deploy_all.sh       # Master Cosmos deployer
│       ├── store_code.sh       # Store contract code on-chain
│       └── instantiate.sh      # Instantiate contracts
├── ipfs/
│   ├── out/                    # Generated CAR files (gitignored)
│   └── scripts/
│       └── upload_car.sh       # Upload to Filebase
├── nym/
│   └── scripts/
│       └── buy_bw.sh           # Purchase bandwidth
└── scripts/
    ├── full_deploy.sh          # Single entry-point orchestrator
    └── smoke_real.sh           # Real-endpoint tests
```

## Individual Components

### 1. Cosmos Smart Contracts

Deploy smart contracts to Osmosis:

```bash
# Deploy to testnet
./cosmos/scripts/deploy_all.sh osmo-test-5 --dry-run

# Deploy to mainnet
./cosmos/scripts/deploy_all.sh osmosis-1
```

This script:
- Imports wallet from `COSMOS_MNEMONIC`
- Stores contract code on-chain
- Instantiates contracts with verification keys
- Outputs `CODE_ID` and `CONTRACT_ADDRESS`

### 2. IPFS Upload

Upload CAR files to Filebase:

```bash
# Dry-run
./ipfs/scripts/upload_car.sh --dry-run

# Actual upload
./ipfs/scripts/upload_car.sh
```

This script:
- Builds CAR file if not present (using `cargo make build-car`)
- Creates Filebase bucket (idempotent)
- Uploads timestamped CAR file
- Outputs `IPFS_ROOT_CID`

### 3. NYM Bandwidth

Purchase NYM bandwidth credentials:

```bash
# Dry-run
./nym/scripts/buy_bw.sh --dry-run

# Actual purchase
./nym/scripts/buy_bw.sh
```

This burns 1,000 NYM tokens for bandwidth.

### 4. Smoke Tests

Run tests against real endpoints:

```bash
./scripts/smoke_real.sh
```

Tests include:
- Cosmos contract queries
- IPFS gateway reachability
- NYM mixnet latency
- ZK proof verification
- Bundle size guard (<53MB)

## CI/CD Integration

### GitHub Actions

The repository includes a `.github/workflows/deploy-smoke.yml` workflow that:
- Installs all dependencies
- Loads secrets from GitHub Secrets
- Runs full deployment (with dry-run on push)
- Uploads artifacts (contracts, CAR files)

Required GitHub Secrets:
- `COSMOS_MNEMONIC`
- `FILEBASE_KEY`
- `FILEBASE_SECRET`
- `NYM_BANDWIDTH_CRED`
- `ZK_VERIFICATION_KEY` (optional)

### Manual Workflow Dispatch

You can manually trigger deployments from GitHub Actions with options:
- **Dry Run**: Test without actual deployment
- **Use Mainnet**: Deploy to osmosis-1 instead of testnet

## Best Practices

### 12-Factor App Principles

- All secrets in environment variables (never committed)
- Configuration via env vars
- Fail fast on missing config
- Exit non-zero on any error

### Idempotency

- Wallet import checks if key exists
- Bucket creation uses `|| true` to ignore existing
- Contract code can be stored multiple times (new CODE_ID)

### Zero Regression

- All scripts use `set -euo pipefail` (strict mode)
- Failures exit immediately
- Feature flags unchanged (ZK/PQ/mixnet tests in smoke)
- Dry-run mode hits zero paid APIs

## Troubleshooting

### "osmosisd: command not found"

Install Osmosis binary (see Prerequisites).

### "Failed to import wallet"

Check that `COSMOS_MNEMONIC` is a valid 12 or 24-word BIP-39 phrase.

### "Failed to upload CAR file"

Verify Filebase credentials and network connectivity.

### "NYM wallet command failed"

Ensure nym-wallet is installed and `NYM_BANDWIDTH_CRED` is valid.

## Development Workflow

```bash
# 1. Set test environment variables
export COSMOS_MNEMONIC="test test test test test test test test test test test junk"
export FILEBASE_KEY="test-key"
export FILEBASE_SECRET="test-secret"
export NYM_BANDWIDTH_CRED="test-cred"

# 2. Test with dry-run (fast, no cost)
./scripts/full_deploy.sh --dry-run

# 3. When ready, deploy to testnet
./scripts/full_deploy.sh

# 4. After testing, deploy to mainnet
./scripts/full_deploy.sh --mainnet
```

## Security Notes

- Never commit real mnemonics or secrets
- Use GitHub Secrets for CI/CD
- Test with dry-run before production
- Mainnet deployments cost real tokens
- Review all changes before mainnet deployment

## License

Same as parent project (see root LICENSE file).
