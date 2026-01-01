import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { scrapeGoogleJobs } from '../services/scrapers/googlejobs-scraper'
import { updateSourceStatus } from '../services/database'

const inputSchema = z.object({
  source: z.string(),
  manual: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'FetchGoogleJobs',
  description: 'Fetches jobs from Google Jobs via SerpAPI',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

export const handler: Handlers['FetchGoogleJobs'] = async (input, { emit, logger, state }) => {
  logger.info('FetchGoogleJobs handler invoked', {
    source: input.source,
    manual: input.manual,
    hasApiKey: !!process.env.SERPAPI_KEY,
    apiKeyLength: process.env.SERPAPI_KEY?.length || 0
  })

  // Skip if not for this source
  if (input.source !== 'googlejobs' && input.source !== 'all') {
    logger.debug('Skipping Google Jobs - source filter does not match', {
      inputSource: input.source,
      expectedSources: ['googlejobs', 'all']
    })
    return
  }

  logger.info('Processing Google Jobs fetch request')

  // Check if API key is configured
  if (!process.env.SERPAPI_KEY) {
    logger.error('SERPAPI_KEY not configured, skipping Google Jobs fetch')
    await state.set('sources', 'googlejobs', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: 'SERPAPI_KEY not configured'
    })
    await updateSourceStatus('googlejobs', 'error', 0, 'SERPAPI_KEY not configured')
    return
  }

  logger.info('Fetching from Google Jobs via SerpAPI')

  try {
    // Configure search parameters
    // You can customize these based on your needs
    const query = process.env.GOOGLEJOBS_QUERY || 'software engineer'
    const location = process.env.GOOGLEJOBS_LOCATION || 'United States'
    const maxJobs = parseInt(process.env.GOOGLEJOBS_MAX_JOBS || '50', 10)

    logger.info('Google Jobs search parameters', { query, location, maxJobs })

    const jobs = await scrapeGoogleJobs(query, location, maxJobs)

    logger.info('Fetched jobs from Google Jobs', { count: jobs.length })

    // Update source metadata in state
    await state.set('sources', 'googlejobs', {
      lastFetch: new Date().toISOString(),
      jobCount: jobs.length,
      status: 'success'
    })

    // Also update database
    await updateSourceStatus('googlejobs', 'success', jobs.length)

    // Batch configuration to prevent event queue overflow
    const BATCH_SIZE = 10
    const BATCH_DELAY = 1000
    let jobsEmitted = 0

    // Emit jobs in batches with delays
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(jobs.length / BATCH_SIZE)

      logger.info(`Processing batch ${batchNum}/${totalBatches}`, {
        source: 'googlejobs',
        batchSize: batch.length
      })

      for (const job of batch) {
        try {
          await emit({
            topic: 'normalize-job',
            data: {
              source: 'googlejobs',
              rawJob: job
            }
          })
          jobsEmitted++
        } catch (emitError) {
          const emitErrorMessage = emitError instanceof Error ? emitError.message : 'Unknown error'
          logger.warn('Failed to emit Google Jobs job', { error: emitErrorMessage, jobTitle: job.title })
        }
      }

      // Delay between batches (but not after the last batch)
      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }

    logger.info('Google Jobs fetch completed', { totalJobs: jobsEmitted })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch from Google Jobs', { error: errorMessage })

    await state.set('sources', 'googlejobs', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage
    })

    // Also update database
    await updateSourceStatus('googlejobs', 'error', 0, errorMessage)
  }
}
