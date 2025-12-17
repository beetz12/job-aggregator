import { JobsResponse, SourcesResponse, JobFilters } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function getJobs(filters?: JobFilters): Promise<JobsResponse> {
  const params = new URLSearchParams()

  if (filters?.source) params.set('source', filters.source)
  if (filters?.remote) params.set('remote', 'true')
  if (filters?.limit) params.set('limit', filters.limit.toString())
  if (filters?.offset) params.set('offset', filters.offset.toString())

  const url = `${API_BASE}/jobs${params.toString() ? `?${params}` : ''}`

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

export async function getSources(): Promise<SourcesResponse> {
  const res = await fetch(`${API_BASE}/sources`, {
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
  const res = await fetch(`${API_BASE}/sources/${sourceName}/refresh`, {
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
  const res = await fetch(`${API_BASE}/health`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`)
  }

  return res.json()
}
