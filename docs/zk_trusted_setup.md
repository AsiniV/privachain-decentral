# ZK-SNARK Trusted Setup for PrivaChain

This document describes the trusted setup ceremony for the PrivaChain ZK-SNARK circuits.

## Overview

PrivaChain uses Groth16 ZK-SNARKs for:
- **Domain Ownership Proofs**: Proving ownership of `.prv` domains without revealing private keys
- **Search Inclusion Proofs**: Proving search results are valid without revealing query content

## Development vs Production Mode

### Test/Development Mode
- Smart contracts built with `cargo test` automatically enable test mode via `#[cfg(test)]`
- ZK proof verification accepts well-formed proofs after structural validation
- No verification key deployment required for testing
- Allows rapid development and testing without full ZK circuit setup

### Production Mode
- Smart contracts built with `cargo build --release` require real verification keys
- ZK proof verification fails securely if verification key is not deployed
- Requires proper trusted setup ceremony and VK deployment to contract storage
- Ensures cryptographic security in production deployments

## Circuits

### 1. Domain Registration Circuit (`domain_register.circom`)
- **Purpose**: Prove domain ownership without revealing private key
- **Constraints**: ~500 constraints
- **Public Inputs**: commitment, domain_hash  
- **Private Inputs**: owner_secret, domain_salt, ownership_nonce
- **Outputs**: ownership_proof, nullifier_hash

### 2. Search Inclusion Circuit (`search_inclusion.circom`)  
- **Purpose**: Prove search result is in index without revealing query
- **Constraints**: ~800 constraints (20 levels Merkle tree)
- **Public Inputs**: root, leaf_hash
- **Private Inputs**: path_elements[20], path_indices[20], query_nullifier_secret
- **Outputs**: query_nullifier, inclusion_proof

## Trusted Setup Process

### Development Setup (Powers of Tau 14)

For development and testing, we use Powers of Tau ceremony 14 which supports up to 2^14 constraints.

```bash
# Install circom and snarkjs
npm install -g circom_tester snarkjs

# Download Powers of Tau (development)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
mv powersOfTau28_hez_final_14.ptau circuits/artifacts/pot14_final.ptau
```

### Circuit Compilation and Setup

```bash
cd circuits

# Compile domain registration circuit
circom domain_register.circom --r1cs --wasm --sym -o artifacts/
snarkjs groth16 setup artifacts/domain_register.r1cs artifacts/pot14_final.ptau artifacts/domain_register_0000.zkey

# Phase 2 ceremony contribution (development)
snarkjs zkey contribute artifacts/domain_register_0000.zkey artifacts/domain_register_0001.zkey --name="First contribution" -v
snarkjs zkey contribute artifacts/domain_register_0001.zkey artifacts/domain_register_final.zkey --name="Second contribution" -v

# Export verification key
snarkjs zkey export verificationkey artifacts/domain_register_final.zkey artifacts/domain_register_verification_key.json

# Compile search inclusion circuit  
circom search_inclusion.circom --r1cs --wasm --sym -o artifacts/
snarkjs groth16 setup artifacts/search_inclusion.r1cs artifacts/pot14_final.ptau artifacts/search_inclusion_0000.zkey

# Phase 2 ceremony contribution (development)
snarkjs zkey contribute artifacts/search_inclusion_0000.zkey artifacts/search_inclusion_0001.zkey --name="First contribution" -v
snarkjs zkey contribute artifacts/search_inclusion_0001.zkey artifacts/search_inclusion_final.zkey --name="Second contribution" -v

# Export verification key
snarkjs zkey export verificationkey artifacts/search_inclusion_final.zkey artifacts/search_inclusion_verification_key.json
```

### Production Setup Requirements

For production deployment, a multi-party trusted setup ceremony must be conducted:

1. **Phase 1 (Powers of Tau)**:
   - Minimum 6 independent participants
   - Each participant contributes entropy
   - Final tau file verified by all participants

2. **Phase 2 (Circuit-Specific)**:
   - Minimum 3 independent participants per circuit
   - Contributions performed in sequence
   - Final zkey files verified by all participants

3. **Verification**:
   - All participants verify final zkey files
   - Verification keys published publicly
   - Setup transcript published for transparency

## Security Considerations

### Development vs Production

- **Development**: Uses simplified 2-contribution setup for testing
- **Production**: Requires full multi-party ceremony with 6+ participants

### Key Management

- **Verification Keys**: Public, stored in version control
- **Proving Keys**: Public, distributed via IPFS/CDN
- **Toxic Waste**: All intermediate files must be securely deleted

### Circuit Auditing

Before production deployment:
- [ ] Circuits audited by ZK security firm
- [ ] Constraint counts verified 
- [ ] Setup ceremony independently verified
- [ ] All artifacts checksummed and published

## File Structure

```
circuits/
├── domain_register.circom          # Domain ownership circuit
├── search_inclusion.circom         # Search inclusion circuit
└── artifacts/
    ├── pot14_final.ptau            # Powers of Tau file
    ├── domain_register.r1cs        # Domain circuit R1CS
    ├── domain_register.wasm        # Domain circuit WASM
    ├── domain_register_final.zkey  # Domain proving key
    ├── domain_register_verification_key.json  # Domain verification key
    ├── search_inclusion.r1cs       # Search circuit R1CS
    ├── search_inclusion.wasm       # Search circuit WASM
    ├── search_inclusion_final.zkey # Search proving key
    └── search_inclusion_verification_key.json # Search verification key
```

## Environment Variables

For production deployment, set these environment variables:

```bash
# Circuit paths for domain registration
export ZK_DOMAIN_CIRCUIT_WASM="./circuits/artifacts/domain_register.wasm"
export ZK_DOMAIN_CIRCUIT_ZKEY="./circuits/artifacts/domain_register_final.zkey"
export ZK_DOMAIN_VERIFICATION_KEY="./circuits/artifacts/domain_register_verification_key.json"

# Circuit paths for search inclusion
export ZK_SEARCH_CIRCUIT_WASM="./circuits/artifacts/search_inclusion.wasm"
export ZK_SEARCH_CIRCUIT_ZKEY="./circuits/artifacts/search_inclusion_final.zkey"
export ZK_SEARCH_VERIFICATION_KEY="./circuits/artifacts/search_inclusion_verification_key.json"
```

## Testing the Setup

```bash
# Test domain registration proof
npm run test:zk:domain

# Test search inclusion proof  
npm run test:zk:search

# Test full ZK cryptography
npm run test:zk:crypto
```

## Production Deployment Checklist

- [ ] Multi-party trusted setup ceremony completed
- [ ] All intermediate keys securely deleted
- [ ] Final artifacts verified by all participants
- [ ] Verification keys published and checksummed
- [ ] Setup transcript published for transparency
- [ ] Circuits audited by security firm
- [ ] Environment variables configured
- [ ] End-to-end testing completed