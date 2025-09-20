import { ed25519 } from "@noble/ed25519";
import { base64url } from "@scure/base";
import { relay } from "../lib/cosmos";

export async function createDID() {
  const priv = ed25519.utils.randomPrivateKey();
  const pub  = await ed25519.getPublicKeyAsync(priv);
  const did  = `did:key:z${base64url.encode(pub)}`;
  return { did, privKey: priv, pubKey: pub };
}

export async function publishDID(did: string, pubKey: Uint8Array) {
  const contract = process.env.CONTRACT_DID!;
  await relay(contract, { register: { did, pub_key: Array.from(pubKey) } });
}