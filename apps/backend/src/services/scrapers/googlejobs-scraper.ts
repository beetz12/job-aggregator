/**
 * @deprecated This scraper is deprecated in favor of the Python Scraper API.
 *
 * DEPRECATION NOTICE (2026-01-02):
 * ================================
 * This file contains legacy Google Jobs scraping logic that used the SerpAPI.
 * All job scraping is now handled by the external Python Scraper API
 * located at /Users/dave/Work/python-scraper
 *
 * The utility functions (parsePostedAt, extractTags, isRemoteJob) are still
 * imported by normalize-job.step.ts for backward compatibility with legacy
 * data formats, but new jobs use the Python API format exclusively.
 *
 * DO NOT add new functionality to this file.
 *
 * @see /Users/dave/Work/python-scraper - New scraper implementation
 * @see docs/plans/MIGRATION_PYTHON_SCRAPER_INTEGRATION.md - Migration details
 */

/**
 * Google Jobs Scraper via SerpAPI
 *
 * SerpAPI provides structured Google Jobs data without the need for
 * complex scraping. Requires SERPAPI_KEY environment variable.
 *
 * API Docs: https://serpapi.com/google-jobs-api
 */

export interface GoogleJobRaw {
  title: string
  company_name: string
  location: string
  via: string  // "via LinkedIn", "via Indeed", etc.
  description: string
  job_id: string
  thumbnail?: string
  detected_extensions?: {
    posted_at?: string      // "1 day ago", "2 weeks ago"
    schedule_type?: string  // "Full-time", "Part-time", "Contractor"
    salary?: string         // "$80,000 - $120,000 a year"
    work_from_home?: boolean
  }
  job_highlights?: Array<{
    title: string           // "Qualifications", "Responsibilities", "Benefits"
    items: string[]
  }>
  related_links?: Array<{
    link: string
    text: string
  }>
  extensions?: string[]     // ["Full-time", "Health insurance", "401(k)"]
}

export interface GoogleJobsResponse {
  jobs_results?: GoogleJobRaw[]
  search_metadata?: {
    id: string
    status: string
    json_endpoint: string
    created_at: string
    processed_at: string
    google_jobs_url: string
    raw_html_file: string
    total_time_taken: number
  }
  search_parameters?: {
    engine: string
    q: string
    google_domain: string
    location_requested?: string
    location_used?: string
  }
  error?: string
}

/**
 * Scrape jobs from Google Jobs via SerpAPI
 *
 * @param query - Search query (e.g., "software engineer", "react developer")
 * @param location - Location filter (e.g., "United States", "New York, NY")
 * @param maxJobs - Maximum number of jobs to fetch (default: 50)
 * @returns Array of raw job data from Google Jobs
 */
