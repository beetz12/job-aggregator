import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import logsPlugin from '@motiadev/plugin-logs/plugin'
import observabilityPlugin from '@motiadev/plugin-observability/plugin'
import statesPlugin from '@motiadev/plugin-states/plugin'
// import bullmqPlugin from '@motiadev/plugin-bullmq/plugin'  // Temporarily disabled - requires Redis

// Log startup information immediately
const PORT = process.env.PORT || '4000'
console.log('[Startup] Job Aggregator initializing...')
console.log(`[Startup] PORT environment variable: ${PORT}`)
console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
console.log(`[Startup] DATABASE_URL configured: ${!!process.env.DATABASE_URL}`)

// Track startup time for diagnostics
const startupTime = new Date().toISOString()

export default defineConfig({
  // Re-enabled plugins - disabling them didn't fix the issue
  plugins: [observabilityPlugin, statesPlugin, endpointPlugin, logsPlugin],
  app: (app) => {
    console.log('[Startup] Registering Express middleware and routes...')

    // ==========================================================================
    // FAILSAFE HEALTH CHECK - Must respond even if other parts of the app fail
    // This is the FIRST route registered to ensure it always works
    // ==========================================================================
    app.get('/healthz', (_req, res) => {
      try {
        console.log('[Health] /healthz endpoint hit')
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          startupTime,
          version: '1.0.0',
          service: 'job-aggregator',
          port: PORT,
          uptime: process.uptime()
        })
      } catch (error) {
        console.error('[Health] Error in health check:', error)
        res.status(200).send('OK') // Still return 200 for Railway
      }
    })

    // Global error handler to catch any unhandled errors
    app.use((err: Error, _req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }, _next: unknown) => {
      console.error('[Express] Unhandled error:', err)
      res.status(500).json({ error: 'Internal server error' })
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
