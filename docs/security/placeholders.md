# Security Placeholders Inventory

**Document Version**: 1.0  
**Last Updated**: 2024-12-19  
**Phase**: Phase 0 (Stabilization)

## Overview

This document enumerates all placeholder cryptographic and security functions in the PrivaChain codebase. Each placeholder is marked with `@placeholder @insecure` JSDoc annotations and includes a replacement plan.

## 🚨 CRITICAL SECURITY WARNING

**ALL PLACEHOLDER FUNCTIONS LISTED BELOW PROVIDE NO REAL SECURITY.**

These are development stubs that must be replaced with production implementations before any real-world deployment.

## Placeholder Function Inventory

### Zero-Knowledge Proof Functions

| Function | File | Status | Replacement Plan |
|----------|------|--------|------------------|
| `verifyZKProof()` | `src/crypto/ZKCrypto.ts:118` | @placeholder @insecure | Phase 3: Real snarkjs verification |
| `pqEncrypt()` | `src/crypto/ZKCrypto.ts:217` | @placeholder @insecure | Phase 2: Kyber WASM integration |
| `pqDecrypt()` | `src/crypto/ZKCrypto.ts:231` | @placeholder @insecure | Phase 2: Kyber WASM integration |
| `generateBatchProof()` | `src/blockchain/PrivChain.ts:250` | @placeholder @insecure | Phase 3: Circom circuit compilation |
| `verifyZKProof()` | `src/blockchain/PrivChain.ts:268` | @placeholder @insecure | Phase 3: Contract verification key |

### Email & Messaging Security

| Function | File | Status | Replacement Plan |
|----------|------|--------|------------------|
| `verifyDomainProof()` | `src/services/ProductionEmailService.ts:531` | @placeholder @insecure | Phase 3: Domain ownership ZK circuit |
| `pqEncrypt()` | `src/services/ProductionEmailService.ts:594` | @placeholder @insecure | Phase 2: Hybrid PQ encryption |
| `pqDecrypt()` | `src/services/ProductionEmailService.ts:599` | @placeholder @insecure | Phase 2: Hybrid PQ decryption |

### Search Privacy Functions

| Function | File | Status | Replacement Plan |
|----------|------|--------|------------------|
| `verifyZKProof()` | `src/blockchain/SearchBackend.ts:644` | @placeholder @insecure | Phase 3: Search inclusion ZK circuit |
| `generateZKQuery()` | `src/blockchain/SearchBackend.ts:653` | @placeholder @insecure | Phase 3: Private query ZK proof |

## Detailed Replacement Plans

### Phase 2: Post-Quantum Cryptography (Weeks 7-12)

#### Target: Real Kyber Implementation
- **Task**: T2.7 Replace Placeholder PQ Crypto (Step 1)
- **Library**: Kyber WASM package (maintained implementation)
- **Files to Update**:
  - `src/crypto/pq/kyber.ts` (new)
  - `src/messaging/sessionManager.ts` (hybrid handshake)
  - All `pqEncrypt()`/`pqDecrypt()` calls

#### Implementation Steps:
1. Add kyber WASM package dependency
2. Implement `src/crypto/pq/kyber.ts` with functions:
   - `generateKeyPair()`
   - `encapsulate(peerPub)`
   - `decapsulate(ct)`
3. Create hybrid handshake util combining X25519 + Kyber
4. Update messaging session initialization
5. Replace all placeholder PQ functions

### Phase 3: Zero-Knowledge Circuits (Weeks 13-20)

#### Target: Real ZK-SNARK Implementation
- **Task**: T3.1-T3.4 ZK Circuit Development
- **Library**: Circom + snarkjs
- **Circuits Needed**:
  - Domain ownership proof (`circuits/domain_register.circom`)
  - Search inclusion proof (`circuits/search_inclusion.circom`)
  - Batch transaction proof (`circuits/zk_rollup.circom`)

