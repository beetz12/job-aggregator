import { Pool, PoolClient } from 'pg'
import dns from 'dns'

// Force IPv4 for all DNS lookups (Railway doesn't support IPv6)
dns.setDefaultResultOrder('ipv4first')

const databaseUrl = process.env.DATABASE_URL

let pool: Pool | null = null

/**
 * Get PostgreSQL pool instance (singleton)
 * Works with Neon, Supabase, or any PostgreSQL database
 */
export function getPool(): Pool | null {
  if (!databaseUrl) {
    return null
  }

  if (!pool) {
    // Detect if SSL should be disabled (for local PostgreSQL)
    const sslDisabled = databaseUrl?.includes('sslmode=disable')

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: sslDisabled ? false : {
        rejectUnauthorized: false // Required for cloud PostgreSQL (Neon, Supabase)
      },
      max: 5, // Reduced for serverless/Railway
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    })

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('[Database] Unexpected pool error:', err.message)
    })
  }

  return pool
}

/**
 * Execute a query with automatic connection handling
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const p = getPool()
  if (!p) {
    throw new Error('Database not configured')
  }

  const result = await p.query(text, params)
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount ?? 0
  }
}

/**
 * Get a client for transactions
 */
export async function getClient(): Promise<PoolClient | null> {
  const p = getPool()
  if (!p) return null
  return p.connect()
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!databaseUrl
}

// Backward compatibility alias
export const isSupabaseConfigured = isDatabaseConfigured

/**
 * Log database configuration status (call on startup)
 */
export function logDatabaseStatus(): void {
  if (isDatabaseConfigured()) {
    // Extract host from connection string for logging (hide credentials)
    const hostMatch = databaseUrl?.match(/@([^:\/]+)/)
    const host = hostMatch ? hostMatch[1] : 'configured'
    console.log('[Database] Connected to PostgreSQL:', host)
  } else {
    console.warn('[Database] Not configured - persistence disabled')
    console.warn('[Database] Set DATABASE_URL in .env')
  }
}

// Backward compatibility alias
export const logSupabaseStatus = logDatabaseStatus

/**
 * Gracefully close pool on shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('[Database] Connection pool closed')
  }
}
