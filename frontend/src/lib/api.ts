import { Job, JobsResponse, SourcesResponse, JobFilters } from './types'

// Ports to try for auto-discovery (Motia default + fallbacks)
const BACKEND_PORTS = [8000, 8001, 8002, 8003]

// Cache the discovered API base URL
let discoveredApiBase: string | null = null
let discoveryPromise: Promise<string> | null = null

/**
 * Discovers the backend API by trying each port until one responds to /health
 * This handles the case where Motia falls back to a different port
 */
async function discoverApiBase(): Promise<string> {
  // Return cached result if already discovered
  if (discoveredApiBase) {
    return discoveredApiBase
  }

  // If discovery is in progress, wait for it
  if (discoveryPromise) {
    return discoveryPromise
  }

  // Start discovery
  discoveryPromise = (async () => {
    for (const port of BACKEND_PORTS) {
      const url = `http://localhost:${port}`
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1000)

        const res = await fetch(`${url}/health`, {
          cache: 'no-store',
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (res.ok) {
          const data = await res.json()
          // Verify this is the Job Aggregator backend by checking for timestamp field
          // (Catalog Builder returns {status, version, environment} without timestamp)
          if (data.status === 'healthy' && data.timestamp) {
            console.log(`[API] Discovered Job Aggregator backend at ${url}`)
            discoveredApiBase = url
            return url
          }
        }
      } catch {
        // Port not available or timeout, try next
      }
    }

    // Fallback to first port if none responded
    console.warn(`[API] Could not discover backend, falling back to port ${BACKEND_PORTS[0]}`)
    discoveredApiBase = `http://localhost:${BACKEND_PORTS[0]}`
    return discoveredApiBase
  })()

  return discoveryPromise
}

export async function getJobs(filters?: JobFilters): Promise<JobsResponse> {
  const apiBase = await discoverApiBase()
  const params = new URLSearchParams()

  if (filters?.source) params.set('source', filters.source)
  if (filters?.remote) params.set('remote', 'true')
  if (filters?.limit) params.set('limit', filters.limit.toString())
  if (filters?.offset) params.set('offset', filters.offset.toString())
  if (filters?.search) params.set('search', filters.search)

  const url = `${apiBase}/jobs${params.toString() ? `?${params}` : ''}`

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch jobs: ${res.status}`)
  }

  return res.json()
}

export async function getJob(id: string): Promise<Job> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/jobs/${id}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Job not found')
    }
    throw new Error(`Failed to fetch job: ${res.status}`)
  }

  return res.json()
}

export async function getSources(): Promise<SourcesResponse> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/sources`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch sources: ${res.status}`)
  }

  return res.json()
}

export async function refreshSource(sourceName: string): Promise<{ message: string; source: string }> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/sources/${sourceName}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to refresh source: ${res.status}`)
  }

  return res.json()
}

export async function getHealth(): Promise<{ status: string; timestamp: string; version: string }> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/health`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`)
  }

  return res.json()
}
