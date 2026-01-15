/**
 * Fuzzy String Matching for Job Deduplication
 *
 * Uses the fuzzball library for intelligent fuzzy matching that handles:
 * - Word order variations ("Senior Software Engineer" vs "Software Engineer, Senior")
 * - Typos and minor spelling differences
 * - Partial matches
 */

import * as fuzz from 'fuzzball'
import type { Job } from '../../types/job'
import { normalizeTitle, normalizeCompany, normalizeLocation } from './normalizer'

/**
 * Matching thresholds for deduplication
 */
export const MATCH_THRESHOLDS = {
  /** Minimum title similarity score (0-100) for a match */
  TITLE: 80,
  /** Minimum company similarity score (0-100) for a match */
  COMPANY: 70,
  /** Minimum location similarity score (0-100) for a match (when both have locations) */
  LOCATION: 60,
  /** Minimum combined weighted score for overall match */
  COMBINED: 75,
}

/**
 * Weights for combining individual match scores
 */
export const MATCH_WEIGHTS = {
  TITLE: 0.5,
  COMPANY: 0.35,
  LOCATION: 0.15,
}

/**
 * Result of a fuzzy job comparison
 */
export interface FuzzyMatchResult {
  /** Whether the jobs are considered duplicates */
  match: boolean
  /** Combined similarity score (0-100) */
  score: number
  /** Individual component scores */
  details: {
    title: number
    company: number
    location: number
  }
}

/**
 * Calculate token set ratio between two strings
 * This is order-invariant and handles word rearrangements well
 *
 * Example:
 * - "Senior Software Engineer" vs "Software Engineer Senior" -> high score
 * - "Frontend Developer" vs "Backend Developer" -> lower score
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score from 0-100
 */
export function tokenSetRatio(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 100

  return fuzz.token_set_ratio(str1, str2)
}

/**
 * Calculate partial ratio between two strings
 * Good for when one string might be a substring of another
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score from 0-100
 */
export function partialRatio(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 100

  return fuzz.partial_ratio(str1, str2)
}

/**
 * Calculate simple ratio between two strings
 * Basic Levenshtein-based similarity
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score from 0-100
 */
export function simpleRatio(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 100

  return fuzz.ratio(str1, str2)
}

/**
 * Compare job titles using fuzzy matching
 * Uses token set ratio for order-invariant matching
 *
 * @param title1 - First job title
 * @param title2 - Second job title
 * @returns Similarity score from 0-100
 */
export function compareTitles(title1: string, title2: string): number {
  const normalized1 = normalizeTitle(title1)
  const normalized2 = normalizeTitle(title2)

  // Use token_set_ratio for word-order invariant matching
  return tokenSetRatio(normalized1, normalized2)
}

/**
 * Compare company names using fuzzy matching
 * Uses a combination of token set and partial ratio
 *
 * @param company1 - First company name
 * @param company2 - Second company name
 * @returns Similarity score from 0-100
 */
export function compareCompanies(company1: string, company2: string): number {
  const normalized1 = normalizeCompany(company1)
  const normalized2 = normalizeCompany(company2)

  // Use max of token_set_ratio and partial_ratio
  // This handles both "Google Inc" vs "Google" and "Alphabet Google" vs "Google Alphabet"
  const tokenScore = tokenSetRatio(normalized1, normalized2)
  const partialScore = partialRatio(normalized1, normalized2)

  return Math.max(tokenScore, partialScore)
}

/**
 * Compare locations using fuzzy matching
 * More lenient than title/company matching
 *
 * @param location1 - First location
 * @param location2 - Second location
 * @returns Similarity score from 0-100
 */
export function compareLocations(location1?: string, location2?: string): number {
  // If both are empty/undefined, consider them matching
  if (!location1 && !location2) return 100

  // If only one has location, give partial credit
  if (!location1 || !location2) return 50

  const normalized1 = normalizeLocation(location1)
  const normalized2 = normalizeLocation(location2)

  // Use token_set_ratio for flexibility with location formats
  return tokenSetRatio(normalized1, normalized2)
}

/**
 * Compare two jobs for fuzzy duplicate detection
 * Uses weighted combination of title, company, and location similarity
 *
 * @param job1 - First job to compare
 * @param job2 - Second job to compare
 * @returns FuzzyMatchResult with match status and scores
 */
export function fuzzyMatchJobs(job1: Job, job2: Job): FuzzyMatchResult {
  const titleScore = compareTitles(job1.title, job2.title)
  const companyScore = compareCompanies(job1.company, job2.company)
  const location_score = compareLocations(job1.location, job2.location)

  // Calculate weighted combined score
  const combinedScore =
    titleScore * MATCH_WEIGHTS.TITLE +
    companyScore * MATCH_WEIGHTS.COMPANY +
    location_score * MATCH_WEIGHTS.LOCATION

  // Determine if this is a match based on individual thresholds AND combined score
  const titleMatch = titleScore >= MATCH_THRESHOLDS.TITLE
  const companyMatch = companyScore >= MATCH_THRESHOLDS.COMPANY
  const combinedMatch = combinedScore >= MATCH_THRESHOLDS.COMBINED

  // Must meet title AND company thresholds, AND combined threshold
  const isMatch = titleMatch && companyMatch && combinedMatch

  return {
    match: isMatch,
    score: Math.round(combinedScore),
    details: {
      title: titleScore,
      company: companyScore,
      location: location_score,
    },
  }
}

/**
 * Find the best fuzzy match for a job among a list of candidates
 *
 * @param targetJob - The job to find matches for
 * @param candidateJobs - List of jobs to compare against
 * @param excludeId - Optional job ID to exclude from comparison
 * @returns Best match result with the matched job, or null if no match found
 */
export function findBestFuzzyMatch(
  targetJob: Job,
  candidateJobs: Job[],
  excludeId?: string
): { job: Job; result: FuzzyMatchResult } | null {
  let bestMatch: { job: Job; result: FuzzyMatchResult } | null = null

  for (const candidate of candidateJobs) {
    // Skip if same job or excluded
    if (candidate.id === targetJob.id || candidate.id === excludeId) {
      continue
    }

    const result = fuzzyMatchJobs(targetJob, candidate)

    if (result.match) {
      if (!bestMatch || result.score > bestMatch.result.score) {
        bestMatch = { job: candidate, result }
      }
    }
  }

  return bestMatch
}

/**
 * Batch compare a job against multiple candidates efficiently
 * Returns all matches above threshold, sorted by score descending
 *
 * @param targetJob - The job to find matches for
 * @param candidateJobs - List of jobs to compare against
 * @param limit - Maximum number of matches to return
 * @returns Array of matches with job and result
 */
export function findAllFuzzyMatches(
  targetJob: Job,
  candidateJobs: Job[],
  limit: number = 5
): Array<{ job: Job; result: FuzzyMatchResult }> {
  const matches: Array<{ job: Job; result: FuzzyMatchResult }> = []

  for (const candidate of candidateJobs) {
    if (candidate.id === targetJob.id) continue

    const result = fuzzyMatchJobs(targetJob, candidate)

    if (result.match) {
      matches.push({ job: candidate, result })
    }
  }

  // Sort by score descending and limit
  return matches.sort((a, b) => b.result.score - a.result.score).slice(0, limit)
}
