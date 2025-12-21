export interface Job {
  id: string
  title: string
  company: string
  location?: string
  remote: boolean
  url: string
  description: string
  source: 'arbeitnow' | 'hackernews' | 'reddit' | 'remotive'
  postedAt: string
  fetchedAt: string
  tags: string[]
  healthScore: number
}

export interface JobsResponse {
  jobs: Job[]
  total: number
  sources: string[]
  lastUpdated: string
}

export interface Source {
  name: string
  lastFetch: string | null
  jobCount: number
  status: 'success' | 'error' | 'pending' | 'unknown'
  error?: string
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
