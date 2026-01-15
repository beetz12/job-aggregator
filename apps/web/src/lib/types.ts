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
  | 'yc_jobs'
  | 'themuse'
  | 'jobicy_api'

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
  'builtin',
  'yc_jobs',
  'themuse',
  'jobicy_api'
]

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
  builtin: 'Built In',
  yc_jobs: 'Y Combinator Jobs',
  themuse: 'The Muse',
  jobicy_api: 'Jobicy API'
}

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
  builtin: 'bg-orange-600',
  yc_jobs: 'bg-amber-500',
  themuse: 'bg-violet-600',
  jobicy_api: 'bg-cyan-600'
}

export interface Job {
  id: string
  source_id?: string
  title: string
  company: string
  company_url?: string
  location?: string
  location_parsed?: {
    raw: string
    city?: string
    state?: string
    country?: string
    country_code?: string
    is_remote: boolean
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
    normalized_yearly?: { min?: number; max?: number }
  }
  employment_type?: 'full-time' | 'part-time' | 'contract' | 'internship'
  experience_level?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  posted_at: string
  fetched_at: string
  tags: string[]
  skills?: string[]
  health_score: number
  content_hash?: string
  ai_summary?: string
}

export interface JobsResponse {
  jobs: Job[]
  total: number
  sources: string[]
  last_updated: string
}

export interface Source {
  name: string
  display_name: string
  last_fetch: string | null
  job_count: number
  status: 'success' | 'error' | 'pending' | 'unknown'
  error?: string
  is_active: boolean
  color: string
}

export interface SourcesResponse {
  sources: Source[]
}

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship'
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive'

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
]

export interface JobFilters {
  source?: string
  remote?: boolean
  limit?: number
  offset?: number
  search?: string
  // Advanced filters
  tags?: string[]
  salaryMin?: number
  salaryMax?: number
  locations?: string[]
  employmentTypes?: EmploymentType[]
  experienceLevels?: ExperienceLevel[]
}

export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'lead' | 'unknown'
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
  experience_years: number
  seniority_level: SeniorityLevel
  remote_preference: RemotePreference
  preferred_locations: string[]
  salary_expectation?: SalaryExpectation
  created_at: string
  updated_at: string
  resume_url?: string
  resume_text?: string
  resume_markdown?: string
  resume_parsed_at?: string
  resume_skills?: string[]
}

export interface CreateProfileInput {
  id?: string
  name: string
  email: string
  skills: string[]
  experience_years: number
  seniority_level: SeniorityLevel
  remote_preference: RemotePreference
  preferred_locations: string[]
  salary_expectation?: SalaryExpectation
}

export interface UpdateProfileInput extends Partial<CreateProfileInput> {}

export interface MatchScoreBreakdown {
  skill_score: number
  seniority_score: number
  location_score: number
  salary_score: number
}

export interface MatchScore {
  profile_id: string
  job_id: string
  total_score: number
  breakdown: MatchScoreBreakdown
  calculated_at: string
}

export interface MatchedJobItem {
  job: Job
  match_score: MatchScore
}

export interface MatchedJobsResponse {
  matches: MatchedJobItem[]
  profile_id: string
  total: number
}

export interface MatchedJob extends Job {
  match_score: number
  match_reasons: string[]
}

export type ApplicationStatus =
  | 'saved'
  | 'analyzing'
  | 'analyzed'
  | 'generating'
  | 'resume_ready'
  | 'applying'
  | 'needs_input'
  | 'applied'
  | 'failed'
  | 'interview'
  | 'rejected'
  | 'offer'
  | 'withdrawn'

export interface Application {
  id: string
  job_id: string
  job_title: string
  company: string
  status: ApplicationStatus
  applied_at?: string
  notes: string
  follow_up_date?: string
  resume_version?: string
  created_at: string
  updated_at: string
  custom_resume_markdown?: string
  custom_resume_generated_at?: string
  custom_cover_letter_markdown?: string
  submission_url?: string
  qa_responses?: Array<{ question: string; answer: string; company_used?: boolean }>
  submitted_at?: string
  checkpoint_status?: string
  checkpoint_data?: Record<string, unknown>
}

export interface CreateApplicationInput {
  job_id: string
  job_title: string
  company: string
  status?: ApplicationStatus
  applied_at?: string
  notes?: string
  follow_up_date?: string
  resume_version?: string
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus
  notes?: string
  follow_up_date?: string
  resume_version?: string
  applied_at?: string
  custom_resume_markdown?: string
  custom_cover_letter_markdown?: string
  checkpoint_status?: string
  checkpoint_data?: Record<string, unknown>
}

export interface ApplicationsResponse {
  applications: Application[]
  total: number
}

export interface CoverLetterResponse {
  cover_letter: string
  highlighted_skills: string[]
  matched_requirements: string[]
  generated_at: string
}

export type FitRecommendation = 'STRONG_APPLY' | 'APPLY' | 'CONDITIONAL' | 'SKIP'
export type CompanyRecommendation = 'STRONG_YES' | 'YES' | 'MAYBE' | 'PASS'
export type HookType = 'direct_relevance' | 'vulnerability' | 'contrarian' | 'achievement'

export interface CompanyScores {
  compensation: number
  culture: number
  family_friendliness: number
  technical_fit: number
  industry: number
  long_term_potential: number
}

export interface CompanyInsights {
  overall_score: number
  scores: CompanyScores
  green_flags: string[]
  red_flags: string[]
  recent_news: string[]
  recommendation: CompanyRecommendation
}

export interface MatchAnalysis {
  overall_match: number
  strong_matches: string[]
  partial_matches: string[]
  gaps: string[]
  transferable_skills: string[]
}

export interface FitScore {
  composite: number
  confidence: number
  recommendation: FitRecommendation
  reasoning: string
}

