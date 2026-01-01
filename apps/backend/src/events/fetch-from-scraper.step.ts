/**
 * Fetch From Scraper Event Step
 *
 * Unified fetcher that calls the Python Scraper API to get jobs from all sources.
 * Replaces individual fetch-*.step.ts files.
 *
 * Flow:
 * 1. Receives fetch-jobs-trigger event with source name
 * 2. If source === 'all', emits separate triggers for each source with stagger delay
 * 3. Gets circuit breaker for source to handle failures
 * 4. Calls scraperClient.scrapeJobs() wrapped in circuit breaker
 * 5. On failure: logs error, updates source status to 'error', returns
 * 6. On success: updates source metadata, batch emits normalize-job events
 */

import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { scraperClient, ALL_SOURCES, type JobSource, type RawJob } from '../services/scraper-client'
import { SCRAPER_SOURCES } from '../services/sources'
import { getCircuitBreaker, CircuitOpenError } from '../services/circuit-breaker'
import { updateSourceStatus } from '../services/database'

// ============================================================================
// Schema
// ============================================================================

// Input schema - extends scraper sources with 'all' option
const inputSchema = z.object({
  source: z.enum([
    ...SCRAPER_SOURCES,
    'all'
  ] as [string, ...string[]]),
  params: z.record(z.string(), z.string()).optional(),
  limit: z.number().optional().default(100)
})

// ============================================================================
// Config
// ============================================================================

export const config: EventConfig = {
  type: 'event',
  name: 'FetchFromScraper',
  description: 'Fetches jobs from Python Scraper API for a specific source',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job', 'fetch-jobs-trigger'],
  input: inputSchema,
  flows: ['job-aggregation']
}

// ============================================================================
// Constants
// ============================================================================

/** Delay between batches of normalize-job events (ms) */
const BATCH_SIZE = 10
const BATCH_DELAY_MS = 500

/** Delay between triggering different sources when source === 'all' (ms) */
const STAGGER_DELAY_MS = 5000

// ============================================================================
// Handler
// ============================================================================

export const handler: Handlers['FetchFromScraper'] = async (input, { emit, logger, state }) => {
  const { source, params, limit } = input

  // Handle "all" by emitting individual triggers with staggered delays
  if (source === 'all') {
    logger.info('Triggering fetch for all sources', { sourceCount: ALL_SOURCES.length })

    for (let i = 0; i < ALL_SOURCES.length; i++) {
      const individualSource = ALL_SOURCES[i]

      await emit({
        topic: 'fetch-jobs-trigger',
        data: {
          source: individualSource,
          params,
          limit
        }
      })

      logger.info(`Triggered fetch for ${individualSource}`, {
        position: i + 1,
        total: ALL_SOURCES.length
      })

      // Stagger to avoid overwhelming the scraper API
      if (i < ALL_SOURCES.length - 1) {
        await delay(STAGGER_DELAY_MS)
      }
    }

    logger.info('Completed triggering all sources')
    return
  }

  // Single source fetch
  const circuitBreaker = getCircuitBreaker(source)

  logger.info(`Fetching jobs from scraper API`, { source, limit, params })

  try {
    // Check if circuit breaker is allowing requests
    if (!circuitBreaker.isAvailable()) {
      const stats = circuitBreaker.getStats()
      logger.warn(`Circuit breaker is open for ${source}`, {
        state: stats.state,
        failures: stats.failureCount
      })

      await updateSourceStatus(source, 'error', 0, `Circuit breaker open (${stats.failureCount} failures)`)
      await state.set('sources', source, {
        lastFetch: new Date().toISOString(),
        jobCount: 0,
        status: 'error',
        error: 'Circuit breaker open - too many failures'
      })

      return
    }

    // Execute scrape with circuit breaker protection
    const response = await circuitBreaker.execute(() =>
      scraperClient.scrapeJobs({
        source: source as JobSource,
        params,
        limit
      })
    )

    // Handle error response from scraper API
    if (!response.success) {
      logger.error(`Scraper API error for ${source}`, {
        error: response.error,
        errorCode: response.error_code,
        retryAfter: response.retry_after_seconds
      })

      await updateSourceStatus(source, 'error', 0, response.error)
      await state.set('sources', source, {
        lastFetch: new Date().toISOString(),
        jobCount: 0,
        status: 'error',
        error: response.error
      })

      return
    }

    // Success - process jobs
    const jobs = response.jobs || []
    const scrapedAt = response.scraped_at || new Date().toISOString()

    logger.info(`Received ${jobs.length} jobs from ${source}`, {
      scrapeDurationMs: response.scrape_duration_ms
    })

    // Update source metadata in state
    await state.set('sources', source, {
      lastFetch: scrapedAt,
      jobCount: jobs.length,
      status: 'success',
      scrapeDurationMs: response.scrape_duration_ms
    })

    // Update database
    await updateSourceStatus(source, 'success', jobs.length)

    // Batch emit normalize-job events
    let emittedCount = 0

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(jobs.length / BATCH_SIZE)

      logger.debug(`Processing batch ${batchNum}/${totalBatches}`, {
        source,
        batchSize: batch.length
      })

      // Emit all jobs in batch in parallel
      await Promise.all(
        batch.map(rawJob =>
          emit({
            topic: 'normalize-job',
            data: {
              source,
              rawJob,
              fetchedAt: scrapedAt
            }
          })
        )
      )

      emittedCount += batch.length

      // Delay between batches to prevent overwhelming the pipeline
      if (i + BATCH_SIZE < jobs.length) {
        await delay(BATCH_DELAY_MS)
      }
    }

    logger.info(`Emitted ${emittedCount} normalize-job events for ${source}`)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle circuit breaker open error
    if (error instanceof CircuitOpenError) {
      logger.warn(`Circuit breaker open for ${source}`, {
        timeUntilReset: error.timeUntilReset
      })
    } else {
      logger.error(`Failed to fetch from scraper API`, {
        source,
        error: errorMessage,
        circuitState: circuitBreaker.getState()
      })
    }

    // Update source status to error
    await updateSourceStatus(source, 'error', 0, errorMessage)
    await state.set('sources', source, {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage
    })
  }
}

// ============================================================================
// Helpers
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
