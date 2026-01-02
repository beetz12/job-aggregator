import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import { jobSchema, type Job } from '../types/job'
import { profileSchema, type Profile } from '../types/profile'
import type { UserProfile } from '../types/job-matching'

/**
 * POST /jobs/:id/check-fit
 *
 * Runs the Analysis Agent to get a deep fit analysis for a job.
 * Returns company insights, match analysis, fit score, talking points, etc.
 */

// Request schema
const checkFitRequestSchema = z.object({
  profileId: z.string()
})

// Response schemas matching frontend FitAnalysisResult type
const companyScoresSchema = z.object({
  compensation: z.number(),
  culture: z.number(),
  familyFriendliness: z.number(),
  technicalFit: z.number(),
  industry: z.number(),
  longTermPotential: z.number()
})

const companyInsightsSchema = z.object({
  overallScore: z.number(),
  scores: companyScoresSchema,
  greenFlags: z.array(z.string()),
  redFlags: z.array(z.string()),
  recentNews: z.array(z.string()),
  recommendation: z.enum(['STRONG_YES', 'YES', 'MAYBE', 'PASS'])
})

const matchAnalysisSchema = z.object({
  overallMatch: z.number(),
  strongMatches: z.array(z.string()),
  partialMatches: z.array(z.string()),
  gaps: z.array(z.string()),
  transferableSkills: z.array(z.string())
})

const fitScoreSchema = z.object({
  composite: z.number(),
  confidence: z.number(),
  recommendation: z.enum(['STRONG_APPLY', 'APPLY', 'CONDITIONAL', 'SKIP']),
  reasoning: z.string()
})

const fitAnalysisResultSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  companyInsights: companyInsightsSchema,
  matchAnalysis: matchAnalysisSchema,
  fitScore: fitScoreSchema,
  talkingPoints: z.array(z.string()),
  gapsToAddress: z.array(z.string()),
  interviewQuestions: z.array(z.string()),
  analyzedAt: z.string()
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CheckFit',
  path: '/jobs/:id/check-fit',
  method: 'POST',
  description: 'Analyze job fit using the Analysis Agent - returns deep fit analysis',
  emits: [],
  flows: ['job-aggregation', 'profile-matching'],
  bodySchema: checkFitRequestSchema,
  responseSchema: {
    200: fitAnalysisResultSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

/**
 * Convert Profile to UserProfile for the orchestrator
 */
function profileToUserProfile(profile: Profile): UserProfile {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    skills: profile.skills,
    preferences: {
      remotePreference: profile.remotePreference,
      locations: profile.preferredLocations,
      minSalary: profile.salaryExpectation?.min,
      maxSalary: profile.salaryExpectation?.max,
      currency: profile.salaryExpectation?.currency
    },
    voiceStyle: 'professional',
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  }
}

/**
 * Analyze job fit - stub implementation matching orchestrator pattern
 * Will be replaced with actual Anthropic API calls when fully integrated
 */
async function analyzeJobFit(job: Job, userProfile: UserProfile, now: string) {
  // Extract tech stack from description
  const techStack = extractTechStack(job.description)

  // Calculate skill matches
  const skillMatches = calculateSkillMatches(userProfile.skills, techStack)

  // Detect red flags
  const redFlags = detectRedFlags(job.description)

  // Calculate fit score
  const fitScore = calculateFitScore(skillMatches, userProfile, job)

  return {
    jobId: job.id,
    userId: userProfile.id,
    companyInsights: {
      overallScore: 75,
      scores: {
        compensation: 15,
        culture: 18,
        familyFriendliness: 14,
        technicalFit: 12,
        industry: 8,
        longTermPotential: 8
      },
      greenFlags: job.remote ? ['Remote-friendly'] : [],
      redFlags,
      recentNews: [],
      recommendation: fitScore.composite >= 70 ? 'YES' as const : 'MAYBE' as const
    },
    matchAnalysis: {
      overallMatch: skillMatches.overallMatch,
      strongMatches: skillMatches.strong,
      partialMatches: skillMatches.partial,
      gaps: skillMatches.gaps,
      transferableSkills: []
    },
    fitScore,
    talkingPoints: generateTalkingPoints(skillMatches, job),
    gapsToAddress: skillMatches.gaps.slice(0, 3),
    interviewQuestions: [
      `Tell me about your experience with ${techStack[0] || 'this technology stack'}`,
      `Why are you interested in ${job.company}?`,
      'What are your career goals?'
    ],
    analyzedAt: now
  }
}

// Helper functions (matching orchestrator patterns)
function extractTechStack(description: string): string[] {
  const techKeywords = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'AWS', 'Docker',
    'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST',
    'Vue', 'Angular', 'Next.js', 'Express', 'FastAPI', 'Django', 'Go', 'Rust',
    'Java', 'Spring', 'Scala', 'Ruby', 'Rails', 'PHP', 'Laravel', 'C#', '.NET'
  ]

  const found: string[] = []
  const descLower = description.toLowerCase()

  for (const tech of techKeywords) {
    if (descLower.includes(tech.toLowerCase())) {
      found.push(tech)
    }
  }

  return found
}

