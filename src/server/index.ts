/**
 * Server initialization for PrivaChain TURN/ICE services
 * This would typically be part of your backend server setup
 */

import { initializeTurnProvider } from './services/turnProvider'
import type { IceServerEntry } from '../shared/types/webrtc'

/**
 * Initialize TURN provider with environment configuration
 */
export function initializeServerServices(): void {
  try {
    // Get configuration from environment variables
    const domain = process.env.METERED_DOMAIN || 'privachain.metered.live'
    const secret = process.env.METERED_TURN_SECRET
    
    if (!secret) {
      console.warn('⚠️  METERED_TURN_SECRET not configured. TURN services will use fallback only.')
    }

    // Parse static servers from environment
    let staticServers: IceServerEntry[] = []
    try {
      const staticServersJson = process.env.TURN_STATIC_SERVERS_JSON
      if (staticServersJson) {
        staticServers = JSON.parse(staticServersJson)
      }
    } catch (error) {
      console.warn('Failed to parse TURN_STATIC_SERVERS_JSON:', error)
    }

    // Default static servers if none configured
    if (staticServers.length === 0) {
      staticServers = [
        { urls: 'stun:stun.relay.metered.ca:80' },
        {
          urls: 'turn:global.relay.metered.ca:80',
          username: 'fallback_user',
          credential: 'fallback_credential'
        }
      ]
    }

    // Initialize TURN provider
    const turnProvider = initializeTurnProvider({
      domain,
      secret: secret || 'fallback_secret',
      staticServers,
      cacheTtlOffsetSeconds: parseInt(process.env.ICE_CACHE_TTL_OFFSET_SECONDS || '15'),
      enableRateLimit: process.env.ENABLE_ICE_RATE_LIMIT === 'true'
    })

    console.log('✅ TURN provider initialized')
    console.log(`🌐 Domain: ${domain}`)
    console.log(`📦 Static servers: ${staticServers.length}`)
    console.log(`⏱️  TTL offset: ${process.env.ICE_CACHE_TTL_OFFSET_SECONDS || '15'}s`)
    console.log(`🚦 Rate limiting: ${process.env.ENABLE_ICE_RATE_LIMIT === 'true' ? 'enabled' : 'disabled'}`)

  } catch (error) {
    console.error('❌ Failed to initialize server services:', error)
    throw error
  }
}

/**
 * Express.js server setup example
 */
export function setupExpressServer(app: any): void {
  const { expressIceHandler } = require('./routes/ice')
  
  // Add ICE endpoint
  app.get('/api/ice', expressIceHandler)
  
  console.log('✅ Express routes configured')
  console.log('📡 ICE endpoint: GET /api/ice')
}

/**
 * Next.js API setup example
 */
export function getNextApiHandler() {
  const { nextIceHandler } = require('./routes/ice')
  return nextIceHandler
}

/**
 * Health check for TURN services
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    turnProvider: {
      initialized: boolean
      cache: any
    }
  }
}> {
  try {
    const { getTurnProvider } = await import('./services/turnProvider')
    const provider = getTurnProvider()
    
    const cacheStatus = provider.getCacheStatus()
    
    return {
      status: 'healthy',
      services: {
        turnProvider: {
          initialized: true,
          cache: cacheStatus
        }
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      services: {
        turnProvider: {
          initialized: false,
          cache: null
        }
      }
    }
  }
}

// Auto-initialize if this file is imported
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  initializeServerServices()
}