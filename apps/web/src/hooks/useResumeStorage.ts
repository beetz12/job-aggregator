'use client'

import { useState, useEffect, useCallback } from 'react'

export interface StoredResume {
  text: string
  fileName?: string
  uploadedAt: string
  source: 'paste' | 'file'
}

const STORAGE_KEY = 'career-compass-resume'

/**
 * Hook for managing resume persistence in localStorage.
 * Handles SSR correctly by checking for window availability.
 */
export function useResumeStorage() {
  const [isClient, setIsClient] = useState(false)
  const [storedResume, setStoredResume] = useState<StoredResume | null>(null)

  // Ensure we're on the client before accessing localStorage
  useEffect(() => {
    setIsClient(true)
    // Load stored resume on mount
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as StoredResume
          setStoredResume(parsed)
        }
      } catch (error) {
        console.error('Failed to load stored resume:', error)
      }
    }
  }, [])

  /**
   * Get the currently stored resume from localStorage.
   * Returns null if no resume is stored or if running on server.
   */
  const getStoredResume = useCallback((): StoredResume | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      return JSON.parse(stored) as StoredResume
    } catch (error) {
      console.error('Failed to get stored resume:', error)
      return null
    }
  }, [])

  /**
   * Save a resume to localStorage.
   */
  const saveResume = useCallback((resume: StoredResume): void => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resume))
      setStoredResume(resume)
    } catch (error) {
      console.error('Failed to save resume:', error)
    }
  }, [])

  /**
   * Clear the stored resume from localStorage.
   */
  const clearResume = useCallback((): void => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(STORAGE_KEY)
      setStoredResume(null)
    } catch (error) {
      console.error('Failed to clear resume:', error)
    }
  }, [])

  /**
   * Check if there's a stored resume in localStorage.
   */
  const hasStoredResume = useCallback((): boolean => {
    if (typeof window === 'undefined') return false

    try {
      return localStorage.getItem(STORAGE_KEY) !== null
    } catch (error) {
      console.error('Failed to check stored resume:', error)
      return false
    }
  }, [])

  return {
    storedResume,
    getStoredResume,
    saveResume,
    clearResume,
    hasStoredResume,
    isClient,
  }
}
