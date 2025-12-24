import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { applicationSchema, type Application } from '../types/application'

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetApplication',
  path: '/applications/:id',
  method: 'GET',
  description: 'Get a single job application by ID',
  emits: [],
  flows: ['application-tracking'],
  responseSchema: {
    200: applicationSchema,
    404: errorResponseSchema
  }
}

export const handler: Handlers['GetApplication'] = async (req, { state, logger }) => {
  const { id } = req.pathParams

  logger.info('Fetching application', { id })

  const application = await state.get<Application>('applications', id)

  if (!application) {
    return {
      status: 404,
      body: { error: 'Application not found' }
    }
  }

  return {
    status: 200,
    body: application
  }
}
