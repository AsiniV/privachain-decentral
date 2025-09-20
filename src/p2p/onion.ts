import { pipe } from "it-pipe";
const HOPS = 3;

export async function onionDial(node: any, targetPeerId: string) {
  const path = await node.peerRouting.findPeers(HOPS + 1);
  let stream = await node.dialProtocol(path[0], "/onion/relay/1.0.0");
  for (let i = 1; i < HOPS; i++) {
    stream = await node.dialProtocol(path[i], "/onion/relay/1.0.0", { stream });
  }
  // last hop to target
  return node.dialProtocol(targetPeerId, "/onion/dest/1.0.0", { stream });
}

export function attachOnion(node: any) {
  node.handle("/onion/relay/1.0.0", ({ stream }: any) => pipe(stream, stream));
}