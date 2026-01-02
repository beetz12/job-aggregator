import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import {
  matchJobsRequestSchema,
  applicationResponseSchema,
  matchReportSchema,
  userProfileSchema,
  type UserProfile
} from '../types/job-matching'
import type { Job } from '../types/job'
import { matchJobs } from '../services/job-matching/orchestrator'

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'MatchJobs',
  path: '/api/v1/match-jobs',
  method: 'POST',
  description: 'Analyze job fit for one or more jobs. Returns MatchReport with fit scores and recommendations.',
  emits: [
    { topic: 'match-complete', label: 'Emitted when strong matches are found', conditional: true }
  ],
  flows: ['job-matching'],
  bodySchema: matchJobsRequestSchema,
  responseSchema: {
    200: applicationResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const handler: Handlers['MatchJobs'] = async (req, { state, emit, logger }) => {
  logger.info('Match jobs request received', { body: req.body })

  try {
    // Validate request body
    const validatedInput = matchJobsRequestSchema.parse(req.body)
    const { userId, jobIds, intent } = validatedInput

    logger.info('Processing match request', { userId, jobCount: jobIds.length, intent })

    // Fetch user profile from state
    const userProfile = await state.get<UserProfile>('user-profiles', userId)

    if (!userProfile) {
      logger.warn('User profile not found', { userId })
      return {
        status: 404,
        body: { error: 'User profile not found', details: `No profile exists for user ID: ${userId}` }
      }
    }

    // Fetch jobs from state
    const jobs: Job[] = []
    const missingJobs: string[] = []

    for (const jobId of jobIds) {
      const job = await state.get<Job>('jobs', jobId)
      if (job) {
        jobs.push(job)
      } else {
        missingJobs.push(jobId)
      }
    }

    if (jobs.length === 0) {
      logger.warn('No jobs found', { jobIds, missingJobs })
      return {
        status: 404,
        body: { error: 'No jobs found', details: `Missing job IDs: ${missingJobs.join(', ')}` }
      }
    }

    if (missingJobs.length > 0) {
      logger.warn('Some jobs not found, proceeding with available jobs', {
        found: jobs.length,
        missing: missingJobs.length
      })
    }

    // Run the job matching orchestrator
    const result = await matchJobs({
      user: userProfile,
      jobs,
      intent
    })

    logger.info('Match analysis complete', {
      userId,
      totalJobs: result.summary.totalJobs,
      strongMatches: result.summary.strongMatches
    })

    // Emit event for strong matches (for notifications)
    if (result.summary.strongMatches > 0) {
      const strongMatchResults = result.results.filter(
        r => r.matchReport.fitScore.recommendation === 'STRONG_APPLY'
      )

      await emit({
        topic: 'match-complete',
        data: {
          userId,
          strongMatches: strongMatchResults.map(r => ({
            jobId: r.jobId,
            fitScore: r.matchReport.fitScore.composite,
            recommendation: r.matchReport.fitScore.recommendation
          })),
          totalMatched: result.summary.strongMatches
        }
      })

      logger.info('Emitted match-complete event', {
        userId,
        strongMatchCount: result.summary.strongMatches
      })
    }

    return {
      status: 200,
      body: result
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
    logger.error('Match jobs failed', { error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to process match request', details: errorMessage }
    }
  }
}
