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

export interface Source {
  name: string
  display_name?: string
  status: 'success' | 'error' | 'pending' | 'unknown'
  last_fetch?: string | null
  job_count: number
  error?: string
  is_active?: boolean
  color?: string
}

// ============================================================================
// Career Compass Types (Resume Analysis & Job Requirements)
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
 * Interview question generated based on resume analysis
 */
export interface InterviewQuestion {
  id: string
  question: string
  category: string
  placeholder: string
}

/**
 * Target position details for job search
 */
export interface TargetPosition {
  title: string
  seniority: string
  focus: string
  reason: string
}

/**
 * Compensation expectations for job search
 */
export interface Compensation {
  baseFloor: string
  baseTarget: string
  equityExpectation: string
  benefits: string[]
}

/**
 * Company preference by stage/size
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
  compensation: Compensation
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
