'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMyProfile } from './useProfile'

// Types for resume upload
export interface UploadResumeInput {
  resume_text: string
  resume_markdown?: string
}

export interface UploadResumeResponse {
  profile_id: string
  resume_text: string
  resume_markdown?: string
  extracted_skills: string[]
  uploaded_at: string
}

// Query key factory (matches useProfile pattern)
const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  detail: (id: string) => [...profileKeys.all, id] as const,
}

/**
 * Upload resume text/markdown to a profile.
 * POST /profile/:id/resume
 * Returns extracted skills and updates the profile.
 */
async function uploadResume(
  profileId: string,
  data: UploadResumeInput
): Promise<UploadResumeResponse> {
  // Use same discovery pattern as api.ts
  const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL
  const BACKEND_PORTS = [4000, 8000, 8001, 8002, 8003]

  let apiBase = CONFIGURED_API_URL?.replace(/\/$/, '') || null

  if (!apiBase) {
    // Simple discovery - try ports in order
    for (const port of BACKEND_PORTS) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1000)

        const res = await fetch(`http://localhost:${port}/health`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (res.ok) {
          apiBase = `http://localhost:${port}`
          break
        }
      } catch {
        // Try next port
      }
    }

    // Fallback to first port
    if (!apiBase) {
      apiBase = `http://localhost:${BACKEND_PORTS[0]}`
    }
  }

  const res = await fetch(`${apiBase}/profile/${profileId}/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to upload resume' }))
    throw new Error(error.error || `Failed to upload resume: ${res.status}`)
  }

  return res.json()
}

/**
 * Hook for uploading resume to a profile.
 * Invalidates profile queries on success to refresh profile data with new skills.
 */
export function useResumeUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ profile_id, data }: { profile_id: string; data: UploadResumeInput }) =>
      uploadResume(profile_id, data),
    onSuccess: (response) => {
      // Invalidate all profile queries to refresh data
      queryClient.invalidateQueries({ queryKey: profileKeys.all })
      // Also update specific profile cache if we have the ID
      if (response.profile_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(response.profile_id) })
        queryClient.invalidateQueries({ queryKey: profileKeys.me() })
      }
    },
  })
}

/**
 * Helper hook to check if the current user's profile has a resume.
 * Returns true if either resume_text or resume_markdown exists on the profile.
 */
export function useHasResume(): boolean {
  const { data: profile } = useMyProfile()

  // Profile type may be extended to include resume fields
  // Cast to access potential resume fields
  const profileWithResume = profile as
    | (typeof profile & { resume_text?: string; resume_markdown?: string })
    | null

  return !!(profileWithResume?.resume_text || profileWithResume?.resume_markdown)
}
