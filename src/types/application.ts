import { z } from 'zod'

/**
 * Application status enum - tracks the lifecycle of a job application
 */
export const applicationStatusSchema = z.enum([
  'saved',
  'applied',
  'interviewing',
  'offered',
  'rejected',
  'withdrawn'
])

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>

/**
 * Application schema - tracks job applications with follow-up reminders
 */
export const applicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  status: applicationStatusSchema,
  appliedAt: z.string().optional(),
  notes: z.string(),
  followUpDate: z.string().optional(),
  resumeVersion: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type Application = z.infer<typeof applicationSchema>

/**
 * Create application input schema - for POST /applications
 */
export const createApplicationSchema = z.object({
  jobId: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  status: applicationStatusSchema.default('saved'),
  appliedAt: z.string().optional(),
  notes: z.string().default(''),
  followUpDate: z.string().optional(),
  resumeVersion: z.string().optional()
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>

/**
 * Update application input schema - for PUT /applications/:id
 */
export const updateApplicationSchema = z.object({
  status: applicationStatusSchema.optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  resumeVersion: z.string().optional(),
  appliedAt: z.string().optional()
})

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
