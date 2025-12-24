import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { calculateHealthScore } from '../services/health-scorer'
import { parsePostedAt, extractTags, isRemoteJob, type GoogleJobRaw } from '../services/scrapers/googlejobs-scraper'
import type { Job } from '../types/job'

const inputSchema = z.object({
  source: z.enum(['arbeitnow', 'hackernews', 'reddit', 'remotive', 'googlejobs', 'wellfound', 'jobicy', 'weworkremotely']),
  rawJob: z.record(z.string(), z.unknown())
})

export const config: EventConfig = {
  type: 'event',
  name: 'NormalizeJob',
  description: 'Normalizes job data from different sources to a common schema',
  subscribes: ['normalize-job'],
  emits: ['index-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

export const handler: Handlers['NormalizeJob'] = async (input, { emit, logger }) => {
  const { source } = input
  const rawJob = input.rawJob as Record<string, unknown>
  let normalizedJob: Job

  logger.info('Normalizing job', { source, jobId: (rawJob.slug || rawJob.id) as string })

  try {
    if (source === 'arbeitnow') {
      const createdAt = rawJob.created_at as number
      const postedAt = new Date(createdAt * 1000).toISOString()
      normalizedJob = {
        id: `arbeitnow_${rawJob.slug as string}`,
        title: (rawJob.title as string) || 'Untitled',
        company: (rawJob.company_name as string) || 'Unknown Company',
        location: (rawJob.location as string) || undefined,
        remote: Boolean(rawJob.remote),
        url: (rawJob.url as string) || '',
        description: ((rawJob.description as string) || '').substring(0, 500),
        source: 'arbeitnow',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags: (rawJob.tags as string[]) || [],
        healthScore: calculateHealthScore(postedAt)
      }
    } else if (source === 'hackernews') {
      const postedAtRaw = rawJob.posted_at as number | undefined
      const postedAt = postedAtRaw
        ? new Date(postedAtRaw * 1000).toISOString()
        : new Date().toISOString()
      const locationStr = (rawJob.location as string) || ''
      const descriptionStr = (rawJob.description as string) || ''
      const isRemote =
        locationStr.toLowerCase().includes('remote') ||
        descriptionStr.toLowerCase().includes('remote')
      normalizedJob = {
        id: `hackernews_${rawJob.id as string}`,
        title: (rawJob.title as string) || 'Software Engineer',
        company: (rawJob.company as string) || 'Unknown Company',
        location: locationStr || undefined,
        remote: isRemote,
        url: (rawJob.url as string) || `https://news.ycombinator.com/item?id=${rawJob.id}`,
        description: descriptionStr.substring(0, 500),
        source: 'hackernews',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags: [],
        healthScore: calculateHealthScore(postedAt)
      }
    } else if (source === 'reddit') {
      const postedAtRaw = rawJob.posted_at as number | undefined
      const postedAt = postedAtRaw
        ? new Date(postedAtRaw * 1000).toISOString()
        : new Date().toISOString()
      const titleStr = (rawJob.title as string) || ''
      const descriptionStr = (rawJob.description as string) || ''
      const isRemote =
        titleStr.toLowerCase().includes('remote') ||
        descriptionStr.toLowerCase().includes('remote')
      normalizedJob = {
        id: `reddit_${rawJob.id as string}`,
        title: titleStr || 'Job Posting',
        company: (rawJob.company as string) || 'Unknown Company',
        location: (rawJob.location as string) || undefined,
        remote: isRemote,
        url: (rawJob.url as string) || '',
        description: descriptionStr.substring(0, 500),
        source: 'reddit',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags: (rawJob.tags as string[]) || [],
        healthScore: calculateHealthScore(postedAt)
      }
    } else if (source === 'remotive') {
      const postedAtRaw = rawJob.posted_at as number | undefined
      const postedAt = postedAtRaw
        ? new Date(postedAtRaw * 1000).toISOString()
        : new Date().toISOString()
      normalizedJob = {
        id: `remotive_${rawJob.id as string}`,
        title: (rawJob.title as string) || 'Remote Job',
        company: (rawJob.company as string) || 'Unknown Company',
        location: (rawJob.location as string) || 'Remote',
        remote: true, // Remotive is always remote
        url: (rawJob.url as string) || '',
        description: ((rawJob.description as string) || '').substring(0, 500),
        source: 'remotive',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags: (rawJob.tags as string[]) || [],
        healthScore: calculateHealthScore(postedAt)
      }
    } else if (source === 'googlejobs') {
      // Cast to GoogleJobRaw for proper typing
      const googleJob = rawJob as unknown as GoogleJobRaw
      const postedAt = parsePostedAt(googleJob.detected_extensions?.posted_at)
      const tags = extractTags(googleJob)
      const remote = isRemoteJob(googleJob)

      // Build apply URL - Google Jobs via string is the actual job board
      // related_links might contain direct apply links
      let applyUrl = ''
      if (googleJob.related_links && googleJob.related_links.length > 0) {
        applyUrl = googleJob.related_links[0].link
      } else {
        // Fallback to Google Jobs search with job_id
        applyUrl = `https://www.google.com/search?q=${encodeURIComponent(googleJob.title + ' ' + googleJob.company_name)}&ibp=htl;jobs#htivrt=jobs&htidocid=${googleJob.job_id}`
      }

      normalizedJob = {
        id: `googlejobs_${googleJob.job_id}`,
        title: googleJob.title || 'Job Opening',
        company: googleJob.company_name || 'Unknown Company',
        location: googleJob.location || undefined,
        remote,
        url: applyUrl,
        description: (googleJob.description || '').substring(0, 500),
        source: 'googlejobs',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags,
        healthScore: calculateHealthScore(postedAt)
      }
    } else if (source === 'wellfound') {
      // Wellfound (AngelList) jobs from Playwright scraper
      const postedAtRaw = rawJob.posted_at as number | undefined
      const postedAt = postedAtRaw
        ? new Date(postedAtRaw * 1000).toISOString()
        : new Date().toISOString()

      // Build location string, include salary if available
      let locationStr = (rawJob.location as string) || ''
      const salary = rawJob.salary as string | undefined
      if (salary && !locationStr.includes(salary)) {
        locationStr = locationStr ? `${locationStr} | ${salary}` : salary
      }

      // Detect remote from location or explicit flag
      const isRemote = Boolean(rawJob.remote) ||
        locationStr.toLowerCase().includes('remote') ||
        ((rawJob.description as string) || '').toLowerCase().includes('remote')

      // Merge scraped tags
      const tags = (rawJob.tags as string[]) || []

      normalizedJob = {
        id: `wellfound_${rawJob.id as string}`,
        title: (rawJob.title as string) || 'Startup Job',
        company: (rawJob.company as string) || 'Unknown Company',
        location: locationStr || undefined,
        remote: isRemote,
        url: (rawJob.url as string) || '',
        description: ((rawJob.description as string) || '').substring(0, 500),
        source: 'wellfound',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags,
        healthScore: calculateHealthScore(postedAt)
      }
    } else if (source === 'jobicy') {
      // Jobicy remote jobs API
      const pubDateStr = rawJob.pubDate as string | undefined
      const postedAt = pubDateStr
        ? new Date(pubDateStr).toISOString()
        : new Date().toISOString()

      // Combine jobIndustry and jobType arrays for tags
      const industryTags = (rawJob.jobIndustry as string[]) || []
      const typeTags = (rawJob.jobType as string[]) || []
      const tags = [...industryTags, ...typeTags]

      // Use jobDescription or jobExcerpt, truncated
      const description = ((rawJob.jobDescription as string) || (rawJob.jobExcerpt as string) || '').substring(0, 500)

      normalizedJob = {
        id: `jobicy_${rawJob.id as string}`,
        title: (rawJob.jobTitle as string) || 'Remote Job',
        company: (rawJob.companyName as string) || 'Unknown Company',
        location: (rawJob.jobGeo as string) || 'Remote',
        remote: true, // Jobicy is always remote
        url: (rawJob.url as string) || '',
        description,
        source: 'jobicy',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags,
        healthScore: calculateHealthScore(postedAt)
      }
    } else if (source === 'weworkremotely') {
      // WeWorkRemotely RSS feed jobs
      const pubDateStr = rawJob.pubDate as string | undefined
      const postedAt = pubDateStr
        ? new Date(pubDateStr).toISOString()
        : new Date().toISOString()

      // Extract title and company from RSS title format "Company: Job Title"
      const fullTitle = (rawJob.title as string) || ''
      let company = 'Unknown Company'
      let title = fullTitle
      const colonIndex = fullTitle.indexOf(':')
      if (colonIndex !== -1) {
        company = fullTitle.substring(0, colonIndex).trim()
        title = fullTitle.substring(colonIndex + 1).trim() || 'Remote Job'
      }

      // Strip HTML from description and truncate
      const rawDescription = (rawJob.description as string) || ''
      const description = rawDescription.replace(/<[^>]*>/g, '').substring(0, 500)

      // Use guid or generate an id from index
      const jobId = (rawJob.guid as string) || (rawJob.index as string) || String(Date.now())

      normalizedJob = {
        id: `weworkremotely_${jobId}`,
        title,
        company,
        location: 'Remote',
        remote: true, // WeWorkRemotely is always remote
        url: (rawJob.link as string) || '',
        description,
        source: 'weworkremotely',
        postedAt,
        fetchedAt: new Date().toISOString(),
        tags: [],
        healthScore: calculateHealthScore(postedAt)
      }
    } else {
      logger.warn('Unknown source, skipping', { source })
      return
    }

    await emit({
      topic: 'index-job',
      data: { job: normalizedJob }
    })

    logger.info('Job normalized and emitted for indexing', { jobId: normalizedJob.id })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to normalize job', { source, error: errorMessage })
  }
}
