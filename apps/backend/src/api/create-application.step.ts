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
      jobId: input.jobId,
      jobTitle: input.jobTitle,
      company: input.company,
      status: input.status,
      appliedAt: input.status === 'applied' ? input.appliedAt || now : input.appliedAt,
      notes: input.notes,
      followUpDate: input.followUpDate,
      resumeVersion: input.resumeVersion,
      createdAt: now,
      updatedAt: now
    }

    await state.set('applications', id, application)

    logger.info('Application created', { id, jobId: application.jobId, company: application.company })

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
