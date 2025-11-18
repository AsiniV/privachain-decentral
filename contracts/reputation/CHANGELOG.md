# Changelog

## [0.2.0] - 2024-11-17

### Added
- **Strict Signature Validation (PQ Mode)**: When compiled with the `pq` feature:
  - Enforces exact 4595-byte signature length for Dilithium-5
  - Rejects zero-filled signatures to prevent trivial bypasses
- **History Tracking**: New storage for tracking reputation updates over time
  - `HISTORY` map stores historical records with timestamps
  - `COUNTER` item maintains unique indices for history entries
  - New `GetHistory` query endpoint with pagination support
- **Self-Only Guard**: Optional `self_only` feature flag
  - When enabled, only allows users to update their own reputation
  - Derives expected address from public key hash
- **Migration Support**: Entry point for migrating from v0.1.0 to v0.2.0
- **Enhanced Error Messages**: More descriptive error variants
  - `WrongSigLen(usize)` - reports actual signature length
  - `ZeroInput` - detects zero-filled signatures
  - `Unauthorized` - for self-only guard violations
  - `LiboqsError(String)` - for liboqs-related errors

### Changed
- `execute_update` now accepts `env: Env` parameter for timestamp tracking
- Version bumped to 0.2.0 in Cargo.toml
- Added `hex` dependency for address derivation in self-only mode

### Fixed
- Transaction hash now uses block height + tx index (TransactionInfo only has index field)

### Backward Compatibility
- All changes are additive or behind feature flags
- Existing `GetReputation` query continues to work unchanged
- Mock mode (without `pq` feature) maintains relaxed validation for testing
- Storage layout is backward compatible with v0.1.0

### Tests
- Added 4 new test cases covering new functionality
- Conditional compilation tests for `pq` feature
- All 11 tests pass in mock mode

## [0.1.0] - Initial Release

Initial implementation of reputation contract with basic Dilithium-5 signature verification.
