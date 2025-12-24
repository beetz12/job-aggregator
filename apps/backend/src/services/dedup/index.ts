/**
 * Enhanced Deduplication Module
 *
 * This module provides a three-tier deduplication system:
 * 1. Exact hash matching with enhanced normalization
 * 2. Fuzzy string matching for near-duplicates
 * 3. Integration with database for persistent dedup
 *
 * Usage:
 * ```typescript
 * import { checkDuplicate, indexJobHash } from '../services/dedup'
 *
 * const result = await checkDuplicate(job, state, recentJobs)
 * if (!result.isDuplicate) {
 *   // Store the job
 *   await indexJobHash(job, state)
 * }
 * ```
 */

// Main dedup service
export {
  checkDuplicate,
  checkExactDuplicate,
  checkFuzzyDuplicate,
  compareJobs,
  generateEnhancedHash,
  generateShortHash,
  indexJobHash,
  removeJobHash,
  getJobDedupInfo,
  type DedupResult,
  type StateManager,
} from './enhanced-dedup'

// Fuzzy matching utilities
export {
  fuzzyMatchJobs,
  findBestFuzzyMatch,
  findAllFuzzyMatches,
  compareTitles,
  compareCompanies,
  compareLocations,
  tokenSetRatio,
  partialRatio,
  simpleRatio,
  MATCH_THRESHOLDS,
  MATCH_WEIGHTS,
  type FuzzyMatchResult,
} from './fuzzy-matcher'

// Normalization utilities
export {
  normalizeText,
  normalizeTitle,
  normalizeCompany,
  normalizeLocation,
  extractCoreLocation,
} from './normalizer'
