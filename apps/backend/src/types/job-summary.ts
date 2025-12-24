import { z } from 'zod'

/**
 * Remote work policy classification
 */
export const remotePolicySchema = z.enum(['remote', 'hybrid', 'onsite', 'unknown'])
export type RemotePolicy = z.infer<typeof remotePolicySchema>

/**
 * Seniority level classification
 */
export const seniorityLevelSchema = z.enum(['junior', 'mid', 'senior', 'lead', 'unknown'])
export type SeniorityLevel = z.infer<typeof seniorityLevelSchema>

/**
 * AI-generated job summary schema
 * Contains extracted insights from job descriptions
 */
export const jobSummarySchema = z.object({
  /** Job ID this summary belongs to */
  id: z.string(),

  /** Concise one-liner summary, e.g., "Senior React dev at fintech startup, $150-180k" */
  oneLiner: z.string(),

  /** Key requirements extracted from job posting */
  keyRequirements: z.array(z.string()),

  /** Nice-to-have skills and qualifications */
  niceToHaves: z.array(z.string()),

  /** Potential red flags in the job posting */
  redFlags: z.array(z.string()),

  /** Salary range if mentioned */
  salaryRange: z.string().optional(),

  /** Remote work policy classification */
  remotePolicy: remotePolicySchema,

  /** Inferred seniority level */
  seniorityLevel: seniorityLevelSchema,

  /** Timestamp when summary was generated */
  generatedAt: z.string()
})

export type JobSummary = z.infer<typeof jobSummarySchema>

/**
 * Input for the summarize-job event
 */
export const summarizeJobInputSchema = z.object({
  jobId: z.string(),
  title: z.string(),
  company: z.string(),
  description: z.string(),
  location: z.string().optional(),
  remote: z.boolean(),
  tags: z.array(z.string())
})

export type SummarizeJobInput = z.infer<typeof summarizeJobInputSchema>
