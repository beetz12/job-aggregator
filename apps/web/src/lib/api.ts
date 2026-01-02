import {
  Job,
  JobsResponse,
  SourcesResponse,
  JobFilters,
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
  MatchedJobsResponse,
  Application,
  ApplicationsResponse,
  CreateApplicationInput,
  UpdateApplicationInput,
  CoverLetterResponse,
  FitAnalysisResult,
  ApplicationKitResult,
  CheckFitRequest,
  GenerateApplicationRequest,
} from './types'

// Environment variable for explicit API URL configuration
// Set NEXT_PUBLIC_API_URL in .env.local to override auto-discovery
const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL

// Ports to try for auto-discovery (4000 is our default, then Motia defaults)
const BACKEND_PORTS = [4000, 8000, 8001, 8002, 8003]

// Cache the discovered API base URL
let discoveredApiBase: string | null = null
let discoveryPromise: Promise<string> | null = null

// Local storage key for profile ID
const PROFILE_ID_KEY = 'job-aggregator-profile-id'

/**
 * Verify that a URL is the Job Aggregator backend by checking /jobs endpoint
 */
async function verifyJobAggregatorBackend(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const res = await fetch(`${url}/jobs?limit=1`, {
      cache: 'no-store',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      // Job Aggregator returns { jobs, total, sources, lastUpdated }
      return Array.isArray(data.jobs) && 'sources' in data && 'lastUpdated' in data
    }
  } catch {
    // Verification failed
  }
  return false
}

/**
 * Discovers the backend API by trying each port until one responds correctly.
 * Uses NEXT_PUBLIC_API_URL if configured, otherwise auto-discovers.
 */
async function discoverApiBase(): Promise<string> {
  // Return cached result if already discovered
  if (discoveredApiBase) {
    return discoveredApiBase
  }

  // Use configured URL if available
  if (CONFIGURED_API_URL) {
    discoveredApiBase = CONFIGURED_API_URL.replace(/\/$/, '') // Remove trailing slash
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
          // First check: health endpoint has timestamp (Job Aggregator specific)
          if (data.status === 'healthy' && data.timestamp) {
            // Second check: verify /jobs endpoint responds correctly
            const isJobAggregator = await verifyJobAggregatorBackend(url)
            if (isJobAggregator) {
              discoveredApiBase = url
              return url
            }
            // Port health OK but not Job Aggregator, try next
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

/**
 * Reset API discovery cache - useful for testing or when backend restarts on different port
 */
export function resetApiDiscovery(): void {
  discoveredApiBase = null
  discoveryPromise = null
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

// ============================================================================
// Profile API
// ============================================================================

/**
 * Create or update a profile.
 * Backend returns { profile, created } wrapper - we unwrap to return just the profile.
 */
export async function createProfile(profile: CreateProfileInput): Promise<Profile> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create profile' }))
    throw new Error(error.error || `Failed to create profile: ${res.status}`)
  }

  const data = await res.json()

  // Store profile ID in localStorage for "my profile" functionality
  if (data.profile?.id) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_ID_KEY, data.profile.id)
    }
  }

  // Backend returns { profile, created } - unwrap to return just the profile
  return data.profile
}

/**
 * Get a profile by ID.
 * Backend returns { profile, found } wrapper - we unwrap to return just the profile.
 */
export async function getProfile(id: string): Promise<Profile> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/profile/${id}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Profile not found')
    }
    throw new Error(`Failed to fetch profile: ${res.status}`)
  }

  const data = await res.json()
  // Backend returns { profile, found } - unwrap to return just the profile
  return data.profile
}

/**
 * Update an existing profile.
 * Note: Backend uses POST /profile with id in body, not PUT /profile/:id
 */
export async function updateProfile(id: string, updates: UpdateProfileInput): Promise<Profile> {
  // Backend's create-profile.step.ts handles updates when id is provided
  return createProfile({ ...updates, id } as CreateProfileInput)
}

/**
 * Get the current user's profile from localStorage.
 * Returns null if no profile ID is stored.
 */
