'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProfile,
  getMyProfile,
  createProfile,
  updateProfile,
  getMatchedJobs,
  generateCoverLetter,
} from '@/lib/api'
import { CreateProfileInput, UpdateProfileInput } from '@/lib/types'

// Query key factory
const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  detail: (id: string) => [...profileKeys.all, id] as const,
  matches: (profileId: string) => [...profileKeys.all, profileId, 'matches'] as const,
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: profileKeys.detail(id),
    queryFn: () => getProfile(id),
    staleTime: 60000, // 1 minute
    retry: 1,
    enabled: !!id,
  })
}

export function useMyProfile() {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: getMyProfile,
    staleTime: 60000,
    retry: 1,
  })
}

export function useCreateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (profile: CreateProfileInput) => createProfile(profile),
    onSuccess: (newProfile) => {
      // Update the 'me' profile cache
      queryClient.setQueryData(profileKeys.me(), newProfile)
      // Also cache by ID
      queryClient.setQueryData(profileKeys.detail(newProfile.id), newProfile)
      // Invalidate matches since we now have a profile
      queryClient.invalidateQueries({ queryKey: profileKeys.all })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileInput }) =>
      updateProfile(id, data),
    onSuccess: (updatedProfile) => {
      // Update both caches
      queryClient.setQueryData(profileKeys.me(), updatedProfile)
      queryClient.setQueryData(profileKeys.detail(updatedProfile.id), updatedProfile)
      // Invalidate matches since skills may have changed
      queryClient.invalidateQueries({ queryKey: profileKeys.matches(updatedProfile.id) })
    },
  })
}

export function useMatchedJobs(profileId: string) {
  return useQuery({
    queryKey: profileKeys.matches(profileId),
    queryFn: () => getMatchedJobs(profileId),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
    enabled: !!profileId,
  })
}

export function useGenerateCoverLetter() {
  return useMutation({
    mutationFn: ({ job_id, profile_id }: { job_id: string; profile_id: string }) =>
      generateCoverLetter(job_id, profile_id),
  })
}
