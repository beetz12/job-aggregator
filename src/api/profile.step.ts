import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import { profileSchema, createProfileSchema, type Profile } from '../types/profile'
import { randomUUID } from 'crypto'

const getProfileResponseSchema = z.object({
  profile: profileSchema.nullable(),
  found: z.boolean()
})

const createProfileResponseSchema = z.object({
  profile: profileSchema,
  created: z.boolean()
})

const errorResponseSchema = z.object({
  error: z.string()
})

// GET /profile/:id - Get user profile
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetProfile',
  path: '/profile/:id',
  method: 'GET',
  description: 'Get user profile by ID',
  emits: [],
  flows: ['profile-matching'],
  responseSchema: {
    200: getProfileResponseSchema,
    404: errorResponseSchema
  }
}

export const handler: Handlers['GetProfile'] = async (req, { state, logger }) => {
  const { id } = req.pathParams

  logger.info('Fetching profile', { profileId: id })

  try {
    const profile = await state.get<Profile>('profiles', id)

    if (!profile) {
      logger.info('Profile not found', { profileId: id })
      return {
        status: 404,
        body: { error: 'Profile not found' }
      }
    }

    logger.info('Profile retrieved', { profileId: id })
    return {
      status: 200,
      body: {
        profile,
        found: true
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch profile', { profileId: id, error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to fetch profile' }
    }
  }
}
