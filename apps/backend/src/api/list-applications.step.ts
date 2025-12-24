import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { applicationSchema, type Application } from '../types/application'

const responseSchema = z.object({
  applications: z.array(applicationSchema),
  total: z.number()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ListApplications',
  path: '/applications',
  method: 'GET',
  description: 'List all job applications with optional status filter',
  emits: [],
  flows: ['application-tracking'],
  queryParams: [
    { name: 'status', description: 'Filter by status (saved, applied, interviewing, offered, rejected, withdrawn)' }
  ],
  responseSchema: {
    200: responseSchema
  }
}

export const handler: Handlers['ListApplications'] = async (req, { state, logger }) => {
  const { status } = req.queryParams as Record<string, string>

  logger.info('Fetching applications', { status })

  let applications = await state.getGroup<Application>('applications')

  // Apply status filter if provided
  if (status) {
    applications = applications.filter(app => app.status === status)
  }

  // Sort by updatedAt descending (most recent first)
  applications.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return {
    status: 200,
    body: {
      applications,
      total: applications.length
    }
  }
}
