/**
 * @deprecated This scraper is ORPHANED and NOT IN USE.
 *
 * DEPRECATION NOTICE (2026-01-02):
 * ================================
 * This file contains legacy Jobicy API scraping logic.
 * This code is NOT called anywhere in the active codebase.
 *
 * All job scraping is now handled by the external Python Scraper API
 * located at /Users/dave/Work/python-scraper
 *
 * The Python scraper handles Jobicy via Playwright with stealth mode.
 *
 * This file is preserved for reference only.
 *
 * @see /Users/dave/Work/python-scraper - New scraper implementation
 * @see docs/plans/MIGRATION_PYTHON_SCRAPER_INTEGRATION.md - Migration details
 */

/**
 * Jobicy Job Scraper
 *
 * Jobicy provides a free JSON API for remote job listings.
 * No API key required.
 *
 * API Docs: https://jobicy.com/jobs-rss-feed
 * API Endpoint: https://jobicy.com/api/v2/remote-jobs
 *
 * Query Parameters:
 * - count: Number of jobs (max 50)
 * - tag: Filter by skill tag (e.g., "javascript", "python")
 * - geo: Filter by region (e.g., "usa", "europe")
 * - industry: Filter by industry
 */

export interface JobicyJobRaw {
  id: number
  url: string
  jobTitle: string
  companyName: string
  companyLogo?: string
  jobIndustry: string[]
  jobType: string[]
  jobGeo: string
  jobLevel?: string
  jobExcerpt?: string
  jobDescription: string
  pubDate: string
  annualSalaryMin?: number
  annualSalaryMax?: number
  salaryCurrency?: string
}

export interface JobicyResponse {
  jobs: JobicyJobRaw[]
  jobCount?: number
}

export interface JobicyScrapeOptions {
  count?: number      // Max 50 per request
  tag?: string        // Filter by skill tag
  geo?: string        // Filter by region
  industry?: string   // Filter by industry
}

/**
 * Scrape jobs from Jobicy API
 *
 * @param options - Scrape options (count, tag, geo, industry)
 * @returns Array of raw job data from Jobicy
 */
