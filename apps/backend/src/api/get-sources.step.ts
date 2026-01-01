import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { SourceMetadata } from '../types/job'
import { ALL_JOB_SOURCES, SOURCE_INFO, type JobSource } from '../services/sources'

const sourceSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  lastFetch: z.string().nullable(),
  jobCount: z.number(),
  status: z.enum(['success', 'error', 'pending', 'unknown']),
  error: z.string().optional(),
  isActive: z.boolean(),
  color: z.string()
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

export const handler: Handlers['GetSources'] = async (_, { state, logger }) => {
  logger.info('Fetching source statuses')

  const sources = await Promise.all(
    ALL_JOB_SOURCES.map(async (name) => {
      const metadata = await state.get<SourceMetadata>('sources', name)
      const info = SOURCE_INFO[name as JobSource]
      return {
        name,
        displayName: info?.displayName || name,
        lastFetch: metadata?.lastFetch || null,
        jobCount: metadata?.jobCount || 0,
        status: metadata?.status || 'unknown' as const,
        error: metadata?.error,
        isActive: info?.isActive ?? false,
        color: info?.color || '#6B7280'
      }
    })
  )

  return {
    status: 200,
    body: { sources }
  }
}
