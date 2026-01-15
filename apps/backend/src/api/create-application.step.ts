import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import { randomUUID } from 'crypto'
import {
  applicationSchema,
  createApplicationSchema,
  type Application
} from '../types/application'

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreateApplication',
  path: '/applications',
  method: 'POST',
  description: 'Create a new job application',
  emits: [],
  flows: ['application-tracking'],
  bodySchema: createApplicationSchema,
  responseSchema: {
    201: applicationSchema,
    400: errorResponseSchema
  }
}

export const handler: Handlers['CreateApplication'] = async (req, { state, logger }) => {
  try {
    const input = createApplicationSchema.parse(req.body)

    const now = new Date().toISOString()
    const id = randomUUID()

    const application: Application = {
      id,
      job_id: input.job_id,
      job_title: input.job_title,
      company: input.company,
      status: input.status,
      applied_at: input.status === 'applied' ? input.applied_at || now : input.applied_at,
      notes: input.notes,
      follow_up_date: input.follow_up_date,
      resume_version: input.resume_version,
      created_at: now,
      updated_at: now
    }

    await state.set('applications', id, application)

    logger.info('Application created', { id, job_id: application.job_id, company: application.company })

    return {
      status: 201,
      body: application
    }
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Validation failed', { error: error.message })
      return {
        status: 400,
        body: { error: 'Validation failed: ' + error.errors.map(e => e.message).join(', ') }
      }
    }
    throw error
  }
}
