// Shared types for Job Aggregator monorepo
// Add shared TypeScript types here

export interface Job {
  id: string
  title: string
  company: string
  location?: string
  remote: boolean
  url: string
  description: string
  source: 'arbeitnow' | 'hackernews' | 'reddit' | 'googlejobs' | 'wellfound'
  postedAt: string
  fetchedAt: string
  tags: string[]
  healthScore: number
}

export interface Source {
  name: string
  status: 'active' | 'inactive' | 'error'
  lastFetch?: string
  jobCount: number
}
