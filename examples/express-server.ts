/**
 * Express.js Server Example
 * 
 * This file shows how to integrate the TURN provider with an Express.js server.
 */

import express from 'express'
import { initializeServerServices, setupExpressServer, healthCheck } from '../src/server'

// Create Express app
const app = express()
const port = process.env.PORT || 3001

// Middleware
app.use(express.json())
app.use(express.static('public'))

// Initialize TURN services
initializeServerServices()

// Setup TURN/ICE endpoints
setupExpressServer(app)

// Add health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthCheck()
  res.json(health)
})

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`)
  console.log(`📡 ICE endpoint: http://localhost:${port}/api/ice`)
  console.log(`🏥 Health check: http://localhost:${port}/health`)
})

export default app

/* 
 * Environment variables needed:
 * 
 * METERED_DOMAIN=privachain.metered.live
 * METERED_TURN_SECRET=your_secret_here
 * ENABLE_ICE_RATE_LIMIT=true
 * ICE_CACHE_TTL_OFFSET_SECONDS=15
 * LOG_LEVEL=info
 */