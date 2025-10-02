// packages/resolver/src/worker.ts
import { getVerifiedFetch } from './heliaBrowser'

self.onmessage = async (e: MessageEvent<{ cid: string }>) => {
  try {
    const vf = await getVerifiedFetch()
    const resp = await vf(`ipfs://${e.data.cid}`)
    if (!resp.ok) throw new Error(`Fetch failed with status ${resp.status}`)
    const buf = new Uint8Array(await resp.arrayBuffer())
    self.postMessage({ cid: e.data.cid, buf }, [buf.buffer])
  } catch (err) {
    self.postMessage({ cid: e.data.cid, error: (err as Error).message })
  }
}