#### Implementation Steps:
1. **T3.1**: Domain Ownership Circuit
   ```circom
   // circuits/domain_register.circom
   template DomainRegister() {
       signal input owner_secret;
       signal input domain_hash;
       signal output commitment;
       // Circuit logic here
   }
   ```

2. **T3.2**: ZKVerifier Contract (optional on-chain verification)
3. **T3.3**: Integrate ZK into DomainRegistry flow
4. **T3.4**: Search inclusion proof circuit

## Security Implications by Phase

### Current State (Phase 0)
- ❌ **No cryptographic security**: All functions return predictable values
- ❌ **No privacy protection**: Data is not actually encrypted or anonymized
- ❌ **No proof verification**: ZK "proofs" are simple length checks
- ⚠️ **Development only**: Suitable for testing functionality, not security

### Phase 1 Target State
- ✅ **Real encryption**: Content encrypted before storage (already implemented in IPFS layer)
- ✅ **Gas sponsorship**: Backend relayer protects mnemonics (implemented)
- ❌ **Still placeholder ZK**: ZK functions remain placeholders
- ⚠️ **Basic security**: Some real cryptography, but not privacy-preserving

### Phase 2 Target State
- ✅ **Post-quantum ready**: Hybrid encryption with Kyber
- ✅ **Onion routing**: Multi-hop message routing
- ✅ **Real encryption**: All PQ functions use real implementations
- ❌ **Still placeholder ZK**: ZK proofs remain simulated

### Phase 3 Target State
- ✅ **Real ZK proofs**: Circom circuits compiled and verified
- ✅ **Domain ownership**: Real ZK proof of domain control
- ✅ **Search privacy**: ZK inclusion proofs for search results
- ✅ **Production crypto**: All placeholder functions replaced

## Automated Detection

### Grep Commands for Placeholder Detection
```bash
# Find all @placeholder annotations
grep -r "@placeholder" src/

# Find specific placeholder functions
grep -r "pqEncrypt\|pqDecrypt\|verifyZKProof\|generateBatchProof" src/

# Find TODO/FIXME related to security
grep -r "TODO.*security\|FIXME.*crypto" src/
```

### Pre-commit Hook Integration
The placeholder detection is integrated into the pre-commit hooks (T0.4) to prevent accidental removal of `@placeholder` annotations.

## Security Review Checklist

Before each phase completion, verify:

### Phase 2 Completion Checklist
- [ ] All `pqEncrypt()` functions use real Kyber implementation
- [ ] All `pqDecrypt()` functions use real Kyber implementation
- [ ] Hybrid handshake combines X25519 + Kyber correctly
- [ ] No `@placeholder` annotations remain for PQ functions
- [ ] Kyber keys properly generated and stored

### Phase 3 Completion Checklist
- [ ] All ZK circuits compile with Circom
- [ ] Proving keys generated and stored securely
- [ ] Verification keys deployed to contracts
- [ ] All `verifyZKProof()` functions use snarkjs
- [ ] All `generateBatchProof()` functions use real circuits
- [ ] No `@placeholder` annotations remain for ZK functions

## Risk Assessment

### High Risk (Immediate Attention Required)
- **Email encryption**: Currently provides no confidentiality
- **Domain proofs**: Anyone can claim any domain
- **Search privacy**: Queries are not actually private

### Medium Risk (Phase 2 Priority)
- **PQ encryption**: Vulnerable to future quantum attacks
- **Message encryption**: Not quantum-resistant

### Low Risk (Phase 3 Priority)
- **ZK batch proofs**: Affects scalability, not core security
- **Search inclusion**: Privacy feature, not core functionality

## Contact for Security Issues

- **Responsible Disclosure**: See [docs/claims_and_limitations.md](../claims_and_limitations.md)
- **Security Questions**: Open GitHub issue with `security` label
- **Documentation Updates**: Update this file when placeholders are replaced

---

**Note**: This document will be updated as placeholders are replaced. Each Phase completion should remove the corresponding entries from the inventory.