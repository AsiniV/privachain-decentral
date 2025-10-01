// Unified resolver for web build. Desktop uses Tauri IPC for HTTP and Kubo.
// Routes ipfs://, *.prv (via off-chain map or contract), and http(s) with DPI feature flags.

import { createHelia, Helia } from 'helia'
import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import { resolvePrvDomain } from '../cosmos/src/prv'
import { dpiFetch } from './dpiClient'

const IS_DESKTOP = typeof window !== 'undefined' && typeof (window as unknown as { __TAURI__?: unknown }).__TAURI__ !== 'undefined'

let helia: Helia | null = null

export async function initResolver() {
  if (!helia && !IS_DESKTOP) {
    helia = await createHelia()
  }
}

export async function resolveUrl(url: string): Promise<{ bytes: Uint8Array; contentType: string; source: 'ipfs' | 'http' | 'blockchain' }> {
  const u = new URL(url)
  if (u.protocol === 'ipfs:') {
    const cid = u.hostname || u.pathname.replace(/^\//, '')
    return await resolveIpfs(cid)
  }
  if (u.hostname.endsWith('.prv')) {
    const rec = await resolvePrvDomain(u.hostname)
    if (!rec || !rec.active || rec.expires < Date.now()) throw new Error('Domain inactive or missing')
    return await resolveIpfs(rec.cid)
  }
  return await resolveHttp(url)
}

async function resolveIpfs(cidStr: string) {
  if (helia) {
    const fs = unixfs(helia)
    const cid = CID.parse(cidStr)
    const chunks: Uint8Array[] = []
    for await (const chunk of fs.cat(cid)) chunks.push(chunk)
    const bytes = concat(chunks)
    return { bytes, contentType: detect(bytes), source: 'ipfs' as const }
  }
  // Desktop or no Helia: use public gateway for first cut; desktop should use Kubo HTTP API.
  const r = await fetch(`https://ipfs.io/ipfs/${encodeURIComponent(cidStr)}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`IPFS gateway ${r.status}`)
  const buf = new Uint8Array(await r.arrayBuffer())
  return { bytes: buf, contentType: r.headers.get('content-type') || detect(buf), source: 'ipfs' as const }
}

async function resolveHttp(url: string) {
  // If desktop, route via Tauri IPC egress; if web and DPI enabled, try peer egress.
  const res = await dpiFetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  return { bytes: buf, contentType: res.headers.get('content-type') || detect(buf), source: 'http' as const }
}

function concat(chunks: Uint8Array[]) {
  const len = chunks.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(len)
  let o = 0; for (const c of chunks) { out.set(c, o); o += c.length }
  return out
}

function detect(data: Uint8Array): string {
  if (data.length >= 4) {
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return 'image/png'
    if (data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg'
    if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) return 'application/pdf'
    if (data[0] === 0x3c) return 'text/html'
  }
  for (let i = 0; i < Math.min(1024, data.length); i++) {
    const b = data[i]; if (b < 0x09 || (b > 0x0d && b < 0x20) || b > 0x7e) return 'application/octet-stream'
  }
  return 'text/plain'
}