function detectRedFlags(description: string): string[] {
  const flags: string[] = []
  const descLower = description.toLowerCase()

  if (descLower.includes('fast-paced')) flags.push('Potential work-life balance concerns')
  if (descLower.includes('competitive salary')) flags.push('Salary may not be disclosed')
  if (descLower.includes('wear many hats')) flags.push('Role scope may be unclear')
  if (descLower.includes('rockstar') || descLower.includes('ninja')) flags.push('Potentially unrealistic expectations')

  return flags
}

interface SkillMatches {
  overallMatch: number
  strong: string[]
  partial: string[]
  gaps: string[]
}

function calculateSkillMatches(userSkills: string[], jobSkills: string[]): SkillMatches {
  const userSkillsLower = userSkills.map(s => s.toLowerCase())
  const strong: string[] = []
  const partial: string[] = []
  const gaps: string[] = []

  for (const jobSkill of jobSkills) {
    const jobSkillLower = jobSkill.toLowerCase()
    if (userSkillsLower.includes(jobSkillLower)) {
      strong.push(jobSkill)
    } else if (userSkillsLower.some(s => s.includes(jobSkillLower) || jobSkillLower.includes(s))) {
      partial.push(jobSkill)
    } else {
      gaps.push(jobSkill)
    }
  }

  const matchCount = strong.length + partial.length * 0.5
  const totalRequired = jobSkills.length || 1
  const overallMatch = Math.min(100, Math.round((matchCount / totalRequired) * 100))

  return { overallMatch, strong, partial, gaps }
}

function calculateFitScore(skillMatches: SkillMatches, user: UserProfile, job: Job) {
  let composite = skillMatches.overallMatch

  // Bonus for remote preference match
  if (job.remote && user.preferences?.remotePreference === 'remote-only') {
    composite = Math.min(100, composite + 10)
  }

  let recommendation: 'STRONG_APPLY' | 'APPLY' | 'CONDITIONAL' | 'SKIP'
  if (composite >= 80) {
    recommendation = 'STRONG_APPLY'
  } else if (composite >= 60) {
    recommendation = 'APPLY'
  } else if (composite >= 40) {
    recommendation = 'CONDITIONAL'
  } else {
    recommendation = 'SKIP'
  }

  return {
    composite,
    confidence: Math.min(95, 70 + skillMatches.strong.length * 5),
    recommendation,
    reasoning: generateFitReasoning(skillMatches, recommendation)
  }
}

function generateFitReasoning(skillMatches: SkillMatches, recommendation: string): string {
  if (recommendation === 'STRONG_APPLY') {
    return `Strong match with ${skillMatches.strong.length} core skills aligned. Minimal gaps to address.`
  } else if (recommendation === 'APPLY') {
    return `Good match with relevant experience. ${skillMatches.gaps.length} skills to highlight as growth areas.`
  } else if (recommendation === 'CONDITIONAL') {
    return `Moderate fit. Consider upskilling in ${skillMatches.gaps.slice(0, 2).join(', ')} before applying.`
  } else {
    return `Limited skill overlap. May not be the best use of application effort.`
  }
}

function generateTalkingPoints(skillMatches: SkillMatches, job: Job): string[] {
  const points: string[] = []

  if (skillMatches.strong.length > 0) {
    points.push(`Emphasize experience with ${skillMatches.strong.slice(0, 3).join(', ')}`)
  }

  if (job.remote) {
    points.push('Highlight remote work experience and self-management skills')
  }

  points.push(`Research ${job.company} recent developments before interview`)

  return points
}

export const handler: Handlers['CheckFit'] = async (req, { state, logger }) => {
  const { id: jobId } = req.pathParams

  logger.info('Starting fit analysis', { jobId })

  // Validate request body
  let validatedBody
  try {
    validatedBody = checkFitRequestSchema.parse(req.body)
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Validation failed', { error: error.message })
      return {
        status: 400,
        body: { error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}` }
      }
    }
    throw error
  }

  const { profileId } = validatedBody

  // Fetch job from state
  const job = await state.get<Job>('jobs', jobId)
  if (!job) {
    logger.warn('Job not found', { jobId })
    return {
      status: 404,
      body: { error: 'Job not found' }
    }
  }

  // Fetch profile from state
  const profile = await state.get<Profile>('profiles', profileId)
  if (!profile) {
    logger.warn('Profile not found', { profileId })
    return {
      status: 404,
      body: { error: 'Profile not found' }
    }
  }

  logger.info('Analyzing fit', {
    jobId,
    jobTitle: job.title,
    profileId,
    profileName: profile.name
  })

  try {
    const userProfile = profileToUserProfile(profile)
    const now = new Date().toISOString()

    const fitAnalysis = await analyzeJobFit(job, userProfile, now)

    logger.info('Fit analysis completed', {
      jobId,
      profileId,
      fitScore: fitAnalysis.fitScore.composite,
      recommendation: fitAnalysis.fitScore.recommendation
    })

    return {
      status: 200,
      body: fitAnalysis
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to analyze fit', { jobId, profileId, error: errorMessage })

    return {
      status: 500,
      body: { error: `Failed to analyze fit: ${errorMessage}` }
    }
  }
}
