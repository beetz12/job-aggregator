import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

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

const VALID_SOURCES = ['arbeitnow', 'hackernews', 'reddit', 'remotive', 'wellfound', 'googlejobs', 'jobicy', 'weworkremotely', 'all']

export const handler: Handlers['RefreshSource'] = async (req, { emit, logger }) => {
  const { name } = req.pathParams

  if (!VALID_SOURCES.includes(name)) {
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
