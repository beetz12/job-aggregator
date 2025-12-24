/**
 * Wellfound (formerly AngelList) Job Scraper
 *
 * Uses fetch-based scraping to extract job listings from Wellfound.
 * Note: Wellfound uses heavy JavaScript rendering, so this scraper
 * extracts job links and basic metadata available in the HTML.
 *
 * For full JavaScript-rendered scraping, consider using a separate
 * Playwright service or running in development mode.
 */

import { getSharedProxyRotator } from '../proxy/proxy-rotator'

export interface WellfoundJobRaw {
  id: string
  title: string
  company: string
  location: string
  url: string
  description: string
  salary?: string
  posted_at?: number  // Unix timestamp
  tags?: string[]
  remote?: boolean
}

export interface WellfoundScrapeResult {
  jobs: WellfoundJobRaw[]
  status: 'success' | 'blocked' | 'error' | 'no_data'
  blockedReason?: string
  httpStatus?: number
  message?: string
}

/**
 * Detect anti-bot protection in HTTP response
 */
function detectAntiBot(html: string): { blocked: boolean; reason?: string } {
  // DataDome protection
  if (html.includes('captcha-delivery.com') || html.includes('geo.captcha-delivery.com')) {
    return { blocked: true, reason: 'DataDome protection detected' }
  }

  // Cloudflare challenge
  if (html.includes('__CF$cv$params') || html.includes('challenge-platform') || html.includes('cf-browser-verification')) {
    return { blocked: true, reason: 'Cloudflare challenge detected' }
  }

  // Generic JS-required page (small response with enable JS message)
  if (html.includes('Please enable JS') && html.length < 5000) {
    return { blocked: true, reason: 'JavaScript required - likely anti-bot' }
  }

  // Generic access denied
  if (html.includes('Access denied') || html.includes('blocked')) {
    return { blocked: true, reason: 'Access denied by server' }
  }

  // Check for captcha
  if (html.includes('captcha') && !html.includes('recaptcha-badge')) {
    return { blocked: true, reason: 'CAPTCHA challenge detected' }
  }

  return { blocked: false }
}

// Realistic user agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

/**
 * Get a random user agent
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/**
 * Random delay between min and max milliseconds
 */
async function randomDelay(minMs: number = 500, maxMs: number = 1500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  await new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Extract job ID from URL or generate one
 */
function extractJobId(url: string, index: number): string {
  // Try to extract from URL like /jobs/123456-job-title
  const match = url.match(/\/jobs\/(\d+)/)
  if (match) return match[1]

  // Try startup slug
  const startupMatch = url.match(/\/(?:jobs|company)\/([^\/]+)/)
  if (startupMatch) return startupMatch[1].replace(/-/g, '_')

  // Fallback to timestamp + index
  return `wf_${Date.now()}_${index}`
}

/**
 * Parse relative time string to Unix timestamp
 * e.g., "2d ago" -> timestamp
 */
function parseRelativeTime(timeStr: string): number | undefined {
  if (!timeStr) return undefined

  const now = Date.now()
  const lowerTime = timeStr.toLowerCase().trim()

  // Match patterns like "2d ago", "3 days ago", "1h ago"
  const match = lowerTime.match(/(\d+)\s*(d|day|h|hour|w|week|m|month|min|minute)s?\s*ago/i)
  if (!match) return undefined

  const value = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()

  let msOffset = 0
  if (unit === 'd' || unit === 'day') {
    msOffset = value * 24 * 60 * 60 * 1000
  } else if (unit === 'h' || unit === 'hour') {
    msOffset = value * 60 * 60 * 1000
  } else if (unit === 'w' || unit === 'week') {
    msOffset = value * 7 * 24 * 60 * 60 * 1000
  } else if (unit === 'm' || unit === 'month') {
    msOffset = value * 30 * 24 * 60 * 60 * 1000
  } else if (unit === 'min' || unit === 'minute') {
    msOffset = value * 60 * 1000
  }

  return Math.floor((now - msOffset) / 1000)
}

/**
 * Extract job data from HTML content
 */
function extractJobsFromHtml(html: string, maxJobs: number): WellfoundJobRaw[] {
  const jobs: WellfoundJobRaw[] = []
  const seenUrls = new Set<string>()

  // Pattern 1: Job links with href="/jobs/..."
  const jobLinkPattern = /href="(\/jobs\/[^"]+)"/g
  let match

  while ((match = jobLinkPattern.exec(html)) !== null && jobs.length < maxJobs) {
    const path = match[1]
    const url = `https://wellfound.com${path}`

    if (seenUrls.has(url)) continue
    seenUrls.add(url)

    // Try to extract title from the URL slug
    const slugMatch = path.match(/\/jobs\/\d+-(.+)$/) || path.match(/\/jobs\/(.+)$/)
    const slug = slugMatch ? slugMatch[1] : 'job-listing'
    const title = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/\d+/g, '')
      .trim() || 'Job Opening'

    jobs.push({
      id: extractJobId(url, jobs.length),
      title,
      company: 'View on Wellfound',
      location: 'See listing',
      url,
      description: 'Visit the job listing for full details.',
      remote: false
    })
  }

  // Pattern 2: Try to find JSON data embedded in page (React hydration data)
  const jsonPattern = /__NEXT_DATA__.*?<\/script>/s
  const jsonMatch = html.match(jsonPattern)
  if (jsonMatch) {
    try {
      const jsonStart = jsonMatch[0].indexOf('{')
      const jsonEnd = jsonMatch[0].lastIndexOf('}') + 1
      if (jsonStart > 0 && jsonEnd > jsonStart) {
        const jsonStr = jsonMatch[0].slice(jsonStart, jsonEnd)
        const data = JSON.parse(jsonStr)

        // Try to extract jobs from Next.js page props
        const pageProps = data?.props?.pageProps
        if (pageProps?.jobs && Array.isArray(pageProps.jobs)) {
          for (const job of pageProps.jobs) {
            if (jobs.length >= maxJobs) break

            const url = job.url || (job.slug ? `https://wellfound.com/jobs/${job.slug}` : '')
            if (!url || seenUrls.has(url)) continue
            seenUrls.add(url)

            jobs.push({
              id: job.id?.toString() || extractJobId(url, jobs.length),
              title: job.title || job.name || 'Job Opening',
              company: job.company?.name || job.startup?.name || 'Startup',
              location: job.location || job.city || 'Remote',
              url,
              description: (job.description || job.excerpt || '').substring(0, 500),
              salary: job.salary || job.compensation,
              remote: job.remote || job.location?.toLowerCase().includes('remote'),
              tags: job.tags || job.skills || []
            })
          }
        }
      }
    } catch {
      // JSON parsing failed, use link-based extraction
    }
  }

  return jobs
}

