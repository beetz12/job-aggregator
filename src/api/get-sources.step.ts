import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const sourceSchema = z.object({
  name: z.string(),
  lastFetch: z.string().nullable(),
  jobCount: z.number(),
  status: z.enum(['success', 'error', 'pending', 'unknown']),
  error: z.string().optional()
})

const responseSchema = z.object({
  sources: z.array(sourceSchema)
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetSources',
  path: '/sources',
  method: 'GET',
  description: 'Get status of all job sources',
  emits: [],
  flows: ['job-aggregation'],
  responseSchema: {
    200: responseSchema
  }
}

interface SourceMetadata {
  lastFetch: string
  jobCount: number
  status: 'success' | 'error' | 'pending'
  error?: string
}

const AVAILABLE_SOURCES = ['arbeitnow', 'hackernews', 'reddit']

export const handler: Handlers['GetSources'] = async (_, { state, logger }) => {
  logger.info('Fetching source statuses')

  const sources = await Promise.all(
    AVAILABLE_SOURCES.map(async (name) => {
      const metadata = await state.get<SourceMetadata>('sources', name)
      return {
        name,
        lastFetch: metadata?.lastFetch || null,
        jobCount: metadata?.jobCount || 0,
        status: metadata?.status || 'unknown' as const,
        error: metadata?.error
      }
    })
  )

  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: { sources }
  }
}
