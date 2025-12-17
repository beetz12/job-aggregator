import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remote: z.boolean(),
  url: z.string(),
  description: z.string(),
  source: z.enum(['arbeitnow', 'hackernews', 'reddit']),
  postedAt: z.string(),
  fetchedAt: z.string(),
  tags: z.array(z.string()),
  healthScore: z.number()
})

const inputSchema = z.object({
  job: jobSchema
})

export const config: EventConfig = {
  type: 'event',
  name: 'IndexJob',
  description: 'Stores normalized job in state',
  subscribes: ['index-job'],
  emits: [],
  input: inputSchema,
  flows: ['job-aggregation']
}

export const handler: Handlers['IndexJob'] = async (input, { state, logger }) => {
  const { job } = input

  logger.info('Indexing job', { jobId: job.id, title: job.title, company: job.company })

  // Store job in state (using job id as key for deduplication)
  await state.set('jobs', job.id, job)

  logger.info('Job indexed successfully', { jobId: job.id })
}
