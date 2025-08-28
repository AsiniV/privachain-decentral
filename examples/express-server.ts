/**
 * Express.js Server Example
 * 
 * This file shows how to integrate the TURN provider with an Express.js server.
 */

import express from 'express'
import { initializeServerServices, setupExpressServer, healthCheck, getMetrics, getStatus } from '../src/server'
import { loggingService } from '../src/services/LoggingService'
import { metricsService } from '../src/services/MetricsService'

// Create Express app
const app = express()
const port = process.env.PORT || 3001

// Middleware
app.use(express.json())
app.use(express.static('public'))

// Request logging and metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now()
  const correlationId = loggingService.generateCorrelationId()
  
  // Add correlation ID to request
  req.correlationId = correlationId
  
  // Log request
  loggingService.info(`${req.method} ${req.path}`, {
    correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  })
  
  // Capture response metrics
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000
    metricsService.recordHttpRequest(req.method, req.path, res.statusCode, duration)
    
    loggingService.info(`${req.method} ${req.path} - ${res.statusCode}`, {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}s`
    })
  })
  
  next()
})

// Initialize TURN services
initializeServerServices()

// Setup TURN/ICE endpoints
setupExpressServer(app)

// Add comprehensive health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await healthCheck()
    res.status(health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503).json(health)
  } catch (error) {
    loggingService.error('Health check endpoint failed', error instanceof Error ? error : new Error(String(error)))
    res.status(503).json({ 
      status: 'unhealthy', 
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    })
  }
})

// Add status endpoint
app.get('/status', async (req, res) => {
  try {
    const status = await getStatus()
    res.json(status)
  } catch (error) {
    loggingService.error('Status endpoint failed', error instanceof Error ? error : new Error(String(error)))
    res.status(500).json({ 
      status: 'error', 
      message: 'Status check failed',
      timestamp: new Date().toISOString()
    })
  }
})

// Add Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await getMetrics()
    res.set('Content-Type', 'text/plain').send(metrics)
  } catch (error) {
    loggingService.error('Metrics endpoint failed', error instanceof Error ? error : new Error(String(error)))
    res.status(500).send('# Metrics unavailable\n')
  }
})

// Add liveness probe (simple ping)
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Add readiness probe (checks if services are ready)
app.get('/ready', async (req, res) => {
  try {
    const health = await healthCheck()
    if (health.status === 'healthy' || health.status === 'degraded') {
      res.json({ status: 'ready', timestamp: new Date().toISOString() })
    } else {
      res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() })
    }
  } catch (error) {
    res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() })
  }
})

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  const correlationId = req.correlationId || loggingService.generateCorrelationId()
  
  loggingService.error('Server error', err, {
    correlationId,
    method: req.method,
    path: req.path,
    statusCode: 500
  })
  
  metricsService.recordError('server_error', 'high', 'express_server')
  res.status(500).json({ 
    error: 'Internal server error',
    correlationId 
  })
})

// Start server
app.listen(port, () => {
  loggingService.info(`🚀 Server running on port ${port}`)
  console.log(`🚀 Server running on port ${port}`)
  console.log(`📡 ICE endpoint: http://localhost:${port}/api/ice`)
  console.log(`🏥 Health check: http://localhost:${port}/health`)
  console.log(`📊 Status: http://localhost:${port}/status`)
  console.log(`📈 Metrics: http://localhost:${port}/metrics`)
  console.log(`🏓 Ping: http://localhost:${port}/ping`)
  console.log(`✅ Ready: http://localhost:${port}/ready`)
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
 * SENTRY_DSN=your_sentry_dsn_here (optional)
 */