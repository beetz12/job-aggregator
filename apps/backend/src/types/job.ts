import { z } from 'zod'

// Import canonical source definitions
export {
  jobSourceEnum,
  type JobSource as JobSourceType,
  ALL_JOB_SOURCES,
  SCRAPER_SOURCES,
  SOURCE_INFO,
  getSourceDisplayName,
  getSourceColor,
  getSourceReliability,
  isValidSource
} from '../services/sources'

import { jobSourceEnum } from '../services/sources'

// ============================================================================
// Parsed Location Schema
// ============================================================================

/**
 * Parsed location structure for normalized location data
 */
export const parsedLocationSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
  raw: z.string().optional()
})

export type ParsedLocation = z.infer<typeof parsedLocationSchema>

// ============================================================================
// Salary Schema
// ============================================================================

/**
 * Salary information with normalization
 */
export const salarySchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string(),
  period: z.string(), // 'yearly', 'monthly', 'hourly', 'daily'
  normalizedYearly: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional()
})

export type Salary = z.infer<typeof salarySchema>

// ============================================================================
// Canonical Job Schema
// ============================================================================

/**
 * Canonical Job schema - used across all steps
 * Import this instead of redefining the schema
 */
export const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remote: z.boolean(),
  url: z.string(),
  description: z.string(),
  source: jobSourceEnum,
  postedAt: z.string(),
  fetchedAt: z.string(),
  tags: z.array(z.string()),
  healthScore: z.number().min(0).max(100),

  // AI-enhanced fields (optional, populated by AI steps)
  aiSummary: z.string().optional(),
  skills: z.array(z.string()).optional(),

  // Extended fields from Python scraper integration
  sourceId: z.string().optional(),
  companyUrl: z.string().optional(),
  locationParsed: parsedLocationSchema.optional(),
  salary: salarySchema.optional(),
  employmentType: z.string().optional(),
  experienceLevel: z.string().optional(),
  contentHash: z.string().optional()
})

export type Job = z.infer<typeof jobSchema>

// ============================================================================
// Source Metadata Schema
// ============================================================================

/**
 * Source metadata schema - tracks fetch status per source
 */
export const sourceMetadataSchema = z.object({
  lastFetch: z.string(),
  jobCount: z.number(),
  status: z.enum(['success', 'error', 'pending']),
  error: z.string().optional(),
  scrapeDurationMs: z.number().optional()
})

export type SourceMetadata = z.infer<typeof sourceMetadataSchema>
