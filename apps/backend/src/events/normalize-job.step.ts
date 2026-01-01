import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { calculateHealthScore, checkCompleteness, type JobSource as HealthJobSource } from '../services/health-scorer'
import { parseLocation } from '../services/location-parser'
import { parseSalary } from '../services/salary-parser'
import { generateContentHash } from '../services/database'
import { rawJobSchema, type RawJob } from '../services/scraper-client'
import { parsePostedAt, extractTags, isRemoteJob, type GoogleJobRaw } from '../services/scrapers/googlejobs-scraper'
import type { Job, JobSourceType } from '../types/job'

// Extended input schema that accepts both old and new formats
const inputSchema = z.object({
  source: z.enum([
    'arbeitnow', 'hackernews', 'reddit', 'remotive', 'googlejobs', 'wellfound',
    'jobicy', 'weworkremotely', 'remoteok', 'braintrust', 'devitjobs', 'dice', 'builtin'
  ]),
  rawJob: z.record(z.string(), z.unknown()),
  // New field from fetch-from-scraper.step.ts
  fetchedAt: z.string().optional()
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
  const { source, fetchedAt: inputFetchedAt } = input
  const rawJob = input.rawJob as Record<string, unknown>
  let normalizedJob: Job

  const jobIdForLog = (rawJob.source_id || rawJob.slug || rawJob.id) as string
  logger.info('Normalizing job', { source, jobId: jobIdForLog })

  try {
    // Check if this is a new format from the Python Scraper API
    // New format has source_id field
    if (rawJob.source_id) {
      normalizedJob = await normalizeScraperApiJob(rawJob, source, inputFetchedAt, logger)
    } else if (source === 'arbeitnow') {
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

// ============================================================================
// Scraper API Job Normalization (New Format)
// ============================================================================

/**
 * Normalizes a job from the Python Scraper API (new format with source_id)
 */
async function normalizeScraperApiJob(
  rawJob: Record<string, unknown>,
  source: string,
  fetchedAt: string | undefined,
  logger: { debug: (msg: string, meta?: Record<string, unknown>) => void }
): Promise<Job> {
  const now = new Date().toISOString()
  const actualFetchedAt = fetchedAt || now

  // Parse location using the location parser
  const locationRaw = rawJob.location_raw as string | undefined
  const parsedLocation = parseLocation(locationRaw)

  // Determine remote status (from rawJob or parsed location)
  const isRemote = rawJob.remote !== undefined
    ? Boolean(rawJob.remote)
    : parsedLocation.isRemote

  // Parse salary using the salary parser
  const salaryParsed = parseSalary(
    rawJob.salary_raw as string | undefined,
    rawJob.salary_min as number | undefined,
    rawJob.salary_max as number | undefined,
    rawJob.salary_currency as string | undefined
  )

  // Extract description (prefer text, fallback to HTML stripped)
  const descriptionText = rawJob.description_text as string | undefined
  const descriptionHtml = rawJob.description_html as string | undefined
  const description = descriptionText || stripHtml(descriptionHtml || '')

  // Determine posted date
  const postedAtRaw = rawJob.posted_at as string | undefined
  const postedAt = postedAtRaw || actualFetchedAt

  // Get tags from rawJob
  const tags = (rawJob.tags as string[]) || []

  // Extract skills from description
  const skills = extractSkills(description, tags)

  // Calculate health score using the new comprehensive scoring
  const sourceAsHealth = source as HealthJobSource
  const completeness = checkCompleteness({
    description,
    location: locationRaw,
    salary: salaryParsed,
    tags: skills
  })
  const healthScore = calculateHealthScore(postedAt, sourceAsHealth, completeness)

  // Generate content hash for deduplication
  const locationForHash = parsedLocation.city || parsedLocation.country || locationRaw || ''
  const contentHash = generateContentHash(
    rawJob.title as string,
    rawJob.company as string,
    locationForHash
  )

  // Build location display string
  const locationDisplay = buildLocationDisplay(parsedLocation, locationRaw)

  // Build normalized job
  const normalizedJob: Job = {
    id: `${source}_${rawJob.source_id as string}`,
    sourceId: rawJob.source_id as string,
    source: source as JobSourceType,

    title: (rawJob.title as string) || 'Untitled',
    company: (rawJob.company as string) || 'Unknown Company',
    companyUrl: rawJob.company_url as string | undefined,

    location: locationDisplay,
    locationParsed: parsedLocation.city || parsedLocation.country ? {
      city: parsedLocation.city,
      state: parsedLocation.state,
      country: parsedLocation.country,
      countryCode: parsedLocation.countryCode,
      raw: parsedLocation.raw
    } : undefined,
    remote: isRemote,

    url: (rawJob.url as string) || '',
    description: description.substring(0, 2000), // Allow longer descriptions

    salary: salaryParsed ? {
      min: salaryParsed.min,
      max: salaryParsed.max,
      currency: salaryParsed.currency,
      period: salaryParsed.period,
      normalizedYearly: salaryParsed.normalizedYearly
    } : undefined,

    employmentType: rawJob.employment_type as string | undefined,
    experienceLevel: rawJob.experience_level as string | undefined,

    tags,
    skills,

    postedAt,
    fetchedAt: actualFetchedAt,

    healthScore,
    contentHash
  }

  logger.debug('Normalized scraper API job', {
    sourceId: normalizedJob.sourceId,
    title: normalizedJob.title,
    company: normalizedJob.company,
    healthScore,
    hasLocation: !!normalizedJob.location,
    hasSalary: !!normalizedJob.salary
  })

  return normalizedJob
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract tech skills from job description and tags
 */
function extractSkills(description: string, tags: string[]): string[] {
  const skills = new Set<string>(tags.map(t => t.toLowerCase()))

  // Common tech skills to detect
  const skillPatterns = [
    // Languages
    'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'ruby',
    'c++', 'c#', 'csharp', 'php', 'scala', 'kotlin', 'swift', 'objective-c',
    // Frontend
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'webpack', 'vite',
    // Backend
    'node', 'nodejs', 'express', 'fastify', 'django', 'flask', 'rails', 'spring',
    'fastapi', 'nest.js', 'nestjs', 'laravel', 'gin',
    // Cloud & DevOps
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
    'jenkins', 'github actions', 'gitlab', 'circleci', 'argocd', 'helm',
    // Databases
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'dynamodb', 'cassandra', 'neo4j', 'sqlite', 'mariadb',
    // Data & ML
    'machine learning', 'ml', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
    'pandas', 'numpy', 'spark', 'kafka', 'airflow', 'dbt', 'snowflake',
    // APIs & Protocols
    'graphql', 'rest', 'restful', 'grpc', 'websocket', 'openapi', 'swagger',
    // Other
    'git', 'linux', 'agile', 'scrum', 'ci/cd', 'microservices', 'serverless'
  ]

  const lowerDesc = description.toLowerCase()

  for (const skill of skillPatterns) {
    // Use word boundaries to avoid partial matches
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (pattern.test(lowerDesc)) {
      skills.add(skill)
    }
  }

  return Array.from(skills).slice(0, 20) // Limit to 20 skills
}

/**
 * Build a display-friendly location string from parsed location
 */
function buildLocationDisplay(
  parsed: ReturnType<typeof parseLocation>,
  raw: string | undefined
): string | undefined {
  if (!raw && !parsed.city && !parsed.country) {
    return undefined
  }

  const parts: string[] = []

  if (parsed.city) {
    parts.push(parsed.city)
  }

  if (parsed.state) {
    parts.push(parsed.state)
  }

  if (parsed.country) {
    parts.push(parsed.country)
  }

  if (parts.length === 0) {
    return raw
  }

  // Add remote indicator if applicable
  if (parsed.isRemote && parts.length > 0) {
    const remoteLabel = parsed.remoteType === 'hybrid' ? ' (Hybrid)'
      : parsed.remoteType === 'flexible' ? ' (Flexible Remote)'
        : ' (Remote)'
    return parts.join(', ') + remoteLabel
  }

  return parts.join(', ')
}
