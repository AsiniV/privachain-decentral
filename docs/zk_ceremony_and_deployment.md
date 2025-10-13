# ZK-SNARK Trusted Setup Ceremony and Deployment Guide

This guide covers the complete process of conducting a trusted setup ceremony for ZK-SNARK circuits and deploying the verifier contract on-chain.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Trusted Setup Ceremony](#trusted-setup-ceremony)
3. [On-Chain Verifier Deployment](#on-chain-verifier-deployment)
4. [Anonymous Bandwidth Purchase](#anonymous-bandwidth-purchase)
5. [Anonymous Governance Voting](#anonymous-governance-voting)
6. [Security Testing](#security-testing)
7. [Production Recommendations](#production-recommendations)

## Prerequisites

### Required Tools

```bash
# Install circom compiler
npm install -g circom@latest

# Install snarkjs for cryptographic operations
npm install -g snarkjs@latest

# Install Rust toolchain (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# For on-chain deployment (optional)
# Install osmosisd or your preferred Cosmos SDK CLI
# See: https://docs.osmosis.zone/networks/join-mainnet
```

### System Requirements

- **CPU**: 4+ cores recommended for faster ceremony
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 2GB free space for artifacts
- **Network**: Internet connection for downloading Powers of Tau

## Trusted Setup Ceremony

### Overview

The trusted setup ceremony consists of two phases:

1. **Phase 1 (Powers of Tau)**: Universal setup for all circuits of a given size
2. **Phase 2 (Circuit-Specific)**: Setup specific to the gas_payer circuit

### Running the Ceremony

```bash
# Compile the circuit first
./scripts/zk_compile.sh

# Run the trusted setup ceremony
./scripts/zk_ceremony.sh
```

### What Happens During Ceremony

#### Phase 1: Powers of Tau

1. **Initialize**: Create initial parameters for BLS12-381 curve with 2^12 constraints
2. **Contribute**: Each participant adds entropy (default: alice, bob, charlie)
3. **Prepare**: Convert Phase 1 output for circuit-specific setup
4. **Verify**: Validate the ceremony completed correctly

```bash
# Example output:
🔐 Starting Trusted-Setup Ceremony for PrivaChain v4.0
========================================================

1️⃣  Phase 1: Powers of Tau (BLS12-381, 2^12 constraints)
   Initializing ceremony...
   ✅ Initial parameters generated

2️⃣  Phase 1: Multi-party contributions
   Participant 1/3: alice
   ✅ Contribution from alice applied
   Participant 2/3: bob
   ✅ Contribution from bob applied
   Participant 3/3: charlie
   ✅ Contribution from charlie applied
```

#### Phase 2: Circuit-Specific Setup

1. **Setup**: Generate initial proving and verification keys for gas_payer circuit
2. **Contribute**: Each participant adds entropy to circuit-specific keys
3. **Beacon**: Apply public randomness beacon for additional security
4. **Verify**: Validate circuit-specific setup

```bash
5️⃣  Phase 2: Circuit-specific setup (gas_payer)
   Generating initial zkey...
   ✅ Initial zkey generated

6️⃣  Phase 2: Multi-party contributions (circuit-specific)
   Participant 1/3: alice
   ✅ Contribution from alice applied
```

### Output Artifacts

After successful ceremony, you'll have:

```
build/zk/
├── pot12_final.ptau          # Phase 1 final parameters
├── gas_payer_final.zkey      # Phase 2 final proving key
├── gas_payer_beacon.zkey     # Phase 2 with beacon
└── verification_key.json     # Public verification key
```

### Security Cleanup

The ceremony script automatically removes intermediate files ("toxic waste") that must be destroyed:

```bash
🔒 Security Cleanup
   Removing intermediate files (toxic waste)...
   ✅ Toxic waste removed
```

**Important**: For production, ensure all participants independently delete their intermediate files.

## On-Chain Verifier Deployment

### Overview

The verifier contract validates ZK proofs on-chain, enabling trustless verification of private computations.

### Deployment Process

```bash
# Deploy the verifier contract
./scripts/deploy_zk_verifier.sh
```

### What the Script Does

1. **Check Prerequisites**: Verify verification key exists
2. **Store Contract**: Upload WASM bytecode to blockchain
3. **Instantiate**: Initialize contract with verification key
4. **Verify**: Confirm deployment was successful

```bash
🚀 Deploying ZK Verifier Contract
==================================

1️⃣  Checking prerequisites...
   ✅ Verification key found
   ✅ Contract WASM ready

2️⃣  Storing verifier contract...
   Transaction hash: ABC123...
   Code ID: 42
   ✅ Contract stored

3️⃣  Instantiating with verification key...
   Transaction hash: DEF456...
   Contract Address: osmo1abc...xyz
   ✅ Contract instantiated
```

### Configuration

Set environment variables to customize deployment:

```bash
# Custom chain and deployer
export CHAIN_ID=osmo-mainnet-1
export DEPLOYER=my-key-name

./scripts/deploy_zk_verifier.sh
```

### Simulated Deployment

If `osmosisd` is not installed, the script runs in simulation mode:

```bash
⚠️  osmosisd not found
For testing purposes, simulating deployment...

2️⃣  [SIMULATED] Storing verifier contract...
   Code ID: 147
   ✅ Contract stored (simulated)
```

This is useful for:
- Testing the deployment flow
- CI/CD pipelines
- Development environments

## Anonymous Bandwidth Purchase

### Overview

The bandwidth purchase module enables anonymous payment for Nym network bandwidth using ZK proofs.

### How It Works

1. **Secret**: User has a private secret (never revealed)
2. **Commitment**: Public hash of the secret is published
3. **Proof**: ZK-SNARK proves knowledge of secret without revealing it
4. **Purchase**: Bandwidth is credited to an anonymous account

### Usage Example

```rust
use privachain_node::zk::buy_bandwidth_anon;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Buy 100 MB anonymously
    let secret = 123456789;  // Private, never sent over network
    buy_bandwidth_anon(100, secret).await?;
    Ok(())
}
```

### CLI Integration (Planned)

```bash
# Set your secret (stored securely)
export PAYER_SECRET=123456789

# Buy bandwidth anonymously
./privachain-node --buy-bandwidth-anon 100 --payer-secret $PAYER_SECRET
```

### Privacy Guarantees

- ✅ **Payer identity hidden**: Only commitment hash is public
- ✅ **Amount visible**: Transaction amount is not hidden (by design)
- ✅ **Unlinkability**: Cannot link multiple purchases to same payer
- ✅ **No network leaks**: Secret never transmitted in plaintext

## Anonymous Governance Voting

### Overview

The governance voting module enables anonymous voting on proposals using ZK proofs.

### How It Works

1. **Secret**: Voter has a private secret proving eligibility
2. **Commitment**: Public hash is registered during setup
3. **Vote**: Choice (yes/no) is encrypted in ZK proof
4. **Submit**: On-chain contract verifies proof and counts vote

### Usage Example

```rust
use privachain_node::zk::vote_anon;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let proposal_id = 42;
    let choice = true;  // YES vote (private)
    let voter_secret = 987654321;  // Private
    
    vote_anon(proposal_id, choice, voter_secret).await?;
    Ok(())
}
```

### CLI Integration (Planned)

```bash
# Set your voter secret
export VOTER_SECRET=987654321

# Vote YES on proposal 42 anonymously
./privachain-node --vote-anon 42 true --voter-secret $VOTER_SECRET

# Vote NO on proposal 43
./privachain-node --vote-anon 43 false --voter-secret $VOTER_SECRET
```

### Privacy Guarantees

- ✅ **Voter identity hidden**: Only commitment hash is public
- ✅ **Vote choice hidden**: Yes/No encrypted in proof
- ✅ **Eligibility proven**: ZK proof validates voter registration
- ✅ **Replay protection**: Proposal ID included in proof

## Security Testing

### Leak Testing

The leak test verifies that secrets are not exposed in network traffic:

```bash
# Run leak test
./scripts/leak-zk.sh
```

### What It Tests

1. **Build**: Compile release binary with ZK features
2. **Capture**: Record network traffic with tcpdump
3. **Execute**: Run ZK proof generation with test secret
4. **Analyze**: Search for secret in captured packets
5. **Verify**: Confirm no leaks detected

```bash
🔍 ZK Proof Leak Test
=====================

1️⃣  Checking for release binary with ZK proofs...
   ✅ Using existing binary

2️⃣  Starting packet capture...
   ✅ Packet capture started (PID: 12345)

3️⃣  Running ZK proof generation with test secret...
   Secret (should NOT appear in traffic): 123456789
   ✅ Process completed

5️⃣  Analyzing captured packets for leaks...
   ✅ No leaks detected
   ✅ No suspicious patterns found

✅ ZK Proof Leak Test PASSED
```

### Manual Testing

You can also run manual tests:

```bash
# Build with ZK features
cargo build --release --features zk-proofs -p privachain_node

# Run ZK tests
cargo test -p privachain_node --features zk-proofs --lib zk

# Run smoke tests
./scripts/smoke-zk.sh
```

## Production Recommendations

### Trusted Setup Ceremony

For production deployment, conduct a **public multi-party ceremony**:

1. **Minimum 6 participants** for Phase 1 (Powers of Tau)
2. **Minimum 3 participants** for Phase 2 (circuit-specific)
3. **Diverse participants** from different organizations/countries
4. **Public verification** allow anyone to verify the ceremony
5. **Transparency** publish ceremony transcript

### Participant Selection

Choose participants who:
- Have strong security practices
- Are geographically distributed
- Represent different stakeholder groups
- Can securely delete toxic waste

### Ceremony Best Practices

```bash
# Custom participant configuration
PARTICIPANTS=("alice" "bob" "charlie" "david" "eve" "frank")

# Run ceremony with custom participants
./scripts/zk_ceremony.sh
```

Each participant should:
1. Contribute fresh entropy (not from a PRNG)
2. Verify previous contributions
3. Securely delete their contribution files
4. Sign a statement of proper deletion

### Circuit Auditing

Before production:
- ✅ Audit circuit constraints for completeness
- ✅ Check for under-constrained variables
- ✅ Verify no arithmetic overflows possible
- ✅ Test edge cases and boundary conditions
- ✅ External security audit (Least Authority, Trail of Bits, etc.)

### Key Management

| Key Type | Visibility | Storage | Notes |
|----------|-----------|---------|-------|
| Proving Key | Public | IPFS/CDN | Can be distributed openly |
| Verification Key | Public | On-chain | Stored in verifier contract |
| User Secrets | Private | User device | Never transmitted |
| Toxic Waste | DELETED | N/A | Must be destroyed |

### Monitoring

Set up monitoring for:
- Proof generation latency
- Verification gas costs
- Failed verification attempts
- Unusual usage patterns

### Upgrades

For circuit upgrades:
1. New ceremony required for new circuits
2. Old verifier remains for backward compatibility
3. Gradual migration period (3-6 months)
4. Clear deprecation timeline

## CI/CD Integration

The CI workflow includes bundle size guards:

```yaml
- name: Bundle size check (v4.0 with zk-proofs)
  run: |
    cargo build --release --features zk-proofs -p privachain_node
    strip ./target/release/privachain-node || true
    SIZE=$(stat -c%s ./target/release/privachain-node)
    SIZE_MB=$((SIZE / 1024 / 1024))
    if [ $SIZE -lt 53000000 ]; then
      echo "✅ Binary size within budget: ${SIZE_MB}MB < 53MB"
    else
      echo "❌ Binary size exceeds budget"
      exit 1
    fi
```

## Troubleshooting

### "snarkjs not found"

```bash
npm install -g snarkjs@latest
```

### "circom not found"

```bash
npm install -g circom@latest
```

### "Proving key not loaded"

```bash
# Run ceremony first
./scripts/zk_ceremony.sh
```

### "Binary size exceeds budget"

The ZK feature adds ~8MB. Build without it for size-constrained environments:

```bash
cargo build --release --no-default-features --features mixnet-default,post-quantum
```

### "osmosisd not found"

For testing, the deployment script runs in simulation mode. For production:

```bash
# Install osmosisd
# See: https://docs.osmosis.zone/networks/join-mainnet

# Or use your preferred Cosmos chain CLI
```

## References

- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf) - Original ZK-SNARK construction
- [Circom Documentation](https://docs.circom.io/) - Circuit language reference
- [snarkjs Documentation](https://github.com/iden3/snarkjs) - JavaScript ZK toolkit
- [Powers of Tau](https://github.com/iden3/snarkjs#7-prepare-phase-2) - Universal setup ceremony
- [ZK Security Audits](https://github.com/trailofbits/publications#cryptography-and-protocols) - Best practices

## Support

For questions or issues:
- **GitHub Issues**: https://github.com/AsiniV/privachain-decentral/issues
- **Documentation**: `docs/v4-zk-proofs.md`, `docs/zk_ceremony_and_deployment.md`
- **Examples**: See `node/src/zk/` module

---

**Remember**: A trusted setup ceremony is only as secure as its weakest participant. For production, ensure a rigorous, transparent, and well-documented process.
