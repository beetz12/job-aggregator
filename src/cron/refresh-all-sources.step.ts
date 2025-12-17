import type { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'RefreshAllSources',
  description: 'Refresh all job sources every 30 minutes',
  cron: '*/30 * * * *',
  emits: ['fetch-jobs-trigger'],
  flows: ['job-aggregation']
}

export const handler: Handlers['RefreshAllSources'] = async ({ emit, logger }) => {
  logger.info('Scheduled refresh started - triggering all sources')

  await emit({
    topic: 'fetch-jobs-trigger',
    data: { source: 'all', manual: false }
  })

  logger.info('Scheduled refresh triggered for all sources')
}
