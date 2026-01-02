/**
 * Core types for the Job Matching system
 * V3 Architecture: 2 Agents + 8 Skills (4 per agent)
 */

// ============================================================================
// USER PROFILE TYPES
// ============================================================================

export interface WorkExperience {
  company: string
  title: string
  startDate: string
  endDate?: string
  current: boolean
  description: string
  achievements: string[]
  technologies: string[]
}

export interface Education {
  institution: string
  degree: string
  field: string
  graduationDate: string
  gpa?: number
  honors?: string[]
}

export interface JobPreferences {
  desiredRoles: string[]
  desiredLocations: string[]
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'flexible'
  salaryMin?: number
  salaryMax?: number
  companySizePreference?: 'startup' | 'mid' | 'enterprise' | 'any'
  industryPreferences?: string[]
  industryExclusions?: string[]
}

export type VoiceStyle = 'andrew_askins' | 'professional' | 'friendly'

export interface UserProfile {
  id: string
  name: string
  email: string
  summary: string
  experience: WorkExperience[]
  skills: string[]
  education: Education[]
  preferences: JobPreferences
  voiceStyle: VoiceStyle
}

// ============================================================================
// JOB POSTING TYPES
// ============================================================================

export interface JobPosting {
  id: string
  title: string
  company: string
  description: string
  requirements: string[]
  url: string
  source: string
  postedAt: string
  location?: string
  remote?: boolean
  salary?: {
    min?: number
    max?: number
    currency?: string
  }
}

// ============================================================================
// ANALYSIS AGENT OUTPUT (MatchReport)
// ============================================================================

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'staff' | 'lead'

export interface ParsedRequirements {
  mustHave: string[]
  niceToHave: string[]
  techStack: string[]
  experienceLevel: ExperienceLevel
  responsibilities: string[]
  redFlags: string[]
}

export type CompanyRecommendation = 'STRONG_YES' | 'YES' | 'MAYBE' | 'PASS'

export interface CompanyScores {
  compensation: number      // 0-20
  culture: number           // 0-25
  familyFriendliness: number // 0-20
  technicalFit: number      // 0-15
  industry: number          // 0-10
  longTermPotential: number // 0-10
}

export interface CompanyInsights {
  overallScore: number  // 0-100
  scores: CompanyScores
  greenFlags: string[]
  redFlags: string[]
  recentNews: string[]
  recommendation: CompanyRecommendation
}

export interface MatchAnalysis {
  overallMatch: number  // 0-100
  strongMatches: string[]
  partialMatches: string[]
  gaps: string[]
  transferableSkills: string[]
}

export type FitRecommendation = 'STRONG_APPLY' | 'APPLY' | 'CONDITIONAL' | 'SKIP'

export interface FitScore {
  composite: number  // 0-100
  confidence: number
  recommendation: FitRecommendation
  reasoning: string
}

/**
 * Output from the Analysis Agent
 * Contains comprehensive analysis of job-candidate fit
 */
export interface MatchReport {
  jobId: string
  userId: string

  // From job-analysis skill
  parsedRequirements: ParsedRequirements

  // From company-evaluation skill
  companyInsights: CompanyInsights

  // From profile-matching skill
  matchAnalysis: MatchAnalysis

  // From fit-scoring skill
  fitScore: FitScore

  // Synthesized for generation agent
  talkingPoints: string[]
  gapsToAddress: string[]
  interviewQuestions: string[]
}

// ============================================================================
// GENERATION AGENT OUTPUT (ApplicationKit)
// ============================================================================

export type HookType = 'direct_relevance' | 'vulnerability' | 'contrarian' | 'achievement'

export interface GeneratedResume {
  markdown: string
  pdfPath?: string
  highlightedSkills: string[]
  atsScore: number
}

export interface GeneratedCoverLetter {
  markdown: string
  pdfPath?: string
  hookType: HookType
  keyPoints: string[]
}

export interface QuestionAnswer {
  question: string
  answer: string
  companyUsed: string  // For diversity tracking
}

export type EmailResponseType = 'interested' | 'decline' | 'questions'

export interface RecruiterEmail {
  subject: string
  body: string
  type: EmailResponseType
}

/**
 * Output from the Generation Agent
 * Contains all generated application materials
 */
export interface ApplicationKit {
  jobId: string
  userId: string

  resume: GeneratedResume

  coverLetter: GeneratedCoverLetter

  questionAnswers?: QuestionAnswer[]

  recruiterEmail?: RecruiterEmail
}

// ============================================================================
// ORCHESTRATOR REQUEST/RESPONSE
// ============================================================================

export type ApplicationIntent =
  | 'full_application'   // Generate all materials
  | 'quick_apply'        // Generate resume + cover letter only
  | 'check_fit'          // Analysis only, no generation
  | 'recruiter_response' // Respond to recruiter message

export interface ApplicationRequest {
  user: UserProfile
  jobs: JobPosting[]  // Can be 1 or many
  intent: ApplicationIntent
  recruiterMessage?: string
  applicationQuestions?: string[]
}

export interface ApplicationResult {
  jobId: string
  matchReport: MatchReport
  applicationKit?: ApplicationKit  // Only if intent includes generation
  recommendations: string[]
  nextSteps: string[]
}

export interface ApplicationSummary {
  totalJobs: number
  strongMatches: number
  applicationsGenerated: number
}

export interface ApplicationResponse {
  results: ApplicationResult[]
  summary: ApplicationSummary
}

// ============================================================================
// MCP TOOL TYPES
// ============================================================================

export interface VoiceStyleConfig {
  name: VoiceStyle
  tone: string
  contractions: boolean
  avoidWords: string[]
  examplePhrases: string[]
}

export interface SemanticMatchResult {
  similarity: number  // 0-1
  matchedConcepts: string[]
}

export interface SaveDocumentResult {
  id: string
  path: string
  savedAt: string
}
