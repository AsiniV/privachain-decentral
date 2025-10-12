// packages/resolver/src/heliaBrowser.ts
import { createHelia, type Helia } from 'helia'
import { unixfs, type UnixFS } from '@helia/unixfs'
import { createVerifiedFetch, type VerifiedFetch } from '@helia/verified-fetch'
import { IDBBlockstore } from 'blockstore-idb'
import { IDBDatastore } from 'datastore-idb'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import type { Libp2pOptions } from 'libp2p'

let helia: Helia | null = null
let fs: UnixFS | null = null
let fetchInstance: VerifiedFetch | null = null

const HELIA_DB = 'helia_blocks'   // IndexedDB name for blocks
const DATA_DB = 'helia_data'      // IndexedDB name for libp2p key-chain etc.

export async function getHelia(): Promise<Helia> {
  if (helia) return helia

  const blockstore = new IDBBlockstore(HELIA_DB)
  const datastore = new IDBDatastore(DATA_DB)
  await blockstore.open().catch(err => { throw new Error(`Failed to open blockstore: ${err.message}`) })
  await datastore.open().catch(err => { throw new Error(`Failed to open datastore: ${err.message}`) })

  const libp2pOptions: Libp2pOptions = {
    transports: [webSockets(), webRTC()],
    connectionEncrypters: [noise()],
    streamMuxers: [mplex()],
    datastore,
  }

  helia = await createHelia({
    blockstore,
    datastore,
    libp2p: libp2pOptions,
  })

  console.info('[Helia] browser node ready', helia.libp2p.peerId.toString())

  return helia
}

export async function getUnixfs(): Promise<UnixFS> {
  if (!fs) fs = unixfs(await getHelia())
  return fs
}

export async function getVerifiedFetch(): Promise<VerifiedFetch> {
  if (!fetchInstance) fetchInstance = await createVerifiedFetch(await getHelia())
  return fetchInstance
}
