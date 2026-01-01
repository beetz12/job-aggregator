import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ALL_JOB_SOURCES, isValidSource, getActiveSources } from '../services/sources'

const responseSchema = z.object({
  message: z.string(),
  source: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'RefreshSource',
  path: '/sources/:name/refresh',
  method: 'POST',
  description: 'Manually trigger a source refresh',
  emits: ['fetch-jobs-trigger'],
  flows: ['job-aggregation'],
  responseSchema: {
    202: responseSchema,
    400: z.object({ error: z.string() })
  }
}

// Valid sources include all job sources plus 'all' for refresh all
const VALID_SOURCES = [...ALL_JOB_SOURCES, 'all'] as const

export const handler: Handlers['RefreshSource'] = async (req, { emit, logger }) => {
  const { name } = req.pathParams

  // Check if source is valid (either 'all' or a known source)
  if (name !== 'all' && !isValidSource(name)) {
    return {
      status: 400,
      body: { error: `Invalid source: ${name}. Valid sources: ${VALID_SOURCES.join(', ')}` }
    }
  }

  logger.info('Manual refresh triggered', { source: name })

  await emit({
    topic: 'fetch-jobs-trigger',
    data: { source: name, manual: true }
  })

  return {
    status: 202,
    body: { message: 'Refresh initiated', source: name }
  }
}
