// Simplified Signal Protocol implementation
// Note: This is a basic implementation for demonstration
// In production, use a proper Signal Protocol library

import { randomBytes } from "tweetnacl";

interface SignalStore {
  identityKey?: Uint8Array;
  registrationId?: number;
  sessions: Map<string, any>;
}

const store: SignalStore = {
  sessions: new Map()
};

export async function initSignal(did: string) {
  const identity = randomBytes(32);
  const regId = Math.floor(Math.random() * 16777215);
  
  store.identityKey = identity;
  store.registrationId = regId;
  
  console.log(`[signal] initialized for ${did}`);
  return store;
}

export async function encrypt(store: SignalStore, theirDid: string, plaintext: string) {
  // Simplified encryption - in production use proper Signal Protocol
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = randomBytes(data.length + 16); // Mock encryption
  return JSON.stringify({ type: 'message', body: Array.from(encrypted) });
}

export async function decrypt(store: SignalStore, theirDid: string, ctJson: string) {
  // Simplified decryption - in production use proper Signal Protocol
  const ct = JSON.parse(ctJson);
  // Mock decryption - just return a placeholder
  return "Decrypted message (mock implementation)";
}

export async function uploadBundle(node: any, did: string) {
  const identity = { pubKey: store.identityKey };
  // Mock key generation - in production use proper Signal Protocol
  const preKey = { keyId: 0, keyPair: { pubKey: randomBytes(32) } };
  const signed = { keyId: 0, keyPair: { pubKey: randomBytes(32) }, signature: randomBytes(64) };
  
  const bundle = {
    did,
    identityKey: identity.pubKey,
    preKey: { id: preKey.keyId, key: preKey.keyPair.pubKey },
    signedPreKey: { id: signed.keyId, key: signed.keyPair.pubKey, signature: signed.signature }
  };
  await node.pubsub.publish("privachain.signal.bundle", new TextEncoder().encode(JSON.stringify(bundle)));
}

export async function downloadBundle(node: any, theirDid: string): Promise<any> {
  return new Promise((resolve) => {
    node.pubsub.subscribe("privachain.signal.bundle");
    node.pubsub.addEventListener("message", (evt: any) => {
      const msg = JSON.parse(new TextDecoder().decode(evt.detail.data));
      if (msg.did === theirDid) resolve(msg);
    });
    setTimeout(() => resolve(null), 10_000); // fallback
  });
}