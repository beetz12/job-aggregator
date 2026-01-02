/**
 * @deprecated This scraper is ORPHANED and NOT IN USE.
 *
 * DEPRECATION NOTICE (2026-01-02):
 * ================================
 * This file contains legacy We Work Remotely RSS feed parsing logic.
 * This code is NOT called anywhere in the active codebase.
 *
 * All job scraping is now handled by the external Python Scraper API
 * located at /Users/dave/Work/python-scraper
 *
 * The Python scraper handles WeWorkRemotely via Playwright with stealth mode.
 *
 * This file is preserved for reference only.
 *
 * @see /Users/dave/Work/python-scraper - New scraper implementation
 * @see docs/plans/MIGRATION_PYTHON_SCRAPER_INTEGRATION.md - Migration details
 */

/**
 * We Work Remotely Job Scraper
 *
 * Scrapes remote jobs from We Work Remotely RSS feeds.
 * No API key required - uses public RSS feeds.
 *
 * RSS Feeds:
 * - All remote jobs: https://weworkremotely.com/remote-jobs.rss
 * - Programming jobs: https://weworkremotely.com/categories/remote-programming-jobs.rss
 */

import { XMLParser } from 'fast-xml-parser'

/**
 * Raw job data from We Work Remotely RSS feed
 */
export interface WeWorkRemotelyJobRaw {
  title: string       // Format: "Company Name: Job Title"
  link: string        // Full URL to job posting
  description: string // HTML job description
  pubDate: string     // RFC 2822 date format
  guid: string        // Unique identifier
  category?: string | string[] // Job category/region
}

/**
 * Parsed RSS feed structure
 */
interface WeWorkRemotelyRssFeed {
  rss: {
    channel: {
      title?: string
      link?: string
      description?: string
      item: WeWorkRemotelyJobRaw | WeWorkRemotelyJobRaw[]
    }
  }
}

/**
 * Result from scraping We Work Remotely
 */
export interface WeWorkRemotelyResult {
  jobs: WeWorkRemotelyJobRaw[]
  feedTitle: string
  fetchedAt: string
}

// RSS feed URLs
const RSS_FEEDS = {
  all: 'https://weworkremotely.com/remote-jobs.rss',
  programming: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  design: 'https://weworkremotely.com/categories/remote-design-jobs.rss',
  devops: 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
  management: 'https://weworkremotely.com/categories/remote-management-executive-jobs.rss',
  sales: 'https://weworkremotely.com/categories/remote-sales-marketing-jobs.rss',
  customer_support: 'https://weworkremotely.com/categories/remote-customer-support-jobs.rss',
}

type FeedType = keyof typeof RSS_FEEDS

/**
 * Scrape jobs from We Work Remotely RSS feeds
 *
 * @param maxJobs - Maximum number of jobs to fetch (default: 100)
 * @param feedTypes - Which feeds to scrape (default: ['all'])
 * @returns Array of raw job data from RSS feed
 */
