/**
 * Auto-Apply Event Handler
 *
 * This event handler processes 'auto-apply-started' events and runs the
 * TRUE AGENTIC LOOP to complete job applications automatically.
 *
 * Flow:
 * 1. Receives auto-apply-started event with application data
 * 2. Starts the agentic loop with Claude + Playwright
 * 3. Emits checkpoint events when human intervention is needed
 * 4. Waits for user responses via checkpoint-response events
 * 5. Emits progress and completion events
 */

import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import {
  applyToJobWithAgent,
  type CheckpointType,
  type CheckpointData,
  type CheckpointResponse,
  type ProfileData,
} from '../services/computer-use'
import type { Application } from '../types/application'
import type { Job } from '../types/job'
import type { Profile } from '../types/profile'

// ============================================================================
// Schemas
// ============================================================================

// Using z.any() for complex objects since z.custom() doesn't work with Zod v4 JSON schema generation
// TypeScript types are still enforced at runtime through type assertions
const autoApplyDataSchema = z.object({
  applicationId: z.string(),
  application: z.any(),
  job: z.any(),
  profile: z.any(),
  customResume: z.string().optional().nullable(),
  customCoverLetter: z.string().optional().nullable(),
  submissionUrl: z.string().optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'AutoApplyHandler',
  description:
    'Handles auto-apply-started events and runs the agentic loop for job applications',
  subscribes: ['auto-apply-started'],
  emits: [
    'auto-apply-checkpoint',
    'auto-apply-progress',
    'auto-apply-complete',
    'auto-apply-error',
  ],
  flows: ['auto-apply'],
  virtualEmits: [
    {
      topic: 'auto-apply-checkpoint',
      label: 'Checkpoint Required',
    },
    {
      topic: 'auto-apply-progress',
      label: 'Progress Update',
    },
    {
      topic: 'auto-apply-complete',
      label: 'Application Complete',
    },
    {
      topic: 'auto-apply-error',
      label: 'Application Error',
    },
  ],
}

export const handler: Handlers['AutoApplyHandler'] = async (
  input,
  { state, emit, logger }
) => {
  const parsedInput = autoApplyDataSchema.parse(input)
  const applicationId = parsedInput.applicationId
  const application = parsedInput.application as Application
  const job = parsedInput.job as Job
  const profile = parsedInput.profile as Profile
  const data = { ...parsedInput, application, job, profile }

  logger.info('Auto-apply handler started', {
    applicationId,
    jobId: job.id,
    company: job.company,
    title: job.title,
  })

  // Build profile data from the profile
  const profileData: ProfileData = {
    name: profile.full_name || 'Unknown',
    email: profile.email || '',
    phone: profile.phone,
    linkedIn: profile.linkedin_url,
    website: profile.website_url || profile.github_url,
    location: profile.location,
    workAuthorization: profile.work_authorization || 'Authorized to work',
  }

  // Use custom resume/cover letter if available, otherwise use profile defaults
  const resumeMarkdown =
    data.customResume || profile.resume_text || 'Resume not provided'
  const coverLetterMarkdown = data.customCoverLetter

  // Determine the job URL
  const jobUrl = data.submissionUrl || job.url

  try {
    // Run the agentic loop
    const result = await applyToJobWithAgent({
      jobUrl,
      profileData,
      resumeMarkdown,
      coverLetterMarkdown: coverLetterMarkdown || undefined,
      // File paths would need to be stored in profile/application if needed
      resumeFilePath: undefined,
      coverLetterPath: undefined,

      // Checkpoint callback - emit event and wait for response
      onCheckpoint: async (
        type: CheckpointType,
        checkpointData: CheckpointData
      ): Promise<CheckpointResponse> => {
        const checkpointId = `checkpoint:${applicationId}:${Date.now()}`

        // Store checkpoint as waiting
        await state.set('checkpoints', checkpointId, {
          applicationId,
          type,
          data: checkpointData,
          status: 'waiting',
          createdAt: new Date().toISOString(),
        })

        // Emit checkpoint event to frontend
        await emit({
          topic: 'auto-apply-checkpoint',
          data: {
            applicationId,
            checkpointId,
            type,
            message: checkpointData.message,
            screenshot: checkpointData.screenshot,
            url: checkpointData.url,
            questions: checkpointData.questions,
          },
        })

        logger.info('Checkpoint emitted, waiting for user response', {
          applicationId,
          checkpointId,
          type,
        })

        // Poll for user response (max 5 minutes)
        const timeout = 300000
        const pollInterval = 1000
        const startTime = Date.now()

        while (Date.now() - startTime < timeout) {
          const storedCheckpoint = await state.get<{
            status: string
            response?: CheckpointResponse
          }>('checkpoints', checkpointId)

          if (storedCheckpoint?.status === 'responded' && storedCheckpoint.response) {
            logger.info('Checkpoint response received', {
              applicationId,
              checkpointId,
              type,
              continue: storedCheckpoint.response.continue,
            })
            return storedCheckpoint.response
          }

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, pollInterval))
        }

        // Timeout - user didn't respond
        logger.warn('Checkpoint timeout - no user response', {
          applicationId,
          checkpointId,
          type,
        })

        return { continue: false }
      },

      // Progress callback - emit progress events
      onProgress: async (step: number, action: string, reason: string) => {
        await emit({
          topic: 'auto-apply-progress',
          data: {
            applicationId,
            step,
            action,
            reason,
            timestamp: new Date().toISOString(),
          },
        })

        logger.debug('Progress update', {
          applicationId,
          step,
          action,
          reason,
        })
      },

      maxSteps: 50,
    })

    // Update application status based on result
    const now = new Date().toISOString()
    const finalStatus = result.success ? 'applied' : 'error'

    const updatedApplication: Application = {
      ...application,
      status: finalStatus,
      submission_url: result.confirmationUrl || application.submission_url,
      updated_at: now,
    }

    await state.set('applications', applicationId, updatedApplication)

    // Emit completion event
    await emit({
      topic: 'auto-apply-complete',
      data: {
        applicationId,
        success: result.success,
        confirmationUrl: result.confirmationUrl,
        message: result.message,
        error: result.error,
        errorCode: result.errorCode,
        steps: result.steps,
        durationMs: result.durationMs,
      },
    })

    logger.info('Auto-apply completed', {
      applicationId,
      success: result.success,
      steps: result.steps,
      durationMs: result.durationMs,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('Auto-apply failed with exception', {
      applicationId,
      error: errorMessage,
    })

    // Update application status to error
    const updatedApplication: Application = {
      ...application,
      status: 'error',
      updated_at: new Date().toISOString(),
    }

    await state.set('applications', applicationId, updatedApplication)

    // Emit error event
    await emit({
      topic: 'auto-apply-error',
      data: {
        applicationId,
        error: errorMessage,
      },
    })
  }
}
