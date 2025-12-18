import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { jobSchema, type Job } from '../types/job'

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

  let jobs = await state.getGroup<Job>('jobs')

  // Apply search filter first
  if (search) {
    const searchLower = search.toLowerCase()
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(searchLower) ||
      j.company.toLowerCase().includes(searchLower) ||
      j.description.toLowerCase().includes(searchLower)
    )
  }

  // Apply filters
  if (source) {
    jobs = jobs.filter(j => j.source === source)
  }
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
