import type { EventConfig, Handlers } from 'motia'
import Anthropic from '@anthropic-ai/sdk'
import { summarizeJobInputSchema, type JobSummary } from '../types/job-summary'

export const config: EventConfig = {
  type: 'event',
  name: 'SummarizeJob',
  description: 'Uses Claude AI to generate job summaries and extract skills from job descriptions',
  subscribes: ['job-indexed'],
  emits: [],
  input: summarizeJobInputSchema,
  flows: ['job-aggregation']
}

/**
 * Build the prompt for Claude to analyze the job posting
 */
function buildAnalysisPrompt(
  title: string,
  company: string,
  description: string,
  location: string | undefined,
  remote: boolean,
  tags: string[]
): string {
  return `Analyze this job posting and extract structured information.

Job Title: ${title}
Company: ${company}
Location: ${location || 'Not specified'}
Remote: ${remote ? 'Yes' : 'No'}
Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}

Job Description:
${description}

Respond with a JSON object containing:
1. "oneLiner": A concise one-line summary (max 80 chars) like "Senior React dev at fintech startup, $150-180k"
2. "keyRequirements": Array of 3-5 key requirements (e.g., ["5+ years React", "TypeScript", "AWS"])
3. "niceToHaves": Array of 0-3 nice-to-have skills mentioned
4. "redFlags": Array of 0-3 potential concerns (e.g., "On-site only", "Unpaid trial", "Vague compensation")
5. "salaryRange": Salary range if mentioned, or null
6. "remotePolicy": One of "remote", "hybrid", "onsite", or "unknown"
7. "seniorityLevel": One of "junior", "mid", "senior", "lead", or "unknown"

Return ONLY valid JSON, no markdown or explanation.`
}

/**
 * Parse the AI response into a JobSummary object
 */
function parseAIResponse(
  jobId: string,
  responseText: string
): JobSummary {
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
    id: jobId,
    oneLiner: parsed.oneLiner || 'No summary available',
    keyRequirements: Array.isArray(parsed.keyRequirements) ? parsed.keyRequirements : [],
    niceToHaves: Array.isArray(parsed.niceToHaves) ? parsed.niceToHaves : [],
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    salaryRange: parsed.salaryRange || undefined,
    remotePolicy: ['remote', 'hybrid', 'onsite', 'unknown'].includes(parsed.remotePolicy)
      ? parsed.remotePolicy
      : 'unknown',
    seniorityLevel: ['junior', 'mid', 'senior', 'lead', 'unknown'].includes(parsed.seniorityLevel)
      ? parsed.seniorityLevel
      : 'unknown',
    generatedAt: new Date().toISOString()
  }
}

/**
 * Generate a fallback summary when AI is unavailable
 */
function generateFallbackSummary(
  jobId: string,
  title: string,
  company: string,
  remote: boolean,
  tags: string[]
): JobSummary {
  return {
    id: jobId,
    oneLiner: `${title} at ${company}`,
    keyRequirements: tags.slice(0, 5),
    niceToHaves: [],
    redFlags: [],
    salaryRange: undefined,
    remotePolicy: remote ? 'remote' : 'unknown',
    seniorityLevel: title.toLowerCase().includes('senior')
      ? 'senior'
      : title.toLowerCase().includes('junior')
        ? 'junior'
        : title.toLowerCase().includes('lead')
          ? 'lead'
          : 'unknown',
    generatedAt: new Date().toISOString()
  }
}

export const handler: Handlers['SummarizeJob'] = async (input, { state, logger }) => {
  const { jobId, title, company, description, location, remote, tags } = input

  logger.info('Starting job summarization', { jobId, title, company })

  // Check if API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY not configured, using fallback summary', { jobId })
    const fallbackSummary = generateFallbackSummary(jobId, title, company, remote, tags)
    await state.set('job-summaries', jobId, fallbackSummary)
    logger.info('Fallback summary stored', { jobId })
    return
  }

  try {
    const anthropic = new Anthropic({ apiKey })

    const prompt = buildAnalysisPrompt(title, company, description, location, remote, tags)

    logger.debug('Calling Claude API', { jobId, promptLength: prompt.length })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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

    const summary = parseAIResponse(jobId, responseContent.text)

    // Store summary in state
    await state.set('job-summaries', jobId, summary)

    logger.info('Job summary generated and stored', {
      jobId,
      oneLiner: summary.oneLiner,
      requirementsCount: summary.keyRequirements.length,
      redFlagsCount: summary.redFlags.length,
      seniorityLevel: summary.seniorityLevel,
      remotePolicy: summary.remotePolicy
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate job summary', { jobId, error: errorMessage })

    // Store fallback summary so the job still has some data
    const fallbackSummary = generateFallbackSummary(jobId, title, company, remote, tags)
    await state.set('job-summaries', jobId, fallbackSummary)
    logger.info('Fallback summary stored after error', { jobId })
  }
}
