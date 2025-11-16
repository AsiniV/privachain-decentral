# Post-Quantum Cryptography Contracts

This directory contains three new CosmWasm contracts that add post-quantum cryptography support to PrivaChain:

## Contracts

### 1. pq-verifier
**Purpose**: On-chain Dilithium-5 signature verification

- Verifies Dilithium-5 signatures appended to Cosmos SDK transactions (TLV format)
- Public key: 2592 bytes
- Signature: ~4595 bytes  
- Message hash: 32 bytes (SHA-256)

**Endpoints**:
- `ExecuteMsg::Verify { pubkey, signature, message_hash }` - Verify a Dilithium-5 signature
- `QueryMsg::CodeId {}` - Get contract code ID

### 2. reputation
**Purpose**: Store and verify post-quantum signed reputation scores

- Stores Dilithium-5 signed reputation scores (0-100) for addresses
- Verifies signature matches: SHA-256(address + score)
- Reputation data includes score, public key, and signature

**Endpoints**:
- `ExecuteMsg::Update { score, dilithium_pk, dilithium_sig }` - Update reputation with PQ signature
- `QueryMsg::GetReputation { address }` - Query reputation for an address

### 3. gas-sponsor (Optional)
**Purpose**: Trustless fee-grant pool for users without balance

- Users can request gas grants from a pool
- Rate-limited to N requests per day per address
- Requires pool funding via `FundPool` message

**Endpoints**:
- `ExecuteMsg::FundPool {}` - Add funds to the pool
- `ExecuteMsg::RequestFeeGrant {}` - Request a fee grant (rate-limited)
- `ExecuteMsg::UpdateConfig {}` - Update configuration (owner only)
- `QueryMsg::Config {}` - Get current configuration
- `QueryMsg::Balance {}` - Get pool balance

## Building

### Standard Build (without PQ feature)
The contracts can be built without actual post-quantum verification enabled, which is useful for testing and development:

```bash
cd contracts/pq-verifier
cargo build --release --target wasm32-unknown-unknown --lib

cd ../reputation
cargo build --release --target wasm32-unknown-unknown --lib

cd ../gas-sponsor
cargo build --release --target wasm32-unknown-unknown --lib
```

### Build with PQ Feature (Requires liboqs)
To enable actual Dilithium-5 verification, you need to install liboqs first:

**Note**: Building with the `pq` feature for WASM targets requires special setup of liboqs for WASM. This is currently experimental and requires:
- liboqs compiled for wasm32 target
- Proper linking configuration
- WASM-compatible build environment

For production use with actual PQ verification, consider:
1. Running verification off-chain and submitting proofs
2. Using a native (x86_64) validator that can verify PQ signatures
3. Waiting for better WASM support in liboqs-rust

### Testing

Tests work without the PQ feature enabled:

```bash
# Test all contracts
cd contracts
for contract in pq-verifier reputation gas-sponsor; do
  cd $contract && cargo test && cd ..
done
```

## Deployment

### Prerequisites
- Cosmos SDK chain with CosmWasm support
- gaiad CLI configured
- Relayer account with funds

### Store Contracts

```bash
# Store pq-verifier
gaiad tx wasm store target/wasm32-unknown-unknown/release/pq_verifier.wasm \
  --from relayer --chain-id theta-testnet-001 --node $RPC \
  --gas auto --gas-adjustment 1.4 --gas-prices 0.005uatom -y

# Store reputation
gaiad tx wasm store target/wasm32-unknown-unknown/release/reputation.wasm \
  --from relayer --chain-id theta-testnet-001 --node $RPC \
  --gas auto --gas-adjustment 1.4 --gas-prices 0.005uatom -y

# Store gas-sponsor (optional)
gaiad tx wasm store target/wasm32-unknown-unknown/release/gas_sponsor.wasm \
  --from relayer --chain-id theta-testnet-001 --node $RPC \
  --gas auto --gas-adjustment 1.4 --gas-prices 0.005uatom -y
```

### Instantiate Contracts

```bash
# Get code IDs
export PQ_VERIFIER_CODE_ID=$(gaiad query wasm list-code --node $RPC -o json | jq -r '.code_infos[-3].code_id')
export REPUTATION_CODE_ID=$(gaiad query wasm list-code --node $RPC -o json | jq -r '.code_infos[-2].code_id')
export GAS_SPONSOR_CODE_ID=$(gaiad query wasm list-code --node $RPC -o json | jq -r '.code_infos[-1].code_id')

# Instantiate pq-verifier
gaiad tx wasm instantiate $PQ_VERIFIER_CODE_ID '{}' \
  --label privachain-pq-verifier --from relayer \
  --chain-id theta-testnet-001 --node $RPC \
  --gas auto --gas-prices 0.005uatom -y

# Instantiate reputation
gaiad tx wasm instantiate $REPUTATION_CODE_ID '{}' \
  --label privachain-reputation --from relayer \
  --chain-id theta-testnet-001 --node $RPC \
  --gas auto --gas-prices 0.005uatom -y

# Instantiate gas-sponsor (optional)
gaiad tx wasm instantiate $GAS_SPONSOR_CODE_ID \
  '{"grant_amount":"1000000","max_requests_per_day":5}' \
  --label privachain-gas-sponsor --from relayer \
  --chain-id theta-testnet-001 --node $RPC \
  --gas auto --gas-prices 0.005uatom -y
```

### Get Contract Addresses

```bash
export PQ_VERIFIER_ADDR=$(gaiad query wasm list-contract-by-code $PQ_VERIFIER_CODE_ID --node $RPC -o json | jq -r '.contracts[0]')
export REPUTATION_ADDR=$(gaiad query wasm list-contract-by-code $REPUTATION_CODE_ID --node $RPC -o json | jq -r '.contracts[0]')
export GAS_SPONSOR_ADDR=$(gaiad query wasm list-contract-by-code $GAS_SPONSOR_CODE_ID --node $RPC -o json | jq -r '.contracts[0]')
```

## Integration with Existing Contracts

The new PQ contracts are **additive** - existing contracts (mail, search-anchor, domain-registry) continue to work without modification.

To integrate PQ verification into your application:

1. **Off-chain**: Generate Dilithium-5 key pairs and sign messages
2. **On-chain**: Call pq-verifier to verify signatures
3. **Reputation**: Store verified reputation scores on-chain
4. **Gas**: Optionally use gas-sponsor for user onboarding

## Security Considerations

- Without the `pq` feature, contracts only perform basic validation (length checks)
- For production use with actual PQ verification, enable the `pq` feature and ensure proper liboqs setup
- Rate limiting in gas-sponsor prevents abuse
- Reputation signatures bind the score to a specific address

## Backward Compatibility

✅ Existing contracts (mail, search-anchor, domain-registry) are unaffected
✅ No breaking changes to existing functionality
✅ PQ contracts can be deployed alongside existing contracts
✅ Old tests continue to pass

## Next Steps

1. Complete liboqs WASM compilation setup for production PQ verification
2. Add integration tests with existing contracts
3. Deploy to testnet and validate functionality
4. Add e2e tests: `npm run test:e2e:pq-i2p`
