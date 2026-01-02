/**
 * @job-aggregator/job-matching
 *
 * Intelligent Job Application System - Phase 2
 *
 * Architecture: 2 Agents + 8 Skills (4 per agent)
 *
 * Agents:
 * - AnalysisAgent: job-analysis, company-evaluation, profile-matching, fit-scoring
 * - GenerationAgent: resume-writing, cover-letter, question-answering, recruiter-response
 *
 * Flow:
 * Request -> Orchestrator -> Analysis Agent -> MatchReport -> Generation Agent -> ApplicationKit
 */

// Main orchestrator
export {
  ApplicationOrchestrator,
  createOrchestrator,
  type OrchestratorOptions
} from './orchestrator.js'

// Agents
export { AnalysisAgent, GenerationAgent } from './agents/index.js'

// MCP Server
export {
  JobMatchingMcpServer,
  mcpServer,
  mcpTools
} from './mcp-server.js'

// Types
export type {
  // User Profile
  UserProfile,
  WorkExperience,
  Education,
  JobPreferences,
  VoiceStyle,

  // Job Posting
  JobPosting,

  // Analysis Agent Output (MatchReport)
  MatchReport,
  ParsedRequirements,
  CompanyInsights,
  CompanyScores,
  MatchAnalysis,
  FitScore,
  ExperienceLevel,
  CompanyRecommendation,
  FitRecommendation,

  // Generation Agent Output (ApplicationKit)
  ApplicationKit,
  GeneratedResume,
  GeneratedCoverLetter,
  QuestionAnswer,
  RecruiterEmail,
  HookType,
  EmailResponseType,

  // Orchestrator Request/Response
  ApplicationRequest,
  ApplicationResponse,
  ApplicationResult,
  ApplicationSummary,
  ApplicationIntent,

  // MCP Tool Types
  VoiceStyleConfig,
  SemanticMatchResult,
  SaveDocumentResult
} from './types.js'
