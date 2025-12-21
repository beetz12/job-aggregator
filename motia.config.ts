import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import logsPlugin from '@motiadev/plugin-logs/plugin'
import observabilityPlugin from '@motiadev/plugin-observability/plugin'
import statesPlugin from '@motiadev/plugin-states/plugin'
// import bullmqPlugin from '@motiadev/plugin-bullmq/plugin'  // Temporarily disabled - requires Redis

// Log startup information
const PORT = process.env.PORT || '4000'
console.log('[Startup] Job Aggregator initializing...')
console.log(`[Startup] PORT environment variable: ${PORT}`)
console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
console.log(`[Startup] DATABASE_URL configured: ${!!process.env.DATABASE_URL}`)

export default defineConfig({
  // BullMQ disabled until Redis is confirmed working
  plugins: [observabilityPlugin, statesPlugin, endpointPlugin, logsPlugin],
  app: (app) => {
    console.log('[Startup] Registering Express middleware and routes...')

    // ==========================================================================
    // NATIVE HEALTH CHECK - Bypasses Motia step processing for Railway
    // This responds immediately without framework overhead
    // ==========================================================================
    app.get('/healthz', (_req, res) => {
      console.log('[Health] /healthz endpoint hit')
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'job-aggregator',
        port: PORT
      })
    })

    // Enable CORS for all routes - handles preflight OPTIONS requests automatically
    app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.header('Access-Control-Max-Age', '86400')
      next()
    })

    // Handle preflight OPTIONS requests
    app.options('*', (_req, res) => {
      res.status(204).send('')
    })

    console.log('[Startup] Express middleware registered successfully')
  },
})
