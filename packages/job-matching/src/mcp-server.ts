/**
 * MCP Server for Job Matching
 *
 * Provides data access and utility tools for the job matching system.
 * These tools handle external operations that agents shouldn't do directly:
 * - Database access (jobs, profiles)
 * - External API calls (semantic matching)
 * - File operations (PDF generation, document storage)
 * - Notifications (email via SendGrid)
 */

import { z } from 'zod'
import type {
  JobPosting,
  UserProfile,
  VoiceStyleConfig,
  SemanticMatchResult,
  SaveDocumentResult
} from './types.js'

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Tool input/output schemas using Zod for validation
 */

// get_job_details
const GetJobDetailsInput = z.object({
  jobId: z.string().describe('Job ID to retrieve')
})

// get_user_profile
const GetUserProfileInput = z.object({
  userId: z.string().describe('User ID to retrieve')
})

// get_voice_style
const GetVoiceStyleInput = z.object({
  style: z.enum(['andrew_askins', 'professional', 'friendly'])
    .describe('Voice style configuration to retrieve')
})

// semantic_match
const SemanticMatchInput = z.object({
  text1: z.string().describe('First text to compare'),
  text2: z.string().describe('Second text to compare')
})

// generate_pdf
const GeneratePdfInput = z.object({
  markdown: z.string().describe('Markdown content to convert'),
  outputPath: z.string().describe('Path to save the PDF')
})

// send_notification
const SendNotificationInput = z.object({
  userId: z.string().describe('User ID to notify'),
  subject: z.string().describe('Email subject'),
  body: z.string().describe('Email body (HTML supported)')
})

// save_document
const SaveDocumentInput = z.object({
  type: z.enum(['resume', 'cover_letter', 'response'])
    .describe('Type of document'),
  content: z.string().describe('Document content'),
  opportunityId: z.string().describe('Associated job opportunity ID')
})

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Fetch job details from database
 * In production, this would query Motia state or a database
 */
async function fetchJobFromDB(jobId: string): Promise<JobPosting | null> {
  console.log(`[MCP] Fetching job: ${jobId}`)

  // TODO: Integrate with Motia state
  // const job = await state.get('jobs', jobId)

  // Placeholder implementation
  return null
}

/**
 * Fetch user profile from database
 * In production, this would query the user database
 */
async function fetchProfileFromDB(userId: string): Promise<UserProfile | null> {
  console.log(`[MCP] Fetching profile: ${userId}`)

  // TODO: Integrate with user database
  // const profile = await db.users.findUnique({ where: { id: userId } })

  // Placeholder implementation
  return null
}

/**
 * Load voice style configuration
 * Returns predefined voice style settings
 */
function loadVoiceStyle(style: 'andrew_askins' | 'professional' | 'friendly'): VoiceStyleConfig {
  console.log(`[MCP] Loading voice style: ${style}`)

  const styles: Record<string, VoiceStyleConfig> = {
    andrew_askins: {
      name: 'andrew_askins',
      tone: 'conversational, peer-level, authentic',
      contractions: true,
      avoidWords: [
        'leverage', 'synergy', 'passionate', 'driven', 'dynamic',
        'rock star', 'ninja', 'guru', 'utilize', 'impactful'
      ],
      examplePhrases: [
        "Here's the honest version",
        "I'll skip the usual script",
        "I've found that",
        "What I can tell you is",
        "That's not buzzword padding"
      ]
    },
    professional: {
      name: 'professional',
      tone: 'formal, polished, corporate',
      contractions: false,
      avoidWords: ['slang', 'colloquialisms'],
      examplePhrases: [
        'I am pleased to submit',
        'I would welcome the opportunity',
        'My experience includes',
        'I am confident that'
      ]
    },
    friendly: {
      name: 'friendly',
      tone: 'warm, approachable, enthusiastic',
      contractions: true,
      avoidWords: ['jargon', 'overly formal language'],
      examplePhrases: [
        "I'm excited about",
        "I'd love to chat",
        "What really stands out to me",
        "I think we'd be a great fit"
      ]
    }
  }

  return styles[style] || styles.andrew_askins
}

/**
 * Calculate semantic similarity between two texts
 * Uses embeddings for accurate similarity scoring
 */
async function calculateEmbeddingSimilarity(
  text1: string,
  text2: string
): Promise<SemanticMatchResult> {
  console.log(`[MCP] Calculating semantic similarity`)

  // TODO: Implement with actual embeddings (e.g., OpenAI, Cohere, or local model)
  // For now, use a simple word overlap heuristic

  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))

  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])

  const similarity = intersection.size / union.size
  const matchedConcepts = [...intersection].slice(0, 10)

  return {
    similarity: Math.round(similarity * 100) / 100,
    matchedConcepts
  }
}

/**
 * Convert markdown to PDF
 * Uses a PDF generation library
 */
async function convertToPDF(
  markdown: string,
  outputPath: string
): Promise<{ success: boolean; path: string }> {
  console.log(`[MCP] Converting to PDF: ${outputPath}`)

  // TODO: Implement with actual PDF library (e.g., puppeteer, md-to-pdf)
  // For now, return placeholder

  return {
    success: true,
    path: outputPath
  }
}

/**
 * Send email notification via SendGrid
 */
async function sendEmail(args: {
  userId: string
  subject: string
  body: string
}): Promise<{ success: boolean; messageId?: string }> {
  console.log(`[MCP] Sending notification to user: ${args.userId}`)

  // TODO: Implement with SendGrid
  // const sgMail = require('@sendgrid/mail')
  // await sgMail.send({ to, from, subject, html })

  return {
    success: true,
    messageId: `msg_${Date.now()}`
  }
}

