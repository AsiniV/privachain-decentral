/**
 * Next.js API Route Example: /pages/api/ice.ts or /app/api/ice/route.ts
 * 
 * This file shows how to integrate the TURN provider with Next.js API routes.
 * Copy this to your pages/api/ or app/api/ directory based on your Next.js version.
 */

import { nextIceHandler } from '../../src/server/routes/ice'

// Initialize TURN provider (do this once at startup)
import { initializeServerServices } from '../../src/server'

// Initialize services when the module loads
try {
  initializeServerServices()
} catch (error) {
  console.error('Failed to initialize TURN services:', error)
}

// Next.js API route handler
export default nextIceHandler

// For App Router (Next.js 13+), use named exports:
export const GET = nextIceHandler

/* 
 * Usage in your frontend code:
 * 
 * ```typescript
 * const response = await fetch('/api/ice')
 * const { iceServers } = await response.json()
 * 
 * const peerConnection = new RTCPeerConnection({
 *   iceServers: iceServers.map(server => ({
 *     urls: server.urls,
 *     username: server.username,
 *     credential: server.credential
 *   }))
 * })
 * ```
 */