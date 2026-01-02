import { z } from 'zod'

// ============================================================================
// Job Matching Types - Phase 3 Implementation
// ============================================================================

/**
 * Work experience schema for user profiles
 */
export const workExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional()
})

export type WorkExperience = z.infer<typeof workExperienceSchema>

/**
 * Education schema for user profiles
 */
export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gpa: z.string().optional()
})

export type Education = z.infer<typeof educationSchema>

/**
 * Job preferences schema
 */
export const jobPreferencesSchema = z.object({
  targetRoles: z.array(z.string()).optional(),
  targetCompanies: z.array(z.string()).optional(),
  excludedCompanies: z.array(z.string()).optional(),
  excludedIndustries: z.array(z.string()).optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  currency: z.string().optional(),
  remotePreference: z.enum(['remote-only', 'hybrid', 'onsite', 'flexible']).optional(),
  locations: z.array(z.string()).optional(),
  willingToRelocate: z.boolean().optional()
})

export type JobPreferences = z.infer<typeof jobPreferencesSchema>

/**
 * Enhanced user profile for job matching
 */
export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  summary: z.string().optional(),
  experience: z.array(workExperienceSchema).optional(),
  skills: z.array(z.string()),
  education: z.array(educationSchema).optional(),
  preferences: jobPreferencesSchema.optional(),
  voiceStyle: z.enum(['andrew_askins', 'professional', 'friendly']).default('professional'),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type UserProfile = z.infer<typeof userProfileSchema>

/**
 * Parsed requirements from job analysis
 */
export const parsedRequirementsSchema = z.object({
  mustHave: z.array(z.string()),
  niceToHave: z.array(z.string()),
  techStack: z.array(z.string()),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'staff', 'lead']),
  responsibilities: z.array(z.string()),
  redFlags: z.array(z.string())
})

export type ParsedRequirements = z.infer<typeof parsedRequirementsSchema>

/**
 * Company evaluation scores
 */
export const companyScoresSchema = z.object({
  compensation: z.number().min(0).max(20),
  culture: z.number().min(0).max(25),
  familyFriendliness: z.number().min(0).max(20),
  technicalFit: z.number().min(0).max(15),
  industry: z.number().min(0).max(10),
  longTermPotential: z.number().min(0).max(10)
})

export type CompanyScores = z.infer<typeof companyScoresSchema>

/**
 * Company insights from evaluation
 */
export const companyInsightsSchema = z.object({
  overallScore: z.number().min(0).max(100),
  scores: companyScoresSchema,
  greenFlags: z.array(z.string()),
  redFlags: z.array(z.string()),
  recentNews: z.array(z.string()).optional(),
  recommendation: z.enum(['STRONG_YES', 'YES', 'MAYBE', 'PASS'])
})

export type CompanyInsights = z.infer<typeof companyInsightsSchema>

/**
 * Match analysis from profile matching
 */
export const matchAnalysisSchema = z.object({
  overallMatch: z.number().min(0).max(100),
  strongMatches: z.array(z.string()),
  partialMatches: z.array(z.string()),
  gaps: z.array(z.string()),
  transferableSkills: z.array(z.string())
})

export type MatchAnalysis = z.infer<typeof matchAnalysisSchema>

/**
 * Fit score with recommendation
 */
export const fitScoreSchema = z.object({
  composite: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  recommendation: z.enum(['STRONG_APPLY', 'APPLY', 'CONDITIONAL', 'SKIP']),
  reasoning: z.string()
})

export type FitScore = z.infer<typeof fitScoreSchema>

/**
 * Complete match report from Analysis Agent
 */
export const matchReportSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  parsedRequirements: parsedRequirementsSchema,
  companyInsights: companyInsightsSchema.optional(),
  matchAnalysis: matchAnalysisSchema,
  fitScore: fitScoreSchema,
  talkingPoints: z.array(z.string()),
  gapsToAddress: z.array(z.string()),
  interviewQuestions: z.array(z.string()).optional(),
  createdAt: z.string()
})

export type MatchReport = z.infer<typeof matchReportSchema>

/**
 * Resume output from generation
 */
