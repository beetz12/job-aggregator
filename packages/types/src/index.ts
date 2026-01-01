// Shared types for Job Aggregator monorepo

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

export interface Source {
  name: string
  displayName?: string
  status: 'success' | 'error' | 'pending' | 'unknown'
  lastFetch?: string | null
  jobCount: number
  error?: string
  isActive?: boolean
  color?: string
}
