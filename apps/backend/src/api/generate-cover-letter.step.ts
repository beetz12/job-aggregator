import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { jobSchema, type Job } from '../types/job'
import { profileSchema, type Profile } from '../types/profile'
import { coverLetterRequestSchema, coverLetterResponseSchema, type CoverLetterResponse } from '../types/cover-letter'

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GenerateCoverLetter',
  path: '/jobs/:id/cover-letter',
  method: 'POST',
  description: 'Generate an AI-powered cover letter for a job application',
  emits: [],
  flows: ['job-aggregation', 'profile-matching'],
  bodySchema: coverLetterRequestSchema,
  responseSchema: {
    200: coverLetterResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

/**
 * Build the prompt for Claude to generate the cover letter
 */
function buildCoverLetterPrompt(
  job: Job,
  profile: Profile,
  tone: string,
  emphasis: string[] | undefined
): string {
  const emphasisText = emphasis && emphasis.length > 0
    ? `\n\nPLEASE EMPHASIZE THESE SKILLS IN PARTICULAR: ${emphasis.join(', ')}`
    : ''

  return `Generate a professional cover letter for a job application.

JOB DETAILS:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || 'Not specified'}
- Remote: ${job.remote ? 'Yes' : 'No'}
- Tags/Skills: ${job.tags.length > 0 ? job.tags.join(', ') : 'Not specified'}

Job Description:
${job.description}

APPLICANT PROFILE:
- Name: ${profile.name}
- Skills: ${profile.skills.join(', ')}
- Experience: ${profile.experience_years} years
- Seniority Level: ${profile.seniority_level}
- Preferred Locations: ${profile.preferred_locations.join(', ')}
- Remote Preference: ${profile.remote_preference}
${profile.salary_expectation ? `- Salary Expectation: ${profile.salary_expectation.min}-${profile.salary_expectation.max} ${profile.salary_expectation.currency}` : ''}

TONE: ${tone}
${emphasisText}

Please generate:
1. A cover letter that is ${tone} in tone
2. Highlight the applicant's relevant skills and experience
3. Show genuine interest in the company and role
4. Keep it concise (3-4 paragraphs)

Respond with a JSON object containing:
1. "coverLetter": The full cover letter text (with proper paragraphs)
2. "highlightedSkills": Array of skills from the applicant's profile that are relevant to this job
3. "matchedRequirements": Array of job requirements that the applicant meets

Return ONLY valid JSON, no markdown or explanation.`
}

/**
 * Parse the AI response into a CoverLetterResponse object
 */
function parseAIResponse(responseText: string): CoverLetterResponse {
  // Clean up response - remove potential markdown code blocks
  let cleanedResponse = responseText.trim()
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.slice(7)
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.slice(3)
  }
  if (cleanedResponse.endsWith('```')) {
    cleanedResponse = cleanedResponse.slice(0, -3)
  }
  cleanedResponse = cleanedResponse.trim()

  const parsed = JSON.parse(cleanedResponse)

  return {
    coverLetter: parsed.coverLetter || 'Unable to generate cover letter',
    highlightedSkills: Array.isArray(parsed.highlightedSkills) ? parsed.highlightedSkills : [],
    matchedRequirements: Array.isArray(parsed.matchedRequirements) ? parsed.matchedRequirements : [],
    generatedAt: new Date().toISOString()
  }
}

/**
 * Generate a fallback cover letter when AI is unavailable
 */
function generateFallbackCoverLetter(
  job: Job,
  profile: Profile
): CoverLetterResponse {
  const relevantSkills = profile.skills.filter(skill =>
    job.tags.some(tag => tag.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(tag.toLowerCase()))
  )

  const coverLetter = `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. With ${profile.experience_years} years of experience and expertise in ${profile.skills.slice(0, 3).join(', ')}, I believe I would be a strong addition to your team.

${relevantSkills.length > 0 ? `My experience with ${relevantSkills.join(', ')} aligns well with the requirements of this role.` : 'I am eager to bring my skills and experience to this position.'} I am particularly drawn to this opportunity because of ${job.company}'s reputation and the exciting challenges this role presents.

I would welcome the opportunity to discuss how my background and skills can contribute to ${job.company}'s continued success.

Best regards,
${profile.name}`

  return {
    coverLetter,
    highlightedSkills: relevantSkills.length > 0 ? relevantSkills : profile.skills.slice(0, 5),
    matchedRequirements: [],
    generatedAt: new Date().toISOString()
  }
}

export const handler: Handlers['GenerateCoverLetter'] = async (req, { state, logger }) => {
  const { id: jobId } = req.pathParams

  logger.info('Starting cover letter generation', { jobId })

  // Validate request body
  let validatedBody
  try {
    validatedBody = coverLetterRequestSchema.parse(req.body)
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

  const { profile_id, tone, emphasis } = validatedBody

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
  const profile = await state.get<Profile>('profiles', profile_id)
  if (!profile) {
    logger.warn('Profile not found', { profile_id })
    return {
      status: 404,
      body: { error: 'Profile not found' }
    }
  }

  logger.info('Generating cover letter', {
    jobId,
    jobTitle: job.title,
    profile_id,
    profileName: profile.name,
    tone,
    emphasisCount: emphasis?.length || 0
  })

  // Check if API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY not configured, using fallback cover letter', { jobId, profile_id })
    const fallbackResponse = generateFallbackCoverLetter(job, profile)
    return {
      status: 200,
      body: fallbackResponse
    }
  }

  try {
    const anthropic = new Anthropic({ apiKey })

    const prompt = buildCoverLetterPrompt(job, profile, tone, emphasis)

    logger.debug('Calling Claude API', { jobId, profile_id, promptLength: prompt.length })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract text from response
    const responseContent = message.content[0]
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude API')
    }

    const coverLetterResponse = parseAIResponse(responseContent.text)

    logger.info('Cover letter generated successfully', {
      jobId,
      profile_id,
      highlightedSkillsCount: coverLetterResponse.highlightedSkills.length,
      matchedRequirementsCount: coverLetterResponse.matchedRequirements.length
    })

    return {
      status: 200,
      body: coverLetterResponse
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate cover letter', { jobId, profile_id, error: errorMessage })

    // Return fallback cover letter instead of error
    logger.info('Using fallback cover letter after error', { jobId, profile_id })
    const fallbackResponse = generateFallbackCoverLetter(job, profile)
    return {
      status: 200,
      body: fallbackResponse
    }
  }
}
