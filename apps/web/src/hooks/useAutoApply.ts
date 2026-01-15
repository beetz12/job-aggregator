'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Application } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

export interface AutoApplyResponse {
  application: Application
  message: string
  success: boolean
}

export interface TriggerResumeGenerationInput {
  applicationId: string
  jobId: string
  profileId: string
}

export interface ResumeGenerationResponse {
  message: string
  application_id: string
  job_id: string
  profile_id: string
  status: 'queued' | 'started'
}

export interface CheckpointData {
  applicationId: string
  checkpointId: string
  type: 'login' | 'captcha' | 'questions' | 'review' | 'error' | 'upload'
  message: string
  screenshot?: string
  url?: string
  questions?: Array<{
    id: string
    text: string
    type: 'text' | 'select' | 'checkbox' | 'radio' | 'textarea'
    options?: string[]
    required?: boolean
  }>
}

export interface CheckpointResponseData {
  continue: boolean
  approved?: boolean
  answers?: Record<string, string>
  credentials?: {
    username?: string
    password?: string
  }
  captchaSolution?: string
  action?: string
}

export interface ProgressData {
  applicationId: string
  step: number
  action: string
  reason: string
  timestamp: string
}

export interface AutoApplyState {
  isApplying: boolean
  currentStep: number
  currentAction: string
  currentReason: string
  checkpoint: CheckpointData | null
  error: string | null
}

// ============================================================================
// API Functions
// ============================================================================

// Environment variable for explicit API URL configuration
const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL

// Ports to try for auto-discovery
const BACKEND_PORTS = [4000, 8000, 8001, 8002, 8003]

// Cache the discovered API base URL
let discoveredApiBase: string | null = null

async function discoverApiBase(): Promise<string> {
  if (discoveredApiBase) {
    return discoveredApiBase
  }

  if (CONFIGURED_API_URL) {
    discoveredApiBase = CONFIGURED_API_URL.replace(/\/$/, '')
    return discoveredApiBase
  }

  for (const port of BACKEND_PORTS) {
    const url = `http://localhost:${port}`
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000)

      const res = await fetch(`${url}/health`, {
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.status === 'healthy' && data.timestamp) {
          discoveredApiBase = url
          return url
        }
      }
    } catch {
      // Port not available, try next
    }
  }

  discoveredApiBase = `http://localhost:${BACKEND_PORTS[0]}`
  return discoveredApiBase
}

async function triggerAutoApply(applicationId: string): Promise<AutoApplyResponse> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/applications/${applicationId}/auto-apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to trigger auto-apply' }))
    throw new Error(error.error || `Failed to trigger auto-apply: ${res.status}`)
  }

  return res.json()
}

async function respondToCheckpoint(
  checkpointId: string,
  response: CheckpointResponseData
): Promise<{ success: boolean; message: string }> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/checkpoints/${checkpointId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(response),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to respond to checkpoint' }))
    throw new Error(error.error || `Failed to respond to checkpoint: ${res.status}`)
  }

  return res.json()
}

