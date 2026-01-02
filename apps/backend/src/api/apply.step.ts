import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import {
  applyRequestSchema,
  applicationKitSchema,
  jobResultSchema,
  type UserProfile
} from '../types/job-matching'
import type { Job } from '../types/job'
import { matchJobs } from '../services/job-matching/orchestrator'

const applyResponseSchema = z.object({
  success: z.boolean(),
  result: jobResultSchema
})

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Apply',
  path: '/api/v1/apply',
  method: 'POST',
  description: 'Generate full application materials for a job (resume, cover letter, question answers)',
  emits: [
    { topic: 'application-generated', label: 'Emitted when application materials are generated' }
  ],
  flows: ['job-matching'],
  bodySchema: applyRequestSchema,
  responseSchema: {
    200: applyResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const handler: Handlers['Apply'] = async (req, { state, emit, logger }) => {
  logger.info('Apply request received', { body: req.body })

  try {
    // Validate request body
    const validatedInput = applyRequestSchema.parse(req.body)
    const { userId, jobId, applicationQuestions } = validatedInput

    logger.info('Processing apply request', {
      userId,
      jobId,
      hasQuestions: !!applicationQuestions?.length
    })

    // Fetch user profile from state
    const userProfile = await state.get<UserProfile>('user-profiles', userId)

    if (!userProfile) {
      logger.warn('User profile not found', { userId })
      return {
        status: 404,
        body: { error: 'User profile not found', details: `No profile exists for user ID: ${userId}` }
      }
    }

    // Fetch job from state
    const job = await state.get<Job>('jobs', jobId)

    if (!job) {
      logger.warn('Job not found', { jobId })
      return {
        status: 404,
        body: { error: 'Job not found', details: `No job exists with ID: ${jobId}` }
      }
    }

    // Run the job matching orchestrator with full_application intent
    const result = await matchJobs({
      user: userProfile,
      jobs: [job],
      intent: 'full_application',
      applicationQuestions
    })

    if (result.results.length === 0) {
      logger.error('No results from orchestrator', { userId, jobId })
      return {
        status: 500,
        body: { error: 'Failed to generate application', details: 'No results returned from orchestrator' }
      }
    }

    const jobResult = result.results[0]

    logger.info('Application generated', {
      userId,
      jobId,
      fitScore: jobResult.matchReport.fitScore.composite,
      hasResume: !!jobResult.applicationKit?.resume,
      hasCoverLetter: !!jobResult.applicationKit?.coverLetter,
      answerCount: jobResult.applicationKit?.questionAnswers?.length || 0
    })

    // Emit event for application generation (for PDF generation, storage, etc.)
    if (jobResult.applicationKit) {
      await emit({
        topic: 'application-generated',
        data: {
          userId,
          jobId,
          applicationKit: jobResult.applicationKit,
          matchReport: {
            fitScore: jobResult.matchReport.fitScore.composite,
            recommendation: jobResult.matchReport.fitScore.recommendation
          }
        }
      })

      logger.info('Emitted application-generated event', { userId, jobId })
    }

    return {
      status: 200,
      body: {
        success: true,
        result: jobResult
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
    logger.error('Apply request failed', { error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to generate application', details: errorMessage }
    }
  }
}
