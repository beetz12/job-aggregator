import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { SCRAPER_SOURCES } from '../services/sources'

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

// Valid sources include all scraper sources plus 'all' for refresh all
const VALID_SOURCES = [...SCRAPER_SOURCES, 'all'] as const

export const handler: Handlers['RefreshSource'] = async (req, { emit, logger }) => {
  const { name } = req.pathParams

  // Check if source is valid (either 'all' or a known scraper source)
  const isValidScraperSource = SCRAPER_SOURCES.includes(name as typeof SCRAPER_SOURCES[number])
  if (name !== 'all' && !isValidScraperSource) {
    return {
      status: 400,
      body: { error: `Invalid source: ${name}. Valid sources: ${VALID_SOURCES.join(', ')}` }
    }
  }

  logger.info('Manual refresh triggered', { source: name })

  await emit({
    topic: 'fetch-jobs-trigger',
    data: { source: name as typeof VALID_SOURCES[number], manual: true, limit: 100 }
  })

  return {
    status: 202,
    body: { message: 'Refresh initiated', source: name }
  }
}