export const resumeOutputSchema = z.object({
  markdown: z.string(),
  pdfPath: z.string().optional(),
  highlightedSkills: z.array(z.string()),
  atsScore: z.number().min(0).max(100)
})

export type ResumeOutput = z.infer<typeof resumeOutputSchema>

/**
 * Cover letter output from generation
 */
export const coverLetterOutputSchema = z.object({
  markdown: z.string(),
  pdfPath: z.string().optional(),
  hookType: z.enum(['direct_relevance', 'vulnerability', 'contrarian', 'achievement']),
  keyPoints: z.array(z.string())
})

export type CoverLetterOutput = z.infer<typeof coverLetterOutputSchema>

/**
 * Question answer with company diversity tracking
 */
export const questionAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  companyUsed: z.string().optional()
})

export type QuestionAnswer = z.infer<typeof questionAnswerSchema>

/**
 * Recruiter email response
 */
export const recruiterEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  type: z.enum(['interested', 'decline', 'questions'])
})

export type RecruiterEmail = z.infer<typeof recruiterEmailSchema>

/**
 * Complete application kit from Generation Agent
 */
export const applicationKitSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  resume: resumeOutputSchema.optional(),
  coverLetter: coverLetterOutputSchema.optional(),
  questionAnswers: z.array(questionAnswerSchema).optional(),
  recruiterEmail: recruiterEmailSchema.optional(),
  createdAt: z.string()
})

export type ApplicationKit = z.infer<typeof applicationKitSchema>

/**
 * Intent types for job matching requests
 */
export const matchIntentSchema = z.enum([
  'check_fit',       // Just analyze fit, don't generate materials
  'full_application', // Generate everything (resume, cover letter, Q&A)
  'quick_apply',     // Generate minimal materials
  'recruiter_response' // Respond to recruiter message
])

export type MatchIntent = z.infer<typeof matchIntentSchema>

/**
 * Application request to the orchestrator
 */
export const applicationRequestSchema = z.object({
  userId: z.string(),
  jobIds: z.array(z.string()),
  intent: matchIntentSchema,
  recruiterMessage: z.string().optional(),
  applicationQuestions: z.array(z.string()).optional()
})

export type ApplicationRequest = z.infer<typeof applicationRequestSchema>

/**
 * Result for a single job in the response
 */
export const jobResultSchema = z.object({
  jobId: z.string(),
  matchReport: matchReportSchema,
  applicationKit: applicationKitSchema.optional(),
  recommendations: z.array(z.string()),
  nextSteps: z.array(z.string())
})

export type JobResult = z.infer<typeof jobResultSchema>

/**
 * Summary of the application response
 */
export const responseSummarySchema = z.object({
  totalJobs: z.number(),
  strongMatches: z.number(),
  applicationsGenerated: z.number()
})

export type ResponseSummary = z.infer<typeof responseSummarySchema>

/**
 * Complete application response from orchestrator
 */
export const applicationResponseSchema = z.object({
  results: z.array(jobResultSchema),
  summary: responseSummarySchema
})

export type ApplicationResponse = z.infer<typeof applicationResponseSchema>

// ============================================================================
// API Request/Response Schemas
// ============================================================================

/**
 * Match jobs request body
 */
export const matchJobsRequestSchema = z.object({
  userId: z.string(),
  jobIds: z.array(z.string()).min(1),
  intent: matchIntentSchema.default('check_fit')
})

export type MatchJobsRequest = z.infer<typeof matchJobsRequestSchema>

/**
 * Apply request body
 */
export const applyRequestSchema = z.object({
  userId: z.string(),
  jobId: z.string(),
  applicationQuestions: z.array(z.string()).optional()
})

export type ApplyRequest = z.infer<typeof applyRequestSchema>

/**
 * Recruiter response request body
 */
export const recruiterResponseRequestSchema = z.object({
  userId: z.string(),
  recruiterMessage: z.string(),
  jobId: z.string().optional()
})

export type RecruiterResponseRequest = z.infer<typeof recruiterResponseRequestSchema>

/**
 * Update user profile request body
 */
export const updateUserProfileRequestSchema = userProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  id: z.string().optional() // Optional for creates, required for updates
})

export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileRequestSchema>