export interface FitAnalysisResult {
  job_id: string
  user_id: string
  company_insights: CompanyInsights
  match_analysis: MatchAnalysis
  fit_score: FitScore
  talking_points: string[]
  gaps_to_address: string[]
  interview_questions: string[]
  analyzed_at: string
}

export interface GeneratedResume {
  markdown: string
  pdf_path?: string
  highlighted_skills: string[]
  ats_score: number
}

export interface GeneratedCoverLetter {
  markdown: string
  pdf_path?: string
  hook_type: HookType
  key_points: string[]
}

export interface QuestionAnswer {
  question: string
  answer: string
  company_used: string
}

export interface ApplicationKitResult {
  job_id: string
  user_id: string
  resume: GeneratedResume
  cover_letter: GeneratedCoverLetter
  question_answers?: QuestionAnswer[]
  generated_at: string
}

export interface CheckFitRequest {
  job_id: string
  profile_id: string
}

export interface GenerateApplicationRequest {
  job_id: string
  profile_id: string
  application_questions?: string[]
}

export interface UploadResumeInput {
  resume_text: string
  resume_markdown?: string
}

export interface UploadResumeResponse {
  profile: Profile
  extracted_skills: string[]
  skill_count: number
}

// Career Advisor Types
export interface JobCriteria {
  name: string
  lastUpdated: string
  executiveSummary: string
  compensation: {
    floor: number
    target: number
    currency: string
    equity: boolean
    equityImportance?: 'critical' | 'important' | 'nice-to-have'
    benefits?: string[]
  }
  location: {
    remote: 'required' | 'preferred' | 'flexible'
    preferredLocations?: string[]
    geoRestrictions?: string[]
    timezonePreference?: string
  }
  culture: {
    values: string[]
    redFlags: string[]
    leadershipStyle?: string
    workStyle?: 'async' | 'sync' | 'hybrid'
    teamSize?: 'small' | 'medium' | 'large' | 'any'
  }
  technicalStack: {
    mustHave: string[]
    niceToHave: string[]
    avoid?: string[]
    domains?: string[]
  }
  companyStage: 'startup' | 'growth' | 'enterprise' | 'any'
  targetPositions: string[]
}

export interface InterviewAnswers {
  [questionId: string]: string
}

// ============================================================================
// Enhanced Career Advisor Integration Types (Phase 7)
// ============================================================================

export interface CriteriaMatch {
  salaryAlignment: 'above' | 'within' | 'below' | 'unknown'
  locationMatch: boolean
  cultureFlags: {
    green: string[]
    red: string[]
  }
  techStackCoverage: number
  companyStageMatch: boolean
}

export type ShouldApply = 'DEFINITELY' | 'LIKELY' | 'MAYBE' | 'PROBABLY_NOT' | 'NO'

export interface EnhancedFitAnalysisResult {
  job_id: string
  user_id: string
  company_insights: CompanyInsights
  match_analysis: MatchAnalysis
  fit_score: FitScore
  talking_points: string[]
  gaps_to_address: string[]
  interview_questions: string[]
  analyzed_at: string
  criteria_match?: CriteriaMatch
  should_apply: ShouldApply
  detailed_reasoning: string[]
}

export interface EnhancedCheckFitRequest {
  job_id?: string
  job_description?: string
  profile_id: string
  job_criteria?: JobCriteria
}

// ============================================================================
// Dynamic Interview Questions Types
// ============================================================================

export type InterviewCategory =
  | 'COMPENSATION'
  | 'LOCATION'
  | 'CULTURE'
  | 'COMPANY_STAGE'
  | 'TECHNICAL'

export interface InterviewQuestion {
  id: string
  question: string
  category: InterviewCategory
  placeholder: string
  helpText?: string
}

export interface ResumeInsights {
  detected_skills: string[]
  experience_level: string
  industries: string[]
}

export interface GenerateInterviewQuestionsResponse {
  questions: InterviewQuestion[]
  generated: boolean
  resume_insights?: ResumeInsights
}

// ============================================================================
// Career Compass Types (Resume Analysis & Job Requirements Generation)
// ============================================================================

/**
 * Structured resume data extracted from resume text using AI analysis
 */
export interface ResumeData {
  name: string
  summary: string
  skills: string[]
  experience: string[]
  rawText: string
}

/**
 * Target position details for job search criteria
 */
export interface TargetPosition {
  title: string
  seniority: string
  focus: string
  reason: string
}

/**
 * Compensation expectations for job requirements
 */
export interface CompensationRequirement {
  baseFloor: string
  baseTarget: string
  equityExpectation: string
  benefits: string[]
}

/**
 * Company preference by stage/size for job requirements
 */
export interface CompanyPreference {
  stage: string
  size: string
  interest: 'High' | 'Medium' | 'Low'
}

/**
 * Comprehensive job requirements document generated from resume and interview answers
 */
export interface JobRequirementsDoc {
  name: string
  lastUpdated: string
  executiveSummary: string
  targetPositions: TargetPosition[]
  compensation: CompensationRequirement
  location: {
    preference: string
    exclusions: string[]
  }
  cultureValues: {
    philosophy: string
    mustHaves: string[]
    redFlags: string[]
  }
  technicalStack: {
    mustHave: string[]
    niceToHave: string[]
  }
}

/**
 * Simple interview question format used by Career Compass resume analysis
 * Note: This is different from the more detailed InterviewQuestion type used
 * by the dynamic interview questions system
 */
export interface CareerCompassInterviewQuestion {
  id: string
  question: string
  category: string
  placeholder: string
}

/**
 * Response from the analyze-resume endpoint
 */
export interface AnalyzeResumeResponse {
  data: ResumeData
  questions: CareerCompassInterviewQuestion[]
}