export async function getMyProfile(): Promise<Profile | null> {
  if (typeof window === 'undefined') {
    return null
  }

  const profileId = localStorage.getItem(PROFILE_ID_KEY)
  if (!profileId) {
    return null
  }

  try {
    return await getProfile(profileId)
  } catch (error) {
    // If profile not found, clear localStorage
    if (error instanceof Error && error.message === 'Profile not found') {
      localStorage.removeItem(PROFILE_ID_KEY)
    }
    return null
  }
}

/**
 * Get the current profile ID from localStorage.
 */
export function getMyProfileId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(PROFILE_ID_KEY)
}

/**
 * Set the current profile ID in localStorage.
 */
export function setMyProfileId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_ID_KEY, id)
  }
}

/**
 * Clear the current profile ID from localStorage.
 */
export function clearMyProfileId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROFILE_ID_KEY)
  }
}

// ============================================================================
// Matched Jobs API
// ============================================================================

export async function getMatchedJobs(
  profileId: string,
  options?: { limit?: number; minScore?: number }
): Promise<MatchedJobsResponse> {
  const apiBase = await discoverApiBase()
  const params = new URLSearchParams()

  if (options?.limit) params.set('limit', options.limit.toString())
  if (options?.minScore) params.set('minScore', options.minScore.toString())

  const url = `${apiBase}/profile/${profileId}/matches${params.toString() ? `?${params}` : ''}`

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Profile not found')
    }
    throw new Error(`Failed to fetch matched jobs: ${res.status}`)
  }

  return res.json()
}

// ============================================================================
// Applications API
// ============================================================================

export async function createApplication(app: CreateApplicationInput): Promise<Application> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(app),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create application' }))
    throw new Error(error.error || `Failed to create application: ${res.status}`)
  }

  return res.json()
}

export async function getApplications(status?: string): Promise<ApplicationsResponse> {
  const apiBase = await discoverApiBase()
  const params = new URLSearchParams()
  if (status && status !== 'all') {
    params.set('status', status)
  }

  const url = `${apiBase}/applications${params.toString() ? `?${params}` : ''}`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch applications: ${res.status}`)
  }

  return res.json()
}

export async function getApplication(id: string): Promise<Application> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/applications/${id}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Application not found')
    }
    throw new Error(`Failed to fetch application: ${res.status}`)
  }

  return res.json()
}

export async function updateApplication(id: string, data: UpdateApplicationInput): Promise<Application> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/applications/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update application' }))
    throw new Error(error.error || `Failed to update application: ${res.status}`)
  }

  return res.json()
}

export async function deleteApplication(id: string): Promise<void> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/applications/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to delete application: ${res.status}`)
  }
}

// ============================================================================
// Cover Letter API
// ============================================================================

export async function generateCoverLetter(
  jobId: string,
  profileId: string,
  options?: {
    tone?: 'professional' | 'friendly' | 'enthusiastic'
    emphasis?: string[]
  }
): Promise<CoverLetterResponse> {
  const apiBase = await discoverApiBase()

  // Correct URL: POST /jobs/:id/cover-letter (not /cover-letter/generate)
  const res = await fetch(`${apiBase}/jobs/${jobId}/cover-letter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profileId,
      tone: options?.tone,
      emphasis: options?.emphasis,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate cover letter' }))
    throw new Error(error.error || `Failed to generate cover letter: ${res.status}`)
  }

  return res.json()
}

// ============================================================================
// Intelligent Job Application System API (V3)
// ============================================================================

/**
 * Check fit for a job - runs the Analysis Agent to get deep fit analysis
 */
export async function checkFit(request: CheckFitRequest): Promise<FitAnalysisResult> {
  const apiBase = await discoverApiBase()

  const res = await fetch(`${apiBase}/jobs/${request.jobId}/check-fit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profileId: request.profileId,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to check fit' }))
    throw new Error(error.error || `Failed to check fit: ${res.status}`)
  }

  return res.json()
}

/**
 * Generate application materials - runs the Generation Agent to create resume, cover letter, etc.
 */
export async function generateApplication(
  request: GenerateApplicationRequest
): Promise<ApplicationKitResult> {
  const apiBase = await discoverApiBase()

  const res = await fetch(`${apiBase}/jobs/${request.jobId}/generate-application`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profileId: request.profileId,
      applicationQuestions: request.applicationQuestions,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate application' }))
    throw new Error(error.error || `Failed to generate application: ${res.status}`)
  }

  return res.json()
}
