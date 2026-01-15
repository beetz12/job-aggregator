'use client'

import { useState, useEffect, useCallback } from 'react'
import { JobCriteria } from '@/lib/types'

const STORAGE_KEY = 'career-compass-job-criteria'

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Hook for managing job criteria persistence in localStorage
 * Handles SSR correctly by only accessing localStorage on the client
 */
export function useCriteriaStorage() {
  const [isHydrated, setIsHydrated] = useState(false)

  // Handle hydration to avoid SSR mismatches
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  /**
   * Get stored criteria from localStorage
   * Returns null if not found or if running on server
   */
  const getStoredCriteria = useCallback((): JobCriteria | null => {
    if (!isBrowser()) return null

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const parsed = JSON.parse(stored) as JobCriteria

      // Validate basic structure
      if (!parsed.name || !parsed.lastUpdated) {
        console.warn('Invalid criteria structure in localStorage')
        return null
      }

      return parsed
    } catch (error) {
      console.error('Error reading criteria from localStorage:', error)
      return null
    }
  }, [])

  /**
   * Save criteria to localStorage
   */
  const saveCriteria = useCallback((criteria: JobCriteria): void => {
    if (!isBrowser()) return

    try {
      // Update lastUpdated timestamp
      const toSave: JobCriteria = {
        ...criteria,
        lastUpdated: new Date().toISOString(),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (error) {
      console.error('Error saving criteria to localStorage:', error)
    }
  }, [])

  /**
   * Clear stored criteria from localStorage
   */
  const clearCriteria = useCallback((): void => {
    if (!isBrowser()) return

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing criteria from localStorage:', error)
    }
  }, [])

  /**
   * Check if criteria exists in localStorage
   */
  const hasCriteria = useCallback((): boolean => {
    if (!isBrowser()) return false

    try {
      return localStorage.getItem(STORAGE_KEY) !== null
    } catch {
      return false
    }
  }, [])

  return {
    getStoredCriteria,
    saveCriteria,
    clearCriteria,
    hasCriteria,
    isHydrated,
  }
}

/**
 * Hook that provides reactive state for job criteria
 * Syncs with localStorage and handles updates
 */
export function useJobCriteria() {
  const [criteria, setCriteriaState] = useState<JobCriteria | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { getStoredCriteria, saveCriteria, clearCriteria, isHydrated } = useCriteriaStorage()

  // Load criteria from localStorage on mount
  useEffect(() => {
    if (isHydrated) {
      const stored = getStoredCriteria()
      setCriteriaState(stored)
      setIsLoading(false)
    }
  }, [isHydrated, getStoredCriteria])

  /**
   * Update criteria and persist to localStorage
   */
  const setCriteria = useCallback(
    (newCriteria: JobCriteria) => {
      setCriteriaState(newCriteria)
      saveCriteria(newCriteria)
    },
    [saveCriteria]
  )

  /**
   * Update a specific section of the criteria
   */
  const updateSection = useCallback(
    <K extends keyof JobCriteria>(section: K, value: JobCriteria[K]) => {
      setCriteriaState((prev) => {
        if (!prev) return prev

        const updated: JobCriteria = {
          ...prev,
          [section]: value,
          lastUpdated: new Date().toISOString(),
        }

        saveCriteria(updated)
        return updated
      })
    },
    [saveCriteria]
  )

  /**
   * Clear criteria from state and localStorage
   */
  const clear = useCallback(() => {
    setCriteriaState(null)
    clearCriteria()
  }, [clearCriteria])

  return {
    criteria,
    isLoading,
    setCriteria,
    updateSection,
    clear,
    hasCriteria: criteria !== null,
  }
}

/**
 * Export criteria to JSON for download
 */
export function exportCriteriaToJson(criteria: JobCriteria): string {
  return JSON.stringify(criteria, null, 2)
}

/**
 * Import criteria from JSON string
 * Returns null if parsing fails or structure is invalid
 */
export function importCriteriaFromJson(json: string): JobCriteria | null {
  try {
    const parsed = JSON.parse(json) as JobCriteria

    // Validate required fields
    if (
      !parsed.name ||
      !parsed.compensation ||
      !parsed.location ||
      !parsed.culture ||
      !parsed.technicalStack
    ) {
      console.error('Invalid criteria structure')
      return null
    }

    // Ensure lastUpdated is set
    if (!parsed.lastUpdated) {
      parsed.lastUpdated = new Date().toISOString()
    }

    return parsed
  } catch (error) {
    console.error('Error parsing criteria JSON:', error)
    return null
  }
}
