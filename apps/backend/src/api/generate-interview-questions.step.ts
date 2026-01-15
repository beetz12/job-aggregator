import type { ApiRouteConfig } from 'motia'
import { z, ZodError } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /interview-questions/generate
 *
 * Generates dynamic, personalized interview questions based on resume content.
 * Uses LLM to analyze the resume and create contextual questions.
 * Falls back to default questions if LLM call fails.
 */

// Request schema
const generateInterviewQuestionsRequestSchema = z.object({
  resume_text: z.string().min(50, 'Resume text must be at least 50 characters'),
  question_count: z.number().min(3).max(10).optional().default(5)
})

// Interview question schema matching frontend structure
const interviewQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: z.enum(['COMPENSATION', 'LOCATION', 'CULTURE', 'COMPANY_STAGE', 'TECHNICAL']),
  placeholder: z.string(),
  helpText: z.string().optional()
})

const generateInterviewQuestionsResponseSchema = z.object({
  questions: z.array(interviewQuestionSchema),
  generated: z.boolean(),
  resume_insights: z.object({
    detected_skills: z.array(z.string()),
    experience_level: z.string(),
    industries: z.array(z.string())
  }).optional()
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GenerateInterviewQuestions',
  path: '/interview-questions/generate',
  method: 'POST',
  description: 'Generate dynamic interview questions based on resume content using LLM analysis',
  emits: [],
  flows: ['profile-matching'],
  bodySchema: generateInterviewQuestionsRequestSchema,
  responseSchema: {
    200: generateInterviewQuestionsResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
}

/**
 * Default fallback questions when LLM is unavailable
 */
const DEFAULT_QUESTIONS = [
  {
    id: 'compensation',
    question: "What's your target compensation? Include your minimum acceptable base salary, ideal salary, and whether equity compensation is important to you.",
    category: 'COMPENSATION' as const,
    placeholder: "E.g., Minimum $150k base, targeting $180k+. Equity is important for early-stage companies but less critical for established ones. Benefits priorities: good health insurance, 401k match, flexible PTO...",
    helpText: "Be specific about base salary range and benefits priorities"
  },
  {
    id: 'location',
    question: "What are your location and remote work preferences? Are there geographic restrictions?",
    category: 'LOCATION' as const,
    placeholder: "E.g., Remote required, open to occasional travel (1-2 times per quarter). Must be US timezone-friendly. Would consider hybrid in SF Bay Area or NYC only...",
    helpText: "Consider timezone requirements and travel flexibility"
  },
  {
    id: 'culture',
    question: "What company culture characteristics are important to you? What are red flags you'd avoid?",
    category: 'CULTURE' as const,
    placeholder: "E.g., Value async communication, flat hierarchy, psychological safety. Prefer companies with strong engineering culture and work-life balance. Red flags: mandatory RTO, excessive on-call, no growth budget...",
    helpText: "Think about leadership style, values, and deal-breakers"
  },
  {
    id: 'company_stage',
    question: "What company stage do you prefer? Early startup, growth-stage, or established enterprise?",
    category: 'COMPANY_STAGE' as const,
    placeholder: "E.g., Prefer Series A-C growth stage companies (50-500 employees). Not interested in pre-seed/seed (too risky) or Fortune 500 (too slow). Okay with late-stage startups preparing for IPO...",
    helpText: "Consider job stability vs equity upside trade-offs"
  },
  {
    id: 'technical',
    question: "What technical requirements do you have? Which technologies are must-haves vs nice-to-haves?",
    category: 'TECHNICAL' as const,
    placeholder: "E.g., Must: TypeScript, React, Node.js. Nice-to-have: Go, Kubernetes, GraphQL. Avoid: PHP, legacy Java, Windows-only environments. Interested in: AI/ML, distributed systems...",
    helpText: "Include languages, frameworks, and tools"
  }
]

/**
 * Build the prompt for Claude to generate personalized interview questions
 */
function buildInterviewQuestionsPrompt(resumeText: string, questionCount: number): string {
  return `Analyze this resume and generate ${questionCount} personalized career preference interview questions.

RESUME CONTENT:
${resumeText}

TASK:
Based on this resume, generate ${questionCount} interview questions that help understand the candidate's career preferences beyond what's in their resume. The questions should:

1. Reference specific details from the resume (skills, experiences, companies, industries)
2. Explore areas the resume doesn't cover (compensation, culture preferences, location flexibility)
3. Be personalized based on their apparent experience level and career trajectory
4. Help understand what they're looking for in their next role

CATEGORIES (use exactly one per question):
- COMPENSATION: Salary expectations, equity, benefits
- LOCATION: Remote/hybrid/onsite, geographic preferences, travel
- CULTURE: Work environment, team dynamics, values, red flags
- COMPANY_STAGE: Startup vs enterprise, company size, growth stage
- TECHNICAL: Tech stack preferences, learning interests, deal-breakers

For each question, also provide:
- A detailed placeholder example showing the type of answer expected
- Optional help text with guidance

RESPONSE FORMAT (JSON only, no markdown):
{
  "questions": [
    {
      "id": "unique_id",
      "question": "The personalized question text",
      "category": "CATEGORY_NAME",
      "placeholder": "Detailed example answer...",
      "helpText": "Optional guidance for answering"
    }
  ],
  "resume_insights": {
    "detected_skills": ["skill1", "skill2"],
    "experience_level": "junior|mid|senior|lead",
    "industries": ["industry1", "industry2"]
  }
}

Generate exactly ${questionCount} questions, one for each category. Make them highly personalized based on the resume content.`
}

interface GeneratedQuestion {
  id: string
  question: string
  category: 'COMPENSATION' | 'LOCATION' | 'CULTURE' | 'COMPANY_STAGE' | 'TECHNICAL'
  placeholder: string
  helpText?: string
}

interface ResumeInsights {
  detected_skills: string[]
  experience_level: string
  industries: string[]
}

interface LLMResponse {
  questions: GeneratedQuestion[]
  resume_insights?: ResumeInsights
}

/**
 * Parse and validate the AI response
 */
function parseAIResponse(responseText: string): LLMResponse {
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

  // Validate questions array
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('Invalid response: questions array is empty or missing')
  }

  // Validate each question has required fields
  const validCategories = ['COMPENSATION', 'LOCATION', 'CULTURE', 'COMPANY_STAGE', 'TECHNICAL']
  for (const q of parsed.questions) {
    if (!q.id || !q.question || !q.category || !q.placeholder) {
      throw new Error('Invalid question format: missing required fields')
    }
    if (!validCategories.includes(q.category)) {
      throw new Error(`Invalid category: ${q.category}`)
    }
  }

  return {
    questions: parsed.questions,
    resume_insights: parsed.resume_insights
  }
}

export const handler = async (req: { body: unknown }, { logger }: { logger: { info: (msg: string, data?: Record<string, unknown>) => void; debug: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void } }) => {
  logger.info('Starting interview questions generation')

  // Validate request body
  let validatedBody
  try {
    validatedBody = generateInterviewQuestionsRequestSchema.parse(req.body)
  } catch (error) {
    if (error instanceof ZodError) {
      // ZodError has an errors property, but TypeScript has issues with its typing
      const zodErr = error as unknown as { errors: Array<{ message: string }> }
      const errorMessages = zodErr.errors.map(e => e.message).join(', ')
      logger.error('Validation failed', { error: errorMessages })
      return {
        status: 400,
        body: { error: `Validation failed: ${errorMessages}` }
      }
    }
    throw error
  }

  const { resume_text, question_count } = validatedBody

  logger.info('Generating interview questions', {
    resumeLength: resume_text.length,
    questionCount: question_count
  })

  // Check if API key is configured
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY not configured, using default questions')
    return {
      status: 200,
      body: {
        questions: DEFAULT_QUESTIONS.slice(0, question_count),
        generated: false
      }
    }
  }

  try {
    const anthropic = new Anthropic({ apiKey })

    const prompt = buildInterviewQuestionsPrompt(resume_text, question_count)

    logger.debug('Calling Claude API for interview questions', { promptLength: prompt.length })

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

    const llmResponse = parseAIResponse(responseContent.text)

    logger.info('Interview questions generated successfully', {
      questionCount: llmResponse.questions.length,
      hasInsights: !!llmResponse.resume_insights
    })

    return {
      status: 200,
      body: {
        questions: llmResponse.questions,
        generated: true,
        resume_insights: llmResponse.resume_insights
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate interview questions', { error: errorMessage })

    // Return fallback questions instead of error
    logger.info('Using default questions after LLM error')
    return {
      status: 200,
      body: {
        questions: DEFAULT_QUESTIONS.slice(0, question_count),
        generated: false
      }
    }
  }
}
