'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Stream, StreamGroupSubscription } from '@motiadev/stream-client-browser'
import { Job } from '@/lib/types'

// Ports to try for auto-discovery (Motia default + fallbacks)
const BACKEND_PORTS = [8000, 8001, 8002, 8003]

interface UseJobStreamOptions {
  /**
   * Filter by source: 'all' for all jobs, or a specific source name
   * @default 'all'
   */
  groupId?: string
  /**
   * Enable/disable the stream connection
   * @default true
   */
  enabled?: boolean
}

interface UseJobStreamResult {
  /** Current list of jobs from the stream */
  jobs: Job[]
  /** Whether the stream is connected */
  isConnected: boolean
  /** Any connection error */
  error: Error | null
  /** Manually reconnect the stream */
  reconnect: () => void
}

/**
 * Hook to subscribe to real-time job updates via Motia Streams
 *
 * @example
 * // Subscribe to all jobs
 * const { jobs, isConnected } = useJobStream()
 *
 * @example
 * // Subscribe to jobs from a specific source
 * const { jobs, isConnected } = useJobStream({ groupId: 'arbeitnow' })
 */
export function useJobStream(options: UseJobStreamOptions = {}): UseJobStreamResult {
  const { groupId = 'all', enabled = true } = options

  const [jobs, setJobs] = useState<Job[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const streamRef = useRef<Stream | null>(null)
  const subscriptionRef = useRef<StreamGroupSubscription<Job> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const maxReconnectAttempts = 5

  const discoverStreamUrl = useCallback(async (): Promise<string | null> => {
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
          // Verify this is the Job Aggregator backend
          if (data.status === 'healthy' && data.timestamp) {
            // WebSocket URL uses ws:// protocol
            return `ws://localhost:${port}`
          }
        }
      } catch {
        // Port not available or timeout, try next
      }
    }
    return null
  }, [])

  const connect = useCallback(async () => {
    if (!enabled) return

    // Clean up existing connection
    if (subscriptionRef.current) {
      subscriptionRef.current.close()
      subscriptionRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.close()
      streamRef.current = null
    }

    try {
      const wsUrl = await discoverStreamUrl()
      if (!wsUrl) {
        throw new Error('Could not discover backend WebSocket URL')
      }

      // Get auth token if available
      const token =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem('motia.streamToken') ?? undefined
          : undefined
      const protocols = token ? ['Authorization', token] : undefined

      // Create stream connection
      const stream = new Stream(wsUrl, { protocols })
      streamRef.current = stream

      // Subscribe to the jobs stream with the specified groupId
      const subscription = stream.subscribeGroup<Job>('jobs', groupId)
      subscriptionRef.current = subscription

      // Listen for changes
      subscription.addChangeListener((updatedJobs) => {
        setJobs(updatedJobs ?? [])
        setIsConnected(true)
        setError(null)
        reconnectAttemptRef.current = 0
      })

      // Listen for new job events (ephemeral notifications)
      subscription.onEvent('new-job', () => {
        // Event received - UI updates handled via change listener
      })

      setIsConnected(true)
      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Stream connection failed')
      setError(error)
      setIsConnected(false)

      // Auto-reconnect with exponential backoff
      if (reconnectAttemptRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000)
        reconnectAttemptRef.current++
        setTimeout(connect, delay)
      }
    }
  }, [enabled, groupId, discoverStreamUrl])

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0
    connect()
  }, [connect])

  // Connect on mount and when groupId changes
  useEffect(() => {
    connect()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.close()
      }
    }
  }, [connect])

  return {
    jobs,
    isConnected,
    error,
    reconnect,
  }
}
