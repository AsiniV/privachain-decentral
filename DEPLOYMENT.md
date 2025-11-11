# PrivaChain One-Button Deployment

This directory contains a comprehensive one-button orchestration system for deploying the complete PrivaChain infrastructure to production.

## Overview

The deployment system orchestrates:
1. **Cosmos smart-contracts** (ZK verifier + anon resolver) to Osmosis mainnet
2. **IPFS CAR files** to Filebase (paid tier)
3. **I2P tunnel configuration** for anonymous networking
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

# 3. Install I2P router (i2pd)
sudo apt install -y i2pd

# Configure SAM bridge
sudo mkdir -p /etc/i2pd
cat << 'EOF' | sudo tee /etc/i2pd/i2pd.conf > /dev/null
[sam]
enabled = true
address = 127.0.0.1
port = 7656
EOF

# Start i2pd service
sudo systemctl enable --now i2pd
sudo systemctl status i2pd

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
export I2P_SAM_HOST="127.0.0.1:7656"  # optional, defaults to 127.0.0.1:7656
export ZK_VERIFICATION_KEY="your-zk-verification-key"  # optional

# For local testing (safe to use)
export COSMOS_MNEMONIC="test test test test test test test test test test test junk"
export FILEBASE_KEY="test-key"
export FILEBASE_SECRET="test-secret"
export I2P_SAM_HOST="127.0.0.1:7656"
```

**⚠️ Security Warning:** 
- NEVER commit real credentials to version control
- Use GitHub Secrets for CI/CD (see CI/CD Integration section)
- In production, use secure secret management (e.g., HashiCorp Vault, AWS Secrets Manager)
- Rotate credentials regularly

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
- Uploads timestamped CAR file (format: `app-vYYYY-MM-DD.car`, e.g., `app-v2025-10-28.car`)
- Outputs `IPFS_ROOT_CID`

### 3. I2P Tunnel Configuration

The I2P router (i2pd) should be running with SAM bridge enabled. Verify:

```bash
# Check i2pd is running
sudo systemctl status i2pd

# Verify SAM bridge is listening
netstat -tuln | grep 7656
# or
ss -tuln | grep 7656

# Configure custom SAM host (optional)
export I2P_SAM_HOST="127.0.0.1:7656"
```

### 4. Smoke Tests

Run tests against real endpoints:

```bash
./scripts/smoke_real.sh
```

Tests include:
- Cosmos contract queries
- IPFS gateway reachability
- I2P SAM bridge connectivity
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
- `I2P_SAM_HOST` (optional, defaults to 127.0.0.1:7656)
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

### "I2P SAM bridge connection failed"

Ensure i2pd is installed and running with SAM bridge enabled on port 7656:
```bash
sudo systemctl status i2pd
# Check SAM bridge is listening
netstat -tuln | grep 7656
```

## Development Workflow

```bash
# 1. Set test environment variables
export COSMOS_MNEMONIC="test test test test test test test test test test test junk"
export FILEBASE_KEY="test-key"
export FILEBASE_SECRET="test-secret"
export I2P_SAM_HOST="127.0.0.1:7656"

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
