'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InterviewAnswers } from '@/lib/interviewQuestions'

const STORAGE_KEY = 'career-compass-interview-answers'

/**
 * Hook for managing interview answers persistence in localStorage.
 * Handles SSR correctly by checking for window availability.
 *
 * Follows the same pattern as useResumeStorage for consistency.
 */
export function useInterviewStorage() {
  const [isClient, setIsClient] = useState(false)
  const [storedAnswers, setStoredAnswers] = useState<InterviewAnswers | null>(null)

  // Ensure we're on the client before accessing localStorage
  useEffect(() => {
    setIsClient(true)
    // Load stored answers on mount
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as InterviewAnswers
          setStoredAnswers(parsed)
        }
      } catch (error) {
        console.error('Failed to load stored interview answers:', error)
      }
    }
  }, [])

  /**
   * Get the currently stored answers from localStorage.
   * Returns null if no answers are stored or if running on server.
   */
  const getStoredAnswers = useCallback((): InterviewAnswers | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      return JSON.parse(stored) as InterviewAnswers
    } catch (error) {
      console.error('Failed to get stored interview answers:', error)
      return null
    }
  }, [])

  /**
   * Save answers to localStorage.
   */
  const saveAnswers = useCallback((answers: InterviewAnswers): void => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
      setStoredAnswers(answers)
    } catch (error) {
      console.error('Failed to save interview answers:', error)
    }
  }, [])

  /**
   * Update a single answer while preserving others.
   */
  const updateAnswer = useCallback((questionId: string, answer: string): void => {
    if (typeof window === 'undefined') return

    try {
      const current = getStoredAnswers() || {}
      const updated = { ...current, [questionId]: answer }
      saveAnswers(updated)
    } catch (error) {
      console.error('Failed to update interview answer:', error)
    }
  }, [getStoredAnswers, saveAnswers])

  /**
   * Clear all stored answers from localStorage.
   */
  const clearAnswers = useCallback((): void => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(STORAGE_KEY)
      setStoredAnswers(null)
    } catch (error) {
      console.error('Failed to clear interview answers:', error)
    }
  }, [])

  /**
   * Check if there are any stored answers in localStorage.
   */
  const hasStoredAnswers = useCallback((): boolean => {
    if (typeof window === 'undefined') return false

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return false
      const parsed = JSON.parse(stored) as InterviewAnswers
      return Object.keys(parsed).length > 0
    } catch (error) {
      console.error('Failed to check stored interview answers:', error)
      return false
    }
  }, [])

  /**
   * Get the count of answered questions.
   */
  const getAnsweredCount = useCallback((): number => {
    if (typeof window === 'undefined') return 0

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return 0
      const parsed = JSON.parse(stored) as InterviewAnswers
      // Count only non-empty answers
      return Object.values(parsed).filter(answer => answer.trim().length > 0).length
    } catch (error) {
      console.error('Failed to count answered questions:', error)
      return 0
    }
  }, [])

  return {
    storedAnswers,
    getStoredAnswers,
    saveAnswers,
    updateAnswer,
    clearAnswers,
    hasStoredAnswers,
    getAnsweredCount,
    isClient,
  }
}
