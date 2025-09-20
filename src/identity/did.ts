import { relay } from "../lib/cosmos";

export async function createDID() {
  // Fallback to ECDSA if Ed25519 not available
  let keyPair;
  let publicKey;
  
  try {
    keyPair = await crypto.subtle.generateKey(
      {
        name: "Ed25519",
        namedCurve: "Ed25519",
      },
      true,
      ["sign", "verify"]
    );
    
    const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    publicKey = new Uint8Array(publicKeyBuffer);
  } catch (error) {
    // Fallback to ECDSA P-256 if Ed25519 not supported
    console.log("Ed25519 not supported, using ECDSA P-256");
    keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"]
    );
    
    const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    publicKey = new Uint8Array(publicKeyBuffer);
  }
  
  // Simple base64url encoding
  const base64url = btoa(String.fromCharCode(...publicKey))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const did = `did:key:z${base64url}`;
  
  return { 
    did, 
    privKey: new Uint8Array(32), // Mock private key for demo
    pubKey: publicKey 
  };
}

export async function publishDID(did: string, pubKey: Uint8Array) {
  const contract = import.meta.env.VITE_CONTRACT_DID || import.meta.env.CONTRACT_DID;
  if (!contract) {
    console.warn('No CONTRACT_DID found, skipping DID publishing');
    return;
  }
  await relay(contract, { register: { did, pub_key: Array.from(pubKey) } });
}