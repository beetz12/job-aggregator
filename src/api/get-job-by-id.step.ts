import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { jobSchema, type Job } from '../types/job'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetJobById',
  path: '/jobs/:id',
  method: 'GET',
  description: 'Get a single job by ID',
  emits: [],
  flows: ['job-aggregation'],
  responseSchema: {
    200: jobSchema,
    404: z.object({ error: z.string() })
  }
}

export const handler: Handlers['GetJobById'] = async (req, { state, logger }) => {
  const { id } = req.pathParams as { id: string }

  logger.info('Fetching job by ID', { id })

  const job = await state.get<Job>('jobs', id)

  if (!job) {
    logger.warn('Job not found', { id })
    return {
      status: 404,
      body: { error: 'Job not found' }
    }
  }

  logger.info('Job retrieved successfully', { id, title: job.title })

  return {
    status: 200,
    body: job
  }
}
