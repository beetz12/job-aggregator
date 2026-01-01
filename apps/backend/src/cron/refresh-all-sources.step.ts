import type { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'RefreshAllSources',
  description: 'Refresh all job sources every 30 minutes',
  cron: '*/30 * * * *',
  emits: ['fetch-jobs-trigger'],
  flows: ['job-aggregation']
}

// All 11 sources from the Python Scraper API
const SOURCES = [
  'arbeitnow',
  'hackernews',
  'remoteok',
  'weworkremotely',
  'braintrust',
  'devitjobs',
  'jobicy',
  'dice',
  'builtin',
  'remotive',
  'wellfound',
] as const;

export const handler: Handlers['RefreshAllSources'] = async ({ emit, logger }) => {
  const sources = SOURCES

  logger.info('Scheduled refresh started - triggering sources with staggered delays', {
    sourceCount: sources.length,
    delayBetweenMs: 5000
  })

  for (const source of sources) {
    logger.info('Triggering fetch for source', { source })

    await emit({
      topic: 'fetch-jobs-trigger',
      data: { source, manual: false, limit: 100 }
    })

    // Add 5 second delay between sources (except after last one)
    if (source !== sources[sources.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  logger.info('Scheduled refresh completed - all sources triggered', {
    sourcesTriggered: sources.length
  })
}
