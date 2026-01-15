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

    // If status is changing to 'applied' and applied_at is not set, set it now
    let applied_at = existing.applied_at
    if (input.status === 'applied' && !existing.applied_at) {
      applied_at = input.applied_at || now
    } else if (input.applied_at !== undefined) {
      applied_at = input.applied_at
    }

    const updated: Application = {
      ...existing,
      status: input.status ?? existing.status,
      notes: input.notes ?? existing.notes,
      follow_up_date: input.follow_up_date !== undefined ? input.follow_up_date : existing.follow_up_date,
      resume_version: input.resume_version !== undefined ? input.resume_version : existing.resume_version,
      applied_at,
      custom_resume_markdown: input.custom_resume_markdown !== undefined ? input.custom_resume_markdown : existing.custom_resume_markdown,
      custom_resume_generated_at: input.custom_resume_generated_at !== undefined ? input.custom_resume_generated_at : existing.custom_resume_generated_at,
      custom_cover_letter_markdown: input.custom_cover_letter_markdown !== undefined ? input.custom_cover_letter_markdown : existing.custom_cover_letter_markdown,
      submission_url: input.submission_url !== undefined ? input.submission_url : existing.submission_url,
      qa_responses: input.qa_responses !== undefined ? input.qa_responses : existing.qa_responses,
      submitted_at: input.submitted_at !== undefined ? input.submitted_at : existing.submitted_at,
      checkpoint_status: input.checkpoint_status !== undefined ? input.checkpoint_status : existing.checkpoint_status,
      checkpoint_data: input.checkpoint_data !== undefined ? input.checkpoint_data : existing.checkpoint_data,
      updated_at: now
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
