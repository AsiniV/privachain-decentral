import {
  CosmosDatasourceKind,
  CosmosHandlerKind,
  CosmosProject,
} from "@subql/types-cosmos";

// Can expand the Datasource processor types via the generic param
const project: CosmosProject = {
  specVersion: "1.0.0",
  version: "0.0.1",
  name: "privachain-cosmos-indexer",
  description:
    "This project can be used as a starting point for developing your new Cosmos SubQuery project (indexing Osmosis swaps)",
  runner: {
    node: {
      name: "@subql/node-cosmos",
      version: ">=3.0.1",
    },
    query: {
      name: "@subql/query",
      version: "*",
    },
  },
  schema: {
    file: "./schema.graphql",
  },
  network: {
    /* The unique chainID of the Cosmos Zone */
    chainId: "osmosis-1",
    /* The HTTP endpoint of a full chain node for this network */
    endpoint: ["https://rpc.osmosis.zone/"],
    chaintypes: new Map([
      [
        "osmosis.gamm.v1beta1",
        {
          file: "./proto/osmosis/gamm/v1beta1/tx.proto",
          messages: ["MsgSwapExactAmountIn"],
        },
      ],
      [
        "osmosis.poolmanager.v1beta1",
        {
          // needed by MsgSwapExactAmountIn
          file: "./proto/osmosis/poolmanager/v1beta1/swap_route.proto",
          messages: ["SwapAmountInRoute"],
        },
      ],
      [
        "cosmos.base.v1beta1",
        {
          // needed by MsgSwapExactAmountIn
          file: "./proto/cosmos/base/v1beta1/coin.proto",
          messages: ["Coin"],
        },
      ],
    ]),
  },
  dataSources: [
    {
      kind: CosmosDatasourceKind.Runtime,
      startBlock: 11253914,
      mapping: {
        file: "./dist/index.js",
        handlers: [
          {
            handler: "handleMessage",
            kind: CosmosHandlerKind.Message,
            filter: {
              type: "/osmosis.gamm.v1beta1.MsgSwapExactAmountIn",
            },
          },
        ],
      },
    },
  ],
};

// Must set default to the project instance
export default project;