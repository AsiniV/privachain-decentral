import { createLibp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { kadDHT } from "@libp2p/kad-dht";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { webSockets } from "@libp2p/websockets";

export async function startP2P(did: string) {
  const bootstrap = process.env.LIBP2P_BOOTSTRAP!.split(",");
  const node = await createLibp2p({
    addresses: { listen: ["/ip4/127.0.0.1/tcp/0/ws"] },
    transports: [
      webSockets()
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
      dht: kadDHT(),
      pubsub: gossipsub({ allowPublishToZeroPeers: true })
    }
  });
  await node.start();
  console.log("[p2p] started with id", node.peerId.toString());
  return node;
}