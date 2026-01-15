import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import { getGeminiModel } from '../services/gemini-client'
import { SchemaType } from '@google/generative-ai'

// Request schema
const analyzeResumeRequestSchema = z.object({
  resumeText: z.string().min(1, 'Resume text is required')
})

// Response schemas
const resumeDataSchema = z.object({
  name: z.string(),
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(z.string()),
  rawText: z.string()
})

const interviewQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: z.string(),
  placeholder: z.string()
})

const analyzeResumeResponseSchema = z.object({
  data: resumeDataSchema,
  questions: z.array(interviewQuestionSchema)
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'AnalyzeResume',
  path: '/resume/analyze',
  method: 'POST',
  description: 'Analyze resume text and generate interview questions for job requirements',
  emits: [],
  flows: ['career-compass'],
  bodySchema: analyzeResumeRequestSchema,
  responseSchema: {
    200: analyzeResumeResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const handler: Handlers['AnalyzeResume'] = async (req, { logger }) => {
  logger.info('Starting resume analysis')

  // Validate request body
  let validatedBody
  try {
    validatedBody = analyzeResumeRequestSchema.parse(req.body)
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

  const { resumeText } = validatedBody

  // Check if API key is configured
  if (!process.env.GEMINI_API_KEY) {
    logger.error('GEMINI_API_KEY not configured')
    return {
      status: 500,
      body: { error: 'Gemini API key not configured' }
    }
  }

  try {
    const model = getGeminiModel('gemini-1.5-flash')

    const prompt = `Analyze the following resume text and identify 5 critical missing pieces of information needed to create a comprehensive "Job Search Requirements Document" (specifically: salary floor, preferred company stage, culture/leadership values, remote/location flexibility, and industry exclusions).

    Resume Text:
    ${resumeText}`

    logger.info('Calling Gemini API for resume analysis', { resumeTextLength: resumeText.length })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            data: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                summary: { type: SchemaType.STRING },
                skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                experience: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['name', 'summary', 'skills', 'experience']
            },
            questions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  question: { type: SchemaType.STRING },
                  category: { type: SchemaType.STRING },
                  placeholder: { type: SchemaType.STRING }
                },
                required: ['id', 'question', 'category', 'placeholder']
              }
            }
          },
          required: ['data', 'questions']
        }
      }
    })

    const response = result.response
    const responseText = response.text()

    logger.debug('Gemini API response received', { responseLength: responseText.length })

    const parsedResult = JSON.parse(responseText || '{}')

    const responseData = {
      data: { ...parsedResult.data, rawText: resumeText },
      questions: parsedResult.questions
    }

    logger.info('Resume analysis completed successfully', {
      name: responseData.data.name,
      skillsCount: responseData.data.skills.length,
      questionsCount: responseData.questions.length
    })

    return {
      status: 200,
      body: responseData
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to analyze resume', { error: errorMessage })
    return {
      status: 500,
      body: { error: `Failed to analyze resume: ${errorMessage}` }
    }
  }
}
