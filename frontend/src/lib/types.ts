export interface Job {
  id: string
  title: string
  company: string
  location?: string
  remote: boolean
  url: string
  description: string
  source: 'arbeitnow' | 'hackernews' | 'reddit'
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
