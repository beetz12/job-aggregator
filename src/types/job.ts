import { z } from 'zod'

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
  source: z.enum(['arbeitnow', 'hackernews', 'reddit']),
  postedAt: z.string(),
  fetchedAt: z.string(),
  tags: z.array(z.string()),
  healthScore: z.number().min(0).max(100)
})

export type Job = z.infer<typeof jobSchema>

/**
 * Source metadata schema - tracks fetch status per source
 */
export const sourceMetadataSchema = z.object({
  lastFetch: z.string(),
  jobCount: z.number(),
  status: z.enum(['success', 'error', 'pending']),
  error: z.string().optional()
})

export type SourceMetadata = z.infer<typeof sourceMetadataSchema>
