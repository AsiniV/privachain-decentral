/**
 * Server-side TURN provider service for PrivaChain
 * Handles dynamic credential fetching from Metered.ca with caching and fallback
 */

import type { 
  IceServerEntry, 
  TurnCredentials, 
  MeteredApiResponse, 
  TurnProviderOptions,
  LogEvent 
} from '../../shared/types/webrtc'

interface CacheEntry {
  iceServers: IceServerEntry[]
  expiresAt: number
  ttl: number
}

export class TurnProvider {
  private cache: CacheEntry | null = null
  private pendingPromise: Promise<IceServerEntry[]> | null = null
  private options: TurnProviderOptions
  private lastTTL: number = 300 // Default 5 minutes

  constructor(options: TurnProviderOptions) {
    this.options = {
      cacheTtlOffsetSeconds: 15,
      enableRateLimit: true,
      ...options
    }
  }

  /**
   * Get ICE servers with caching and fallback strategy
   */
  async getIceServers(force = false): Promise<{ 
    iceServers: IceServerEntry[]
    source: 'dynamic' | 'cache' | 'fallback'
    expiresAt?: number 
  }> {
    const now = Date.now()
    const offsetMs = (this.options.cacheTtlOffsetSeconds || 15) * 1000

    // Check cache first (unless forced refresh)
    if (!force && this.cache && (now < this.cache.expiresAt - offsetMs)) {
      this.log('ice_cache_hit', { 
        remainingMs: this.cache.expiresAt - now,
        ttl: this.cache.ttl
      })
      return { 
        iceServers: this.cache.iceServers, 
        source: 'cache', 
        expiresAt: this.cache.expiresAt 
      }
    }

    // If there's already a pending fetch, wait for it
    if (this.pendingPromise) {
      const result = await this.pendingPromise
      return { 
        iceServers: result, 
        source: 'cache-wait', 
        expiresAt: this.cache?.expiresAt 
      }
    }

    // Start new fetch
    this.pendingPromise = this.fetchFromMetered()
      .then(credentials => {
        const expiresAt = Date.now() + credentials.ttl * 1000
        this.cache = { 
          iceServers: credentials.iceServers, 
          expiresAt,
          ttl: credentials.ttl
        }
        this.lastTTL = credentials.ttl
        return credentials.iceServers
      })
      .catch(err => {
        this.log('ice_fetch_failure', { 
          error: err.message,
          hasValidCache: !!(this.cache && now < this.cache.expiresAt)
        })
        
        // If we have valid cached data, use it
        if (this.cache && now < this.cache.expiresAt) {
          return this.cache.iceServers
        }
        
        // Otherwise fallback to static servers
        return this.fallbackStatic()
      })
      .finally(() => { 
        this.pendingPromise = null 
      })

    const iceServers = await this.pendingPromise
    
    // Determine the source
    let source: 'dynamic' | 'cache' | 'fallback'
    if (this.cache && iceServers === this.cache.iceServers) {
      source = 'dynamic'
    } else if (this.cache) {
      source = 'cache'
    } else {
      source = 'fallback'
    }

    return { 
      iceServers, 
      source, 
      expiresAt: this.cache?.expiresAt 
    }
  }

  /**
   * Fetch fresh credentials from Metered.ca API
   */
  private async fetchFromMetered(): Promise<TurnCredentials> {
    const startTime = Date.now()
    
    try {
      const url = `https://${this.options.domain}/api/v1/turn-credentials?secret=${this.options.secret}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // Add timeout
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`Metered API error: ${response.status} ${response.statusText}`)
      }

      const data: MeteredApiResponse = await response.json()
      
      // Validate response structure
      if (!data.iceServers || !Array.isArray(data.iceServers)) {
        throw new Error('Invalid response format from Metered API')
      }

      // Extract TTL from response or use default
      const ttl = data.ttl || 300 // Default 5 minutes if not provided

      this.log('ice_fetch_success', { 
        ttl,
        renewInMs: ttl * 1000,
        latencyMs: Date.now() - startTime,
        serverCount: data.iceServers.length
      })

      return {
        iceServers: data.iceServers,
        ttl
      }

    } catch (error) {
      this.log('ice_fetch_failure', { 
        errorType: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Fallback to static TURN servers
   */
  private fallbackStatic(): IceServerEntry[] {
    this.log('ice_fallback_used', { 
      reason: 'no_dynamic_credentials',
      staticServerCount: this.options.staticServers?.length || 0
    })

    // Use provided static servers or default fallback
    return this.options.staticServers || [
      { urls: 'stun:stun.relay.metered.ca:80' },
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: 'fallback_user',
        credential: 'fallback_credential'
      }
    ]
  }

  /**
   * Structured logging
   */
  private log(event: string, detail: Record<string, any>): void {
    const logEvent: LogEvent = {
      timestamp: Date.now(),
      level: event.includes('failure') || event.includes('fallback') ? 'warn' : 'info',
      event,
      source: 'turn_provider',
      detail
    }

    // In production, this would go to a proper logging service
    console.log(JSON.stringify(logEvent))
  }

  /**
   * Force cache invalidation (for debugging/testing)
   */
  invalidateCache(): void {
    this.cache = null
    this.log('cache_invalidated', { reason: 'manual' })
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { 
    hasCache: boolean
    expiresAt?: number
    remainingMs?: number
    ttl?: number
  } {
    if (!this.cache) {
      return { hasCache: false }
    }

    const remainingMs = this.cache.expiresAt - Date.now()
    return {
      hasCache: true,
      expiresAt: this.cache.expiresAt,
      remainingMs: Math.max(0, remainingMs),
      ttl: this.cache.ttl
    }
  }
}

// Singleton instance for server use
export let turnProviderInstance: TurnProvider | null = null

export function initializeTurnProvider(options: TurnProviderOptions): TurnProvider {
  turnProviderInstance = new TurnProvider(options)
  return turnProviderInstance
}

export function getTurnProvider(): TurnProvider {
  if (!turnProviderInstance) {
    throw new Error('TurnProvider not initialized. Call initializeTurnProvider() first.')
  }
  return turnProviderInstance
}