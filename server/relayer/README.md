# Relayer Service

This directory contains the backend service that handles gas-sponsored transactions for PrivaChain.

## Current Status: Phase 0 Stub Implementation

The relayer service is currently in stub form for Phase 0 of the delivery runbook. It provides:

- Backend-only access to developer mnemonic (removed from frontend)
- Gas sponsorship for contract transactions
- Basic transaction execution API

## Phase 1 Implementation (Upcoming)

In Phase 1, this will become a full Fastify server with:

- **Service Directory**: `services/relayer/`
- **Endpoints**:
  - `POST /tx/execute` - Execute sponsored transactions
  - `GET /health` - Health check endpoint
- **Features**:
  - Rate limiting (Redis or in-memory)
  - Transaction logs (SQLite/Postgres)
  - Metrics endpoint (`/metrics`)
  - Request validation
  - Cosmos client integration

## Security Model

- Developer mnemonic is **NEVER** exposed to frontend code
- All gas sponsorship happens server-side
- Runtime guards prevent frontend mnemonic access
- Environment variable validation ensures proper configuration

## Usage

```typescript
import { relayerStub } from './relayer_stub'

// Initialize with environment mnemonic
await relayerStub.initialize()

// Execute sponsored transaction
const result = await relayerStub.executeSponsoredTx(
  'register_domain',
  { domain: 'example.prv', ... },
  contractAddress
)
```

**Note**: This is a placeholder implementation. Do not use in production.