/**
 * Scrape jobs from Wellfound using fetch
 *
 * @param keyword - Search keyword (e.g., "software engineer")
 * @param location - Location filter (e.g., "Remote", "San Francisco")
 * @param maxJobs - Maximum number of jobs to scrape (default: 50)
 * @returns Scrape result with jobs and status
 */
export async function scrapeWellfound(
  keyword: string = 'software engineer',
  location: string = 'Remote',
  maxJobs: number = 50
): Promise<WellfoundScrapeResult> {
  const proxyRotator = getSharedProxyRotator()
  const allJobs: WellfoundJobRaw[] = []

  console.log(`[Wellfound] scrapeWellfound called with: keyword="${keyword}", location="${location}", maxJobs=${maxJobs}`)

  try {
    // Build search URL
    const searchParams = new URLSearchParams()
    if (keyword) searchParams.set('q', keyword)
    if (location) searchParams.set('location', location)

    const pages = Math.ceil(maxJobs / 20) // ~20 jobs per page

    for (let page = 1; page <= pages && allJobs.length < maxJobs; page++) {
      searchParams.set('page', page.toString())
      const searchUrl = `https://wellfound.com/jobs?${searchParams.toString()}`

      console.log(`[Wellfound] Fetching page ${page}: ${searchUrl}`)

      const headers: Record<string, string> = {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      }

      const response = await fetch(searchUrl, {
        headers,
        redirect: 'follow'
      })

      if (!response.ok) {
        console.warn(`[Wellfound] HTTP ${response.status} on page ${page}`)
        if (response.status === 403 || response.status === 429) {
          console.warn('[Wellfound] Rate limited or blocked, stopping pagination')
          break
        }
        continue
      }

      const html = await response.text()

      // Check for anti-bot block
      if (html.includes('Access denied') || html.includes('captcha') || html.includes('blocked')) {
        console.warn('[Wellfound] Detected anti-bot protection')
        break
      }

      const pageJobs = extractJobsFromHtml(html, maxJobs - allJobs.length)

      // Update job metadata based on search params
      for (const job of pageJobs) {
        // Check for duplicates
        if (!allJobs.some(j => j.url === job.url)) {
          // Set remote based on location search
          if (location.toLowerCase().includes('remote')) {
            job.remote = true
            job.location = 'Remote'
          }
          allJobs.push(job)
        }
      }

      console.log(`[Wellfound] Page ${page}: Found ${pageJobs.length} jobs, total: ${allJobs.length}`)

      if (pageJobs.length === 0) {
        console.log('[Wellfound] No more jobs found, stopping pagination')
        break
      }

      // Rate limiting delay
      if (page < pages) {
        await randomDelay(1000, 2000)
      }
    }

    console.log(`[Wellfound] Scraping complete. Found ${allJobs.length} total jobs`)
    return allJobs.slice(0, maxJobs)

  } catch (error) {
    console.error('[Wellfound] Scraping error:', error instanceof Error ? error.message : error)
    return allJobs // Return whatever we got
  }
}

/**
 * Test the scraper with minimal requests
 */
export async function testWellfoundScraper(): Promise<boolean> {
  try {
    console.log('[Wellfound] Running scraper test...')
    const jobs = await scrapeWellfound('engineer', 'Remote', 5)
    console.log(`[Wellfound] Test complete. Found ${jobs.length} jobs`)
    return jobs.length > 0
  } catch (error) {
    console.error('[Wellfound] Test failed:', error)
    return false
  }
}
