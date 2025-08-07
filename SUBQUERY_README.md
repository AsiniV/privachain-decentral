# SubQuery Osmosis Swap Indexer

This SubQuery project indexes Osmosis swap transactions for use in the PrivaChain decentralized search backend.

## Overview

The indexer tracks `MsgSwapExactAmountIn` messages on the Osmosis blockchain and creates queryable entities for:

- **Swaps**: Individual swap transactions with sender, amounts, and transaction details
- **SwapRoutes**: Route information for multi-hop swaps  
- **Pools**: Pool entities that swaps route through

## Project Structure

```
├── project.ts              # SubQuery project manifest
├── project.yaml            # Alternative YAML manifest  
├── schema.graphql          # GraphQL schema definitions
├── proto/                  # Protobuf definitions
│   ├── osmosis/gamm/v1beta1/tx.proto
│   ├── osmosis/poolmanager/v1beta1/swap_route.proto
│   └── cosmos/base/v1beta1/coin.proto
├── src/
│   ├── index.ts            # Export mapping handlers
│   ├── mappings/
│   │   └── mappingHandlers.ts  # Message handlers
│   └── types/              # Generated types (auto-generated)
└── dist/                   # Compiled JavaScript output
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Types

```bash
npm run codegen
```

This generates TypeScript types from:
- GraphQL schema → Entity classes in `src/types/models/`
- Protobuf definitions → Message types in `src/types/CosmosMessageTypes.ts`

### 3. Build Project

```bash
npm run subql:build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

### 4. Run Indexer

```bash
# Using SubQuery CLI
subql-node -f .

# Or using Docker
docker run --rm -it -v $(pwd):/project \
  subquerynetwork/subql-node-cosmos:latest \
  -f /project
```

## Schema Entities

### Swap
```graphql
type Swap @entity {
  id: ID!                    # Format: {txHash}-{msgIndex}
  sender: String!            # Address that initiated the swap
  txHash: String!            # Transaction hash
  blockHeight: BigInt!       # Block height of the transaction
  tokenInDenom: String       # Denomination of input token
  tokenInAmount: BigInt      # Amount of input token
  tokenOutMin: BigInt!       # Minimum output amount
  swapRoutes: [SwapRoute]    # Related swap routes
}
```

### SwapRoute
```graphql
type SwapRoute @entity {
  id: ID!                    # Format: {txHash}-{msgIndex}-{routeIndex}
  pool: Pool!                # Pool used in this route
  swap: Swap!                # Parent swap transaction
  tokenInDenom: String       # Input token for this route
  tokenOutDenom: String!     # Output token for this route
}
```

### Pool
```graphql
type Pool @entity {
  id: ID!                    # Pool ID from Osmosis
  swapRoutes: [SwapRoute]    # All routes through this pool
}
```

## Message Handler

The `handleMessage` function in `src/mappings/mappingHandlers.ts`:

1. **Extracts swap data** from `MsgSwapExactAmountIn` messages
2. **Creates Swap entity** with transaction details
3. **Processes routes** to create SwapRoute entities for each hop
4. **Ensures Pool entities** exist for all referenced pools

## Example Queries

### Get Recent Swaps
```graphql
query RecentSwaps {
  swaps(first: 10, orderBy: BLOCK_HEIGHT_DESC) {
    nodes {
      id
      sender
      tokenInDenom
      tokenInAmount
      blockHeight
      swapRoutes {
        nodes {
          tokenOutDenom
          pool {
            id
          }
        }
      }
    }
  }
}
```

### Get Swaps by Sender
```graphql
query SwapsBySender($sender: String!) {
  swaps(filter: { sender: { equalTo: $sender } }) {
    nodes {
      id
      txHash
      tokenInDenom
      tokenInAmount
      tokenOutMin
    }
  }
}
```

### Pool Statistics
```graphql
query PoolStats($poolId: String!) {
  pool(id: $poolId) {
    id
    swapRoutes {
      totalCount
      nodes {
        tokenInDenom
        tokenOutDenom
      }
    }
  }
}
```

## Integration with PrivaChain

The SubQuery indexer integrates with PrivaChain's search backend in `src/blockchain/SearchBackend.ts`:

- **searchOsmosisSwaps()**: Query indexed swap data
- **getSwapStatistics()**: Get aggregate statistics
- **GraphQL client**: Configured to query the SubQuery endpoint

## Configuration

### Network Settings
- **Chain ID**: `osmosis-1` (Osmosis mainnet)
- **RPC Endpoint**: `https://rpc.osmosis.zone/`
- **Start Block**: `11253914` (first block with swap data)

### Message Filter
- **Type**: `/osmosis.gamm.v1beta1.MsgSwapExactAmountIn`
- **Handler**: `handleMessage`

## Development

### Adding New Message Types

1. Add protobuf definition to `proto/`
2. Update `chaintypes` in `project.ts`
3. Add handler in `src/mappings/mappingHandlers.ts`
4. Update schema if needed
5. Run `npm run codegen`

### Testing Handlers

The compiled handlers in `dist/index.js` can be tested independently by importing and calling with mock message data.

### Deployment

Deploy to SubQuery's hosted service:

```bash
subql publish
```

## Monitoring

The indexer tracks:
- Block processing progress
- Message handling success/failures  
- Entity creation statistics
- Query performance metrics

Check logs for processing status and any errors during indexing.