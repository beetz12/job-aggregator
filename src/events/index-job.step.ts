import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createHash } from 'crypto'
import { jobSchema, type Job } from '../types/job'
import { upsertJob } from '../services/database'
import { isSupabaseConfigured } from '../services/supabase'

const inputSchema = z.object({
  job: jobSchema
})

export const config: EventConfig = {
  type: 'event',
  name: 'IndexJob',
  description: 'Stores normalized job in state and database with deduplication',
  subscribes: ['index-job'],
  emits: ['job-indexed'],
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

export const handler: Handlers['IndexJob'] = async (input, { state, streams, logger, emit }) => {
  const { job } = input
  const duplicateHash = generateDuplicateHash(job)

  logger.info('Indexing job', {
    jobId: job.id,
    title: job.title,
    company: job.company,
    duplicateHash,
    supabaseEnabled: isSupabaseConfigured()
  })

  // =========================================================================
  // STEP 1: Database Deduplication (Primary - survives restarts)
  // =========================================================================
  if (isSupabaseConfigured()) {
    try {
      const result = await upsertJob(job)

      if (result && !result.inserted) {
        // Job already exists in database - just update Motia state for consistency
        logger.info('Job exists in database, updating state only', {
          jobId: job.id,
          contentHash: duplicateHash
        })

        // Update Motia state to stay in sync
        await state.set('jobs', job.id, job)

        // Don't emit job-indexed for existing jobs (no AI re-processing needed)
        return
      }

      if (result?.inserted) {
        logger.info('New job inserted into database', { jobId: job.id })
      }
    } catch (error) {
      logger.error('Database upsert failed, falling back to state-only', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      // Continue with state-only indexing as fallback
    }
  }

  // =========================================================================
  // STEP 2: Motia State Deduplication (Secondary - within session)
  // =========================================================================
  const existingJobs = await state.getGroup<Job>('jobs')
  const existingDuplicate = existingJobs.find(existing => {
    if (existing.id === job.id) return false
    return generateDuplicateHash(existing) === duplicateHash
  })

  if (existingDuplicate) {
    const keepExisting =
      existingDuplicate.healthScore > job.healthScore ||
      (existingDuplicate.healthScore === job.healthScore &&
       new Date(existingDuplicate.postedAt) > new Date(job.postedAt))

    if (keepExisting) {
      logger.info('Duplicate job in state, keeping existing', {
        newJobId: job.id,
        existingJobId: existingDuplicate.id,
        reason: 'existing has higher score or newer posting'
      })
      return
    } else {
      logger.info('Duplicate job in state, replacing with newer/better version', {
        newJobId: job.id,
        oldJobId: existingDuplicate.id
      })
      await state.delete('jobs', existingDuplicate.id)
      await streams.jobs.delete('all', existingDuplicate.id)
      await streams.jobs.delete(existingDuplicate.source, existingDuplicate.id)
    }
  }

  // =========================================================================
  // STEP 3: Store in Motia State (hot cache for fast reads)
  // =========================================================================
  await state.set('jobs', job.id, job)

  // =========================================================================
  // STEP 4: Stream to connected clients (real-time updates)
  // =========================================================================
  await streams.jobs.set('all', job.id, job)
  await streams.jobs.set(job.source, job.id, job)

  logger.info('Job indexed and streamed successfully', {
    jobId: job.id,
    source: job.source,
    wasDuplicate: !!existingDuplicate
  })

  // =========================================================================
  // STEP 5: Emit event for AI summarization (only for NEW jobs)
  // =========================================================================
  await emit({
    topic: 'job-indexed',
    data: {
      jobId: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      remote: job.remote,
      tags: job.tags
    }
  })

  logger.info('Emitted job-indexed event for summarization', { jobId: job.id })
}
