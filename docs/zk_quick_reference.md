# ZK-Proofs Quick Reference Guide

Quick commands and examples for working with PrivaChain v4.0 ZK features.

## Quick Start

```bash
# 1. Compile circuit
./scripts/zk_compile.sh

# 2. Run trusted setup ceremony
./scripts/zk_ceremony.sh

# 3. Deploy verifier (optional)
./scripts/deploy_zk_verifier.sh

# 4. Build with ZK features
cargo build --release --features zk-proofs -p privachain_node

# 5. Run tests
cargo test -p privachain_node --features zk-proofs --lib zk

# 6. Run leak test
./scripts/leak-zk.sh
```

## Build Commands

```bash
# Default build (no ZK)
cargo build --release -p privachain_node

# With ZK proofs
cargo build --release --features zk-proofs -p privachain_node

# ZK + all features
cargo build --release --all-features -p privachain_node

# Minimal build (v1.0-rc)
cargo build --release --no-default-features -p privachain_node
```

## Test Commands

```bash
# All tests
cargo test -p privachain_node

# ZK tests only
cargo test -p privachain_node --features zk-proofs --lib zk

# Specific test
cargo test -p privachain_node --features zk-proofs test_prover_creation

# With output
cargo test -p privachain_node --features zk-proofs --lib zk -- --nocapture
```

## Script Commands

```bash
# Compile circuit
./scripts/zk_compile.sh

# Trusted setup ceremony
./scripts/zk_ceremony.sh

# Deploy verifier
./scripts/deploy_zk_verifier.sh

# Leak test
./scripts/leak-zk.sh

# Smoke tests
./scripts/smoke-zk.sh
```

## Rust API

### Anonymous Bandwidth Purchase

```rust
use privachain_node::zk::buy_bandwidth_anon;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mb = 100;              // Amount in MB
    let secret = 123456789;    // Private secret
    
    buy_bandwidth_anon(mb, secret).await?;
    Ok(())
}
```

### Anonymous Voting

```rust
use privachain_node::zk::vote_anon;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let proposal_id = 42;
    let choice = true;         // YES vote
    let voter_secret = 987654321;
    
    vote_anon(proposal_id, choice, voter_secret).await?;
    Ok(())
}
```

### Custom Proof Generation

```rust
use privachain_node::zk::ZkProver;

fn main() -> anyhow::Result<()> {
    let prover = ZkProver::new()?;
    
    let proof = prover.prove(
        123456789,              // payer_secret (private)
        [0u8; 32],              // payer_hash (public)
        21000,                  // gas_limit (public)
        20000000000,            // gas_price (public)
    )?;
    
    println!("Proof size: {} bytes", proof.len());
    Ok(())
}
```

## File Locations

```
circuits/
├── gas_payer.circom          # Main circuit

build/zk/
├── gas_payer.r1cs            # Compiled circuit
├── gas_payer.wasm            # Circuit witness generator
├── pot12_final.ptau          # Powers of Tau
├── gas_payer_final.zkey      # Proving key
└── verification_key.json     # Verification key

node/src/zk/
├── mod.rs                    # Module exports
├── prover.rs                 # Proof generation
├── ffi.rs                    # FFI bindings
├── bandwidth_buy.rs          # Anonymous bandwidth
└── governance_vote.rs        # Anonymous voting

scripts/
├── zk_compile.sh             # Circuit compilation
├── zk_ceremony.sh            # Trusted setup
├── deploy_zk_verifier.sh     # Contract deployment
├── leak-zk.sh                # Leak testing
└── smoke-zk.sh               # Smoke tests
```

## Environment Variables

```bash
# Circuit directories
export ZK_CIRCUIT_DIR=circuits/
export ZK_BUILD_DIR=build/zk/

# Deployment configuration
export CHAIN_ID=osmo-test-5
export DEPLOYER=deployer

# Secrets (use secure storage in production!)
export PAYER_SECRET=123456789
export VOTER_SECRET=987654321
```

## Common Issues

### Circuit not compiled

```bash
Error: build/zk/gas_payer.r1cs not found

Solution: ./scripts/zk_compile.sh
```

### Proving key not loaded

```bash
Error: Proving key not loaded

Solution: ./scripts/zk_ceremony.sh
```

### snarkjs not found

```bash
Solution: npm install -g snarkjs@latest
```

### Binary too large

```bash
Solution: Build without ZK
cargo build --release --no-default-features --features mixnet-default
```

## Size Budget

| Configuration | Size | Budget | Status |
|--------------|------|--------|--------|
| Default (no ZK) | ~8.6 MB | < 45 MB | ✅ |
| With ZK-proofs | ~16.6 MB | < 53 MB | ✅ |

## Feature Flags

```toml
[features]
default = ["mixnet-default", "post-quantum"]
mixnet-default = ["dep:nym-crypto"]
fallback-tor = []
post-quantum = []
zk-proofs = ["dep:ark-groth16", "dep:ark-bls12-381", ...]
```

## Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Circuit compilation | ~10s | One-time |
| Key generation | ~30s | One-time |
| Proof generation | ~2s | Per transaction |
| Proof verification | ~50ms | On-chain |

## Security Checklist

- [ ] Run `./scripts/leak-zk.sh` - verify no secret leaks
- [ ] Public trusted setup ceremony with 6+ participants
- [ ] Circuit audited by security firm
- [ ] All tests passing
- [ ] Binary size within budget
- [ ] Documentation reviewed
- [ ] Deployment tested on testnet

## CI/CD

The GitHub Actions workflow automatically:
- ✅ Builds with and without zk-proofs
- ✅ Runs all ZK tests
- ✅ Checks binary size (< 53MB)
- ✅ Verifies no regressions

## Version Compatibility

| Version | Mixnet | PQ | ZK | Notes |
|---------|--------|----|----|-------|
| v1.0 | ❌ | ❌ | ❌ | Basic |
| v2.0 | ✅ | ❌ | ❌ | Mixnet |
| v3.0 | ✅ | ✅ | ❌ | Post-quantum |
| v4.0 | ✅ | ✅ | ✅ | ZK-proofs (opt-in) |

## Further Reading

- [Full ZK Documentation](./v4-zk-proofs.md)
- [Ceremony Guide](./zk_ceremony_and_deployment.md)
- [Trusted Setup](./zk_trusted_setup.md)
- [Circuit Source](../circuits/gas_payer.circom)

---

**Quick Tip**: Start with `./scripts/zk_compile.sh && ./scripts/zk_ceremony.sh` then run tests!
