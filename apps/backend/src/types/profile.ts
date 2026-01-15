import { z } from 'zod'

/**
 * User profile schema for job matching
 */
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  skills: z.array(z.string()),
  experience_years: z.number(),
  seniority_level: z.enum(['junior', 'mid', 'senior', 'lead']),
  preferred_locations: z.array(z.string()),
  remote_preference: z.enum(['remote-only', 'hybrid', 'onsite', 'flexible']),
  salary_expectation: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string()
  }).optional(),
  created_at: z.string(),
  updated_at: z.string()
})

export type Profile = z.infer<typeof profileSchema>

/**
 * Schema for creating/updating a profile (without id, created_at, updated_at)
 */
export const createProfileSchema = profileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).extend({
  id: z.string().optional() // Optional for updates
})

export type CreateProfileInput = z.infer<typeof createProfileSchema>

/**
 * Match score schema for job-profile matching
 */
export const matchScoreSchema = z.object({
  profile_id: z.string(),
  job_id: z.string(),
  total_score: z.number().min(0).max(100),
  breakdown: z.object({
    skill_score: z.number().min(0).max(50),
    seniority_score: z.number().min(0).max(20),
    location_score: z.number().min(0).max(15),
    salary_score: z.number().min(0).max(15)
  }),
  calculated_at: z.string()
})

export type MatchScore = z.infer<typeof matchScoreSchema>
