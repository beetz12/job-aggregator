import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { updateSourceStatus } from '../services/database'

const inputSchema = z.object({
  source: z.string(),
  manual: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'FetchArbeitnow',
  description: 'Fetches jobs from Arbeitnow API',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

interface ArbeitnowResponse {
  data: Array<{
    slug: string
    company_name: string
    title: string
    description: string
    remote: boolean
    url: string
    tags: string[]
    job_types: string[]
    location: string
    created_at: number
  }>
  links: { next?: string }
  meta: { total: number }
}

export const handler: Handlers['FetchArbeitnow'] = async (input, { emit, logger, state }) => {
  if (input.source !== 'arbeitnow' && input.source !== 'all') {
    return // Skip if not for this source
  }

  logger.info('Fetching from Arbeitnow API')

  try {
    const response = await fetch('https://api.arbeitnow.com/api/v2/jobs?per_page=100')

    if (!response.ok) {
      throw new Error(`Arbeitnow API returned ${response.status}`)
    }

    const data: ArbeitnowResponse = await response.json()

    logger.info('Fetched jobs from Arbeitnow', { count: data.data.length })

    // Update source metadata in state
    await state.set('sources', 'arbeitnow', {
      lastFetch: new Date().toISOString(),
      jobCount: data.data.length,
      status: 'success'
    })

    // Also update database
    await updateSourceStatus('arbeitnow', 'success', data.data.length)

    // Batch configuration to prevent event queue overflow
    const BATCH_SIZE = 10
    const BATCH_DELAY = 1000
    const jobs = data.data
    let jobsEmitted = 0

    // Emit jobs in batches with delays
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(jobs.length / BATCH_SIZE)

      logger.info(`Processing batch ${batchNum}/${totalBatches}`, {
        source: 'arbeitnow',
        batchSize: batch.length
      })

      for (const job of batch) {
        try {
          await emit({
            topic: 'normalize-job',
            data: {
              source: 'arbeitnow',
              rawJob: job
            }
          })
          jobsEmitted++
        } catch (emitError) {
          const emitErrorMessage = emitError instanceof Error ? emitError.message : 'Unknown error'
          logger.warn('Failed to emit Arbeitnow job', { error: emitErrorMessage, slug: job.slug })
        }
      }

      // Delay between batches (but not after the last batch)
      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }

    logger.info('Arbeitnow fetch completed', { totalJobs: jobsEmitted })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch from Arbeitnow', { error: errorMessage })
    await state.set('sources', 'arbeitnow', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage
    })

    // Also update database
    await updateSourceStatus('arbeitnow', 'error', 0, errorMessage)
  }
}