async function triggerResumeGeneration(
  input: TriggerResumeGenerationInput
): Promise<ResumeGenerationResponse> {
  const apiBase = await discoverApiBase()
  const res = await fetch(`${apiBase}/applications/${input.applicationId}/generate-resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job_id: input.jobId,
      profile_id: input.profileId,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to trigger resume generation' }))
    throw new Error(error.error || `Failed to trigger resume generation: ${res.status}`)
  }

  return res.json()
}

// ============================================================================
// Query Keys
// ============================================================================

const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (status?: string) => [...applicationKeys.lists(), status] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for triggering auto-apply on an application.
 * Calls POST /applications/:id/auto-apply
 *
 * @returns UseMutationResult<AutoApplyResponse, Error, string>
 */
export function useAutoApply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (applicationId: string) => triggerAutoApply(applicationId),
    onSuccess: (data) => {
      // Update the specific application in cache
      if (data.application) {
        queryClient.setQueryData(applicationKeys.detail(data.application.id), data.application)
      }
      // Invalidate lists since status may have changed
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

/**
 * Hook for responding to checkpoints during auto-apply.
 * Calls POST /checkpoints/:checkpointId/respond
 */
export function useCheckpointResponse() {
  return useMutation({
    mutationFn: ({
      checkpointId,
      response,
    }: {
      checkpointId: string
      response: CheckpointResponseData
    }) => respondToCheckpoint(checkpointId, response),
  })
}

/**
 * Hook for triggering custom resume generation for an application.
 * Calls POST /applications/:id/generate-resume
 *
 * @returns UseMutationResult<ResumeGenerationResponse, Error, TriggerResumeGenerationInput>
 */
export function useTriggerResumeGeneration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: TriggerResumeGenerationInput) => triggerResumeGeneration(input),
    onSuccess: (data) => {
      // Invalidate the specific application to refetch updated status
      queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(data.application_id),
      })
      // Invalidate lists since status may have changed
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

/**
 * Full auto-apply workflow hook with checkpoint handling.
 * Manages the entire auto-apply process including checkpoints.
 */
export function useAutoApplyWorkflow() {
  const [state, setState] = useState<AutoApplyState>({
    isApplying: false,
    currentStep: 0,
    currentAction: '',
    currentReason: '',
    checkpoint: null,
    error: null,
  })

  const autoApply = useAutoApply()
  const checkpointResponse = useCheckpointResponse()
  const queryClient = useQueryClient()

  // Start the auto-apply process
  const startAutoApply = useCallback(
    async (applicationId: string) => {
      setState({
        isApplying: true,
        currentStep: 0,
        currentAction: 'Starting',
        currentReason: 'Initializing auto-apply...',
        checkpoint: null,
        error: null,
      })

      try {
        await autoApply.mutateAsync(applicationId)
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isApplying: false,
          error: error instanceof Error ? error.message : 'Failed to start auto-apply',
        }))
      }
    },
    [autoApply]
  )

  // Handle checkpoint response from user
  const handleCheckpointResponse = useCallback(
    async (response: CheckpointResponseData) => {
      if (!state.checkpoint) return

      try {
        await checkpointResponse.mutateAsync({
          checkpointId: state.checkpoint.checkpointId,
          response,
        })

        // Clear checkpoint state - the backend will continue
        setState((prev) => ({
          ...prev,
          checkpoint: null,
        }))
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to respond to checkpoint',
        }))
      }
    },
    [state.checkpoint, checkpointResponse]
  )

  // Update state from progress events (call from SSE/WebSocket handler)
  const handleProgressEvent = useCallback((progress: ProgressData) => {
    setState((prev) => ({
      ...prev,
      currentStep: progress.step,
      currentAction: progress.action,
      currentReason: progress.reason,
    }))
  }, [])

  // Update state from checkpoint events (call from SSE/WebSocket handler)
  const handleCheckpointEvent = useCallback((checkpoint: CheckpointData) => {
    setState((prev) => ({
      ...prev,
      checkpoint,
    }))
  }, [])

  // Handle completion event (call from SSE/WebSocket handler)
  const handleCompleteEvent = useCallback(
    (data: { applicationId: string; success: boolean; error?: string }) => {
      setState((prev) => ({
        ...prev,
        isApplying: false,
        error: data.error || null,
      }))

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(data.applicationId) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
    [queryClient]
  )

  // Cancel the current checkpoint (user wants to skip)
  const cancelCheckpoint = useCallback(async () => {
    await handleCheckpointResponse({ continue: false })
    setState((prev) => ({
      ...prev,
      isApplying: false,
      checkpoint: null,
    }))
  }, [handleCheckpointResponse])

  // Reset state
  const reset = useCallback(() => {
    setState({
      isApplying: false,
      currentStep: 0,
      currentAction: '',
      currentReason: '',
      checkpoint: null,
      error: null,
    })
  }, [])

  return {
    state,
    startAutoApply,
    handleCheckpointResponse,
    handleProgressEvent,
    handleCheckpointEvent,
    handleCompleteEvent,
    cancelCheckpoint,
    reset,
    isLoading: autoApply.isPending || checkpointResponse.isPending,
  }
}
