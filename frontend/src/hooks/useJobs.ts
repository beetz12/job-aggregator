'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobs, getJob, getSources, refreshSource } from '@/lib/api'
import { JobFilters } from '@/lib/types'

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => getJobs(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id),
    staleTime: 60000, // Consider data stale after 60 seconds
    retry: 1, // Only retry once for individual job fetches
  })
}

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: getSources,
    refetchInterval: 30000,
    staleTime: 10000,
  })
}

export function useRefreshSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refreshSource,
    onSuccess: () => {
      // Invalidate both jobs and sources queries after refresh
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })
}