export async function scrapeGoogleJobs(
  query: string,
  location: string,
  maxJobs: number = 50
): Promise<GoogleJobRaw[]> {
  console.log(`[GoogleJobs] scrapeGoogleJobs called with: query="${query}", location="${location}", maxJobs=${maxJobs}`)

  const apiKey = process.env.SERPAPI_KEY

  if (!apiKey) {
    console.warn('[GoogleJobs] SERPAPI_KEY not configured, returning empty results')
    console.warn('[GoogleJobs] Available env vars:', Object.keys(process.env).filter(k => k.includes('SERP') || k.includes('API')))
    return []
  }

  console.log(`[GoogleJobs] SERPAPI_KEY found (length: ${apiKey.length}, prefix: ${apiKey.substring(0, 8)}...)`)

  const allJobs: GoogleJobRaw[] = []
  let start = 0
  const pageSize = 10  // SerpAPI returns ~10 jobs per page

  try {
    while (allJobs.length < maxJobs) {
      const params = new URLSearchParams({
        engine: 'google_jobs',
        q: query,
        location: location,
        api_key: apiKey,
        start: start.toString(),
        // Optional parameters for better results
        hl: 'en',           // Language
        gl: 'us',           // Country
      })

      const url = `https://serpapi.com/search.json?${params.toString()}`

      // Log URL without exposing full API key
      const safeUrl = url.replace(apiKey, 'REDACTED')
      console.log(`[GoogleJobs] Fetching: ${safeUrl}`)

      const response = await fetch(url)

      console.log(`[GoogleJobs] Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[GoogleJobs] API error response: ${errorText.substring(0, 500)}`)
        throw new Error(`SerpAPI returned ${response.status}: ${errorText}`)
      }

      const data: GoogleJobsResponse = await response.json()

      console.log(`[GoogleJobs] Response metadata:`, {
        status: data.search_metadata?.status,
        hasJobsResults: !!data.jobs_results,
        jobsCount: data.jobs_results?.length || 0,
        error: data.error
      })

      // Check for API errors
      if (data.error) {
        throw new Error(`SerpAPI error: ${data.error}`)
      }

      const jobs = data.jobs_results || []

      if (jobs.length === 0) {
        // No more results
        console.log(`[GoogleJobs] No more results at offset ${start}`)
        break
      }

      allJobs.push(...jobs)
      console.log(`[GoogleJobs] Fetched ${jobs.length} jobs (total: ${allJobs.length})`)

      // Check if we have enough jobs
      if (allJobs.length >= maxJobs) {
        break
      }

      // Move to next page
      start += pageSize

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Trim to maxJobs if we got more
    const result = allJobs.slice(0, maxJobs)
    console.log(`[GoogleJobs] Returning ${result.length} jobs`)

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[GoogleJobs] Scrape failed: ${message}`)
    throw error
  }
}

/**
 * Parse relative time strings from Google Jobs into approximate timestamps
 * Examples: "1 day ago", "2 weeks ago", "Just posted", "30+ days ago"
 *
 * @param postedAt - Relative time string from Google Jobs
 * @returns ISO timestamp string
 */
export function parsePostedAt(postedAt?: string): string {
  if (!postedAt) {
    return new Date().toISOString()
  }

  const now = new Date()
  const lowerPosted = postedAt.toLowerCase()

  // Just posted / Today
  if (lowerPosted.includes('just posted') || lowerPosted.includes('today')) {
    return now.toISOString()
  }

  // X hours ago
  const hoursMatch = lowerPosted.match(/(\d+)\s*hours?\s*ago/)
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10)
    return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
  }

  // X days ago
  const daysMatch = lowerPosted.match(/(\d+)\s*days?\s*ago/)
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10)
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  }

  // X weeks ago
  const weeksMatch = lowerPosted.match(/(\d+)\s*weeks?\s*ago/)
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10)
    return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString()
  }

  // X months ago
  const monthsMatch = lowerPosted.match(/(\d+)\s*months?\s*ago/)
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10)
    return new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  // 30+ days ago (treat as 30 days)
  if (lowerPosted.includes('30+ days')) {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  // Default to now if we can't parse
  return now.toISOString()
}

/**
 * Extract tags/skills from job highlights
 *
 * @param job - Raw Google Jobs data
 * @returns Array of extracted tags
 */
export function extractTags(job: GoogleJobRaw): string[] {
  const tags: Set<string> = new Set()

  // Add extensions as tags (e.g., "Full-time", "Health insurance")
  if (job.extensions) {
    for (const ext of job.extensions) {
      if (ext.length < 30) {  // Skip long descriptions
        tags.add(ext)
      }
    }
  }

  // Add schedule type
  if (job.detected_extensions?.schedule_type) {
    tags.add(job.detected_extensions.schedule_type)
  }

  // Extract from job highlights (qualifications often contain skills)
  if (job.job_highlights) {
    for (const highlight of job.job_highlights) {
      if (highlight.title?.toLowerCase() === 'qualifications') {
        // Look for common skill patterns
        for (const item of highlight.items) {
          // Extract programming languages/frameworks
          const skillPatterns = [
            /\b(Python|JavaScript|TypeScript|Java|C\+\+|Ruby|Go|Rust|PHP|Swift|Kotlin)\b/gi,
            /\b(React|Angular|Vue|Node\.js|Django|Flask|Spring|Rails)\b/gi,
            /\b(AWS|Azure|GCP|Docker|Kubernetes|Terraform)\b/gi,
            /\b(SQL|PostgreSQL|MySQL|MongoDB|Redis)\b/gi,
          ]

          for (const pattern of skillPatterns) {
            const matches = item.match(pattern)
            if (matches) {
              for (const match of matches) {
                tags.add(match)
              }
            }
          }
        }
      }
    }
  }

  return Array.from(tags).slice(0, 15)  // Limit to 15 tags
}

/**
 * Determine if a job is remote based on available data
 *
 * @param job - Raw Google Jobs data
 * @returns true if job appears to be remote
 */
export function isRemoteJob(job: GoogleJobRaw): boolean {
  // Check detected_extensions
  if (job.detected_extensions?.work_from_home) {
    return true
  }

  // Check location string
  const location = job.location?.toLowerCase() || ''
  if (location.includes('remote') || location.includes('work from home') || location === 'anywhere') {
    return true
  }

  // Check title
  const title = job.title?.toLowerCase() || ''
  if (title.includes('remote') || title.includes('work from home')) {
    return true
  }

  // Check extensions
  if (job.extensions) {
    for (const ext of job.extensions) {
      const extLower = ext.toLowerCase()
      if (extLower.includes('remote') || extLower.includes('work from home')) {
        return true
      }
    }
  }

  return false
}
