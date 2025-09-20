import React, { createContext, useContext, useEffect, useState } from "react";
import { getSigningClient } from "../lib/cosmos";

interface BlockchainState {
  connected: boolean;
  balance: string;
  validators: any[];
  lastBlock: number;
  txs: any[];
}

const initialState: BlockchainState = {
  connected: false,
  balance: "0",
  validators: [],
  lastBlock: 0,
  txs: []
};

const BlockchainContext = createContext<BlockchainState>(initialState);

export const BlockchainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BlockchainState>(initialState);

  useEffect(() => {
    (async () => {
      const client = await getSigningClient();
      if (client) {
        const height = await client.getHeight();
        const balance = await client.getBalance("cosmos1relayer", "uatom");
        setState(prev => ({
          ...prev,
          connected: true,
          lastBlock: height,
          balance: balance.amount
        }));
      }
    })();
  }, []);

  return <BlockchainContext.Provider value={state}>{children}</BlockchainContext.Provider>;
};

export const useBlockchain = () => useContext(BlockchainContext);