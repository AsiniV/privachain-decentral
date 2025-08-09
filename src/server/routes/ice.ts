/**
 * ICE server endpoint for PrivaChain video calling
 * Provides secure access to TURN/STUN server configuration
 */

import type { IceResponse } from '../../shared/types/webrtc'
import { getTurnProvider } from '../services/turnProvider'

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 30 * 1000 // 30 seconds
const RATE_LIMIT_MAX = 30 // 30 requests per window

/**
 * Rate limiting middleware
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(clientId)

  if (!entry || now > entry.resetTime) {
    // New window or expired entry
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false // Rate limit exceeded
  }

  entry.count++
  return true
}

/**
 * GET /api/ice - Get ICE server configuration
 */
export async function handleIceRequest(
  req: Request,
  clientId?: string
): Promise<Response> {
  try {
    // Extract client identifier for rate limiting
    const identifier = clientId || getClientIdentifier(req)

    // Apply rate limiting in production
    const enableRateLimit = process.env.ENABLE_ICE_RATE_LIMIT === 'true'
    if (enableRateLimit && !checkRateLimit(identifier)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '30'
          }
        }
      )
    }

    // Check for force refresh parameter
    const url = new URL(req.url)
    const force = url.searchParams.get('force') === '1'

    // Get ICE servers from TURN provider
    const turnProvider = getTurnProvider()
    const result = await turnProvider.getIceServers(force)

    const response: IceResponse = {
      iceServers: result.iceServers,
      source: result.source,
      expiresAt: result.expiresAt
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store', // Prevent proxy caching of credentials
        'Access-Control-Allow-Origin': '*', // Configure appropriately for production
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('ICE endpoint error:', error)

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Extract client identifier from request for rate limiting
 */
function getClientIdentifier(req: Request): string {
  // In production, use proper client identification
  const forwarded = req.headers.get('x-forwarded-for')
  const clientIp = forwarded ? forwarded.split(',')[0] : '127.0.0.1'
  return clientIp
}

/**
 * Express.js route handler adapter
 */
export function expressIceHandler(req: any, res: any): void {
  // Convert Express request to Web API Request
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
  })

  handleIceRequest(request, req.ip)
    .then(response => {
      res.status(response.status)
      
      // Set headers
      response.headers.forEach((value, key) => {
        res.set(key, value)
      })

      // Send response
      return response.text()
    })
    .then(body => {
      res.send(body)
    })
    .catch(error => {
      console.error('Express ICE handler error:', error)
      res.status(500).json({ error: 'Internal server error' })
    })
}

/**
 * Next.js API route handler
 */
export async function nextIceHandler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Convert Next.js request to Web API Request
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers.host
    const url = `${protocol}://${host}/api/ice${req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`
    
    const request = new Request(url, {
      method: 'GET',
      headers: req.headers,
    })

    const response = await handleIceRequest(request, req.socket?.remoteAddress)
    
    // Set status
    res.status(response.status)
    
    // Set headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    // Send response
    const body = await response.text()
    res.send(body)

  } catch (error) {
    console.error('Next.js ICE handler error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}