import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { XMLParser } from 'fast-xml-parser'
import { updateSourceStatus } from '../services/database'

const inputSchema = z.object({
  source: z.string(),
  manual: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'FetchRemotive',
  description: 'Fetches remote jobs from Remotive RSS feed',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

interface RemotiveRssItem {
  title: string
  link: string
  pubDate: string
  description: string
  category?: string | string[]
  guid: string
}

interface RemotiveRssFeed {
  rss: {
    channel: {
      item: RemotiveRssItem | RemotiveRssItem[]
    }
  }
}

export const handler: Handlers['FetchRemotive'] = async (input, { emit, logger, state }) => {
  if (input.source !== 'remotive' && input.source !== 'all') {
    return // Skip if not for this source
  }

  logger.info('Fetching from Remotive RSS feed')

  try {
    const response = await fetch('https://remotive.com/remote-jobs/feed', {
      headers: {
        'User-Agent': 'JobAggregator/1.0 (Motia Hackathon)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    })

    if (!response.ok) {
      throw new Error(`Remotive RSS returned ${response.status}`)
    }

    const xmlText = await response.text()

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })

    const feed: RemotiveRssFeed = parser.parse(xmlText)

    // Handle both single item and array of items
    const items = Array.isArray(feed.rss.channel.item)
      ? feed.rss.channel.item
      : feed.rss.channel.item
        ? [feed.rss.channel.item]
        : []

    logger.info('Fetched jobs from Remotive RSS', { count: items.length })

    let jobsEmitted = 0

    for (const item of items) {
      try {
        // Extract company from title (format: "Role at Company")
        const titleParts = item.title.split(' at ')
        const jobTitle = titleParts[0]?.trim() || item.title
        const company = titleParts[1]?.trim() || extractCompanyFromDescription(item.description)

        // Parse categories/tags
        const categories = item.category
          ? (Array.isArray(item.category) ? item.category : [item.category])
          : []

        // Extract tags from categories and title
        const tags = extractTags(jobTitle, categories)

        // Clean description (remove HTML tags)
        const cleanDescription = stripHtml(item.description)

        // Generate unique ID from guid or link
        const jobId = extractIdFromGuid(item.guid || item.link)

        const jobData = {
          id: jobId,
          title: jobTitle.substring(0, 200),
          company: company || 'Unknown Company',
          location: 'Remote', // Remotive is all remote jobs
          description: cleanDescription.substring(0, 500),
          url: item.link,
          posted_at: new Date(item.pubDate).getTime() / 1000, // Convert to Unix timestamp
          tags,
          categories
        }

        await emit({
          topic: 'normalize-job',
          data: {
            source: 'remotive' as const,
            rawJob: jobData
          }
        })
        jobsEmitted++
      } catch (itemError) {
        const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error'
        logger.warn('Failed to process Remotive job item', { error: errorMessage, title: item.title })
      }
    }

    // Update source metadata in state
    await state.set('sources', 'remotive', {
      lastFetch: new Date().toISOString(),
      jobCount: jobsEmitted,
      status: jobsEmitted > 0 ? 'success' : 'error',
      error: jobsEmitted === 0 ? 'No jobs found' : undefined
    })

    // Also update database
    const remotiveStatus = jobsEmitted > 0 ? 'success' : 'error'
    await updateSourceStatus('remotive', remotiveStatus, jobsEmitted, jobsEmitted === 0 ? 'No jobs found' : undefined)

    logger.info('Remotive fetch completed', { totalJobs: jobsEmitted })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch from Remotive', { error: errorMessage })
    await state.set('sources', 'remotive', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage
    })

    // Also update database
    await updateSourceStatus('remotive', 'error', 0, errorMessage)
  }
}

/**
 * Strip HTML tags from text
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
 * Extract company name from description if not in title
 */
function extractCompanyFromDescription(description: string): string {
  const cleanDesc = stripHtml(description)
  // Try to find company patterns like "at Company" or "Company is hiring"
  const atMatch = cleanDesc.match(/\bat\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+is|\s+we|\.|,)/i)
  if (atMatch) return atMatch[1].trim()

  const hiringMatch = cleanDesc.match(/^([A-Z][A-Za-z0-9\s&]+?)\s+is\s+(?:hiring|looking)/i)
  if (hiringMatch) return hiringMatch[1].trim()

  return 'Unknown Company'
}

/**
 * Extract relevant tech tags
 */
function extractTags(title: string, categories: string[]): string[] {
  const techKeywords = [
    'javascript', 'typescript', 'react', 'node', 'python', 'java', 'golang', 'go',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'vue', 'angular', 'nextjs', 'next.js',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'postgres', 'mongodb', 'redis',
    'graphql', 'rest', 'api', 'frontend', 'backend', 'fullstack', 'full-stack',
    'devops', 'sre', 'machine learning', 'ml', 'ai', 'data science', 'ios', 'android',
    'mobile', 'web', 'cloud', 'security', 'qa', 'testing', 'product', 'design'
  ]

  const text = `${title} ${categories.join(' ')}`.toLowerCase()
  const foundTags: string[] = []

  for (const keyword of techKeywords) {
    if (text.includes(keyword) && !foundTags.includes(keyword)) {
      foundTags.push(keyword)
    }
  }

  // Add categories as tags (normalized)
  for (const category of categories) {
    const normalizedCat = category.toLowerCase().replace(/-/g, ' ')
    if (!foundTags.includes(normalizedCat) && normalizedCat.length < 30) {
      foundTags.push(normalizedCat)
    }
  }

  return foundTags.slice(0, 10) // Max 10 tags
}

/**
 * Extract a clean ID from guid or link
 */
function extractIdFromGuid(guid: string): string {
  // Try to extract numeric ID from URL
  const numericMatch = guid.match(/\/(\d+)(?:[/?#]|$)/)
  if (numericMatch) return numericMatch[1]

  // Fallback to hash of the guid
  let hash = 0
  for (let i = 0; i < guid.length; i++) {
    const char = guid.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString()
}
