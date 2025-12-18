import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { calculateHealthScore } from '../services/health-scorer'
import type { Job } from '../types/job'

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

export const handler: Handlers['NormalizeJob'] = async (input, { emit, logger }) => {
  const { source } = input
  const rawJob = input.rawJob as Record<string, unknown>
  let normalizedJob: Job

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
    } else if (source === 'reddit') {
      const postedAtRaw = rawJob.posted_at as number | undefined
      const postedAt = postedAtRaw
        ? new Date(postedAtRaw * 1000).toISOString()
        : new Date().toISOString()
      const titleStr = (rawJob.title as string) || ''
      const descriptionStr = (rawJob.description as string) || ''
      const isRemote =
        titleStr.toLowerCase().includes('remote') ||
        descriptionStr.toLowerCase().includes('remote')
      normalizedJob = {
        id: `reddit_${rawJob.id as string}`,
        title: titleStr || 'Job Posting',
        company: (rawJob.company as string) || 'Unknown Company',
        location: (rawJob.location as string) || undefined,
        remote: isRemote,
        url: (rawJob.url as string) || '',
        description: descriptionStr.substring(0, 500),
        source: 'reddit',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags: (rawJob.tags as string[]) || [],
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
