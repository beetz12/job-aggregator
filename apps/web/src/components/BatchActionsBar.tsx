'use client'

import React from 'react'
import Link from 'next/link'

interface BatchActionsBarProps {
  selectedCount: number
  onCheckFit: () => void
  onSaveAll: () => void
  onApply: () => void
  onClearSelection: () => void
  isCheckingFit?: boolean
  isSaving?: boolean
  isApplying?: boolean
  hasProfile?: boolean
  hasResume?: boolean
}

/**
 * Floating action bar that appears when jobs are selected.
 * Provides batch actions: Check Fit, Apply, Save All, Clear Selection.
 */
export default function BatchActionsBar({
  selectedCount,
  onCheckFit,
  onSaveAll,
  onApply,
  onClearSelection,
  isCheckingFit = false,
  isSaving = false,
  isApplying = false,
  hasProfile = true,
  hasResume = true,
}: BatchActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky top-4 z-20 mb-4">
      <div className="bg-gray-800 border border-blue-500/50 rounded-lg p-4 shadow-lg shadow-blue-500/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Selection count */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
              <span className="text-white font-bold text-sm">{selectedCount}</span>
            </div>
            <span className="text-white font-medium">
              {selectedCount} job{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Check Fit Button */}
            <button
              onClick={onCheckFit}
              disabled={isCheckingFit || !hasProfile}
              title={!hasProfile ? 'Create a profile first to use Check Fit' : 'Analyze job fit'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingFit ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Check Fit</span>
                </>
              )}
            </button>

            {/* Apply Button */}
            <button
              onClick={onApply}
              disabled={isApplying || !hasProfile}
              title={!hasProfile ? 'Create a profile first to apply' : !hasResume ? 'Consider uploading a resume for better applications' : 'Apply to selected jobs'}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span>Apply to Selected</span>
                  {!hasResume && hasProfile && (
                    <span className="flex items-center justify-center w-4 h-4 bg-yellow-500 rounded-full text-xs font-bold text-gray-900" title="No resume uploaded">
                      !
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Save All Button */}
            <button
              onClick={onSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  <span>Save All</span>
                </>
              )}
            </button>

            {/* Clear Selection Button */}
            <button
              onClick={onClearSelection}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Help text */}
        {!hasProfile && (
          <div className="flex items-center gap-3 mt-2">
            <p className="text-yellow-400 text-sm">
              Create a profile to use Check Fit and Apply features
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Profile
            </Link>
          </div>
        )}
        {hasProfile && !hasResume && (
          <p className="text-yellow-400 text-sm mt-2">
            Upload a resume for better application results
          </p>
        )}
      </div>
    </div>
  )
}
