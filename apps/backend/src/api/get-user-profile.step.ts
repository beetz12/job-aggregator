import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { userProfileSchema, type UserProfile } from '../types/job-matching'

const responseSchema = z.object({
  profile: userProfileSchema,
  found: z.boolean()
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetUserProfile',
  path: '/api/v1/user-profile/:id',
  method: 'GET',
  description: 'Get enhanced user profile for job matching',
  emits: [],
  flows: ['job-matching'],
  responseSchema: {
    200: responseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const handler: Handlers['GetUserProfile'] = async (req, { state, logger }) => {
  const { id } = req.pathParams

  logger.info('Fetching user profile', { userId: id })

  try {
    const profile = await state.get<UserProfile>('user-profiles', id)

    if (!profile) {
      logger.info('User profile not found', { userId: id })
      return {
        status: 404,
        body: { error: 'User profile not found' }
      }
    }

    logger.info('User profile retrieved', { userId: id })
    return {
      status: 200,
      body: {
        profile,
        found: true
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch user profile', { userId: id, error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to fetch user profile' }
    }
  }
}
