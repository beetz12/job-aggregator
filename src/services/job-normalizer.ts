import { Job } from '../types/job'
import { calculateHealthScore } from './health-scorer'

interface ArbeitnowJob {
  slug: string
  company_name: string
  title: string
  description: string
  remote: boolean
  url: string
  tags: string[]
  job_types: string[]
  location: string
  created_at: number
}

interface HackerNewsJob {
  id: string
  company: string
  title: string
  location?: string
  description: string
  url: string
  posted_at: number
}

export function normalizeArbeitnowJob(raw: ArbeitnowJob): Job {
  const postedAt = new Date(raw.created_at * 1000).toISOString()
  return {
    id: `arbeitnow_${raw.slug}`,
    title: raw.title,
    company: raw.company_name,
    location: raw.location || undefined,
    remote: raw.remote,
    url: raw.url,
    description: raw.description.substring(0, 500),
    source: 'arbeitnow',
    postedAt,
    fetchedAt: new Date().toISOString(),
    tags: raw.tags || [],
    healthScore: calculateHealthScore(postedAt)
  }
}

export function normalizeHackerNewsJob(raw: HackerNewsJob): Job {
  const postedAt = new Date(raw.posted_at * 1000).toISOString()
  const isRemote = raw.location?.toLowerCase().includes('remote') ||
                   raw.description?.toLowerCase().includes('remote') || false
  return {
    id: `hackernews_${raw.id}`,
    title: raw.title,
    company: raw.company,
    location: raw.location || undefined,
    remote: isRemote,
    url: raw.url,
    description: raw.description.substring(0, 500),
    source: 'hackernews',
    postedAt,
    fetchedAt: new Date().toISOString(),
    tags: [],
    healthScore: calculateHealthScore(postedAt)
  }
}
