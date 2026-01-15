import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { applicationKitSchema } from '../types/job-matching'

const inputSchema = z.object({
  userId: z.string(),
  jobId: z.string(),
  applicationKit: applicationKitSchema,
  matchReport: z.object({
    fitScore: z.number(),
    recommendation: z.enum(['STRONG_APPLY', 'APPLY', 'CONDITIONAL', 'SKIP'])
  })
})

export const config: EventConfig = {
  type: 'event',
  name: 'ApplicationGenerated',
  description: 'Handles application generation events. Saves documents to storage and generates PDFs.',
  subscribes: ['application-generated'],
  emits: ['documents-saved'],
  input: inputSchema,
  flows: ['job-matching']
}

export const handler: Handlers['ApplicationGenerated'] = async (input, { state, emit, logger }) => {
  const { userId, jobId, applicationKit, matchReport } = input

  logger.info('Processing application-generated event', {
    userId,
    jobId,
    hasResume: !!applicationKit.resume,
    hasCoverLetter: !!applicationKit.coverLetter,
    questionCount: applicationKit.questionAnswers?.length || 0
  })

  try {
    // Generate unique application ID
    const applicationId = `app-${Date.now()}-${userId}-${jobId}`

    // Store application kit in state for retrieval
    const storedApplication = {
      id: applicationId,
      userId,
      jobId,
      applicationKit,
      matchReport,
      created_at: new Date().toISOString(),
      status: 'generated' as const
    }

    await state.set('applications', applicationId, storedApplication)

    logger.info('Application stored in state', { applicationId })

    // In production, generate PDFs for resume and cover letter
    const documents: Array<{ type: string; path: string; format: string }> = []

    if (applicationKit.resume?.markdown) {
      // TODO: Integrate PDF generation library (puppeteer, pdfkit, etc.)
      const resumePath = `documents/${userId}/${applicationId}/resume.pdf`
      logger.info('Would generate resume PDF', { path: resumePath })

      documents.push({
        type: 'resume',
        path: resumePath,
        format: 'pdf'
      })

      // For now, store the markdown
      await state.set('documents', `${applicationId}-resume`, {
        applicationId,
        type: 'resume',
        content: applicationKit.resume.markdown,
        format: 'markdown',
        created_at: new Date().toISOString()
      })
    }

    if (applicationKit.coverLetter?.markdown) {
      const coverLetterPath = `documents/${userId}/${applicationId}/cover-letter.pdf`
      logger.info('Would generate cover letter PDF', { path: coverLetterPath })

      documents.push({
        type: 'cover_letter',
        path: coverLetterPath,
        format: 'pdf'
      })

      // Store the markdown
      await state.set('documents', `${applicationId}-cover-letter`, {
        applicationId,
        type: 'cover_letter',
        content: applicationKit.coverLetter.markdown,
        format: 'markdown',
        created_at: new Date().toISOString()
      })
    }

    // Store question answers if present
    if (applicationKit.questionAnswers && applicationKit.questionAnswers.length > 0) {
      await state.set('documents', `${applicationId}-qa`, {
        applicationId,
        type: 'question_answers',
        content: JSON.stringify(applicationKit.questionAnswers, null, 2),
        format: 'json',
        created_at: new Date().toISOString()
      })

      documents.push({
        type: 'question_answers',
        path: `documents/${userId}/${applicationId}/qa.json`,
        format: 'json'
      })
    }

    // Update application with document references
    const updatedApplication = {
      ...storedApplication,
      documents,
      status: 'documents_saved' as const
    }

    await state.set('applications', applicationId, updatedApplication)

    // Track user's application history
    const userApplications = await state.get<string[]>('user-applications', userId) || []
    userApplications.push(applicationId)
    await state.set('user-applications', userId, userApplications)

    // Emit documents-saved event
    await emit({
      topic: 'documents-saved',
      data: {
        applicationId,
        userId,
        jobId,
        documentCount: documents.length,
        documents
      }
    })

    logger.info('Application processing complete', {
      applicationId,
      userId,
      jobId,
      documentCount: documents.length
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to process application-generated event', {
      userId,
      jobId,
      error: errorMessage
    })
    // Don't throw - allow the event to be marked as processed
    // The application can still be retrieved from the API response
  }
}
