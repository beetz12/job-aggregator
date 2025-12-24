import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { updateSourceStatus } from '../services/database'
import {
  scrapeJobicy,
  parseJobicyDate,
  extractJobicyTags,
  formatJobicySalary,
  type JobicyJobRaw
} from '../services/scrapers/jobicy-scraper'

const inputSchema = z.object({
  source: z.string(),
  manual: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'FetchJobicy',
  description: 'Fetches remote jobs from Jobicy API',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

export const handler: Handlers['FetchJobicy'] = async (input, { emit, logger, state }) => {
  if (input.source !== 'jobicy' && input.source !== 'all') {
    return // Skip if not for this source
  }

  logger.info('Fetching from Jobicy API')

  try {
    // Fetch jobs from Jobicy API
    const jobs = await scrapeJobicy({ count: 50 })

    logger.info('Fetched jobs from Jobicy', { count: jobs.length })

    // Update source metadata in state
    await state.set('sources', 'jobicy', {
      lastFetch: new Date().toISOString(),
      jobCount: jobs.length,
      status: 'success'
    })

    // Also update database
    await updateSourceStatus('jobicy', 'success', jobs.length)

    // Emit each job for normalization
    for (const job of jobs) {
      await emit({
        topic: 'normalize-job',
        data: {
          source: 'jobicy',
          rawJob: transformJobicyJob(job)
        }
      })
    }

    logger.info('Emitted jobs for normalization', { count: jobs.length })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch from Jobicy', { error: errorMessage })

    await state.set('sources', 'jobicy', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage
    })

    // Also update database
    await updateSourceStatus('jobicy', 'error', 0, errorMessage)
  }
}

/**
 * Transform Jobicy raw job to a format compatible with normalize-job step
 */
function transformJobicyJob(job: JobicyJobRaw): Record<string, unknown> {
  // Strip HTML tags from description
  const cleanDescription = (job.jobDescription || job.jobExcerpt || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000) // Limit description length

  const tags = extractJobicyTags(job)
  const salary = formatJobicySalary(job)

  return {
    // Core fields
    id: `jobicy_${job.id}`,
    title: job.jobTitle,
    company: job.companyName,
    companyLogo: job.companyLogo,
    url: job.url,
    description: cleanDescription,

    // Location and remote status - Jobicy is specifically remote jobs
    location: job.jobGeo || 'Remote',
    remote: true, // Jobicy is a remote-first job board

    // Timestamps
    postedAt: parseJobicyDate(job.pubDate),

    // Metadata
    tags,
    jobType: job.jobType,
    jobLevel: job.jobLevel,
    industry: job.jobIndustry,

    // Salary information (if available)
    salary,
    annualSalaryMin: job.annualSalaryMin,
    annualSalaryMax: job.annualSalaryMax,
    salaryCurrency: job.salaryCurrency
  }
}
