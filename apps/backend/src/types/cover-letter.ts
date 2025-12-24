import { z } from 'zod'

/**
 * Cover letter request schema
 */
export const coverLetterRequestSchema = z.object({
  profileId: z.string(),
  tone: z.enum(['professional', 'friendly', 'enthusiastic']).optional().default('professional'),
  emphasis: z.array(z.string()).optional()  // Specific skills to highlight
})

export type CoverLetterRequest = z.infer<typeof coverLetterRequestSchema>

/**
 * Cover letter response schema
 */
export const coverLetterResponseSchema = z.object({
  coverLetter: z.string(),
  highlightedSkills: z.array(z.string()),
  matchedRequirements: z.array(z.string()),
  generatedAt: z.string()
})

export type CoverLetterResponse = z.infer<typeof coverLetterResponseSchema>
