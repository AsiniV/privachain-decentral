# Migration Guide: v0.1.0 → v0.2.0

## Overview
This guide explains how to upgrade your reputation contract from version 0.1.0 to 0.2.0.

## Breaking Changes
**None!** This is a fully backward-compatible upgrade.

## New Features

### 1. History Tracking
Reputation updates are now automatically tracked in a history table.

**Query history:**
```json
{
  "get_history": {
    "address": "juno1...",
    "start_after": null,
    "limit": 10
  }
}
```

**Response:**
```json
{
  "entries": [
    {
      "index": 1,
      "score": 50,
      "timestamp": "1700000000000000000",
      "tx_hash": [0, 0, 0, 1, ...]
    }
  ]
}
```

### 2. Enhanced Signature Validation (PQ Mode)
When the contract is compiled with the `pq` feature:
- Signatures must be exactly 4595 bytes
- Zero-filled signatures are rejected

**Mock mode (no pq feature):**
- Maintains relaxed validation for testing
- Only requires signatures > 100 bytes

### 3. Self-Only Guard (Optional)
Enable the `self_only` feature to restrict updates:
- Users can only update their own reputation
- Address must match the hash of the provided public key

**Build with self-only guard:**
```bash
cargo build --release --features pq,self_only
```

## Migration Steps

### On-Chain Migration

1. **Build the new contract:**
```bash
cd contracts/reputation
cargo build --release --features pq
```

2. **Store the new wasm:**
```bash
junod tx wasm store artifacts/reputation.wasm \
  --from your-key \
  --gas auto \
  --gas-adjustment 1.3 \
  --fees 5000ujuno
```

3. **Migrate the contract:**
```bash
junod tx wasm migrate <contract-address> <new-code-id> '{}' \
  --from your-key \
  --gas auto \
  --fees 5000ujuno
```

### Verification

After migration, verify the new version:
```bash
junod query wasm contract-state smart <contract-address> \
  '{"get_history":{"address":"juno1..."}}'
```

## Client Updates (Optional)

### To Use History Tracking
Update your client to query history:
```typescript
const history = await client.queryContractSmart(contractAddress, {
  get_history: {
    address: userAddress,
    start_after: null,
    limit: 10
  }
});
```

### Existing Queries Continue to Work
Your existing `get_reputation` queries require no changes:
```typescript
const reputation = await client.queryContractSmart(contractAddress, {
  get_reputation: { address: userAddress }
});
// Returns: { score, dilithium_pk, dilithium_sig }
```

## Rollback Plan

If you need to rollback:
1. The storage format is backward compatible
2. Simply migrate back to the previous code ID
3. History data will be preserved but not accessible until you upgrade again

## Support

If you encounter issues during migration:
1. Check that the contract version in storage is set to "0.2.0"
2. Verify that history queries work for new updates
3. Confirm that old reputation queries still function

## Gas Costs

- Execute update: ~1,550k gas (with PQ verification)
- Query reputation: Same as v0.1.0
- Query history: ~100k-200k gas depending on limit
