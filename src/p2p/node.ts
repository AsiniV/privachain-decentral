import { createLibp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { kadDHT } from "@libp2p/kad-dht";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { webSockets } from "@libp2p/websockets";
import { identify } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { attachOnion } from "./onion";

export async function startP2P(did: string) {
  const bootstrap = (import.meta.env.VITE_LIBP2P_BOOTSTRAP || import.meta.env.LIBP2P_BOOTSTRAP || "").split(",").filter(Boolean);
  const node = await createLibp2p({
    addresses: { listen: ["/ip4/127.0.0.1/tcp/0/ws"] },
    transports: [
      webSockets()
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      ping: ping(),
      dht: kadDHT(),
      pubsub: gossipsub({ allowPublishToZeroTopicPeers: true })
    }
  });
  await node.start();
  console.log("[p2p] started with id", node.peerId.toString());
  
  // Attach onion routing handler
  attachOnion(node);
  
  // auto-dial bootstrap every 30 s
  setInterval(async () => {
    for (const ma of bootstrap) {
      try { 
        await node.dial(ma); 
      } catch (e) { 
        /* ignore */ 
      }
    }
  }, 30_000);
  
  return node;
}