// Unified resolver for web build. Desktop uses Tauri IPC for HTTP and Kubo.
// Routes ipfs://, *.prv (via off-chain map or contract), and http(s) with DPI feature flags.

import { CID } from 'multiformats/cid'
import { concat } from 'uint8arrays/concat'
import { fileTypeFromBuffer } from 'file-type'
import { getUnixfs } from './heliaBrowser'
import { resolvePrvDomain } from '../cosmos/src/prv'
import { dpiFetch } from './dpiClient'

const IS_DESKTOP = typeof window !== 'undefined' && typeof (window as unknown as { __TAURI__?: unknown }).__TAURI__ !== 'undefined'

export async function initResolver() {
  // Initialize Helia via heliaBrowser singleton
  if (!IS_DESKTOP) {
    await getUnixfs()
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
  const cid = CID.parse(cidStr)
  const fs = await getUnixfs()

  const chunks: Uint8Array[] = []
  for await (const chunk of fs.cat(cid)) {
    chunks.push(chunk)
  }

  const bytes = concat(chunks)
  const fileType = await fileTypeFromBuffer(bytes)
  return { bytes, contentType: fileType?.mime ?? 'application/octet-stream', source: 'ipfs' as const }
}

async function resolveHttp(url: string) {
  // If desktop, route via Tauri IPC egress; if web and DPI enabled, try peer egress.
  const res = await dpiFetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  return { bytes: buf, contentType: res.headers.get('content-type') || detect(buf), source: 'http' as const }
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
