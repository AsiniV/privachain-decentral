import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

const SPONSOR_RPC = import.meta.env.VITE_SPONSOR_RPC || 'http://localhost:3000';
const SPONSOR_URL = `${SPONSOR_RPC}/api/sponsor`;

export async function sponsorAndBroadcast(txRaw: TxRaw) {
  const body = {
    tx_bytes: Buffer.from(TxRaw.encode(txRaw).finish()).toString('base64'),
    chain_id: import.meta.env.VITE_CHAIN_ID || 'theta-testnet-001',
  };
  
  const r = await fetch(SPONSOR_URL, { 
    method: 'POST', 
    body: JSON.stringify(body), 
    headers: { 'Content-Type': 'application/json' } 
  });
  
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // { txhash, code, logs }
}
