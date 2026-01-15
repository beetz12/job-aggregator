import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { createHash } from 'crypto'
import { jobSchema, type Job } from '../types/job'
import { upsertJob } from '../services/database'
import { isSupabaseConfigured } from '../services/postgres'
import {
  checkFuzzyDuplicate,
  generateShortHash,
  indexJobHash,
  getJobDedupInfo,
} from '../services/dedup/index'

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

/** Maximum number of recent jobs to check for fuzzy duplicates */
const FUZZY_DEDUP_WINDOW = 500

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
  const enhancedHash = generateShortHash(job)

  logger.info('Indexing job', {
    jobId: job.id,
    title: job.title,
    company: job.company,
    duplicateHash,
    enhancedHash,
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
  // STEP 2: Hash Cache Check (FAST - avoids loading all jobs)
  // =========================================================================
  // Check if we've seen this exact hash before (O(1) lookup)
  const cachedJobId = await state.get<string>('job-hashes', duplicateHash)

  if (cachedJobId && cachedJobId !== job.id) {
    // Found in hash cache - need to get the existing job to compare
    const existingJob = await state.get<Job>('jobs', cachedJobId)

    if (existingJob) {
      const keepExisting =
        existingJob.health_score > job.health_score ||
        (existingJob.health_score === job.health_score &&
         new Date(existingJob.posted_at) > new Date(job.posted_at))

      if (keepExisting) {
        logger.info('Duplicate job found via hash cache, keeping existing', {
          newJobId: job.id,
          existingJobId: cachedJobId,
          duplicateHash,
          reason: 'existing has higher score or newer posting'
        })
        return
      } else {
        logger.info('Duplicate job found via hash cache, replacing with newer/better version', {
          newJobId: job.id,
          oldJobId: cachedJobId,
          duplicateHash
        })
        await state.delete('jobs', cachedJobId)
        await streams.jobs.delete('all', cachedJobId)
        await streams.jobs.delete(existingJob.source, cachedJobId)
        // Update hash cache to point to new job
        await state.set('job-hashes', duplicateHash, job.id)
        // Continue to store the new job below
      }
    } else {
      // Stale cache entry - the job was deleted but hash remains
      logger.info('Hash cache pointed to deleted job, will index as new', {
        jobId: job.id,
        staleJobId: cachedJobId,
        duplicateHash
      })
      // Update hash cache to point to new job
      await state.set('job-hashes', duplicateHash, job.id)
    }
  }

  // =========================================================================
  // STEP 3: Fuzzy Deduplication (only if no exact hash match)
  // =========================================================================
  // Only load all jobs for fuzzy matching if we didn't find an exact hash match
  // This is the expensive operation we're trying to avoid
  if (!cachedJobId || cachedJobId === job.id) {
    const existingJobs = await state.getGroup<Job>('jobs')

    // Double-check exact hash match in case of race condition or cache miss
    const existingDuplicate = existingJobs.find(existing => {
      if (existing.id === job.id) return false
      return generateDuplicateHash(existing) === duplicateHash
    })

    if (existingDuplicate) {
      const keepExisting =
        existingDuplicate.health_score > job.health_score ||
        (existingDuplicate.health_score === job.health_score &&
         new Date(existingDuplicate.posted_at) > new Date(job.posted_at))

      if (keepExisting) {
        logger.info('Duplicate job in state (exact match), keeping existing', {
          newJobId: job.id,
          existingJobId: existingDuplicate.id,
          reason: 'existing has higher score or newer posting'
        })
        // Fix cache for future lookups
        await state.set('job-hashes', duplicateHash, existingDuplicate.id)
        return
      } else {
        logger.info('Duplicate job in state (exact match), replacing with newer/better version', {
          newJobId: job.id,
          oldJobId: existingDuplicate.id
        })
        await state.delete('jobs', existingDuplicate.id)
        await streams.jobs.delete('all', existingDuplicate.id)
        await streams.jobs.delete(existingDuplicate.source, existingDuplicate.id)
      }
    }

    // Enhanced Fuzzy Deduplication (catches near-duplicates)
    // Only check fuzzy if no exact match found
    if (!existingDuplicate) {
      // Get recent jobs for fuzzy comparison (limit to window size for performance)
      const recentJobs = existingJobs.slice(0, FUZZY_DEDUP_WINDOW)

      const fuzzyResult = checkFuzzyDuplicate(job, recentJobs)

      if (fuzzyResult.isDuplicate && fuzzyResult.existingJobId) {
        const fuzzyMatch = existingJobs.find(j => j.id === fuzzyResult.existingJobId)

        if (fuzzyMatch) {
          // Log detailed fuzzy match information
          const newJobInfo = getJobDedupInfo(job)
          const existingJobInfo = getJobDedupInfo(fuzzyMatch)

          logger.info('Fuzzy duplicate detected', {
            newJobId: job.id,
            existingJobId: fuzzyMatch.id,
            similarityScore: fuzzyResult.similarityScore,
            matchDetails: fuzzyResult.matchDetails,
            newJob: {
              title: job.title,
              company: job.company,
              location: job.location,
              normalized: newJobInfo
            },
            existingJob: {
              title: fuzzyMatch.title,
              company: fuzzyMatch.company,
              location: fuzzyMatch.location,
              normalized: existingJobInfo
            }
          })

          // Decide whether to keep existing or replace with new
          const keepExisting =
            fuzzyMatch.health_score > job.health_score ||
            (fuzzyMatch.health_score === job.health_score &&
             new Date(fuzzyMatch.posted_at) > new Date(job.posted_at))

          if (keepExisting) {
            logger.info('Fuzzy duplicate: keeping existing job', {
              newJobId: job.id,
              existingJobId: fuzzyMatch.id,
              reason: 'existing has higher score or newer posting',
              similarityScore: fuzzyResult.similarityScore
            })
            return
          } else {
            logger.info('Fuzzy duplicate: replacing with newer/better version', {
              newJobId: job.id,
              oldJobId: fuzzyMatch.id,
              similarityScore: fuzzyResult.similarityScore
            })
            await state.delete('jobs', fuzzyMatch.id)
            await streams.jobs.delete('all', fuzzyMatch.id)
            await streams.jobs.delete(fuzzyMatch.source, fuzzyMatch.id)
          }
        }
      }
    }
  }

  // =========================================================================
  // STEP 4: Store in Motia State (hot cache for fast reads)
  // =========================================================================
  await state.set('jobs', job.id, job)

  // Store hash in cache for O(1) future duplicate lookups
  await state.set('job-hashes', duplicateHash, job.id)

  // Index the enhanced hash for future dedup checks
  await indexJobHash(job, state)

  // =========================================================================
  // STEP 5: Stream to connected clients (real-time updates)
  // =========================================================================
  await streams.jobs.set('all', job.id, job)
  await streams.jobs.set(job.source, job.id, job)

  logger.info('Job indexed and streamed successfully', {
    jobId: job.id,
    source: job.source,
    duplicateHash,
    enhancedHash
  })

  // =========================================================================
  // STEP 6: Emit event for AI summarization (only for NEW jobs)
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
