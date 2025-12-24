import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { updateSourceStatus } from '../services/database'
import {
  scrapeWeWorkRemotely,
  parseTitle,
  stripHtml,
  extractJobId,
  extractTags,
  extractLocation,
  type WeWorkRemotelyJobRaw
} from '../services/scrapers/weworkremotely-scraper'

const inputSchema = z.object({
  source: z.string(),
  manual: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'FetchWeWorkRemotely',
  description: 'Fetches remote jobs from We Work Remotely RSS feeds',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

export const handler: Handlers['FetchWeWorkRemotely'] = async (input, { emit, logger, state }) => {
  if (input.source !== 'weworkremotely' && input.source !== 'all') {
    return // Skip if not for this source
  }

  logger.info('Fetching from We Work Remotely RSS feeds')

  try {
    // Fetch from programming feed (most relevant for tech jobs)
    // Can expand to other feeds if needed
    const jobs = await scrapeWeWorkRemotely(100, ['programming', 'devops'])

    logger.info('Fetched jobs from We Work Remotely', { count: jobs.length })

    let jobsEmitted = 0

    for (const item of jobs) {
      try {
        // Parse the "Company: Job Title" format
        const { company, jobTitle } = parseTitle(item.title)

        // Parse categories/tags
        const categories = item.category
          ? (Array.isArray(item.category) ? item.category : [item.category])
          : []

        // Clean description (remove HTML tags)
        const cleanDescription = stripHtml(item.description)

        // Extract tags from title, description, and categories
        const tags = extractTags(jobTitle, cleanDescription, categories)

        // Extract location (most WWR jobs are worldwide remote)
        const location = extractLocation(cleanDescription, categories)

        // Generate unique ID from guid or link
        const jobId = extractJobId(item.guid || item.link)

        // Parse posted date
        let postedAt: number
        try {
          postedAt = new Date(item.pubDate).getTime() / 1000 // Convert to Unix timestamp
          if (isNaN(postedAt)) {
            postedAt = Date.now() / 1000
          }
        } catch {
          postedAt = Date.now() / 1000
        }

        const jobData = {
          id: jobId,
          title: jobTitle.substring(0, 200),
          company: company || 'Unknown Company',
          location: location,
          description: cleanDescription.substring(0, 500),
          url: item.link,
          posted_at: postedAt,
          tags,
          categories
        }

        await emit({
          topic: 'normalize-job',
          data: {
            source: 'weworkremotely' as const,
            rawJob: jobData
          }
        })
        jobsEmitted++
      } catch (itemError) {
        const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error'
        logger.warn('Failed to process We Work Remotely job item', {
          error: errorMessage,
          title: item.title
        })
      }
    }

    // Update source metadata in state
    await state.set('sources', 'weworkremotely', {
      lastFetch: new Date().toISOString(),
      jobCount: jobsEmitted,
      status: jobsEmitted > 0 ? 'success' : 'error',
      error: jobsEmitted === 0 ? 'No jobs found' : undefined
    })

    // Also update database
    const status = jobsEmitted > 0 ? 'success' : 'error'
    await updateSourceStatus(
      'weworkremotely',
      status,
      jobsEmitted,
      jobsEmitted === 0 ? 'No jobs found' : undefined
    )

    logger.info('We Work Remotely fetch completed', { totalJobs: jobsEmitted })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch from We Work Remotely', { error: errorMessage })

    // Update state with error
    await state.set('sources', 'weworkremotely', {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage
    })

    // Also update database
    await updateSourceStatus('weworkremotely', 'error', 0, errorMessage)
  }
}
