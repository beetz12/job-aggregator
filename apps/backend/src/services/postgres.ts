import { Pool, PoolClient } from 'pg'
import dns from 'dns'

// Only force IPv4 on Railway (which doesn't support IPv6).
// Supabase direct connections are IPv6-only, so ipv4first breaks them.
if (process.env.RAILWAY_ENVIRONMENT) {
  dns.setDefaultResultOrder('ipv4first')
}

const databaseUrl = process.env.DATABASE_URL

let pool: Pool | null = null

/**
 * Parse a PostgreSQL connection string into explicit config.
 * The pg library's URL parser + Node.js DNS can fail on IPv6-only hosts
 * (like Supabase direct connections). Explicit config avoids this.
 */
function parseConnectionString(url: string): {
  host: string; port: number; database: string; user: string; password: string
} {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 5432,
    database: parsed.pathname.slice(1) || 'postgres',
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
  }
}

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

    // Parse URL into explicit config to avoid IPv6 DNS resolution issues
    const dbConfig = parseConnectionString(databaseUrl)

    pool = new Pool({
      ...dbConfig,
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
