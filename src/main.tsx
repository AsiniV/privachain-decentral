import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

import { createDID, publishDID } from "./identity/did";
import { startP2P } from "./p2p/node";
import { initSignal } from "./messenger/signal";
import { createIndex } from "./search/indexer";
import { getSigningClient } from "./lib/cosmos";

async function bootstrap() {
  try {
    console.log("🚀 Starting PrivaChain bootstrap...");
    
    const { did, pubKey } = await createDID();
    console.log("✅ DID created:", did);
    
    const node = await startP2P(did);
    console.log("✅ P2P node started");
    
    const store = await initSignal(did);
    console.log("✅ Signal messenger initialized");
    
    const index = await createIndex();
    console.log("✅ Search index created");
    
    // Only try to connect to cosmos if env vars are available
    const rpcEndpoint = import.meta.env.VITE_COSMOS_RPC || import.meta.env.COSMOS_RPC;
    const mnemonic = import.meta.env.VITE_COSMOS_RELAYER_MNEMONIC || import.meta.env.COSMOS_RELAYER_MNEMONIC;
    
    if (rpcEndpoint && mnemonic) {
      const client = await getSigningClient();
      await publishDID(did, pubKey);
      console.log("✅ DID published to blockchain");
      console.log('🟢 PrivaChain ready', { did, node, store, index, client });
    } else {
      console.log('🟡 PrivaChain ready (offline mode)', { did, node, store, index });
    }
  } catch (error) {
    console.error("❌ PrivaChain bootstrap failed:", error);
  }
}

// Start bootstrap process
bootstrap();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
