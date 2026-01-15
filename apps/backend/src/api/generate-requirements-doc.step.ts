import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import { getGeminiModel } from '../services/gemini-client'
import { SchemaType } from '@google/generative-ai'

// Request schemas
const resumeDataSchema = z.object({
  name: z.string(),
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(z.string()),
  rawText: z.string()
})

const generateRequirementsDocRequestSchema = z.object({
  resumeData: resumeDataSchema,
  answers: z.record(z.string(), z.string())
})

// Response schemas
const targetPositionSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  focus: z.string(),
  reason: z.string()
})

const compensationSchema = z.object({
  baseFloor: z.string(),
  baseTarget: z.string(),
  equityExpectation: z.string(),
  benefits: z.array(z.string())
})

const locationSchema = z.object({
  preference: z.string(),
  exclusions: z.array(z.string())
})

const cultureValuesSchema = z.object({
  philosophy: z.string(),
  mustHaves: z.array(z.string()),
  redFlags: z.array(z.string())
})

const technicalStackSchema = z.object({
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string())
})

const jobRequirementsDocSchema = z.object({
  name: z.string(),
  lastUpdated: z.string(),
  executiveSummary: z.string(),
  targetPositions: z.array(targetPositionSchema),
  compensation: compensationSchema,
  location: locationSchema,
  cultureValues: cultureValuesSchema,
  technicalStack: technicalStackSchema
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GenerateRequirementsDoc',
  path: '/resume/requirements-doc',
  method: 'POST',
  description: 'Generate a Job Search Requirements Document from resume data and user answers',
  emits: [],
  flows: ['career-compass'],
  bodySchema: generateRequirementsDocRequestSchema,
  responseSchema: {
    200: jobRequirementsDocSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const handler: Handlers['GenerateRequirementsDoc'] = async (req, { logger }) => {
  logger.info('Starting requirements document generation')

  // Validate request body
  let validatedBody
  try {
    validatedBody = generateRequirementsDocRequestSchema.parse(req.body)
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

  const { resumeData, answers } = validatedBody

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

    const prompt = `Based on the following resume and user answers, generate a professional Job Search Requirements Document.

  Resume: ${JSON.stringify(resumeData)}
  User Answers: ${JSON.stringify(answers)}`

    logger.info('Calling Gemini API for requirements doc generation', {
      resumeName: resumeData.name,
      answersCount: Object.keys(answers).length
    })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            lastUpdated: { type: SchemaType.STRING },
            executiveSummary: { type: SchemaType.STRING },
            targetPositions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  seniority: { type: SchemaType.STRING },
                  focus: { type: SchemaType.STRING },
                  reason: { type: SchemaType.STRING }
                },
                required: ['title', 'seniority', 'focus', 'reason']
              }
            },
            compensation: {
              type: SchemaType.OBJECT,
              properties: {
                baseFloor: { type: SchemaType.STRING },
                baseTarget: { type: SchemaType.STRING },
                equityExpectation: { type: SchemaType.STRING },
                benefits: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['baseFloor', 'baseTarget', 'equityExpectation', 'benefits']
            },
            location: {
              type: SchemaType.OBJECT,
              properties: {
                preference: { type: SchemaType.STRING },
                exclusions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['preference', 'exclusions']
            },
            cultureValues: {
              type: SchemaType.OBJECT,
              properties: {
                philosophy: { type: SchemaType.STRING },
                mustHaves: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                redFlags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['philosophy', 'mustHaves', 'redFlags']
            },
            technicalStack: {
              type: SchemaType.OBJECT,
              properties: {
                mustHave: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                niceToHave: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['mustHave', 'niceToHave']
            }
          },
          required: [
            'name', 'lastUpdated', 'executiveSummary', 'targetPositions',
            'compensation', 'location', 'cultureValues', 'technicalStack'
          ]
        }
      }
    })

    const response = result.response
    const responseText = response.text()

    logger.debug('Gemini API response received', { responseLength: responseText.length })

    const requirementsDoc = JSON.parse(responseText || '{}')

    logger.info('Requirements document generated successfully', {
      name: requirementsDoc.name,
      targetPositionsCount: requirementsDoc.targetPositions?.length || 0
    })

    return {
      status: 200,
      body: requirementsDoc
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate requirements document', { error: errorMessage })
    return {
      status: 500,
      body: { error: `Failed to generate requirements document: ${errorMessage}` }
    }
  }
}
