'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { checkFit, generateApplication } from '@/lib/api'
import { CheckFitRequest, GenerateApplicationRequest } from '@/lib/types'

/**
 * Hook for checking job fit using the Analysis Agent
 * Returns deep analysis including company insights, match analysis, fit score
 */
export function useCheckFit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CheckFitRequest) => checkFit(request),
    onSuccess: (data) => {
      // Cache the fit analysis result
      queryClient.setQueryData(['fitAnalysis', data.job_id], data)
    },
  })
}

/**
 * Hook for generating application materials using the Generation Agent
 * Returns tailored resume, cover letter, and optionally question answers
 */
export function useGenerateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: GenerateApplicationRequest) => generateApplication(request),
    onSuccess: (data) => {
      // Cache the application kit
      queryClient.setQueryData(['applicationKit', data.job_id], data)
    },
  })
}
