// All supported job sources - must match backend sources.ts
export type JobSource =
  | 'arbeitnow'
  | 'hackernews'
  | 'reddit'
  | 'remotive'
  | 'wellfound'
  | 'googlejobs'
  | 'jobicy'
  | 'weworkremotely'
  | 'remoteok'
  | 'braintrust'
  | 'devitjobs'
  | 'dice'
  | 'builtin'

// All sources as array for iteration
export const ALL_JOB_SOURCES: JobSource[] = [
  'arbeitnow',
  'hackernews',
  'reddit',
  'remotive',
  'wellfound',
  'googlejobs',
  'jobicy',
  'weworkremotely',
  'remoteok',
  'braintrust',
  'devitjobs',
  'dice',
  'builtin'
]

// Source display names
export const SOURCE_DISPLAY_NAMES: Record<JobSource, string> = {
  arbeitnow: 'Arbeitnow',
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  remotive: 'Remotive',
  wellfound: 'Wellfound',
  googlejobs: 'Google Jobs',
  jobicy: 'Jobicy',
  weworkremotely: 'We Work Remotely',
  remoteok: 'RemoteOK',
  braintrust: 'Braintrust',
  devitjobs: 'DevITJobs',
  dice: 'Dice',
  builtin: 'Built In'
}

// Source colors for UI
export const SOURCE_COLORS: Record<JobSource, string> = {
  arbeitnow: 'bg-green-600',
  hackernews: 'bg-orange-500',
  reddit: 'bg-red-600',
  remotive: 'bg-indigo-600',
  wellfound: 'bg-gray-900',
  googlejobs: 'bg-blue-500',
  jobicy: 'bg-blue-600',
  weworkremotely: 'bg-emerald-600',
  remoteok: 'bg-red-500',
  braintrust: 'bg-purple-600',
  devitjobs: 'bg-pink-500',
  dice: 'bg-sky-600',
  builtin: 'bg-orange-600'
}

export interface Job {
  id: string
  sourceId?: string
  title: string
  company: string
  companyUrl?: string
  location?: string
  locationParsed?: {
    raw: string
    city?: string
    state?: string
    country?: string
    countryCode?: string
    isRemote: boolean
    remoteType?: 'full' | 'hybrid' | 'flexible'
  }
  remote: boolean
  url: string
  description: string
  source: JobSource
  salary?: {
    min?: number
    max?: number
    currency: string
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
    normalizedYearly?: { min?: number; max?: number }
  }
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'internship'
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  postedAt: string
  fetchedAt: string
  tags: string[]
  skills?: string[]
  healthScore: number
  contentHash?: string
  aiSummary?: string
}

export interface JobsResponse {
  jobs: Job[]
  total: number
  sources: string[]
  lastUpdated: string
}

export interface Source {
  name: string
  displayName: string
  lastFetch: string | null
  jobCount: number
  status: 'success' | 'error' | 'pending' | 'unknown'
  error?: string
  isActive: boolean
  color: string
}

export interface SourcesResponse {
  sources: Source[]
}

export interface JobFilters {
  source?: string
  remote?: boolean
  limit?: number
  offset?: number
  search?: string
}

// Profile Types - Match backend exactly
export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'lead'
export type RemotePreference = 'remote-only' | 'hybrid' | 'onsite' | 'flexible'

export interface SalaryExpectation {
  min: number
  max: number
  currency: string
}

export interface Profile {
  id: string
  name: string
  email: string
  skills: string[]
  experienceYears: number
  seniorityLevel: SeniorityLevel
  remotePreference: RemotePreference
  preferredLocations: string[]
  salaryExpectation?: SalaryExpectation
  createdAt: string
  updatedAt: string
}

export interface CreateProfileInput {
  id?: string  // Optional for updates
  name: string
  email: string
  skills: string[]
  experienceYears: number
  seniorityLevel: SeniorityLevel
  remotePreference: RemotePreference
  preferredLocations: string[]
  salaryExpectation?: SalaryExpectation
}

export interface UpdateProfileInput extends Partial<CreateProfileInput> {}

// Match Score Types - Match backend structure
export interface MatchScoreBreakdown {
  skillScore: number
  seniorityScore: number
  locationScore: number
  salaryScore: number
}

export interface MatchScore {
  profileId: string
  jobId: string
  totalScore: number
  breakdown: MatchScoreBreakdown
  calculatedAt: string
}

// Matched Job Types - Match backend response structure
export interface MatchedJobItem {
  job: Job
  matchScore: MatchScore
}

export interface MatchedJobsResponse {
  matches: MatchedJobItem[]
  profileId: string
  total: number
}

// Legacy type for backward compatibility in components
export interface MatchedJob extends Job {
  matchScore: number
  matchReasons: string[]
}

// Application Types - Match backend exactly
export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn'

export interface Application {
  id: string
  jobId: string
  jobTitle: string
  company: string
  status: ApplicationStatus
  appliedAt?: string
  notes: string
  followUpDate?: string
  resumeVersion?: string
  createdAt: string
  updatedAt: string
}

export interface CreateApplicationInput {
  jobId: string
  jobTitle: string
  company: string
  status?: ApplicationStatus  // Has default 'saved'
  appliedAt?: string
  notes?: string  // Has default ''
  followUpDate?: string
  resumeVersion?: string
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus
  notes?: string
  followUpDate?: string
  resumeVersion?: string
  appliedAt?: string
}

export interface ApplicationsResponse {
  applications: Application[]
  total: number
}

// Cover Letter Types - Match backend exactly
export interface CoverLetterResponse {
  coverLetter: string
  highlightedSkills: string[]
  matchedRequirements: string[]
  generatedAt: string
}

// ============================================================================
// Intelligent Job Application System Types (V3)
// ============================================================================

export type FitRecommendation = 'STRONG_APPLY' | 'APPLY' | 'CONDITIONAL' | 'SKIP'
export type CompanyRecommendation = 'STRONG_YES' | 'YES' | 'MAYBE' | 'PASS'
export type HookType = 'direct_relevance' | 'vulnerability' | 'contrarian' | 'achievement'

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

export interface FitScore {
  composite: number  // 0-100
  confidence: number
  recommendation: FitRecommendation
  reasoning: string
}

export interface FitAnalysisResult {
  jobId: string
  userId: string
  companyInsights: CompanyInsights
  matchAnalysis: MatchAnalysis
  fitScore: FitScore
  talkingPoints: string[]
  gapsToAddress: string[]
  interviewQuestions: string[]
  analyzedAt: string
}

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
  companyUsed: string
}

export interface ApplicationKitResult {
  jobId: string
  userId: string
  resume: GeneratedResume
  coverLetter: GeneratedCoverLetter
  questionAnswers?: QuestionAnswer[]
  generatedAt: string
}

export interface CheckFitRequest {
  jobId: string
  profileId: string
}

export interface GenerateApplicationRequest {
  jobId: string
  profileId: string
  applicationQuestions?: string[]
}
