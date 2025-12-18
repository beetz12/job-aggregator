import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createHash } from 'crypto'
import { jobSchema, type Job } from '../types/job'

const inputSchema = z.object({
  job: jobSchema
})

export const config: EventConfig = {
  type: 'event',
  name: 'IndexJob',
  description: 'Stores normalized job in state with deduplication',
  subscribes: ['index-job'],
  emits: [],
  input: inputSchema,
  flows: ['job-aggregation']
}

/**
 * Generate a content-based hash for deduplication
 * Jobs are considered duplicates if they have the same title, company, and location
 */
function generateDuplicateHash(job: Job): string {
  const content = [
    job.title.toLowerCase().trim(),
    job.company.toLowerCase().trim(),
    (job.location || '').toLowerCase().trim()
  ].join('|')

  return createHash('md5').update(content).digest('hex').substring(0, 16)
}

export const handler: Handlers['IndexJob'] = async (input, { state, streams, logger }) => {
  const { job } = input

  const duplicateHash = generateDuplicateHash(job)

  logger.info('Indexing job', {
    jobId: job.id,
    title: job.title,
    company: job.company,
    duplicateHash
  })

  // Check for existing jobs with same content hash (potential duplicates)
  const existingJobs = await state.getGroup<Job>('jobs')
  const existingDuplicate = existingJobs.find(existing => {
    // Skip if same job ID (update case)
    if (existing.id === job.id) return false
    // Check content-based hash match
    return generateDuplicateHash(existing) === duplicateHash
  })

  if (existingDuplicate) {
    // Duplicate found - keep the one with higher health score or newer posting
    const keepExisting =
      existingDuplicate.healthScore > job.healthScore ||
      (existingDuplicate.healthScore === job.healthScore &&
       new Date(existingDuplicate.postedAt) > new Date(job.postedAt))

    if (keepExisting) {
      logger.info('Duplicate job detected, keeping existing', {
        newJobId: job.id,
        existingJobId: existingDuplicate.id,
        reason: 'existing has higher score or newer posting'
      })
      return // Don't index the duplicate
    } else {
      // Remove the old duplicate, index the new one
      logger.info('Duplicate job detected, replacing with newer/better version', {
        newJobId: job.id,
        oldJobId: existingDuplicate.id
      })
      await state.delete('jobs', existingDuplicate.id)
      // Also remove from streams
      await streams.jobs.delete('all', existingDuplicate.id)
      await streams.jobs.delete(existingDuplicate.source, existingDuplicate.id)
    }
  }

  // Store job in state
  await state.set('jobs', job.id, job)

  // Stream the job to connected clients for real-time updates
  // GroupId 'all' for clients subscribing to all jobs
  await streams.jobs.set('all', job.id, job)

  // Also stream to source-specific group for filtered subscriptions
  await streams.jobs.set(job.source, job.id, job)

  logger.info('Job indexed and streamed successfully', {
    jobId: job.id,
    source: job.source,
    wasDuplicate: !!existingDuplicate
  })
}
