# Quick Start Guide - Post-Quantum Cryptography Contracts

## Prerequisites
- Rust toolchain with wasm32 target installed
- Cosmos SDK chain with CosmWasm enabled
- gaiad CLI or similar tool for transactions

## 1. Build the Contracts

```bash
cd contracts
./build-pq-contracts.sh
```

This generates three WASM files:
- `pq_verifier.wasm` (150 KB)
- `reputation.wasm` (171 KB)
- `gas_sponsor.wasm` (177 KB)

## 2. Test Locally

```bash
# Test individual contracts
cd contracts/pq-verifier && cargo test
cd ../reputation && cargo test
cd ../gas-sponsor && cargo test
```

## 3. Deploy to Testnet

### Store Contracts
```bash
# Set your RPC endpoint and chain ID
export RPC="https://rpc.testnet.cosmos.network:443"
export CHAIN_ID="theta-testnet-001"

# Store pq-verifier
gaiad tx wasm store target/wasm32-unknown-unknown/release/pq_verifier.wasm \
  --from relayer --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-adjustment 1.4 --gas-prices 0.005uatom -y

# Get the code ID (replace with actual ID from tx output)
export PQ_VERIFIER_CODE_ID=123

# Store reputation
gaiad tx wasm store target/wasm32-unknown-unknown/release/reputation.wasm \
  --from relayer --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-adjustment 1.4 --gas-prices 0.005uatom -y

export REPUTATION_CODE_ID=124

# Store gas-sponsor (optional)
gaiad tx wasm store target/wasm32-unknown-unknown/release/gas_sponsor.wasm \
  --from relayer --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-adjustment 1.4 --gas-prices 0.005uatom -y

export GAS_SPONSOR_CODE_ID=125
```

### Instantiate Contracts
```bash
# Instantiate pq-verifier
gaiad tx wasm instantiate $PQ_VERIFIER_CODE_ID '{}' \
  --label privachain-pq-verifier --from relayer \
  --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-prices 0.005uatom -y

# Instantiate reputation
gaiad tx wasm instantiate $REPUTATION_CODE_ID '{}' \
  --label privachain-reputation --from relayer \
  --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-prices 0.005uatom -y

# Instantiate gas-sponsor with config
gaiad tx wasm instantiate $GAS_SPONSOR_CODE_ID \
  '{"grant_amount":"1000000","max_requests_per_day":5}' \
  --label privachain-gas-sponsor --from relayer \
  --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-prices 0.005uatom -y
```

### Get Contract Addresses
```bash
# Query contract addresses
export PQ_VERIFIER_ADDR=$(gaiad query wasm list-contract-by-code $PQ_VERIFIER_CODE_ID --node $RPC -o json | jq -r '.contracts[0]')
export REPUTATION_ADDR=$(gaiad query wasm list-contract-by-code $REPUTATION_CODE_ID --node $RPC -o json | jq -r '.contracts[0]')
export GAS_SPONSOR_ADDR=$(gaiad query wasm list-contract-by-code $GAS_SPONSOR_CODE_ID --node $RPC -o json | jq -r '.contracts[0]')

echo "PQ Verifier: $PQ_VERIFIER_ADDR"
echo "Reputation: $REPUTATION_ADDR"
echo "Gas Sponsor: $GAS_SPONSOR_ADDR"
```

## 4. Usage Examples

### Verify a Dilithium-5 Signature
```bash
# Execute verify (with base64-encoded pubkey, signature, and message_hash)
gaiad tx wasm execute $PQ_VERIFIER_ADDR \
  '{
    "verify": {
      "pubkey": "<base64-encoded-2592-byte-pubkey>",
      "signature": "<base64-encoded-signature>",
      "message_hash": "<base64-encoded-32-byte-hash>"
    }
  }' \
  --from user --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-prices 0.005uatom -y
```

### Update Reputation Score
```bash
# Update reputation with PQ signature
gaiad tx wasm execute $REPUTATION_ADDR \
  '{
    "update": {
      "score": 85,
      "dilithium_pk": "<base64-encoded-2592-byte-pubkey>",
      "dilithium_sig": "<base64-encoded-signature>"
    }
  }' \
  --from user --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-prices 0.005uatom -y
```

### Query Reputation
```bash
# Query reputation for an address
gaiad query wasm contract-state smart $REPUTATION_ADDR \
  '{"get_reputation":{"address":"cosmos1..."}}' \
  --node $RPC
```

### Fund Gas Sponsor Pool
```bash
# Add funds to the pool
gaiad tx wasm execute $GAS_SPONSOR_ADDR \
  '{"fund_pool":{}}' \
  --from funder --chain-id $CHAIN_ID --node $RPC \
  --amount 1000000uatom \
  --gas auto --gas-prices 0.005uatom -y
```

### Request Fee Grant
```bash
# Request a fee grant (rate-limited)
gaiad tx wasm execute $GAS_SPONSOR_ADDR \
  '{"request_fee_grant":{}}' \
  --from user --chain-id $CHAIN_ID --node $RPC \
  --gas auto --gas-prices 0.005uatom -y
```

## 5. Integration with Your Application

### Off-chain: Generate Dilithium-5 Keys and Signatures

Use a library like liboqs or pqcrypto to:
1. Generate Dilithium-5 key pairs
2. Sign messages (e.g., SHA-256(address + score) for reputation)
3. Base64-encode the public key and signature
4. Submit to the contracts

### On-chain: Verify and Store

1. Call `pq-verifier::verify` to verify signatures
2. Call `reputation::update` to store verified scores
3. Use `gas-sponsor` to onboard users without initial balance

## 6. Monitoring

### Query Contract State
```bash
# Get pq-verifier code ID
gaiad query wasm contract-state smart $PQ_VERIFIER_ADDR \
  '{"code_id":{}}' --node $RPC

# Get gas sponsor config
gaiad query wasm contract-state smart $GAS_SPONSOR_ADDR \
  '{"config":{}}' --node $RPC

# Get gas sponsor balance
gaiad query wasm contract-state smart $GAS_SPONSOR_ADDR \
  '{"balance":{}}' --node $RPC
```

## 7. Troubleshooting

### Contract Build Issues
- Make sure wasm32 target is installed: `rustup target add wasm32-unknown-unknown`
- If building with `pq` feature fails, build without it (default)

### Deployment Issues
- Check gas limits: increase with `--gas-adjustment 1.5`
- Verify chain supports CosmWasm
- Check account has sufficient balance

### Signature Verification Failures
- Without `pq` feature, only length validation is performed
- Ensure public key is exactly 2592 bytes
- Ensure signature length is valid
- Ensure message hash is exactly 32 bytes (SHA-256)

## 8. Next Steps

- **Production PQ**: Enable the `pq` feature and set up liboqs for actual verification
- **Integration Tests**: Test with your existing contracts
- **E2E Tests**: Run the full test suite including PQ features
- **Monitoring**: Set up alerts for contract events
- **Documentation**: Update your API docs with new endpoints

## Need Help?

See the full documentation:
- `contracts/README-PQ.md` - Complete reference
- `IMPLEMENTATION_PQ_SUMMARY.md` - Implementation details
- Contract source code in `contracts/pq-verifier/`, `contracts/reputation/`, `contracts/gas-sponsor/`
