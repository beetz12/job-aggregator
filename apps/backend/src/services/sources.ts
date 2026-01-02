/**
 * Job Sources - Single Source of Truth
 *
 * This file is the canonical definition of all supported job sources.
 * Import from here instead of defining source lists elsewhere.
 */

import { z } from 'zod'

// ============================================================================
// Source Categories
// ============================================================================

/**
 * Sources available through the Python Scraper API
 */
export const SCRAPER_SOURCES = [
  'arbeitnow',
  'hackernews',
  'remoteok',
  'weworkremotely',
  'braintrust',
  'devitjobs',
  'jobicy',
  'dice',
  'builtin',
  'remotive',
  'wellfound',
  'yc_jobs',
  'themuse',
  'jobicy_api'
] as const

/**
 * Legacy sources (may not be actively scraped but kept for backwards compatibility)
 */
export const LEGACY_SOURCES = [
  'reddit',
  'googlejobs'
] as const

/**
 * All supported job sources (union of scraper + legacy)
 */
export const ALL_JOB_SOURCES = [
  ...SCRAPER_SOURCES,
  ...LEGACY_SOURCES
] as const

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Zod enum for all job sources
 */
export const jobSourceEnum = z.enum([
  'arbeitnow',
  'hackernews',
  'reddit',
  'remotive',
  'wellfound',
  'googlejobs',
  'jobicy',
  'weworkremotely',
  'remoteok',
  'braintrust',
  'devitjobs',
  'dice',
  'builtin',
  'yc_jobs',
  'themuse',
  'jobicy_api'
])

export type JobSource = z.infer<typeof jobSourceEnum>

/**
 * Zod enum for scraper-only sources
 */
export const scraperSourceEnum = z.enum([
  'arbeitnow',
  'hackernews',
  'remoteok',
  'weworkremotely',
  'braintrust',
  'devitjobs',
  'jobicy',
  'dice',
  'builtin',
  'remotive',
  'wellfound',
  'yc_jobs',
  'themuse',
  'jobicy_api'
])

export type ScraperSource = z.infer<typeof scraperSourceEnum>

// ============================================================================
// Source Metadata
// ============================================================================

export interface SourceInfo {
  name: JobSource
  displayName: string
  type: 'api' | 'scraper' | 'legacy'
  color: string // For UI display
  reliabilityScore: number // 0-100, used for health scoring
  isActive: boolean // Whether this source is currently being scraped
}

/**
 * Metadata for all job sources
 */
export const SOURCE_INFO: Record<JobSource, SourceInfo> = {
  arbeitnow: {
    name: 'arbeitnow',
    displayName: 'Arbeitnow',
    type: 'api',
    color: '#4CAF50',
    reliabilityScore: 95,
    isActive: true
  },
  hackernews: {
    name: 'hackernews',
    displayName: 'Hacker News',
    type: 'scraper',
    color: '#FF6600',
    reliabilityScore: 90,
    isActive: true
  },
  reddit: {
    name: 'reddit',
    displayName: 'Reddit',
    type: 'legacy',
    color: '#FF4500',
    reliabilityScore: 75,
    isActive: false
  },
  remotive: {
    name: 'remotive',
    displayName: 'Remotive',
    type: 'scraper',
    color: '#6366F1',
    reliabilityScore: 85,
    isActive: true
  },
  wellfound: {
    name: 'wellfound',
    displayName: 'Wellfound',
    type: 'scraper',
    color: '#000000',
    reliabilityScore: 88,
    isActive: true
  },
  googlejobs: {
    name: 'googlejobs',
    displayName: 'Google Jobs',
    type: 'legacy',
    color: '#4285F4',
    reliabilityScore: 95,
    isActive: false
  },
  jobicy: {
    name: 'jobicy',
    displayName: 'Jobicy',
    type: 'scraper',
    color: '#2563EB',
    reliabilityScore: 82,
    isActive: true
  },
  weworkremotely: {
    name: 'weworkremotely',
    displayName: 'We Work Remotely',
    type: 'scraper',
    color: '#16A34A',
    reliabilityScore: 90,
    isActive: true
  },
  remoteok: {
    name: 'remoteok',
    displayName: 'RemoteOK',
    type: 'scraper',
    color: '#EF4444',
    reliabilityScore: 85,
    isActive: true
  },
  braintrust: {
    name: 'braintrust',
    displayName: 'Braintrust',
    type: 'scraper',
    color: '#8B5CF6',
    reliabilityScore: 88,
    isActive: true
  },
  devitjobs: {
    name: 'devitjobs',
    displayName: 'DevITJobs',
    type: 'scraper',
    color: '#EC4899',
    reliabilityScore: 80,
    isActive: true
  },
  dice: {
    name: 'dice',
    displayName: 'Dice',
    type: 'scraper',
    color: '#CC0000',
    reliabilityScore: 90,
    isActive: true
  },
  builtin: {
    name: 'builtin',
    displayName: 'Built In',
    type: 'scraper',
    color: '#0066CC',
    reliabilityScore: 88,
    isActive: true
  },
  yc_jobs: {
    name: 'yc_jobs',
    displayName: 'Y Combinator Jobs',
    type: 'api',
    color: '#FF6600',
    reliabilityScore: 92,
    isActive: true
  },
  themuse: {
    name: 'themuse',
    displayName: 'The Muse',
    type: 'api',
    color: '#00B388',
    reliabilityScore: 85,
    isActive: true
  },
  jobicy_api: {
    name: 'jobicy_api',
    displayName: 'Jobicy API',
    type: 'api',
    color: '#3B82F6',
    reliabilityScore: 88,
    isActive: true
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get active sources (currently being scraped)
 */
export function getActiveSources(): JobSource[] {
  return Object.values(SOURCE_INFO)
    .filter(s => s.isActive)
    .map(s => s.name)
}

/**
 * Get source display name
 */
export function getSourceDisplayName(source: JobSource): string {
  return SOURCE_INFO[source]?.displayName || source
}

/**
 * Get source color for UI
 */
export function getSourceColor(source: JobSource): string {
  return SOURCE_INFO[source]?.color || '#6B7280'
}

/**
 * Get source reliability score (for health scoring)
 */
export function getSourceReliability(source: JobSource): number {
  return SOURCE_INFO[source]?.reliabilityScore || 70
}

/**
 * Check if source is valid
 */
export function isValidSource(source: string): source is JobSource {
  return jobSourceEnum.safeParse(source).success
}
