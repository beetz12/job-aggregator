import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  source: z.string(),
  manual: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'FetchReddit',
  description: 'Fetches jobs from Reddit job subreddits (r/forhire, r/remotejs)',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

// Subreddits to fetch job postings from
const JOB_SUBREDDITS = [
  'forhire',      // General hiring subreddit
  'remotejs',     // Remote JavaScript jobs
]

interface RedditPost {
  data: {
    id: string
    title: string
    selftext: string
    author: string
    created_utc: number
    url: string
    permalink: string
    link_flair_text?: string
    subreddit: string
  }
}

interface RedditListing {
  data: {
    children: RedditPost[]
  }
}

export const handler: Handlers['FetchReddit'] = async (input, { emit, logger, state }) => {
  if (input.source !== 'reddit' && input.source !== 'all') {
    return // Skip if not for this source
  }

  logger.info('Fetching from Reddit job subreddits')

  let totalJobsFound = 0

  for (const subreddit of JOB_SUBREDDITS) {
    try {
      // Reddit public JSON API - no auth required for public subreddits
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/new.json?limit=25`,
        {
          headers: {
            // Reddit requires a User-Agent
            'User-Agent': 'JobAggregator/1.0 (Motia Hackathon)'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Reddit API returned ${response.status}`)
      }

      const data: RedditListing = await response.json()
      const posts = data.data.children

      logger.info(`Fetched posts from r/${subreddit}`, { count: posts.length })

      // Filter for hiring posts (in r/forhire, [Hiring] tag indicates employers)
      const hiringPosts = posts.filter(post => {
        const title = post.data.title.toLowerCase()
        const flair = (post.data.link_flair_text || '').toLowerCase()

        // Look for hiring indicators
        return (
          title.includes('[hiring]') ||
          title.includes('[for hire]') === false && // Exclude "for hire" (job seekers)
          flair.includes('hiring') ||
          (subreddit === 'remotejs') // remotejs is all job postings
        )
      })

      for (const post of hiringPosts) {
        const { data: postData } = post

        // Extract company name from title if possible (often in format "Company Name - Role")
        const titleParts = postData.title.split(/[-–|]/)
        const company = titleParts.length > 1
          ? titleParts[0].replace(/\[.*?\]/g, '').trim()
          : postData.author

        // Parse job info
        const jobData = {
          id: postData.id,
          title: postData.title.replace(/\[.*?\]/g, '').trim().substring(0, 200),
          company: company || postData.author,
          location: extractLocation(postData.title + ' ' + postData.selftext),
          description: postData.selftext.substring(0, 500),
          url: `https://reddit.com${postData.permalink}`,
          posted_at: postData.created_utc,
          tags: extractTags(postData.title + ' ' + postData.selftext),
          subreddit: postData.subreddit
        }

        await emit({
          topic: 'normalize-job',
          data: {
            source: 'reddit' as const,
            rawJob: jobData
          }
        })
        totalJobsFound++
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to fetch from r/${subreddit}`, { error: errorMessage })
    }
  }

  // Update source metadata
  await state.set('sources', 'reddit', {
    lastFetch: new Date().toISOString(),
    jobCount: totalJobsFound,
    status: totalJobsFound > 0 ? 'success' : 'error',
    error: totalJobsFound === 0 ? 'No jobs found' : undefined
  })

  logger.info('Reddit fetch completed', { totalJobs: totalJobsFound })
}

/**
 * Extract location from text (looks for common patterns)
 */
function extractLocation(text: string): string | undefined {
  const lowerText = text.toLowerCase()

  if (lowerText.includes('remote')) {
    return 'Remote'
  }

  // Common location patterns
  const locationPatterns = [
    /(?:location|based in|located in)[:\s]+([A-Za-z\s,]+)/i,
    /\b(new york|san francisco|london|berlin|austin|seattle|boston|chicago|los angeles|toronto|vancouver)\b/i,
  ]

  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return undefined
}

/**
 * Extract tech tags from text
 */
function extractTags(text: string): string[] {
  const techKeywords = [
    'javascript', 'typescript', 'react', 'node', 'python', 'java', 'golang', 'go',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'vue', 'angular', 'nextjs', 'next.js',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'postgres', 'mongodb', 'redis',
    'graphql', 'rest', 'api', 'frontend', 'backend', 'fullstack', 'full-stack',
    'devops', 'sre', 'machine learning', 'ml', 'ai', 'data science'
  ]

  const lowerText = text.toLowerCase()
  const foundTags: string[] = []

  for (const keyword of techKeywords) {
    if (lowerText.includes(keyword) && !foundTags.includes(keyword)) {
      foundTags.push(keyword)
    }
  }

  return foundTags.slice(0, 10) // Max 10 tags
}
