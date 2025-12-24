import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import {
  applicationSchema,
  updateApplicationSchema,
  type Application
} from '../types/application'

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'UpdateApplication',
  path: '/applications/:id',
  method: 'PUT',
  description: 'Update a job application status or notes',
  emits: [],
  flows: ['application-tracking'],
  bodySchema: updateApplicationSchema,
  responseSchema: {
    200: applicationSchema,
    400: errorResponseSchema,
    404: errorResponseSchema
  }
}

export const handler: Handlers['UpdateApplication'] = async (req, { state, logger }) => {
  const { id } = req.pathParams

  try {
    const input = updateApplicationSchema.parse(req.body)

    const existing = await state.get<Application>('applications', id)

    if (!existing) {
      return {
        status: 404,
        body: { error: 'Application not found' }
      }
    }

    const now = new Date().toISOString()

    // If status is changing to 'applied' and appliedAt is not set, set it now
    let appliedAt = existing.appliedAt
    if (input.status === 'applied' && !existing.appliedAt) {
      appliedAt = input.appliedAt || now
    } else if (input.appliedAt !== undefined) {
      appliedAt = input.appliedAt
    }

    const updated: Application = {
      ...existing,
      status: input.status ?? existing.status,
      notes: input.notes ?? existing.notes,
      followUpDate: input.followUpDate !== undefined ? input.followUpDate : existing.followUpDate,
      resumeVersion: input.resumeVersion !== undefined ? input.resumeVersion : existing.resumeVersion,
      appliedAt,
      updatedAt: now
    }

    await state.set('applications', id, updated)

    logger.info('Application updated', { id, status: updated.status })

    return {
      status: 200,
      body: updated
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
