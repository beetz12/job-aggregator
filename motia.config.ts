import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import logsPlugin from '@motiadev/plugin-logs/plugin'
import observabilityPlugin from '@motiadev/plugin-observability/plugin'
import statesPlugin from '@motiadev/plugin-states/plugin'
// import bullmqPlugin from '@motiadev/plugin-bullmq/plugin'  // Temporarily disabled - requires Redis

export default defineConfig({
  // BullMQ disabled until Redis is confirmed working
  plugins: [observabilityPlugin, statesPlugin, endpointPlugin, logsPlugin],
  app: (app) => {
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
  },
})
