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
    onSuccess: (_data, sourceName) => {
      if (sourceName === 'all') {
        // Batch refresh - invalidate all job queries
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
      } else {
        // Single source - only invalidate queries that include this source
        // This includes the "all jobs" view (no source filter) and the specific source view
        queryClient.invalidateQueries({
          queryKey: ['jobs'],
          predicate: (query) => {
            const filters = query.queryKey[1] as JobFilters | undefined
            // Invalidate if no source filter OR if the source matches
            return !filters?.source || filters.source === sourceName
          }
        })
      }
      // Always refresh source status (job counts may have changed)
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })
}
