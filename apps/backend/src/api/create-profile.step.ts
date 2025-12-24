import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import { profileSchema, createProfileSchema, type Profile } from '../types/profile'
import { randomUUID } from 'crypto'

const createProfileResponseSchema = z.object({
  profile: profileSchema,
  created: z.boolean()
})

const errorResponseSchema = z.object({
  error: z.string()
})

// POST /profile - Create or update profile
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreateProfile',
  path: '/profile',
  method: 'POST',
  description: 'Create or update user profile',
  emits: ['profile-updated'],
  flows: ['profile-matching'],
  bodySchema: createProfileSchema,
  responseSchema: {
    201: createProfileResponseSchema,
    200: createProfileResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const handler: Handlers['CreateProfile'] = async (req, { state, emit, logger }) => {
  logger.info('Creating/updating profile', { body: req.body })

  try {
    // Validate request body
    const validatedInput = createProfileSchema.parse(req.body)

    const now = new Date().toISOString()
    const isUpdate = !!validatedInput.id

    // Check if profile exists for updates
    let existingProfile: Profile | null = null
    if (validatedInput.id) {
      existingProfile = await state.get<Profile>('profiles', validatedInput.id)
    }

    const profileId = validatedInput.id || randomUUID()

    const profile: Profile = {
      id: profileId,
      name: validatedInput.name,
      email: validatedInput.email,
      skills: validatedInput.skills,
      experienceYears: validatedInput.experienceYears,
      seniorityLevel: validatedInput.seniorityLevel,
      preferredLocations: validatedInput.preferredLocations,
      remotePreference: validatedInput.remotePreference,
      salaryExpectation: validatedInput.salaryExpectation,
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now
    }

    // Store profile in state
    await state.set('profiles', profileId, profile)

    logger.info('Profile saved', { profileId, isUpdate: !!existingProfile })

    // Emit event for match score calculation
    await emit({
      topic: 'profile-updated',
      data: { profileId }
    })

    logger.info('Emitted profile-updated event', { profileId })

    return {
      status: existingProfile ? 200 : 201,
      body: {
        profile,
        created: !existingProfile
      }
    }
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Validation failed', { errors: error.errors })
      return {
        status: 400,
        body: { error: 'Validation failed: ' + error.errors.map(e => e.message).join(', ') }
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to create/update profile', { error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to create/update profile' }
    }
  }
}
