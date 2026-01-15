import { z } from 'zod'

/**
 * Application status enum - tracks the lifecycle of a job application
 * Aligned with frontend types for consistency
 */
export const applicationStatusSchema = z.enum([
  'saved',
  'analyzing',
  'analyzed',
  'generating',
  'resume_ready',
  'applying',
  'needs_input',
  'applied',
  'failed',
  'interview',
  'rejected',
  'offer',
  'withdrawn'
])

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>

/**
 * QA Response schema - for application form questions and answers
 */
export const qaResponseSchema = z.object({
  question: z.string(),
  answer: z.string(),
  company_used: z.boolean().optional()
})

export type QaResponse = z.infer<typeof qaResponseSchema>

/**
 * Application schema - tracks job applications with follow-up reminders
 * Uses snake_case to match frontend types and database conventions
 */
export const applicationSchema = z.object({
  id: z.string(),
  job_id: z.string(),
  job_title: z.string(),
  company: z.string(),
  status: applicationStatusSchema,
  applied_at: z.string().optional(),
  notes: z.string(),
  follow_up_date: z.string().optional(),
  resume_version: z.string().optional(),
  custom_resume_markdown: z.string().optional(),
  custom_resume_generated_at: z.string().optional(),
  custom_cover_letter_markdown: z.string().optional(),
  submission_url: z.string().optional(),
  qa_responses: z.array(qaResponseSchema).optional(),
  submitted_at: z.string().optional(),
  checkpoint_status: z.string().optional(),
  checkpoint_data: z.record(z.string(), z.any()).optional(),
  created_at: z.string(),
  updated_at: z.string()
})

export type Application = z.infer<typeof applicationSchema>

/**
 * Create application input schema - for POST /applications
 * Uses snake_case to match frontend types
 */
export const createApplicationSchema = z.object({
  job_id: z.string(),
  job_title: z.string(),
  company: z.string(),
  status: applicationStatusSchema.default('saved'),
  applied_at: z.string().optional(),
  notes: z.string().default(''),
  follow_up_date: z.string().optional(),
  resume_version: z.string().optional()
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>

/**
 * Update application input schema - for PUT /applications/:id
 * Uses snake_case to match frontend types
 */
export const updateApplicationSchema = z.object({
  status: applicationStatusSchema.optional(),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
  resume_version: z.string().optional(),
  applied_at: z.string().optional(),
  custom_resume_markdown: z.string().optional(),
  custom_resume_generated_at: z.string().optional(),
  custom_cover_letter_markdown: z.string().optional(),
  submission_url: z.string().optional(),
  qa_responses: z.array(qaResponseSchema).optional(),
  submitted_at: z.string().optional(),
  checkpoint_status: z.string().optional(),
  checkpoint_data: z.record(z.string(), z.any()).optional()
})

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