export async function scrapeWeWorkRemotely(
  maxJobs: number = 100,
  feedTypes: FeedType[] = ['all']
): Promise<WeWorkRemotelyJobRaw[]> {
  console.log(`[WeWorkRemotely] scrapeWeWorkRemotely called with: maxJobs=${maxJobs}, feeds=${feedTypes.join(', ')}`)

  const allJobs: WeWorkRemotelyJobRaw[] = []
  const seenGuids = new Set<string>()

  for (const feedType of feedTypes) {
    if (allJobs.length >= maxJobs) {
      console.log(`[WeWorkRemotely] Reached maxJobs limit, stopping`)
      break
    }

    const feedUrl = RSS_FEEDS[feedType]
    if (!feedUrl) {
      console.warn(`[WeWorkRemotely] Unknown feed type: ${feedType}`)
      continue
    }

    try {
      console.log(`[WeWorkRemotely] Fetching ${feedType} feed: ${feedUrl}`)

      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'JobAggregator/1.0 (Motia Hackathon)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      })

      if (!response.ok) {
        console.error(`[WeWorkRemotely] HTTP ${response.status} for ${feedType} feed`)
        continue
      }

      const xmlText = await response.text()

      // Parse XML
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        isArray: (name) => name === 'item' || name === 'category'
      })

      const feed: WeWorkRemotelyRssFeed = parser.parse(xmlText)

      // Handle both single item and array of items
      const items = Array.isArray(feed.rss?.channel?.item)
        ? feed.rss.channel.item
        : feed.rss?.channel?.item
          ? [feed.rss.channel.item]
          : []

      console.log(`[WeWorkRemotely] Found ${items.length} jobs in ${feedType} feed`)

      for (const item of items) {
        if (allJobs.length >= maxJobs) break

        // Deduplicate by guid
        const guid = item.guid || item.link
        if (seenGuids.has(guid)) {
          continue
        }
        seenGuids.add(guid)

        allJobs.push(item)
      }

      // Small delay between feeds to be polite
      if (feedTypes.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[WeWorkRemotely] Error fetching ${feedType} feed: ${message}`)
      // Continue with other feeds even if one fails
    }
  }

  console.log(`[WeWorkRemotely] Returning ${allJobs.length} total jobs`)
  return allJobs.slice(0, maxJobs)
}

/**
 * Parse title to extract company name and job title
 * We Work Remotely uses format: "Company Name: Job Title"
 *
 * @param title - Raw title from RSS feed
 * @returns Object with company and jobTitle
 */
export function parseTitle(title: string): { company: string; jobTitle: string } {
  if (!title) {
    return { company: 'Unknown Company', jobTitle: 'Job Opening' }
  }

  // Handle the "Company Name: Job Title" format
  const colonIndex = title.indexOf(':')
  if (colonIndex > 0) {
    const company = title.substring(0, colonIndex).trim()
    const jobTitle = title.substring(colonIndex + 1).trim()

    if (company && jobTitle) {
      return { company, jobTitle }
    }
  }

  // Fallback: use entire title as job title
  return { company: 'Unknown Company', jobTitle: title.trim() }
}

/**
 * Strip HTML tags from text
 *
 * @param html - HTML string
 * @returns Plain text
 */
export function stripHtml(html: string): string {
  if (!html) return ''

  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract job ID from URL or guid
 *
 * @param url - Job URL or guid
 * @returns Extracted ID
 */
export function extractJobId(url: string): string {
  if (!url) {
    return `wwr_${Date.now()}`
  }

  // Try to extract slug from URL like:
  // https://weworkremotely.com/remote-jobs/company-job-title
  const urlMatch = url.match(/\/remote-jobs\/([^/?#]+)/)
  if (urlMatch) {
    return urlMatch[1]
  }

  // Try to extract numeric ID
  const numericMatch = url.match(/\/(\d+)(?:[/?#]|$)/)
  if (numericMatch) {
    return numericMatch[1]
  }

  // Fallback to hash of the URL
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `wwr_${Math.abs(hash).toString()}`
}

/**
 * Extract relevant tech tags from title and description
 *
 * @param title - Job title
 * @param description - Job description
 * @param categories - RSS categories
 * @returns Array of extracted tags
 */
export function extractTags(
  title: string,
  description: string,
  categories: string[]
): string[] {
  const techKeywords = [
    'javascript', 'typescript', 'react', 'node', 'nodejs', 'python', 'java', 'golang', 'go',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'vue', 'angular', 'nextjs', 'next.js',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'postgres', 'postgresql', 'mongodb', 'redis',
    'graphql', 'rest', 'api', 'frontend', 'backend', 'fullstack', 'full-stack', 'full stack',
    'devops', 'sre', 'machine learning', 'ml', 'ai', 'data science', 'ios', 'android',
    'mobile', 'web', 'cloud', 'security', 'qa', 'testing', 'product', 'design',
    'rails', 'django', 'flask', 'spring', 'laravel', '.net', 'c#', 'csharp',
    'sql', 'mysql', 'elasticsearch', 'kafka', 'rabbitmq', 'terraform', 'ansible',
    'linux', 'unix', 'windows', 'macos', 'git', 'ci/cd', 'agile', 'scrum'
  ]

  const text = `${title} ${description} ${categories.join(' ')}`.toLowerCase()
  const foundTags: string[] = []

  for (const keyword of techKeywords) {
    // Use word boundary matching for accurate detection
    const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (pattern.test(text) && !foundTags.includes(keyword)) {
      foundTags.push(keyword)
    }
  }

  // Add categories as tags (normalized)
  for (const category of categories) {
    const normalizedCat = category.toLowerCase().replace(/-/g, ' ').trim()
    if (normalizedCat && !foundTags.includes(normalizedCat) && normalizedCat.length < 30) {
      foundTags.push(normalizedCat)
    }
  }

  return foundTags.slice(0, 15) // Max 15 tags
}

/**
 * Extract location from description or categories
 * We Work Remotely jobs are mostly "Anywhere in the World" but some have restrictions
 *
 * @param description - Job description
 * @param categories - RSS categories
 * @returns Location string
 */
export function extractLocation(description: string, categories: string[]): string {
  const text = `${description} ${categories.join(' ')}`.toLowerCase()

  // Check for specific location restrictions
  const locationPatterns = [
    { pattern: /usa?\s+only|us\s+only|united\s+states\s+only/i, location: 'USA Only' },
    { pattern: /north\s+america\s+only/i, location: 'North America Only' },
    { pattern: /europe(?:an)?\s+only/i, location: 'Europe Only' },
    { pattern: /uk\s+only|united\s+kingdom\s+only/i, location: 'UK Only' },
    { pattern: /americas?\s+only/i, location: 'Americas Only' },
    { pattern: /emea\s+only/i, location: 'EMEA Only' },
    { pattern: /apac\s+only/i, location: 'APAC Only' },
  ]

  for (const { pattern, location } of locationPatterns) {
    if (pattern.test(text)) {
      return location
    }
  }

  // Default for We Work Remotely
  return 'Remote (Worldwide)'
}

/**
 * Test the scraper with minimal requests
 */
export async function testWeWorkRemotelyScraper(): Promise<boolean> {
  try {
    console.log('[WeWorkRemotely] Running scraper test...')
    const jobs = await scrapeWeWorkRemotely(5, ['programming'])
    console.log(`[WeWorkRemotely] Test complete. Found ${jobs.length} jobs`)

    if (jobs.length > 0) {
      const { company, jobTitle } = parseTitle(jobs[0].title)
      console.log(`[WeWorkRemotely] Sample job: "${jobTitle}" at "${company}"`)
    }

    return jobs.length > 0
  } catch (error) {
    console.error('[WeWorkRemotely] Test failed:', error)
    return false
  }
}
