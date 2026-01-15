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
  country_code: z.string().optional(),
  region: z.string().optional(),
  raw: z.string().optional(),
  is_remote: z.boolean().optional(),
  remote_type: z.enum(['full', 'hybrid', 'flexible']).optional()
})

export type ParsedLocation = z.infer<typeof parsedLocationSchema>

// ============================================================================
// Salary Schema
// ============================================================================

/**
 * Salary information with normalization
 */
export const salarySchema = z.object({
  min: z.number().optional().nullable(),
  max: z.number().optional().nullable(),
  currency: z.string(),
  period: z.string(), // 'yearly', 'monthly', 'hourly', 'daily'
  normalized_yearly: z.object({
    min: z.number().optional().nullable(),
    max: z.number().optional().nullable()
  }).optional().nullable()
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
  posted_at: z.string(),
  fetched_at: z.string(),
  tags: z.array(z.string()),
  health_score: z.number().min(0).max(100),

  // AI-enhanced fields (optional, populated by AI steps)
  ai_summary: z.string().optional(),
  skills: z.array(z.string()).optional(),

  // Extended fields from Python scraper integration
  // Using .nullable() to allow null/undefined values from legacy sources
  source_id: z.string().optional().nullable(),
  company_url: z.string().optional().nullable(),
  location_parsed: parsedLocationSchema.optional().nullable(),
  salary: salarySchema.optional().nullable(),
  employment_type: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional().nullable(),
  experience_level: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional().nullable(),
  content_hash: z.string().optional().nullable()
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