export async function scrapeJobicy(
  options: JobicyScrapeOptions = {}
): Promise<JobicyJobRaw[]> {
  const { count = 50, tag, geo, industry } = options

  console.log(`[Jobicy] scrapeJobicy called with options:`, {
    count,
    tag: tag || '(none)',
    geo: geo || '(none)',
    industry: industry || '(none)'
  })

  try {
    // Build URL with query parameters
    const params = new URLSearchParams()
    params.set('count', Math.min(count, 50).toString())

    if (tag) {
      params.set('tag', tag)
    }
    if (geo) {
      params.set('geo', geo)
    }
    if (industry) {
      params.set('industry', industry)
    }

    const url = `https://jobicy.com/api/v2/remote-jobs?${params.toString()}`
    console.log(`[Jobicy] Fetching: ${url}`)

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JobAggregator/1.0 (https://github.com/job-aggregator)'
      }
    })

    console.log(`[Jobicy] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Jobicy] API error response: ${errorText.substring(0, 500)}`)
      throw new Error(`Jobicy API returned ${response.status}: ${errorText}`)
    }

    const data: JobicyResponse = await response.json()

    console.log(`[Jobicy] Response received:`, {
      jobCount: data.jobs?.length || 0,
      hasJobs: !!data.jobs
    })

    if (!data.jobs || !Array.isArray(data.jobs)) {
      console.warn('[Jobicy] No jobs array in response')
      return []
    }

    // Log sample job for debugging
    if (data.jobs.length > 0) {
      const sample = data.jobs[0]
      console.log(`[Jobicy] Sample job:`, {
        id: sample.id,
        title: sample.jobTitle,
        company: sample.companyName,
        geo: sample.jobGeo,
        hasSalary: !!(sample.annualSalaryMin || sample.annualSalaryMax)
      })
    }

    console.log(`[Jobicy] Returning ${data.jobs.length} jobs`)
    return data.jobs

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Jobicy] Scrape failed: ${message}`)
    throw error
  }
}

/**
 * Parse Jobicy date string to ISO timestamp
 * Jobicy uses format: "2024-12-23 10:00:00"
 *
 * @param pubDate - Date string from Jobicy API
 * @returns ISO timestamp string
 */
export function parseJobicyDate(pubDate: string): string {
  if (!pubDate) {
    return new Date().toISOString()
  }

  try {
    // Replace space with T for ISO format compatibility
    const isoLike = pubDate.replace(' ', 'T')
    const date = new Date(isoLike)

    if (isNaN(date.getTime())) {
      console.warn(`[Jobicy] Could not parse date: ${pubDate}`)
      return new Date().toISOString()
    }

    return date.toISOString()
  } catch {
    console.warn(`[Jobicy] Date parsing error for: ${pubDate}`)
    return new Date().toISOString()
  }
}

/**
 * Extract tags from Jobicy job data
 *
 * @param job - Raw Jobicy job data
 * @returns Array of extracted tags
 */
export function extractJobicyTags(job: JobicyJobRaw): string[] {
  const tags: Set<string> = new Set()

  // Add job industries as tags
  if (job.jobIndustry && Array.isArray(job.jobIndustry)) {
    for (const industry of job.jobIndustry) {
      if (industry && industry.length < 50) {
        tags.add(industry)
      }
    }
  }

  // Add job types as tags (e.g., "full-time", "contract")
  if (job.jobType && Array.isArray(job.jobType)) {
    for (const type of job.jobType) {
      if (type && type.length < 30) {
        tags.add(type)
      }
    }
  }

  // Add job level if present (e.g., "Senior", "Junior")
  if (job.jobLevel && job.jobLevel.length < 30) {
    tags.add(job.jobLevel)
  }

  // Extract programming languages and frameworks from description
  const techPatterns = [
    /\b(Python|JavaScript|TypeScript|Java|C\+\+|Ruby|Go|Rust|PHP|Swift|Kotlin|Scala)\b/gi,
    /\b(React|Angular|Vue|Next\.js|Node\.js|Django|Flask|Spring|Rails|Laravel)\b/gi,
    /\b(AWS|Azure|GCP|Docker|Kubernetes|Terraform|CI\/CD)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)\b/gi,
    /\b(GraphQL|REST|API|Microservices)\b/gi
  ]

  const textToScan = `${job.jobTitle} ${job.jobDescription || ''} ${job.jobExcerpt || ''}`

  for (const pattern of techPatterns) {
    const matches = textToScan.match(pattern)
    if (matches) {
      for (const match of matches) {
        tags.add(match)
      }
    }
  }

  return Array.from(tags).slice(0, 15) // Limit to 15 tags
}

/**
 * Format salary range for display
 *
 * @param job - Raw Jobicy job data
 * @returns Formatted salary string or undefined
 */
export function formatJobicySalary(job: JobicyJobRaw): string | undefined {
  if (!job.annualSalaryMin && !job.annualSalaryMax) {
    return undefined
  }

  const currency = job.salaryCurrency || 'USD'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  })

  if (job.annualSalaryMin && job.annualSalaryMax) {
    return `${formatter.format(job.annualSalaryMin)} - ${formatter.format(job.annualSalaryMax)}`
  } else if (job.annualSalaryMin) {
    return `From ${formatter.format(job.annualSalaryMin)}`
  } else if (job.annualSalaryMax) {
    return `Up to ${formatter.format(job.annualSalaryMax)}`
  }

  return undefined
}

/**
 * Test the Jobicy scraper
 */
export async function testJobicyScraper(): Promise<boolean> {
  try {
    console.log('[Jobicy] Running scraper test...')
    const jobs = await scrapeJobicy({ count: 5 })
    console.log(`[Jobicy] Test complete. Found ${jobs.length} jobs`)

    if (jobs.length > 0) {
      console.log('[Jobicy] Sample job tags:', extractJobicyTags(jobs[0]))
      console.log('[Jobicy] Sample job date:', parseJobicyDate(jobs[0].pubDate))
      console.log('[Jobicy] Sample job salary:', formatJobicySalary(jobs[0]))
    }

    return jobs.length > 0
  } catch (error) {
    console.error('[Jobicy] Test failed:', error)
    return false
  }
}
