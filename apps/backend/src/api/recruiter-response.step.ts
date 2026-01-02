import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import {
  recruiterResponseRequestSchema,
  recruiterEmailSchema,
  matchReportSchema,
  type UserProfile
} from '../types/job-matching'
import type { Job } from '../types/job'
import { matchJobs } from '../services/job-matching/orchestrator'

const recruiterResponseResponseSchema = z.object({
  success: z.boolean(),
  email: recruiterEmailSchema,
  matchReport: matchReportSchema.optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional()
})

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'RecruiterResponse',
  path: '/api/v1/recruiter-response',
  method: 'POST',
  description: 'Generate a response to a recruiter message. Optionally analyzes job fit if jobId provided.',
  emits: [],
  flows: ['job-matching'],
  bodySchema: recruiterResponseRequestSchema,
  responseSchema: {
    200: recruiterResponseResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const handler: Handlers['RecruiterResponse'] = async (req, { state, logger }) => {
  logger.info('Recruiter response request received', { body: req.body })

  try {
    // Validate request body
    const validatedInput = recruiterResponseRequestSchema.parse(req.body)
    const { userId, recruiterMessage, jobId } = validatedInput

    logger.info('Processing recruiter response', {
      userId,
      hasJobId: !!jobId,
      messageLength: recruiterMessage.length
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

    // If jobId is provided, fetch the job for context
    let job: Job | null = null
    if (jobId) {
      job = await state.get<Job>('jobs', jobId)
      if (!job) {
        logger.warn('Job not found, proceeding without job context', { jobId })
      }
    }

    // If no job context, create a minimal job for the orchestrator
    // This allows generating a response even without a specific job
    const targetJob: Job = job || {
      id: 'unknown',
      title: 'Unknown Position',
      company: 'Unknown Company',
      description: recruiterMessage,
      url: '',
      source: 'arbeitnow' as const,
      remote: false,
      postedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      tags: [],
      healthScore: 50
    }

    // Run the job matching orchestrator with recruiter_response intent
    const result = await matchJobs({
      user: userProfile,
      jobs: [targetJob],
      intent: 'recruiter_response',
      recruiterMessage
    })

    if (result.results.length === 0 || !result.results[0].applicationKit?.recruiterEmail) {
      logger.error('No recruiter email generated', { userId, jobId })
      return {
        status: 500,
        body: { error: 'Failed to generate response', details: 'No email generated from orchestrator' }
      }
    }

    const jobResult = result.results[0]
    const email = jobResult.applicationKit.recruiterEmail

    logger.info('Recruiter response generated', {
      userId,
      jobId,
      responseType: email.type,
      fitScore: jobResult.matchReport.fitScore.composite
    })

    return {
      status: 200,
      body: {
        success: true,
        email,
        matchReport: job ? jobResult.matchReport : undefined,
        jobTitle: job?.title,
        company: job?.company
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
    logger.error('Recruiter response failed', { error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to generate recruiter response', details: errorMessage }
    }
  }
}
