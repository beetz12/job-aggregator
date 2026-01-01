/**
 * Health Scorer Service
 * Calculates health scores for jobs based on freshness, source reliability, and completeness
 */

import { type JobSource, SOURCE_INFO } from './sources'

// Re-export JobSource type for backwards compatibility
export type { JobSource }

/**
 * Get source reliability score from SOURCE_INFO
 * Converts 0-100 reliability to 0-20 scale for scoring
 */
function getSourceReliabilityFromInfo(source: JobSource): number {
  const info = SOURCE_INFO[source]
  if (!info) return 10 // Default for unknown sources
  // Convert 0-100 scale to 0-20 scale (divide by 5)
  return Math.round(info.reliabilityScore / 5)
}

// Completeness weights (out of 30 points total)
const COMPLETENESS_WEIGHTS = {
  hasDescription: 12,
  hasLocation: 8,
  hasSalary: 6,
  hasTags: 4,
};

// Freshness configuration
const FRESHNESS_MAX_POINTS = 40;
const FRESHNESS_HALF_LIFE_DAYS = 7; // Score halves every week

// Base engagement (out of 10 points)
const BASE_ENGAGEMENT_POINTS = 5;

/**
 * Completeness check interface
 */
export interface CompletenessCheck {
  hasDescription: boolean;
  hasLocation: boolean;
  hasSalary: boolean;
  hasTags: boolean;
}

/**
 * Health score breakdown for debugging/display
 */
export interface HealthScoreBreakdown {
  total: number;
  freshness: number;
  completeness: number;
  sourceReliability: number;
  engagement: number;
}

/**
 * Calculates freshness score using exponential decay
 * Half-life of 1 week means score halves every 7 days
 *
 * @param postedAt - ISO date string of when the job was posted
 * @returns Freshness score (0-40)
 */
function calculateFreshnessScore(postedAt: string): number {
  const posted = new Date(postedAt);
  const now = new Date();
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Exponential decay: score = maxPoints * (0.5 ^ (days / halfLife))
  const decay = Math.pow(0.5, diffDays / FRESHNESS_HALF_LIFE_DAYS);
  return Math.round(FRESHNESS_MAX_POINTS * decay);
}

/**
 * Calculates completeness score based on available job data
 *
 * @param completeness - Object indicating which fields are present
 * @returns Completeness score (0-30)
 */
function calculateCompletenessScore(completeness: CompletenessCheck): number {
  let score = 0;

  if (completeness.hasDescription) score += COMPLETENESS_WEIGHTS.hasDescription;
  if (completeness.hasLocation) score += COMPLETENESS_WEIGHTS.hasLocation;
  if (completeness.hasSalary) score += COMPLETENESS_WEIGHTS.hasSalary;
  if (completeness.hasTags) score += COMPLETENESS_WEIGHTS.hasTags;

  return score;
}

/**
 * Gets source reliability score
 *
 * @param source - Job source identifier
 * @returns Source reliability score (0-20)
 */
function getSourceReliabilityScore(source: JobSource): number {
  return getSourceReliabilityFromInfo(source);
}

/**
 * Calculates a comprehensive health score (0-100) based on multiple factors
 *
 * Score breakdown:
 * - Freshness: 0-40 points (exponential decay, 1-week half-life)
 * - Completeness: 0-30 points (description: 12, location: 8, salary: 6, tags: 4)
 * - Source reliability: 0-20 points (based on source quality)
 * - Base engagement: 0-10 points (default: 5)
 *
 * @param postedAt - ISO date string of when the job was posted
 * @param source - Job source identifier
 * @param completeness - Object indicating which fields are present
 * @returns Health score (0-100)
 */
export function calculateHealthScore(
  postedAt: string,
  source: JobSource,
  completeness: CompletenessCheck
): number;

/**
 * Legacy: Calculates a health score (0-100) based on job freshness only
 *
 * @deprecated Use the new overload with source and completeness for better scoring
 * @param postedAt - ISO date string of when the job was posted
 * @returns Health score (0-100)
 */
export function calculateHealthScore(postedAt: string): number;

// Implementation
export function calculateHealthScore(
  postedAt: string,
  source?: JobSource,
  completeness?: CompletenessCheck
): number {
  // Legacy mode: freshness-only scoring
  if (source === undefined || completeness === undefined) {
    return calculateLegacyHealthScore(postedAt);
  }

  // New comprehensive scoring
  const freshnessScore = calculateFreshnessScore(postedAt);
  const completenessScore = calculateCompletenessScore(completeness);
  const sourceScore = getSourceReliabilityScore(source);
  const engagementScore = BASE_ENGAGEMENT_POINTS;

  const total = freshnessScore + completenessScore + sourceScore + engagementScore;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, total));
}

/**
 * Calculates health score with full breakdown for debugging/display
 *
 * @param postedAt - ISO date string of when the job was posted
 * @param source - Job source identifier
 * @param completeness - Object indicating which fields are present
 * @returns HealthScoreBreakdown with individual component scores
 */
export function calculateHealthScoreWithBreakdown(
  postedAt: string,
  source: JobSource,
  completeness: CompletenessCheck
): HealthScoreBreakdown {
  const freshness = calculateFreshnessScore(postedAt);
  const completenessScore = calculateCompletenessScore(completeness);
  const sourceReliability = getSourceReliabilityScore(source);
  const engagement = BASE_ENGAGEMENT_POINTS;

  const total = Math.max(0, Math.min(100, freshness + completenessScore + sourceReliability + engagement));

  return {
    total,
    freshness,
    completeness: completenessScore,
    sourceReliability,
    engagement,
  };
}

/**
 * Legacy health score calculation (freshness-only)
 * Kept for backward compatibility with existing code
 *
 * Scoring tiers:
 * - 100: Posted today
 * - 75-99: Posted within last week
 * - 50-74: Posted within last month
 * - 25-49: Posted within last 3 months
 * - 0-24: Older than 3 months
 */
function calculateLegacyHealthScore(postedAt: string): number {
  const posted = new Date(postedAt);
  const now = new Date();
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return 100;
  if (diffDays <= 7) return Math.round(100 - (diffDays * 3.5));
  if (diffDays <= 30) return Math.round(75 - ((diffDays - 7) * 1.1));
  if (diffDays <= 90) return Math.round(50 - ((diffDays - 30) * 0.4));
  return Math.max(0, Math.round(25 - ((diffDays - 90) * 0.1)));
}

/**
 * Creates a CompletenessCheck from job data
 * Helper function for easier integration
 */
export function checkCompleteness(job: {
  description?: string;
  location?: string;
  salary?: unknown;
  tags?: string[];
}): CompletenessCheck {
  return {
    hasDescription: Boolean(job.description && job.description.length > 50),
    hasLocation: Boolean(job.location && job.location.length > 0),
    hasSalary: Boolean(job.salary),
    hasTags: Boolean(job.tags && job.tags.length > 0),
  };
}
