import { query, isSupabaseConfigured } from './postgres'
import crypto from 'crypto'
import type { Job, SourceMetadata } from '../types/job'

/**
 * Normalize text for consistent hashing
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove special characters (keep alphanumeric, spaces, hyphens)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
}

/**
 * Generate content hash for deduplication
 * Hash is based on: title + company + location (normalized)
 */
export function generateContentHash(
  title: string,
  company: string,
  location?: string
): string {
  const content = [
    normalizeText(title),
    normalizeText(company),
    normalizeText(location || '')
  ].join('|')
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Map database row to Job type
 */
function mapDbRowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    title: row.title as string,
    company: row.company as string,
    location: row.location as string | undefined,
    remote: row.remote as boolean,
    url: row.url as string,
    description: row.description as string,
    source: row.source as Job['source'],
    posted_at: row.posted_at as string,
    fetched_at: row.fetched_at as string,
    tags: (row.tags as string[]) || [],
    health_score: row.health_score as number,
    ai_summary: row.ai_summary as string | undefined,
    skills: (row.skills as string[]) || [],
    source_id: row.source_id as string | undefined,
    company_url: row.company_url as string | undefined,
    location_parsed: row.location_parsed as Job['location_parsed'],
    salary: row.salary as Job['salary'],
    employment_type: row.employment_type as string | undefined,
    experience_level: row.experience_level as string | undefined,
    content_hash: row.content_hash as string | undefined,
  }
}

/**
 * Upsert job to database
 * - INSERT if new (no matching content_hash)
 * - UPDATE if exists (matching content_hash)
 *
 * Returns { inserted: true } for new jobs, { inserted: false } for updates
 * Returns null if database is not configured
 */
export async function upsertJob(job: Job): Promise<{
  inserted: boolean
  job: Job
} | null> {
  if (!isSupabaseConfigured()) return null

  const contentHash = generateContentHash(job.title, job.company, job.location)

  try {
    // First, check if job with this content_hash exists
    const { rows: existing } = await query<{ id: string; health_score: number }>(
      'SELECT id, health_score FROM jobs WHERE content_hash = $1 LIMIT 1',
      [contentHash]
    )

    if (existing.length > 0) {
      // Update existing job (refresh freshness, keep higher health score)
      const newHealthScore = Math.max(existing[0].health_score, job.health_score)
      const { rows } = await query<Record<string, unknown>>(
        `UPDATE jobs SET
          fetched_at = $1,
          health_score = $2,
          updated_at = $3
        WHERE content_hash = $4
        RETURNING *`,
        [new Date().toISOString(), newHealthScore, new Date().toISOString(), contentHash]
      )

      return {
        inserted: false,
        job: rows[0] ? mapDbRowToJob(rows[0]) : job
      }
    }

    // Insert new job
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO jobs (
        id, title, company, location, remote, url, description, source,
        posted_at, fetched_at, tags, health_score, content_hash,
        title_normalized, company_normalized, ai_summary, skills,
        source_id, company_url, location_parsed, salary, employment_type, experience_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        job.id,
        job.title,
        job.company,
        job.location || null,
        job.remote,
        job.url,
        job.description,
        job.source,
        job.posted_at,
        job.fetched_at,
        job.tags,
        job.health_score,
        contentHash,
        normalizeText(job.title),
        normalizeText(job.company),
        job.ai_summary || null,
        job.skills || [],
        job.source_id || null,
        job.company_url || null,
        job.location_parsed ? JSON.stringify(job.location_parsed) : null,
        job.salary ? JSON.stringify(job.salary) : null,
        job.employment_type || null,
        job.experience_level || null
      ]
    )

    return {
      inserted: true,
      job: rows[0] ? mapDbRowToJob(rows[0]) : job
    }
  } catch (error: unknown) {
    // Handle race condition: another process inserted same job (unique constraint violation)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { inserted: false, job }
    }
    throw error
  }
}

/**
 * Get jobs from database with filters
 */
