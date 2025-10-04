/**
 * Server initialization for PrivaChain TURN/ICE services
 * This would typically be part of your backend server setup
 */

import { initializeTurnProvider } from './services/turnProvider'
import type { IceServerEntry } from '../shared/types/webrtc'
import { healthCheckService } from '../services/HealthCheckService'
import { metricsService } from '../services/MetricsService'
import { loggingService } from '../services/LoggingService'
import { errorTrackingService } from '../services/ErrorTrackingService'
import { expressIceHandler, nextIceHandler } from './routes/ice'

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
  // Add ICE endpoint
  app.get('/api/ice', expressIceHandler)
  
  console.log('✅ Express routes configured')
  console.log('📡 ICE endpoint: GET /api/ice')
}

/**
 * Next.js API setup example
 */
export function getNextApiHandler() {
  return nextIceHandler
}

/**
 * Health check for TURN services
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  services: {
    turnProvider: {
      initialized: boolean
      cache: any
    }
  }
  checks: any[]
  dependencies: any[]
}> {
  try {
    // Get comprehensive health check
    const healthData = await healthCheckService.performHealthCheck()
    
    // Get TURN provider status
    let turnProviderStatus: {
      initialized: boolean
      cache: null | { hasCache: boolean; expiresAt?: number; remainingMs?: number; ttl?: number }
    } = {
      initialized: false,
      cache: null
    }
    
    try {
      const { getTurnProvider } = await import('./services/turnProvider')
      const provider = getTurnProvider()
      const cacheStatus = provider.getCacheStatus()
      
      turnProviderStatus = {
        initialized: true,
        cache: cacheStatus
      }
    } catch (error) {
      loggingService.warn('TURN provider not available', { error: error instanceof Error ? error.message : String(error) })
    }
    
    return {
      status: healthData.status,
      timestamp: healthData.timestamp,
      uptime: healthData.uptime,
      version: healthData.version,
      services: {
        turnProvider: turnProviderStatus
      },
      checks: healthData.checks,
      dependencies: healthData.dependencies
    }
  } catch (error) {
    loggingService.error('Health check failed', error instanceof Error ? error : new Error(String(error)))
    errorTrackingService.captureException(error instanceof Error ? error : new Error(String(error)), {
      component: 'server',
      action: 'health_check'
    })
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      services: {
        turnProvider: {
          initialized: false,
          cache: null
        }
      },
      checks: [],
      dependencies: []
    }
  }
}

/**
 * Metrics endpoint for Prometheus scraping
 */
export async function getMetrics(): Promise<string> {
  try {
    return await metricsService.getMetrics()
  } catch (error) {
    loggingService.error('Failed to get metrics', error instanceof Error ? error : new Error(String(error)))
    return ''
  }
}

/**
 * Status endpoint with detailed system information
 */
export async function getStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  environment: string
  features: string[]
  dependencies: any[]
}> {
  try {
    const healthData = await healthCheckService.performHealthCheck()
    
    return {
      status: healthData.status,
      version: healthData.version,
      uptime: healthData.uptime,
      environment: process.env.NODE_ENV || 'development',
      features: [
        'TURN/STUN services',
        'Health monitoring',
        'Metrics collection',
        'Error tracking',
        'Structured logging'
      ],
      dependencies: healthData.dependencies
    }
  } catch (error) {
    loggingService.error('Status check failed', error instanceof Error ? error : new Error(String(error)))
    return {
      status: 'unhealthy',
      version: '1.0.0',
      uptime: 0,
      environment: process.env.NODE_ENV || 'development',
      features: [],
      dependencies: []
    }
  }
}

// Auto-initialize if this file is imported
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  initializeServerServices()
}