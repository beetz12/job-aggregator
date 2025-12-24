'use client'

import { useQuery } from '@tanstack/react-query'
import { getHealth } from '@/lib/api'

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'wrong-backend'

export interface ConnectionInfo {
  status: ConnectionStatus
  backendVersion?: string
  lastChecked?: Date
  error?: string
}

/**
 * Hook to monitor backend connection status
 */
export function useConnectionStatus() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const health = await getHealth()
      return {
        ...health,
        checkedAt: new Date().toISOString(),
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1,
    staleTime: 10000,
  })

  let status: ConnectionStatus = 'checking'
  let info: ConnectionInfo = { status }

  if (isLoading) {
    status = 'checking'
  } else if (error) {
    status = 'disconnected'
    info = {
      status,
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  } else if (data) {
    // Check if this is the Job Aggregator backend (has timestamp field)
    if ('timestamp' in data) {
      status = 'connected'
      info = {
        status,
        backendVersion: data.version,
        lastChecked: new Date(data.checkedAt),
      }
    } else {
      // Health endpoint exists but it's not our backend
      status = 'wrong-backend'
      info = {
        status,
        error: 'Connected to a different backend service',
      }
    }
  }

  return {
    ...info,
    isConnected: status === 'connected',
    isLoading,
    refetch,
  }
}
