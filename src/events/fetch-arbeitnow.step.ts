import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

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

    // Update source metadata
    await state.set('sources', 'arbeitnow', {
      lastFetch: new Date().toISOString(),
      jobCount: data.data.length,
      status: 'success'
    })

    // Emit each job for normalization
    for (const job of data.data) {
      await emit({
        topic: 'normalize-job',
        data: {
          source: 'arbeitnow',
          rawJob: job
        }
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch from Arbeitnow', { error: errorMessage })
    await state.set('sources', 'arbeitnow', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage
    })
  }
}
