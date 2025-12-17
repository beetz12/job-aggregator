import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const responseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  version: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'HealthCheck',
  path: '/health',
  method: 'GET',
  description: 'Health check endpoint',
  emits: [],
  flows: ['job-aggregation'],
  responseSchema: {
    200: responseSchema
  }
}

export const handler: Handlers['HealthCheck'] = async (_, { logger }) => {
  logger.info('Health check requested')

  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }
}
