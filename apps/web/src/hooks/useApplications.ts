'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
} from '@/lib/api'
import { CreateApplicationInput, UpdateApplicationInput } from '@/lib/types'

// Query key factory
const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (status?: string) => [...applicationKeys.lists(), status] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
}

export function useApplications(status?: string) {
  return useQuery({
    queryKey: applicationKeys.list(status),
    queryFn: () => getApplications(status),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => getApplication(id),
    staleTime: 60000,
    enabled: !!id,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (app: CreateApplicationInput) => createApplication(app),
    onSuccess: () => {
      // Invalidate all application lists to refetch
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApplicationInput }) =>
      updateApplication(id, data),
    onSuccess: (updatedApp) => {
      // Update the specific application in cache
      queryClient.setQueryData(applicationKeys.detail(updatedApp.id), updatedApp)
      // Invalidate lists since status may have changed
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: applicationKeys.detail(deletedId) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}
