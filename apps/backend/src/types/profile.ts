import { z } from 'zod'

/**
 * User profile schema for job matching
 */
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  skills: z.array(z.string()),
  experienceYears: z.number(),
  seniorityLevel: z.enum(['junior', 'mid', 'senior', 'lead']),
  preferredLocations: z.array(z.string()),
  remotePreference: z.enum(['remote-only', 'hybrid', 'onsite', 'flexible']),
  salaryExpectation: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string()
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type Profile = z.infer<typeof profileSchema>

/**
 * Schema for creating/updating a profile (without id, createdAt, updatedAt)
 */
export const createProfileSchema = profileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  id: z.string().optional() // Optional for updates
})

export type CreateProfileInput = z.infer<typeof createProfileSchema>

/**
 * Match score schema for job-profile matching
 */
export const matchScoreSchema = z.object({
  profileId: z.string(),
  jobId: z.string(),
  totalScore: z.number().min(0).max(100),
  breakdown: z.object({
    skillScore: z.number().min(0).max(50),
    seniorityScore: z.number().min(0).max(20),
    locationScore: z.number().min(0).max(15),
    salaryScore: z.number().min(0).max(15)
  }),
  calculatedAt: z.string()
})

export type MatchScore = z.infer<typeof matchScoreSchema>
