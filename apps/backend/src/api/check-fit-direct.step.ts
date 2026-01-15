import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import type { Job } from '../types/job'
import { profileSchema, type Profile } from '../types/profile'
import type { UserProfile, JobCriteria, CriteriaMatch, ShouldApply } from '../types/job-matching'
import { jobCriteriaSchema } from '../types/job-matching'
import {
  calculateCriteriaMatch,
  determineShouldApply,
  generateDetailedReasoning
} from '../services/job-matching/orchestrator'

/**
 * POST /jobs/check-fit
 *
 * Runs the Analysis Agent to get a deep fit analysis for a pasted job description.
 * This endpoint does NOT require a job ID - it works with raw job description text.
 *
 * Use this endpoint when:
 * - User pastes a job description directly (not from a stored job)
 * - Checking fit before adding a job to the system
 *
 * For stored jobs, use POST /jobs/:id/check-fit instead.
 */

// Request schema - requires job_description since there's no job ID
const checkFitDirectRequestSchema = z.object({
  job_description: z.string().min(10, 'Job description must be at least 10 characters'),
  job_title: z.string().optional(),
  company: z.string().optional(),
  profile_id: z.string(),
  job_criteria: jobCriteriaSchema.optional()
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

// Criteria match schema for enhanced response
const criteriaMatchSchema = z.object({
  salaryAlignment: z.enum(['above', 'within', 'below', 'unknown']),
  locationMatch: z.boolean(),
  cultureFlags: z.object({
    green: z.array(z.string()),
    red: z.array(z.string())
  }),
  techStackCoverage: z.number(),
  companyStageMatch: z.boolean()
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
  analyzedAt: z.string(),

  // Enhanced Career Advisor fields (optional for backward compatibility)
  criteriaMatch: criteriaMatchSchema.optional(),
  shouldApply: z.enum(['DEFINITELY', 'LIKELY', 'MAYBE', 'PROBABLY_NOT', 'NO']),
  detailedReasoning: z.array(z.string())
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CheckFitDirect',
  path: '/jobs/check-fit',
  method: 'POST',
  description: 'Analyze job fit for a pasted job description (no job ID required). Returns deep fit analysis including company insights, match analysis, and Career Advisor criteria matching.',
  emits: [],
  flows: ['job-aggregation', 'profile-matching'],
  bodySchema: checkFitDirectRequestSchema,
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
      remote_preference: profile.remote_preference,
      locations: profile.preferred_locations,
      minSalary: profile.salary_expectation?.min,
      maxSalary: profile.salary_expectation?.max,
      currency: profile.salary_expectation?.currency
    },
    voiceStyle: 'professional',
    created_at: profile.created_at,
    updated_at: profile.updated_at
  }
}

interface AnalyzeJobFitOptions {
  job: Job
  userProfile: UserProfile
  now: string
  jobCriteria?: JobCriteria
}

/**
 * Analyze job fit - enhanced implementation with Career Advisor integration
 */
async function analyzeJobFit(options: AnalyzeJobFitOptions) {
  const { job, userProfile, now, jobCriteria } = options

  // Extract tech stack from description
  const techStack = extractTechStack(job.description)

  // Calculate skill matches
  const skillMatches = calculateSkillMatches(userProfile.skills, techStack)

  // Detect red flags
  const redFlags = detectRedFlags(job.description)

  // Calculate fit score
  const fitScore = calculateFitScore(skillMatches, userProfile, job)

  // Calculate criteria match if job_criteria provided
  let criteriaMatch: CriteriaMatch | undefined
  if (jobCriteria) {
    criteriaMatch = calculateCriteriaMatch(job, jobCriteria)
  }

  // Determine shouldApply recommendation
  const shouldApply = determineShouldApply(fitScore, criteriaMatch)

  // Build match analysis
  const matchAnalysis = {
    overallMatch: skillMatches.overallMatch,
    strongMatches: skillMatches.strong,
    partialMatches: skillMatches.partial,
    gaps: skillMatches.gaps,
    transferableSkills: [] as string[]
  }

  // Generate detailed reasoning
  const detailedReasoning = generateDetailedReasoning(
    fitScore,
    matchAnalysis,
    criteriaMatch,
    shouldApply
  )

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
    matchAnalysis,
    fitScore,
    talkingPoints: generateTalkingPoints(skillMatches, job),
    gapsToAddress: skillMatches.gaps.slice(0, 3),
    interviewQuestions: [
      `Tell me about your experience with ${techStack[0] || 'this technology stack'}`,
      `Why are you interested in ${job.company}?`,
      'What are your career goals?'
    ],
    analyzedAt: now,
    // Enhanced fields
    criteriaMatch,
    shouldApply,
    detailedReasoning
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
  if (job.remote && user.preferences?.remote_preference === 'remote-only') {
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

/**
 * Create a synthetic job from a pasted job description
 */
function createSyntheticJob(
  jobDescription: string,
  jobTitle?: string,
  company?: string
): Job {
  // Generate a unique ID for this synthetic job
  const syntheticId = `synthetic-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  // If title/company not provided, try to extract from the description
  let extractedTitle = jobTitle
  let extractedCompany = company

  if (!extractedTitle || !extractedCompany) {
    const lines = jobDescription.split('\n').filter(line => line.trim())
    const firstLine = lines[0] || 'Unknown Position'
    const secondLine = lines[1] || 'Unknown Company'

    // Basic heuristics for extracting info
    if (!extractedTitle) {
      extractedTitle = firstLine
    }
    if (!extractedCompany) {
      extractedCompany = secondLine
    }

    // Check if first line looks like a company name
    if (firstLine.toLowerCase().includes('inc') ||
        firstLine.toLowerCase().includes('llc') ||
        firstLine.toLowerCase().includes('corp') ||
        firstLine.toLowerCase().includes('company')) {
      if (!company) extractedCompany = firstLine
      if (!jobTitle) extractedTitle = secondLine
    }
  }

  return {
    id: syntheticId,
    title: (extractedTitle || 'Unknown Position').slice(0, 100),
    company: (extractedCompany || 'Unknown Company').slice(0, 100),
    location: undefined,
    remote: jobDescription.toLowerCase().includes('remote'),
    url: '',
    description: jobDescription,
    source: 'arbeitnow', // Default source for pasted descriptions
    posted_at: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
    tags: [],
    health_score: 100
  }
}

export const handler: Handlers['CheckFitDirect'] = async (req, { state, logger }) => {
  logger.info('Starting direct fit analysis (pasted job description)')

  // Validate request body
  let validatedBody
  try {
    validatedBody = checkFitDirectRequestSchema.parse(req.body)
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

  const { job_description, job_title, company, profile_id, job_criteria } = validatedBody

  // Create synthetic job from pasted description
  const job = createSyntheticJob(job_description, job_title, company)

  logger.info('Created synthetic job from description', {
    syntheticJobId: job.id,
    title: job.title,
    company: job.company
  })

  // Fetch profile from state
  const profile = await state.get<Profile>('profiles', profile_id)
  if (!profile) {
    logger.warn('Profile not found', { profile_id })
    return {
      status: 404,
      body: { error: 'Profile not found' }
    }
  }

  logger.info('Analyzing fit for pasted job description', {
    syntheticJobId: job.id,
    jobTitle: job.title,
    profile_id,
    profileName: profile.name,
    hasJobCriteria: !!job_criteria
  })

  try {
    const userProfile = profileToUserProfile(profile)
    const now = new Date().toISOString()

    const fitAnalysis = await analyzeJobFit({
      job,
      userProfile,
      now,
      jobCriteria: job_criteria
    })

    logger.info('Fit analysis completed for pasted description', {
      syntheticJobId: job.id,
      profile_id,
      fitScore: fitAnalysis.fitScore.composite,
      recommendation: fitAnalysis.fitScore.recommendation,
      shouldApply: fitAnalysis.shouldApply,
      hasCriteriaMatch: !!fitAnalysis.criteriaMatch
    })

    return {
      status: 200,
      body: fitAnalysis
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to analyze fit', { profile_id, error: errorMessage })

    return {
      status: 500,
      body: { error: `Failed to analyze fit: ${errorMessage}` }
    }
  }
}