export async function getJobsFromDB(params: {
  search?: string
  source?: string
  remote?: boolean
  limit?: number
  offset?: number
}): Promise<Job[]> {
  if (!isSupabaseConfigured()) return []

  const { search, source, remote, limit = 50, offset = 0 } = params

  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (source) {
    conditions.push(`source = $${paramIndex++}`)
    values.push(source)
  }

  if (remote === true) {
    conditions.push(`remote = $${paramIndex++}`)
    values.push(true)
  }

  if (search) {
    conditions.push(`(title ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`)
    values.push(`%${search}%`)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  values.push(limit, offset)

  const sql = `
    SELECT * FROM jobs
    ${whereClause}
    ORDER BY health_score DESC, posted_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `

  const { rows } = await query<Record<string, unknown>>(sql, values)
  return rows.map(mapDbRowToJob)
}

/**
 * Get a single job by ID from database
 */
export async function getJobByIdFromDB(id: string): Promise<Job | null> {
  if (!isSupabaseConfigured()) return null

  const { rows } = await query<Record<string, unknown>>(
    'SELECT * FROM jobs WHERE id = $1 LIMIT 1',
    [id]
  )

  return rows[0] ? mapDbRowToJob(rows[0]) : null
}

/**
 * Check if job exists by content hash
 */
export async function jobExistsByHash(contentHash: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { rows } = await query<{ id: string }>(
    'SELECT id FROM jobs WHERE content_hash = $1 LIMIT 1',
    [contentHash]
  )

  return rows.length > 0
}

/**
 * Get job statistics
 */
export async function getJobStats(): Promise<{
  total: number
  bySource: Record<string, number>
} | null> {
  if (!isSupabaseConfigured()) return null

  const { rows } = await query<{ source: string; count: string }>(
    'SELECT source, COUNT(*) as count FROM jobs GROUP BY source'
  )

  const bySource: Record<string, number> = {}
  let total = 0

  for (const row of rows) {
    const count = parseInt(row.count, 10)
    bySource[row.source] = count
    total += count
  }

  return { total, bySource }
}

/**
 * Get total job count from database
 */
export async function getJobCountFromDB(): Promise<number> {
  if (!isSupabaseConfigured()) return 0

  const { rows } = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM jobs'
  )

  return rows[0] ? parseInt(rows[0].count, 10) : 0
}

/**
 * Update source status in database
 */
export async function updateSourceStatus(
  sourceName: string,
  status: SourceMetadata['status'],
  jobCount?: number,
  errorMsg?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  try {
    await query(
      `INSERT INTO sources (name, status, last_fetch, job_count, error, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name) DO UPDATE SET
         status = EXCLUDED.status,
         last_fetch = EXCLUDED.last_fetch,
         job_count = EXCLUDED.job_count,
         error = EXCLUDED.error,
         updated_at = EXCLUDED.updated_at`,
      [
        sourceName,
        status,
        new Date().toISOString(),
        jobCount ?? 0,
        errorMsg || null,
        new Date().toISOString()
      ]
    )
  } catch (error) {
    console.error(`[Database] Failed to update source status for ${sourceName}:`, error)
  }
}

/**
 * Get all sources from database
 */
export async function getSourcesFromDB(): Promise<Array<{
  name: string
  status: string
  last_fetch: string | null
  job_count: number
  error: string | null
}>> {
  if (!isSupabaseConfigured()) return []

  try {
    const { rows } = await query<{
      name: string
      status: string
      last_fetch: string | null
      job_count: number
      error: string | null
    }>('SELECT * FROM sources ORDER BY name')

    return rows.map(s => ({
      name: s.name,
      status: s.status,
      last_fetch: s.last_fetch,
      job_count: s.job_count || 0,
      error: s.error
    }))
  } catch (error) {
    console.error('[Database] Failed to get sources:', error)
    return []
  }
}

/**
 * Sync sources from Motia state to database
 */
export async function syncSourcesToDB(
  sources: Array<{ name: string; metadata: SourceMetadata }>
): Promise<void> {
  for (const source of sources) {
    await updateSourceStatus(
      source.name,
      source.metadata.status,
      source.metadata.jobCount,
      source.metadata.error
    )
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  try {
    await query('SELECT 1')
    return true
  } catch (error) {
    console.error('[Database] Connection test failed:', error)
    return false
  }
}
