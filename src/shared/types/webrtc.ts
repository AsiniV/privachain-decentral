/**
 * Shared WebRTC types for PrivaChain video calling
 */

export interface IceServerEntry {
  urls: string
  username?: string
  credential?: string
  credentialType?: 'password' | 'oauth'
}

export interface IceResponse {
  iceServers: IceServerEntry[]
  source: 'dynamic' | 'cache' | 'cache-wait' | 'fallback'
  expiresAt?: number
}

export interface TurnCredentials {
  iceServers: IceServerEntry[]
  ttl: number
  username?: string
  credential?: string
}

export interface MeteredApiResponse {
  iceServers: IceServerEntry[]
  ttl?: number
}

export interface TurnProviderOptions {
  domain: string
  secret: string
  staticServers?: IceServerEntry[]
  cacheTtlOffsetSeconds?: number
  enableRateLimit?: boolean
}

export interface LogEvent {
  timestamp: number
  level: 'info' | 'warn' | 'error'
  event: string
  source: string
  detail: Record<string, any>
}