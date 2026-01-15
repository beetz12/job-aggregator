import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

let client: GoogleGenerativeAI | null = null

export function getGeminiClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }
    client = new GoogleGenerativeAI(apiKey)
  }
  return client
}

export function getGeminiModel(modelName = 'gemini-1.5-flash'): GenerativeModel {
  return getGeminiClient().getGenerativeModel({ model: modelName })
}
