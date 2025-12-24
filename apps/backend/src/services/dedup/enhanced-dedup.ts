/**
 * Enhanced Deduplication Service
 *
 * Three-tier deduplication system:
 * 1. Exact hash match (fast, uses enhanced normalization)
 * 2. Fuzzy match (catches near-duplicates)
 * 3. Database lookup (persistent storage check)
 *
 * This service combines all dedup strategies into a unified interface.
 */

import crypto from 'crypto'
import type { Job } from '../../types/job'
import { normalizeTitle, normalizeCompany, normalizeLocation } from './normalizer'
import { fuzzyMatchJobs, findBestFuzzyMatch, type FuzzyMatchResult } from './fuzzy-matcher'

/**
 * Result of deduplication check
 */
export interface DedupResult {
  /** Whether the job is a duplicate */
  isDuplicate: boolean
  /** Type of match found */
  matchType: 'exact' | 'fuzzy' | 'none'
  /** ID of existing job if duplicate found */
  existingJobId?: string
  /** Similarity score for fuzzy matches (0-100) */
  similarityScore?: number
  /** Detailed match information for fuzzy matches */
  matchDetails?: FuzzyMatchResult['details']
}

/**
 * State manager interface (compatible with Motia state)
 */
export interface StateManager {
  get<T>(group: string, key: string): Promise<T | undefined>
  set(group: string, key: string, value: unknown): Promise<void>
  getGroup<T>(group: string): Promise<T[]>
}

/**
 * Generate enhanced content hash for deduplication
 * Uses improved normalization for better matching
 *
 * @param job - The job to generate hash for
 * @returns MD5 hash string
 */
export function generateEnhancedHash(job: Job): string {
  const content = [
    normalizeTitle(job.title),
    normalizeCompany(job.company),
    normalizeLocation(job.location || ''),
  ].join('|')

  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Generate a short hash (16 chars) for display/logging
 *
 * @param job - The job to generate hash for
 * @returns Short hash string
 */
export function generateShortHash(job: Job): string {
  return generateEnhancedHash(job).substring(0, 16)
}

/**
 * Check for exact duplicate using enhanced hash
 * Looks up hash in state to find existing job
 *
 * @param job - The job to check
 * @param state - Motia state manager
 * @returns DedupResult with match information
 */
export async function checkExactDuplicate(
  job: Job,
  state: StateManager
): Promise<DedupResult> {
  const hash = generateEnhancedHash(job)

  // Check if we have this hash indexed
  const existingJobId = await state.get<string>('job-hashes', hash)

  if (existingJobId) {
    return {
      isDuplicate: true,
      matchType: 'exact',
      existingJobId,
      similarityScore: 100,
    }
  }

  return {
    isDuplicate: false,
    matchType: 'none',
  }
}

/**
 * Check for fuzzy duplicate among recent jobs
 * Uses fuzzy string matching to catch near-duplicates
 *
 * @param job - The job to check
 * @param recentJobs - Array of recent jobs to compare against
 * @returns DedupResult with match information
 */
export function checkFuzzyDuplicate(job: Job, recentJobs: Job[]): DedupResult {
  const bestMatch = findBestFuzzyMatch(job, recentJobs)

  if (bestMatch) {
    return {
      isDuplicate: true,
      matchType: 'fuzzy',
      existingJobId: bestMatch.job.id,
      similarityScore: bestMatch.result.score,
      matchDetails: bestMatch.result.details,
    }
  }

  return {
    isDuplicate: false,
    matchType: 'none',
  }
}

/**
 * Compare two jobs directly for duplicate detection
 *
 * @param job1 - First job
 * @param job2 - Second job
 * @returns DedupResult with comparison information
 */
export function compareJobs(job1: Job, job2: Job): DedupResult {
  // First check exact hash match
  const hash1 = generateEnhancedHash(job1)
  const hash2 = generateEnhancedHash(job2)

  if (hash1 === hash2) {
    return {
      isDuplicate: true,
      matchType: 'exact',
      existingJobId: job2.id,
      similarityScore: 100,
    }
  }

  // Then check fuzzy match
  const fuzzyResult = fuzzyMatchJobs(job1, job2)

  if (fuzzyResult.match) {
    return {
      isDuplicate: true,
      matchType: 'fuzzy',
      existingJobId: job2.id,
      similarityScore: fuzzyResult.score,
      matchDetails: fuzzyResult.details,
    }
  }

  return {
    isDuplicate: false,
    matchType: 'none',
  }
}

/**
 * Full deduplication check combining all tiers
 *
 * Order of checks:
 * 1. Exact hash match via state (fastest)
 * 2. Fuzzy match against recent jobs (catches variations)
 *
 * @param job - The job to check
 * @param state - Motia state manager
 * @param recentJobs - Array of recent jobs for fuzzy matching
 * @returns DedupResult with match information
 */
export async function checkDuplicate(
  job: Job,
  state: StateManager,
  recentJobs: Job[]
): Promise<DedupResult> {
  // Tier 1: Exact hash match (via state lookup)
  const exactResult = await checkExactDuplicate(job, state)
  if (exactResult.isDuplicate) {
    return exactResult
  }

  // Tier 2: Fuzzy match against recent jobs
  const fuzzyResult = checkFuzzyDuplicate(job, recentJobs)
  if (fuzzyResult.isDuplicate) {
    return fuzzyResult
  }

  // No duplicate found
  return {
    isDuplicate: false,
    matchType: 'none',
  }
}

/**
 * Index a job's hash for future dedup checks
 * Call this after successfully storing a new job
 *
 * @param job - The job that was stored
 * @param state - Motia state manager
 */
export async function indexJobHash(job: Job, state: StateManager): Promise<void> {
  const hash = generateEnhancedHash(job)
  await state.set('job-hashes', hash, job.id)
}

/**
 * Remove a job's hash from the index
 * Call this when removing/replacing a job
 *
 * @param job - The job being removed
 * @param state - Motia state manager
 */
export async function removeJobHash(job: Job, state: StateManager): Promise<void> {
  const hash = generateEnhancedHash(job)
  // Note: Motia state doesn't have delete for individual keys in a group
  // Setting to empty string as a workaround
  await state.set('job-hashes', hash, '')
}

/**
 * Get debug information for a job's dedup status
 * Useful for logging and troubleshooting
 *
 * @param job - The job to inspect
 * @returns Debug information object
 */
export function getJobDedupInfo(job: Job): {
  hash: string
  shortHash: string
  normalizedTitle: string
  normalizedCompany: string
  normalizedLocation: string
} {
  return {
    hash: generateEnhancedHash(job),
    shortHash: generateShortHash(job),
    normalizedTitle: normalizeTitle(job.title),
    normalizedCompany: normalizeCompany(job.company),
    normalizedLocation: normalizeLocation(job.location || ''),
  }
}

// Re-export types and functions from sub-modules for convenience
export { normalizeTitle, normalizeCompany, normalizeLocation, normalizeText } from './normalizer'
export { fuzzyMatchJobs, compareTitles, compareCompanies, compareLocations } from './fuzzy-matcher'
export type { FuzzyMatchResult } from './fuzzy-matcher'