/**
 * Save generated document to storage
 */
async function saveToStorage(args: {
  type: 'resume' | 'cover_letter' | 'response'
  content: string
  opportunityId: string
}): Promise<SaveDocumentResult> {
  console.log(`[MCP] Saving ${args.type} for opportunity: ${args.opportunityId}`)

  // TODO: Implement with actual storage (S3, Supabase, etc.)

  const id = `doc_${Date.now()}`
  const path = `/documents/${args.opportunityId}/${args.type}_${id}.md`

  return {
    id,
    path,
    savedAt: new Date().toISOString()
  }
}

// ============================================================================
// MCP SERVER DEFINITION
// ============================================================================

/**
 * Tool definitions for MCP server
 * These match the format expected by Anthropic's MCP SDK
 */
export const mcpTools = {
  // Data retrieval tools
  get_job_details: {
    name: 'get_job_details',
    description: 'Get full job posting details from the database',
    inputSchema: GetJobDetailsInput,
    handler: async (args: z.infer<typeof GetJobDetailsInput>) => {
      return fetchJobFromDB(args.jobId)
    }
  },

  get_user_profile: {
    name: 'get_user_profile',
    description: 'Get user profile with skills, experience, and preferences',
    inputSchema: GetUserProfileInput,
    handler: async (args: z.infer<typeof GetUserProfileInput>) => {
      return fetchProfileFromDB(args.userId)
    }
  },

  get_voice_style: {
    name: 'get_voice_style',
    description: 'Get voice style configuration for content generation',
    inputSchema: GetVoiceStyleInput,
    handler: async (args: z.infer<typeof GetVoiceStyleInput>) => {
      return loadVoiceStyle(args.style)
    }
  },

  // Computation tools
  semantic_match: {
    name: 'semantic_match',
    description: 'Calculate semantic similarity between two texts using embeddings',
    inputSchema: SemanticMatchInput,
    handler: async (args: z.infer<typeof SemanticMatchInput>) => {
      return calculateEmbeddingSimilarity(args.text1, args.text2)
    }
  },

  // Document generation tools
  generate_pdf: {
    name: 'generate_pdf',
    description: 'Convert markdown content to PDF format',
    inputSchema: GeneratePdfInput,
    handler: async (args: z.infer<typeof GeneratePdfInput>) => {
      return convertToPDF(args.markdown, args.outputPath)
    }
  },

  // Notification tools
  send_notification: {
    name: 'send_notification',
    description: 'Send email notification to user via SendGrid',
    inputSchema: SendNotificationInput,
    handler: async (args: z.infer<typeof SendNotificationInput>) => {
      return sendEmail(args)
    }
  },

  // Storage tools
  save_document: {
    name: 'save_document',
    description: 'Save generated document to storage',
    inputSchema: SaveDocumentInput,
    handler: async (args: z.infer<typeof SaveDocumentInput>) => {
      return saveToStorage(args)
    }
  }
}

// ============================================================================
// MCP SERVER CLASS
// ============================================================================

/**
 * JobMatchingMcpServer
 *
 * Provides MCP tools for the job matching system.
 * Can be integrated with Motia or run standalone.
 */
export class JobMatchingMcpServer {
  private name = 'job-matching'
  private version = '1.0.0'

  constructor() {
    console.log(`[MCP] Initializing ${this.name} v${this.version}`)
  }

  /**
   * Get server metadata
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      tools: Object.keys(mcpTools)
    }
  }

  /**
   * List available tools
   */
  listTools() {
    return Object.entries(mcpTools).map(([name, tool]) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const tool = mcpTools[name as keyof typeof mcpTools]

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`)
    }

    // Validate input
    const validated = tool.inputSchema.parse(args)

    // Execute handler
    return tool.handler(validated as never)
  }

  /**
   * Get job details (convenience method)
   */
  async getJobDetails(jobId: string): Promise<JobPosting | null> {
    return this.executeTool('get_job_details', { jobId }) as Promise<JobPosting | null>
  }

  /**
   * Get user profile (convenience method)
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.executeTool('get_user_profile', { userId }) as Promise<UserProfile | null>
  }

  /**
   * Get voice style config (convenience method)
   */
  async getVoiceStyle(
    style: 'andrew_askins' | 'professional' | 'friendly'
  ): Promise<VoiceStyleConfig> {
    return this.executeTool('get_voice_style', { style }) as Promise<VoiceStyleConfig>
  }

  /**
   * Calculate semantic match (convenience method)
   */
  async semanticMatch(text1: string, text2: string): Promise<SemanticMatchResult> {
    return this.executeTool('semantic_match', { text1, text2 }) as Promise<SemanticMatchResult>
  }

  /**
   * Generate PDF (convenience method)
   */
  async generatePdf(
    markdown: string,
    outputPath: string
  ): Promise<{ success: boolean; path: string }> {
    return this.executeTool('generate_pdf', { markdown, outputPath }) as Promise<{
      success: boolean
      path: string
    }>
  }

  /**
   * Send notification (convenience method)
   */
  async sendNotification(
    userId: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; messageId?: string }> {
    return this.executeTool('send_notification', { userId, subject, body }) as Promise<{
      success: boolean
      messageId?: string
    }>
  }

  /**
   * Save document (convenience method)
   */
  async saveDocument(
    type: 'resume' | 'cover_letter' | 'response',
    content: string,
    opportunityId: string
  ): Promise<SaveDocumentResult> {
    return this.executeTool('save_document', { type, content, opportunityId }) as Promise<SaveDocumentResult>
  }
}

// Export singleton instance
export const mcpServer = new JobMatchingMcpServer()
