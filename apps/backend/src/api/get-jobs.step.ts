import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { jobSchema, type Job } from '../types/job'
import { getJobsFromDB } from '../services/database'
import { isSupabaseConfigured } from '../services/postgres'

const responseSchema = z.object({
  jobs: z.array(jobSchema),
  total: z.number(),
  sources: z.array(z.string()),
  last_updated: z.string()
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
    { name: 'offset', description: 'Pagination offset (default: 0)' },
    { name: 'tags', description: 'Comma-separated list of tags to filter by' },
    { name: 'salaryMin', description: 'Minimum yearly salary (normalized)' },
    { name: 'salaryMax', description: 'Maximum yearly salary (normalized)' },
    { name: 'locations', description: 'Comma-separated list of locations to filter by' },
    { name: 'employmentTypes', description: 'Comma-separated list of employment types (full-time, part-time, contract, internship)' },
    { name: 'experienceLevels', description: 'Comma-separated list of experience levels (entry, mid, senior, lead, executive)' }
  ],
  responseSchema: {
    200: responseSchema
  }
}

export const handler: Handlers['GetJobs'] = async (req, { state, logger }) => {
  const {
    search,
    source,
    remote,
    limit = '50',
    offset = '0',
    tags,
    salaryMin,
    salaryMax,
    locations,
    employmentTypes,
    experienceLevels
  } = req.queryParams as Record<string, string>

  logger.info('Fetching jobs', { search, source, remote, limit, offset, tags, salaryMin, salaryMax, locations, employmentTypes, experienceLevels })

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

  // Apply tags filter (match any tag in the job's tags or skills)
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    if (tagList.length > 0) {
      jobs = jobs.filter(j => {
        const jobTags = [...(j.tags || []), ...(j.skills || [])].map(t => t.toLowerCase())
        // Also search in title and description for tags
        const titleLower = j.title.toLowerCase()
        const descLower = j.description.toLowerCase()
        return tagList.some(tag =>
          jobTags.some(jt => jt.includes(tag)) ||
          titleLower.includes(tag) ||
          descLower.includes(tag)
        )
      })
    }
  }

  // Apply salary filter (using normalized yearly salary)
  if (salaryMin || salaryMax) {
    const minSalary = salaryMin ? parseInt(salaryMin) : 0
    const maxSalary = salaryMax ? parseInt(salaryMax) : Infinity

    jobs = jobs.filter(j => {
      if (!j.salary?.normalized_yearly) return false
      const jobMin = j.salary.normalized_yearly.min || 0
      const jobMax = j.salary.normalized_yearly.max || jobMin

      // Job salary range overlaps with filter range
      return jobMax >= minSalary && jobMin <= maxSalary
    })
  }

  // Apply locations filter
  if (locations) {
    const locationList = locations.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
    if (locationList.length > 0) {
      jobs = jobs.filter(j => {
        if (!j.location) return false
        const jobLocation = j.location.toLowerCase()
        const parsedCity = j.location_parsed?.city?.toLowerCase() || ''
        const parsedState = j.location_parsed?.state?.toLowerCase() || ''
        const parsedCountry = j.location_parsed?.country?.toLowerCase() || ''

        return locationList.some(loc =>
          jobLocation.includes(loc) ||
          parsedCity.includes(loc) ||
          parsedState.includes(loc) ||
          parsedCountry.includes(loc)
        )
      })
    }
  }

  // Apply employment types filter
  if (employmentTypes) {
    const typeList = employmentTypes.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    if (typeList.length > 0) {
      jobs = jobs.filter(j => {
        if (!j.employment_type) return false
        return typeList.includes(j.employment_type.toLowerCase())
      })
    }
  }

  // Apply experience levels filter
  if (experienceLevels) {
    const levelList = experienceLevels.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
    if (levelList.length > 0) {
      jobs = jobs.filter(j => {
        if (!j.experience_level) return false
        return levelList.includes(j.experience_level.toLowerCase())
      })
    }
  }

  // Sort by freshness (health_score descending)
  jobs.sort((a, b) => b.health_score - a.health_score)

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
      last_updated: new Date().toISOString()
    }
  }
}
