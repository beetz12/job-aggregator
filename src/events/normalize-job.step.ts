import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  source: z.enum(['arbeitnow', 'hackernews', 'reddit']),
  rawJob: z.record(z.string(), z.unknown())
})

export const config: EventConfig = {
  type: 'event',
  name: 'NormalizeJob',
  description: 'Normalizes job data from different sources to a common schema',
  subscribes: ['normalize-job'],
  emits: ['index-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

function calculateHealthScore(postedAt: string): number {
  const posted = new Date(postedAt)
  const now = new Date()
  const diffMs = now.getTime() - posted.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays <= 1) return 100
  if (diffDays <= 7) return Math.round(100 - (diffDays * 3.5))
  if (diffDays <= 30) return Math.round(75 - ((diffDays - 7) * 1.1))
  if (diffDays <= 90) return Math.round(50 - ((diffDays - 30) * 0.4))
  return Math.max(0, Math.round(25 - ((diffDays - 90) * 0.1)))
}

interface NormalizedJob {
  id: string
  title: string
  company: string
  location?: string
  remote: boolean
  url: string
  description: string
  source: 'arbeitnow' | 'hackernews' | 'reddit'
  postedAt: string
  fetchedAt: string
  tags: string[]
  healthScore: number
}

export const handler: Handlers['NormalizeJob'] = async (input, { emit, logger }) => {
  const { source } = input
  const rawJob = input.rawJob as Record<string, unknown>
  let normalizedJob: NormalizedJob

  logger.info('Normalizing job', { source, jobId: (rawJob.slug || rawJob.id) as string })

  try {
    if (source === 'arbeitnow') {
      const createdAt = rawJob.created_at as number
      const postedAt = new Date(createdAt * 1000).toISOString()
      normalizedJob = {
        id: `arbeitnow_${rawJob.slug as string}`,
        title: (rawJob.title as string) || 'Untitled',
        company: (rawJob.company_name as string) || 'Unknown Company',
        location: (rawJob.location as string) || undefined,
        remote: Boolean(rawJob.remote),
        url: (rawJob.url as string) || '',
        description: ((rawJob.description as string) || '').substring(0, 500),
        source: 'arbeitnow',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags: (rawJob.tags as string[]) || [],
        healthScore: calculateHealthScore(postedAt)
      }
    } else if (source === 'hackernews') {
      const postedAtRaw = rawJob.posted_at as number | undefined
      const postedAt = postedAtRaw
        ? new Date(postedAtRaw * 1000).toISOString()
        : new Date().toISOString()
      const locationStr = (rawJob.location as string) || ''
      const descriptionStr = (rawJob.description as string) || ''
      const isRemote =
        locationStr.toLowerCase().includes('remote') ||
        descriptionStr.toLowerCase().includes('remote')
      normalizedJob = {
        id: `hackernews_${rawJob.id as string}`,
        title: (rawJob.title as string) || 'Software Engineer',
        company: (rawJob.company as string) || 'Unknown Company',
        location: locationStr || undefined,
        remote: isRemote,
        url: (rawJob.url as string) || `https://news.ycombinator.com/item?id=${rawJob.id}`,
        description: descriptionStr.substring(0, 500),
        source: 'hackernews',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags: [],
        healthScore: calculateHealthScore(postedAt)
      }
    } else {
      logger.warn('Unknown source, skipping', { source })
      return
    }

    await emit({
      topic: 'index-job',
      data: { job: normalizedJob }
    })

    logger.info('Job normalized and emitted for indexing', { jobId: normalizedJob.id })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to normalize job', { source, error: errorMessage })
  }
}
