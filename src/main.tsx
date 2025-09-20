import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BlockchainProvider } from "./blockchain";
import { createDID, publishDID } from "./identity/did";
import { startP2P } from "./p2p/node";
import { initSignal } from "./messenger/signal";
import { createIndex } from "./search/indexer";
import "./index.css";

(async () => {
  // 1. identity
  const { did, pubKey } = await createDID();
  await publishDID(did, pubKey);

  // 2. network
  const node = await startP2P(did);
  const store = await initSignal(did);
  const index = await createIndex();

  // 3. expose global API for UI
  (window as any).privachain = { did, node, store, index };

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <BlockchainProvider>
      <App />
    </BlockchainProvider>
  );
})();
