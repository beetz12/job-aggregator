import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import { randomUUID } from 'crypto'
import {
  updateUserProfileRequestSchema,
  userProfileSchema,
  type UserProfile
} from '../types/job-matching'

const createResponseSchema = z.object({
  profile: userProfileSchema,
  created: z.boolean()
})

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'UpdateUserProfile',
  path: '/api/v1/user-profile',
  method: 'POST',
  description: 'Create or update enhanced user profile for job matching',
  emits: [
    { topic: 'user-profile-updated', label: 'Emitted when profile is created or updated' }
  ],
  flows: ['job-matching'],
  bodySchema: updateUserProfileRequestSchema,
  responseSchema: {
    201: createResponseSchema,
    200: createResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const handler: Handlers['UpdateUserProfile'] = async (req, { state, emit, logger }) => {
  logger.info('Creating/updating user profile', { body: req.body })

  try {
    // Validate request body
    const validatedInput = updateUserProfileRequestSchema.parse(req.body)

    const now = new Date().toISOString()
    const isUpdate = !!validatedInput.id

    // Check if profile exists for updates
    let existingProfile: UserProfile | null = null
    if (validatedInput.id) {
      existingProfile = await state.get<UserProfile>('user-profiles', validatedInput.id)
    }

    const profileId = validatedInput.id || randomUUID()

    const profile: UserProfile = {
      id: profileId,
      name: validatedInput.name,
      email: validatedInput.email,
      summary: validatedInput.summary,
      experience: validatedInput.experience,
      skills: validatedInput.skills,
      education: validatedInput.education,
      preferences: validatedInput.preferences,
      voiceStyle: validatedInput.voiceStyle || 'professional',
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now
    }

    // Store profile in state
    await state.set('user-profiles', profileId, profile)

    logger.info('User profile saved', {
      profileId,
      isUpdate: !!existingProfile,
      skillCount: profile.skills.length,
      experienceCount: profile.experience?.length || 0
    })

    // Emit event for downstream processing
    await emit({
      topic: 'user-profile-updated',
      data: {
        profileId,
        isUpdate: !!existingProfile,
        skills: profile.skills
      }
    })

    logger.info('Emitted user-profile-updated event', { profileId })

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
        body: {
          error: 'Validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        }
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to create/update user profile', { error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to create/update user profile', details: errorMessage }
    }
  }
}
