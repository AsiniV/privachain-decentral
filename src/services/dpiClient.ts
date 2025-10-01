// Unified DPI facade. Desktop → Tauri IPC; Web → WebRTC peer egress if configured; fallback to direct fetch.

type Resp = {
  ok: boolean
  status: number
  headers: Headers
  arrayBuffer: () => Promise<ArrayBuffer>
}

const IS_DESKTOP = typeof window !== 'undefined' && typeof (window as { __TAURI__?: unknown }).__TAURI__ !== 'undefined'
const DPI_ENABLED = import.meta.env.VITE_DPI_ENABLED === 'true'
const TOR_ENABLED = import.meta.env.VITE_TOR_ENABLED === 'true'

export async function dpiFetch(url: string): Promise<Resp> {
  if (IS_DESKTOP) return tauriFetch(url)
  if (DPI_ENABLED) {
    try {
      return await webrtcPeerFetch(url)
    } catch {
      // Fall through to direct fetch
    }
  }
  // fallback direct
  const h = randomizedHeaders()
  const r = await fetch(url, { headers: h, cache: 'no-store' })
  return { ok: r.ok, status: r.status, headers: r.headers, arrayBuffer: () => r.arrayBuffer() }
}

async function tauriFetch(url: string): Promise<Resp> {
  // @ts-expect-error - Tauri global is injected by Tauri runtime
  const { invoke } = window.__TAURI__.tauri
  const res = await invoke<{ status: number; headers: [string, string][]; body: number[] }>('dpi_fetch', { url, tor: TOR_ENABLED })
  const headers = new Headers(res.headers)
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    headers,
    arrayBuffer: async () => new Uint8Array(res.body).buffer
  }
}

async function webrtcPeerFetch(url: string): Promise<Resp> {
  // TODO: implement peer discovery via OrbitDB doc; establish datachannel; request/response RPC
  console.log('WebRTC peer fetch not yet implemented for:', url)
  throw new Error('peer egress not ready')
}

function randomizedHeaders(): Headers {
  const h = new Headers()
  h.set('Accept', '*/*')
  h.set('Cache-Control', 'no-cache')
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 Version/16.5 Safari/605.1.15',
  ]
  h.set('User-Agent', uas[Math.random() * uas.length | 0])
  return h
}
