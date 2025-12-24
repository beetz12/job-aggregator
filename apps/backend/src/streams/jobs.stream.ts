import { StreamConfig } from 'motia'
import { jobSchema } from '../types/job'

/**
 * Jobs Stream - Real-time job updates
 *
 * GroupId: 'all' for all jobs, or source name (e.g., 'arbeitnow', 'hackernews', 'reddit')
 * ItemId: job.id
 *
 * Clients subscribe to receive live job updates as they are indexed.
 */
export const config: StreamConfig = {
  name: 'jobs',
  schema: jobSchema,
  baseConfig: { storageType: 'default' },
}
