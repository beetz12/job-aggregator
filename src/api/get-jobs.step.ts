import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { jobSchema, type Job } from '../types/job'
import { getJobsFromDB } from '../services/database'
import { isSupabaseConfigured } from '../services/postgres'

const responseSchema = z.object({
  jobs: z.array(jobSchema),
  total: z.number(),
  sources: z.array(z.string()),
  lastUpdated: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetJobs',
  path: '/jobs',
  method: 'GET',
  description: 'List all aggregated jobs with optional filters',
  emits: [],
  flows: ['job-aggregation'],
  queryParams: [
    { name: 'search', description: 'Search in title, company, and description' },
    { name: 'source', description: 'Filter by source (arbeitnow, hackernews, reddit)' },
    { name: 'remote', description: 'Filter remote jobs only (true/false)' },
    { name: 'limit', description: 'Number of results (default: 50)' },
    { name: 'offset', description: 'Pagination offset (default: 0)' }
  ],
  responseSchema: {
    200: responseSchema
  }
}

export const handler: Handlers['GetJobs'] = async (req, { state, logger }) => {
  const { search, source, remote, limit = '50', offset = '0' } = req.queryParams as Record<string, string>

  logger.info('Fetching jobs', { search, source, remote, limit, offset })

  // Get jobs from Motia state (hot cache)
  let jobs = await state.getGroup<Job>('jobs')

  // =========================================================================
  // DATABASE HYDRATION: If state is empty, load from database
  // =========================================================================
  if (jobs.length === 0 && isSupabaseConfigured()) {
    logger.info('Motia state empty, hydrating from database')

    try {
      // Load jobs from database (get more than needed for filtering)
      const dbJobs = await getJobsFromDB({ limit: 1000 })

      if (dbJobs.length > 0) {
        logger.info('Loaded jobs from database', { count: dbJobs.length })

        // Populate Motia state for future fast reads
        for (const job of dbJobs) {
          await state.set('jobs', job.id, job)
        }

        jobs = dbJobs
        logger.info('Hydrated Motia state from database', { count: jobs.length })
      }
    } catch (error) {
      logger.error('Failed to hydrate from database', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      // Continue with empty state
    }
  }

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase()
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(searchLower) ||
      j.company.toLowerCase().includes(searchLower) ||
      j.description.toLowerCase().includes(searchLower)
    )
  }

  // Apply source filter
  if (source) {
    jobs = jobs.filter(j => j.source === source)
  }

  // Apply remote filter
  if (remote === 'true') {
    jobs = jobs.filter(j => j.remote === true)
  }

  // Sort by freshness (healthScore descending)
  jobs.sort((a, b) => b.healthScore - a.healthScore)

  // Paginate
  const start = parseInt(offset)
  const end = start + parseInt(limit)
  const paginatedJobs = jobs.slice(start, end)

  return {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=60'
    },
    body: {
      jobs: paginatedJobs,
      total: jobs.length,
      sources: [...new Set(jobs.map(j => j.source))],
      lastUpdated: new Date().toISOString()
    }
  }
}
