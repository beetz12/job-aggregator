import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import { jobSchema, type Job } from '../types/job'
import { profileSchema, type Profile } from '../types/profile'
import type { UserProfile } from '../types/job-matching'

/**
 * POST /jobs/:id/generate-application
 *
 * Runs the Generation Agent to create application materials:
 * - Tailored resume
 * - Personalized cover letter
 * - Optional question answers
 */

// Request schema
const generateApplicationRequestSchema = z.object({
  profileId: z.string(),
  applicationQuestions: z.array(z.string()).optional()
})

// Response schemas matching frontend ApplicationKitResult type
const generatedResumeSchema = z.object({
  markdown: z.string(),
  pdfPath: z.string().optional(),
  highlightedSkills: z.array(z.string()),
  atsScore: z.number()
})

const generatedCoverLetterSchema = z.object({
  markdown: z.string(),
  pdfPath: z.string().optional(),
  hookType: z.enum(['direct_relevance', 'vulnerability', 'contrarian', 'achievement']),
  keyPoints: z.array(z.string())
})

const questionAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  companyUsed: z.string().optional()
})

const applicationKitResultSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  resume: generatedResumeSchema,
  coverLetter: generatedCoverLetterSchema,
  questionAnswers: z.array(questionAnswerSchema).optional(),
  generatedAt: z.string()
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GenerateApplication',
  path: '/jobs/:id/generate-application',
  method: 'POST',
  description: 'Generate application materials using the Generation Agent - returns resume, cover letter, Q&A',
  emits: [],
  flows: ['job-aggregation', 'profile-matching'],
  bodySchema: generateApplicationRequestSchema,
  responseSchema: {
    200: applicationKitResultSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

/**
 * Convert Profile to UserProfile for the generator
 */
function profileToUserProfile(profile: Profile): UserProfile {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    skills: profile.skills,
    experience: [],  // Profile doesn't have experience details, add later if needed
    education: [],   // Profile doesn't have education details, add later if needed
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
 * Generate application materials - stub implementation
 * Will be replaced with actual Anthropic API calls when fully integrated
 */
async function generateApplicationMaterials(
  job: Job,
  userProfile: UserProfile,
  applicationQuestions: string[] | undefined,
  now: string
) {
  // Extract tech stack for skill matching
  const techStack = extractTechStack(job.description)
  const skillMatches = calculateSkillMatches(userProfile.skills, techStack)

  // Generate resume
  const resume = {
    markdown: generateResumeMarkdown(userProfile, skillMatches, job),
    highlightedSkills: skillMatches.strong,
    atsScore: calculateATSScore(skillMatches)
  }

  // Generate cover letter
  const coverLetter = {
    markdown: generateCoverLetterMarkdown(userProfile, job, skillMatches),
    hookType: 'direct_relevance' as const,
    keyPoints: generateTalkingPoints(skillMatches, job)
  }

  // Generate question answers if provided
  let questionAnswers: Array<{ question: string; answer: string; companyUsed?: string }> | undefined
  if (applicationQuestions && applicationQuestions.length > 0) {
    questionAnswers = applicationQuestions.map((question, index) => ({
      question,
      answer: generateQuestionAnswer(question, userProfile, skillMatches),
      companyUsed: index === 0 ? undefined : undefined // Would use real experience data
    }))
  }

  return {
    jobId: job.id,
    userId: userProfile.id,
    resume,
    coverLetter,
    questionAnswers,
    generatedAt: now
  }
}

// Helper functions
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

function calculateATSScore(skillMatches: SkillMatches): number {
  // Base ATS score from skill matches
  const baseScore = skillMatches.overallMatch * 0.7 + 30  // Range: 30-100
  return Math.min(100, Math.round(baseScore))
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

function generateResumeMarkdown(
  user: UserProfile,
  skillMatches: SkillMatches,
  job: Job
): string {
  const skills = skillMatches.strong.length > 0
    ? skillMatches.strong.join(', ')
    : user.skills.slice(0, 5).join(', ')

  return `# ${user.name}

## Contact
${user.email}

## Summary
Experienced professional with expertise in ${skills}, seeking ${job.title} position at ${job.company}.

## Skills
${(skillMatches.strong.length > 0 ? skillMatches.strong : user.skills.slice(0, 8)).map(s => `- ${s}`).join('\n')}

## Experience
${user.experience && user.experience.length > 0
  ? user.experience.map(exp => `
### ${exp.title} at ${exp.company}
${exp.startDate} - ${exp.endDate || 'Present'}
${exp.description || ''}
`).join('\n')
  : `### Professional Experience
Previous roles demonstrating expertise in ${skills}.
`}

## Education
${user.education && user.education.length > 0
  ? user.education.map(edu => `
### ${edu.degree} - ${edu.institution}
${edu.field || ''}
`).join('\n')
  : 'Education details available upon request.'}
`
}

function generateCoverLetterMarkdown(
  user: UserProfile,
  job: Job,
  skillMatches: SkillMatches
): string {
  const strongSkillsText = skillMatches.strong.length > 0
    ? skillMatches.strong.slice(0, 3).join(', ')
    : user.skills.slice(0, 3).join(', ')

  return `Dear ${job.company} Hiring Team,

I am reaching out about the ${job.title} role because my background in ${strongSkillsText} directly aligns with your requirements.

${skillMatches.strong.length > 0
  ? `My experience with ${skillMatches.strong.slice(0, 3).join(', ')} makes me well-suited for this position. I have a proven track record of delivering results using these technologies.`
  : 'I bring relevant experience that would contribute meaningfully to your team.'}

${skillMatches.gaps.length > 0
  ? `While I am continuing to develop my expertise in ${skillMatches.gaps[0]}, I am a quick learner committed to continuous improvement and staying current with industry trends.`
  : 'I am committed to continuous improvement and staying current with industry trends.'}

${job.remote
  ? 'I am experienced in remote collaboration and have a dedicated home office setup for productive remote work.'
  : `I am excited about the opportunity to work with the team at ${job.company}'s location.`}

I would welcome the opportunity to discuss how my skills and experience can contribute to ${job.company}'s success. Looking forward to connecting.

Best regards,
${user.name}
`
}

function generateQuestionAnswer(
  question: string,
  user: UserProfile,
  skillMatches: SkillMatches
): string {
  const questionLower = question.toLowerCase()
  const topSkills = skillMatches.strong.length > 0
    ? skillMatches.strong.slice(0, 2).join(' and ')
    : user.skills.slice(0, 2).join(' and ')

  if (questionLower.includes('why') && (questionLower.includes('company') || questionLower.includes('role'))) {
    return `I am drawn to this opportunity because of the chance to work with ${topSkills} and contribute to meaningful projects. The company's focus and culture align well with my career goals and values.`
  }

  if (questionLower.includes('experience') || questionLower.includes('background')) {
    return `I have experience working with ${topSkills}. In my previous roles, I have successfully delivered projects using these technologies while collaborating with cross-functional teams.`
  }

  if (questionLower.includes('strength')) {
    return `My key strengths include ${topSkills}, combined with strong problem-solving abilities and effective communication skills. I excel at breaking down complex problems and delivering practical solutions.`
  }

  if (questionLower.includes('weakness') || questionLower.includes('improve')) {
    return `I am always looking to improve my skills. Currently, I am focusing on ${skillMatches.gaps[0] || 'expanding my technical toolkit'} to become a more well-rounded professional.`
  }

  if (questionLower.includes('team') || questionLower.includes('collaborate')) {
    return `I thrive in collaborative environments. I believe in clear communication, mutual respect, and supporting team members to achieve shared goals. I value diverse perspectives and constructive feedback.`
  }

  // Default response
  return `Based on my experience with ${topSkills}, I would approach this thoughtfully. I believe in understanding the context, considering multiple solutions, and implementing the most effective approach while maintaining clear communication with stakeholders.`
}

export const handler: Handlers['GenerateApplication'] = async (req, { state, logger }) => {
  const { id: jobId } = req.pathParams

  logger.info('Starting application generation', { jobId })

  // Validate request body
  let validatedBody
  try {
    validatedBody = generateApplicationRequestSchema.parse(req.body)
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

  const { profileId, applicationQuestions } = validatedBody

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

  logger.info('Generating application materials', {
    jobId,
    jobTitle: job.title,
    profileId,
    profileName: profile.name,
    questionCount: applicationQuestions?.length || 0
  })

  try {
    const userProfile = profileToUserProfile(profile)
    const now = new Date().toISOString()

    const applicationKit = await generateApplicationMaterials(
      job,
      userProfile,
      applicationQuestions,
      now
    )

    logger.info('Application materials generated', {
      jobId,
      profileId,
      hasResume: true,
      hasCoverLetter: true,
      questionAnswersCount: applicationKit.questionAnswers?.length || 0,
      atsScore: applicationKit.resume.atsScore
    })

    return {
      status: 200,
      body: applicationKit
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate application', { jobId, profileId, error: errorMessage })

    return {
      status: 500,
      body: { error: `Failed to generate application: ${errorMessage}` }
    }
  }
}
