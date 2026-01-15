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
  EnhancedFitAnalysisResult,
  EnhancedCheckFitRequest,
  GenerateInterviewQuestionsResponse,
  ResumeData,
  JobRequirementsDoc,
  AnalyzeResumeResponse,
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

  // Basic filters
  if (filters?.source) params.set('source', filters.source)
  if (filters?.remote) params.set('remote', 'true')
  if (filters?.limit) params.set('limit', filters.limit.toString())
  if (filters?.offset) params.set('offset', filters.offset.toString())
  if (filters?.search) params.set('search', filters.search)

  // Advanced filters
  if (filters?.tags && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','))
  }
  if (filters?.salaryMin !== undefined) {
    params.set('salaryMin', filters.salaryMin.toString())
  }
  if (filters?.salaryMax !== undefined) {
    params.set('salaryMax', filters.salaryMax.toString())
  }
  if (filters?.locations && filters.locations.length > 0) {
    params.set('locations', filters.locations.join(','))
  }
  if (filters?.employmentTypes && filters.employmentTypes.length > 0) {
    params.set('employmentTypes', filters.employmentTypes.join(','))
  }
  if (filters?.experienceLevels && filters.experienceLevels.length > 0) {
    params.set('experienceLevels', filters.experienceLevels.join(','))
  }

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
      profile_id: profileId,
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

  const res = await fetch(`${apiBase}/jobs/${request.job_id}/check-fit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile_id: request.profile_id,
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

  const res = await fetch(`${apiBase}/jobs/${request.job_id}/generate-application`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile_id: request.profile_id,
      applicationQuestions: request.application_questions,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate application' }))
    throw new Error(error.error || `Failed to generate application: ${res.status}`)
  }

  return res.json()
}

/**
 * Enhanced check fit with Career Advisor criteria support.
 * Allows checking fit for either an existing job (by ID) or a pasted job description.
 * Includes optional job criteria for enhanced analysis.
 */
export async function checkFitWithCriteria(
  request: EnhancedCheckFitRequest
): Promise<EnhancedFitAnalysisResult> {
  const apiBase = await discoverApiBase()

  // Determine the endpoint based on whether we have a job_id or job_description
  const endpoint = request.job_id
    ? `${apiBase}/jobs/${request.job_id}/check-fit`
    : `${apiBase}/jobs/check-fit`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job_id: request.job_id,
      job_description: request.job_description,
      profile_id: request.profile_id,
      job_criteria: request.job_criteria,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to check fit' }))
    throw new Error(error.error || `Failed to check fit: ${res.status}`)
  }

  const data = await res.json()

  // Transform backend response (camelCase) to frontend format (snake_case)
  // This handles the case where the backend returns camelCase keys
  return transformFitAnalysisResponse(data)
}

/**
 * Transform backend fit analysis response to frontend format.
 * Handles both camelCase (from backend) and snake_case (already transformed) formats.
 */
function transformFitAnalysisResponse(data: Record<string, unknown>): EnhancedFitAnalysisResult {
  // Check if already in snake_case format
  if ('job_id' in data && 'user_id' in data) {
    return data as unknown as EnhancedFitAnalysisResult
  }

  // Transform from camelCase to snake_case
  const transformed: EnhancedFitAnalysisResult = {
    job_id: (data.jobId as string) || '',
    user_id: (data.userId as string) || '',
    company_insights: {
      overall_score: (data.companyInsights as Record<string, unknown>)?.overallScore as number || 0,
      scores: {
        compensation: ((data.companyInsights as Record<string, unknown>)?.scores as Record<string, number>)?.compensation || 0,
        culture: ((data.companyInsights as Record<string, unknown>)?.scores as Record<string, number>)?.culture || 0,
        family_friendliness: ((data.companyInsights as Record<string, unknown>)?.scores as Record<string, number>)?.familyFriendliness || 0,
        technical_fit: ((data.companyInsights as Record<string, unknown>)?.scores as Record<string, number>)?.technicalFit || 0,
        industry: ((data.companyInsights as Record<string, unknown>)?.scores as Record<string, number>)?.industry || 0,
        long_term_potential: ((data.companyInsights as Record<string, unknown>)?.scores as Record<string, number>)?.longTermPotential || 0,
      },
      green_flags: ((data.companyInsights as Record<string, unknown>)?.greenFlags as string[]) || [],
      red_flags: ((data.companyInsights as Record<string, unknown>)?.redFlags as string[]) || [],
      recent_news: ((data.companyInsights as Record<string, unknown>)?.recentNews as string[]) || [],
      recommendation: ((data.companyInsights as Record<string, unknown>)?.recommendation as 'STRONG_YES' | 'YES' | 'MAYBE' | 'PASS') || 'MAYBE',
    },
    match_analysis: {
      overall_match: (data.matchAnalysis as Record<string, unknown>)?.overallMatch as number || 0,
      strong_matches: ((data.matchAnalysis as Record<string, unknown>)?.strongMatches as string[]) || [],
      partial_matches: ((data.matchAnalysis as Record<string, unknown>)?.partialMatches as string[]) || [],
      gaps: ((data.matchAnalysis as Record<string, unknown>)?.gaps as string[]) || [],
      transferable_skills: ((data.matchAnalysis as Record<string, unknown>)?.transferableSkills as string[]) || [],
    },
    fit_score: {
      composite: (data.fitScore as Record<string, unknown>)?.composite as number || 0,
      confidence: (data.fitScore as Record<string, unknown>)?.confidence as number || 0,
      recommendation: ((data.fitScore as Record<string, unknown>)?.recommendation as 'STRONG_APPLY' | 'APPLY' | 'CONDITIONAL' | 'SKIP') || 'CONDITIONAL',
      reasoning: ((data.fitScore as Record<string, unknown>)?.reasoning as string) || '',
    },
    talking_points: (data.talkingPoints as string[]) || [],
    gaps_to_address: (data.gapsToAddress as string[]) || [],
    interview_questions: (data.interviewQuestions as string[]) || [],
    analyzed_at: (data.analyzedAt as string) || new Date().toISOString(),
    criteria_match: data.criteriaMatch ? {
      salaryAlignment: ((data.criteriaMatch as Record<string, unknown>)?.salaryAlignment as 'above' | 'within' | 'below' | 'unknown') || 'unknown',
      locationMatch: ((data.criteriaMatch as Record<string, unknown>)?.locationMatch as boolean) || false,
      cultureFlags: {
        green: (((data.criteriaMatch as Record<string, unknown>)?.cultureFlags as Record<string, string[]>)?.green) || [],
        red: (((data.criteriaMatch as Record<string, unknown>)?.cultureFlags as Record<string, string[]>)?.red) || [],
      },
      techStackCoverage: ((data.criteriaMatch as Record<string, unknown>)?.techStackCoverage as number) || 0,
      companyStageMatch: ((data.criteriaMatch as Record<string, unknown>)?.companyStageMatch as boolean) || false,
    } : undefined,
    should_apply: (data.shouldApply as 'DEFINITELY' | 'LIKELY' | 'MAYBE' | 'PROBABLY_NOT' | 'NO') || 'MAYBE',
    detailed_reasoning: (data.detailedReasoning as string[]) || [],
  }

  return transformed
}

// ============================================================================
// Interview Questions API
// ============================================================================

/**
 * Generate personalized interview questions based on resume content.
 * Uses LLM to analyze the resume and create contextual questions.
 * Falls back to default questions if LLM call fails.
 */
export async function generateInterviewQuestions(
  resumeText: string,
  questionCount: number = 5
): Promise<GenerateInterviewQuestionsResponse> {
  const apiBase = await discoverApiBase()

  const res = await fetch(`${apiBase}/interview-questions/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resume_text: resumeText,
      question_count: questionCount,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate interview questions' }))
    throw new Error(error.error || `Failed to generate interview questions: ${res.status}`)
  }

  return res.json()
}

// ============================================================================
// Career Compass API (Resume Analysis & Job Requirements Generation)
// ============================================================================

/**
 * Analyze resume using Gemini AI
 * Returns structured resume data and personalized interview questions
 */
export async function analyzeResumeWithAI(resumeText: string): Promise<AnalyzeResumeResponse> {
  const apiBase = await discoverApiBase()

  const res = await fetch(`${apiBase}/resume/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resumeText }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to analyze resume' }))
    throw new Error(error.error || 'Failed to analyze resume')
  }

  return res.json()
}

/**
 * Generate job requirements document using Gemini AI
 * Returns comprehensive job search criteria based on resume and interview answers
 */
export async function generateRequirementsDoc(
  resumeData: ResumeData,
  answers: Record<string, string>
): Promise<JobRequirementsDoc> {
  const apiBase = await discoverApiBase()

  const res = await fetch(`${apiBase}/resume/requirements-doc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resumeData, answers }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate requirements' }))
    throw new Error(error.error || 'Failed to generate requirements document')
  }

  return res.json()
}
