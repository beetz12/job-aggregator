/**
 * Batch Refresh Sources API Step
 *
 * Refreshes multiple job sources in a single request by calling the
 * Python Scraper API's batch endpoint.
 *
 * Endpoint: POST /sources/refresh
 * Body: { sources: string[], test_mode?: boolean, limit?: number }
 */

import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { scraperClient, type BatchScrapeResponse } from '../services/scraper-client'
import { SCRAPER_SOURCES } from '../services/sources'
import { updateSourceStatus } from '../services/database'

// ============================================================================
// Schema
// ============================================================================

const bodySchema = z.object({
  sources: z.array(z.string()).min(1).max(15),
  test_mode: z.boolean().optional().default(false),
  limit: z.number().min(1).max(200).optional().default(100)
})

const responseSchema = z.object({
  message: z.string(),
  sources: z.array(z.string()),
  count: z.number(),
  total_jobs: z.number(),
  successful_sources: z.number(),
  failed_sources: z.number(),
  errors: z.array(z.string()).optional()
})

const errorSchema = z.object({
  error: z.string(),
  invalid_sources: z.array(z.string()).optional()
})

// ============================================================================
// Config
// ============================================================================

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'BatchRefreshSources',
  description: 'Refresh multiple job sources in a single batch request',
  path: '/sources/refresh',
  method: 'POST',
  emits: ['normalize-job'],
  flows: ['job-aggregation'],
  bodySchema,
  responseSchema: {
    202: responseSchema,
    400: errorSchema,
    500: errorSchema
  }
}

// ============================================================================
// Handler
// ============================================================================

export const handler: Handlers['BatchRefreshSources'] = async (req, { emit, logger }) => {
  const { sources, test_mode, limit } = req.body

  // Validate all sources are known
  const invalidSources = sources.filter(
    (s: string) => !SCRAPER_SOURCES.includes(s as typeof SCRAPER_SOURCES[number])
  )

  if (invalidSources.length > 0) {
    logger.warn('Invalid sources in batch request', { invalidSources })
    return {
      status: 400,
      body: {
        error: `Invalid sources: ${invalidSources.join(', ')}. Valid sources: ${SCRAPER_SOURCES.join(', ')}`,
        invalid_sources: invalidSources
      }
    }
  }

  logger.info('Batch refresh initiated', {
    sources,
    sourceCount: sources.length,
    test_mode,
    limit
  })

  try {
    // Call the Python Scraper API batch endpoint
    const response: BatchScrapeResponse = await scraperClient.scrapeBatch({
      sources: sources as any,
      limit_per_source: limit,
      test_mode
    })

    // Process each source's results
    let emittedJobCount = 0

    for (const [source, result] of Object.entries(response.results)) {
      if (result.success && result.jobs && result.jobs.length > 0) {
        logger.info(`Processing ${result.count} jobs from ${source}`)

        // Emit normalize-job events for each job
        for (const rawJob of result.jobs) {
          await emit({
            topic: 'normalize-job',
            data: {
              source,
              rawJob,
              fetchedAt: response.scraped_at
            }
          })
          emittedJobCount++
        }

        // Update source status to success
        await updateSourceStatus(source, 'success', result.count)
      } else if (!result.success) {
        logger.warn(`Source ${source} failed`, {
          error: result.error,
          error_code: result.error_code
        })

        // Update source status to error
        await updateSourceStatus(source, 'error', 0, result.error)
      }
    }

    logger.info('Batch refresh completed', {
      totalSources: response.total_sources,
      successfulSources: response.successful_sources,
      failedSources: response.failed_sources,
      totalJobs: response.total_jobs,
      emittedJobs: emittedJobCount,
      durationMs: response.total_duration_ms
    })

    return {
      status: 202,
      body: {
        message: 'Batch refresh completed',
        sources,
        count: sources.length,
        total_jobs: response.total_jobs,
        successful_sources: response.successful_sources,
        failed_sources: response.failed_sources,
        errors: response.errors_summary
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Batch refresh failed', { error: errorMessage })

    return {
      status: 500,
      body: {
        error: `Batch refresh failed: ${errorMessage}`
      }
    }
  }
}
