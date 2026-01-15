'use client'

import { useState, useCallback, useMemo } from 'react'

export interface UseJobSelectionReturn {
  selectedJobIds: Set<string>
  isSelected: (jobId: string) => boolean
  toggleSelection: (jobId: string) => void
  selectAll: (jobIds: string[]) => void
  clearSelection: () => void
  selectedCount: number
  getSelectedIds: () => string[]
}

/**
 * Hook for managing multi-job selection state.
 * Used for batch operations like "Check Fit" on multiple jobs.
 */
export function useJobSelection(): UseJobSelectionReturn {
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())

  const isSelected = useCallback(
    (jobId: string) => selectedJobIds.has(jobId),
    [selectedJobIds]
  )

  const toggleSelection = useCallback((jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((jobIds: string[]) => {
    setSelectedJobIds((prev) => {
      // If all are selected, deselect all. Otherwise, select all.
      const allSelected = jobIds.every((id) => prev.has(id))
      if (allSelected) {
        return new Set()
      }
      return new Set(jobIds)
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedJobIds(new Set())
  }, [])

  const selectedCount = useMemo(() => selectedJobIds.size, [selectedJobIds])

  const getSelectedIds = useCallback(() => {
    return Array.from(selectedJobIds)
  }, [selectedJobIds])

  return {
    selectedJobIds,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    selectedCount,
    getSelectedIds,
  }
}
