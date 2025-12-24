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

    // Emit each job for normalization
    for (const job of jobs) {
      await emit({
        topic: 'normalize-job',
        data: {
          source: 'wellfound',
          rawJob: job
        }
      })
    }

    logger.info('Wellfound fetch complete', {
      jobsFound: jobs.length,
      jobsEmitted: jobs.length
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
