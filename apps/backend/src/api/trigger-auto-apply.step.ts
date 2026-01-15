import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import {
  applicationSchema,
  type Application
} from '../types/application'
import { jobSchema, type Job } from '../types/job'
import { profileSchema, type Profile } from '../types/profile'

const errorResponseSchema = z.object({
  error: z.string()
})

const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  application: applicationSchema
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'TriggerAutoApply',
  path: '/applications/:id/auto-apply',
  method: 'POST',
  description: 'Trigger Computer Use automation to auto-apply for a job application',
  emits: ['auto-apply-started'],
  flows: ['application-tracking', 'auto-apply'],
  responseSchema: {
    200: successResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema
  }
}

export const handler: Handlers['TriggerAutoApply'] = async (req, { state, emit, logger }) => {
  const { id } = req.pathParams

  try {
    // 1. Get application by ID
    const application = await state.get<Application>('applications', id)

    if (!application) {
      return {
        status: 404,
        body: { error: 'Application not found' }
      }
    }

    // 2. Verify it's in 'resume_ready' status
    if (application.status !== 'resume_ready') {
      return {
        status: 400,
        body: {
          error: `Application must be in 'resume_ready' status to auto-apply. Current status: ${application.status}`
        }
      }
    }

    // 3. Get the job details
    const job = await state.get<Job>('jobs', application.job_id)

    if (!job) {
      return {
        status: 404,
        body: { error: 'Job not found for this application' }
      }
    }

    // 4. Get the profile with resume
    // Using 'default' as the profile ID - adjust if your system uses different profile IDs
    const profile = await state.get<Profile>('profiles', 'default')

    if (!profile) {
      return {
        status: 400,
        body: { error: 'Profile not found. Please create a profile before auto-applying.' }
      }
    }

    // 5. Update status to 'applying'
    const now = new Date().toISOString()
    const updatedApplication: Application = {
      ...application,
      status: 'applying',
      updated_at: now
    }

    await state.set('applications', id, updatedApplication)

    // 6. Emit 'auto-apply-started' event with application data
    await emit({
      topic: 'auto-apply-started',
      data: {
        applicationId: id,
        application: updatedApplication,
        job,
        profile,
        customResume: application.custom_resume_markdown,
        customCoverLetter: application.custom_cover_letter_markdown,
        submissionUrl: application.submission_url || job.url
      }
    })

    logger.info('Auto-apply triggered', {
      applicationId: id,
      job_id: application.job_id,
      company: application.company,
      job_title: application.job_title
    })

    // 7. Return updated application
    return {
      status: 200,
      body: {
        success: true,
        message: 'Auto-apply process started successfully',
        application: updatedApplication
      }
    }
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Validation failed', { error: error.message })
      return {
        status: 400,
        body: { error: 'Validation failed: ' + error.errors.map(e => e.message).join(', ') }
      }
    }
    throw error
  }
}
