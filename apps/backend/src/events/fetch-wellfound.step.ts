/**
 * Wellfound Job Fetcher Step
 *
 * Scrapes jobs from Wellfound (formerly AngelList) using Playwright.
 * Handles DataDome anti-bot protection with proxy rotation.
 */

import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { scrapeWellfound } from '../services/scrapers/wellfound-scraper'
import { updateSourceStatus } from '../services/database'

const inputSchema = z.object({
  source: z.string(),
  manual: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'FetchWellfound',
  description: 'Scrapes jobs from Wellfound (AngelList) using Playwright',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

export const handler: Handlers['FetchWellfound'] = async (input, { emit, logger, state }) => {
  // Skip if not for this source
  if (input.source !== 'wellfound' && input.source !== 'all') {
    return
  }

  logger.info('Starting Wellfound scrape')

  try {
    // Mark as pending while fetching
    await state.set('sources', 'wellfound', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'pending'
    })

    // Scrape jobs with default parameters
    // Using 'software engineer' as default keyword, 'Remote' as location
    const jobs = await scrapeWellfound('software engineer', 'Remote', 30)

    logger.info('Scraped jobs from Wellfound', { count: jobs.length })

    // Update source metadata in state
    await state.set('sources', 'wellfound', {
      lastFetch: new Date().toISOString(),
      jobCount: jobs.length,
      status: 'success'
    })

    // Update database source status
    await updateSourceStatus('wellfound', 'success', jobs.length)

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
        source: 'wellfound',
        batchSize: batch.length
      })

      for (const job of batch) {
        try {
          await emit({
            topic: 'normalize-job',
            data: {
              source: 'wellfound',
              rawJob: job
            }
          })
          jobsEmitted++
        } catch (emitError) {
          const emitErrorMessage = emitError instanceof Error ? emitError.message : 'Unknown error'
          logger.warn('Failed to emit Wellfound job', { error: emitErrorMessage, jobTitle: job.title })
        }
      }

      // Delay between batches (but not after the last batch)
      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }

    logger.info('Wellfound fetch complete', {
      jobsFound: jobs.length,
      jobsEmitted: jobsEmitted
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to scrape Wellfound', { error: errorMessage })

    // Update state with error
    await state.set('sources', 'wellfound', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage
    })

    // Update database with error
    await updateSourceStatus('wellfound', 'error', 0, errorMessage)
  }
}
