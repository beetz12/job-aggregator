import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { type Application } from '../types/application'

const errorResponseSchema = z.object({
  error: z.string()
})

const successResponseSchema = z.object({
  success: z.boolean(),
  id: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'DeleteApplication',
  path: '/applications/:id',
  method: 'DELETE',
  description: 'Delete a job application',
  emits: [],
  flows: ['application-tracking'],
  responseSchema: {
    200: successResponseSchema,
    404: errorResponseSchema
  }
}

export const handler: Handlers['DeleteApplication'] = async (req, { state, logger }) => {
  const { id } = req.pathParams

  const existing = await state.get<Application>('applications', id)

  if (!existing) {
    return {
      status: 404,
      body: { error: 'Application not found' }
    }
  }

  await state.delete('applications', id)

  logger.info('Application deleted', { id })

  return {
    status: 200,
    body: { success: true, id }
  }
}
