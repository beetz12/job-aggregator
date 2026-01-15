'use client'

import Link from 'next/link'
import { Job, MatchedJob, SOURCE_COLORS, SOURCE_DISPLAY_NAMES, type JobSource } from '@/lib/types'

interface JobCardProps {
  job: Job | MatchedJob
  matchScore?: number
  onSave?: () => void
  isSaving?: boolean
  showSaveButton?: boolean
  // Selection props
  showCheckbox?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
  // Check Fit props
  showCheckFitButton?: boolean
  onCheckFit?: () => void
  isCheckingFit?: boolean
}

function getMatchScoreColor(score: number): string {
  if (score >= 75) return 'bg-green-500 text-green-50'
  if (score >= 50) return 'bg-yellow-500 text-yellow-50'
  if (score >= 25) return 'bg-orange-500 text-orange-50'
  return 'bg-red-500 text-red-50'
}

export default function JobCard({
  job,
  matchScore,
  onSave,
  isSaving = false,
  showSaveButton = true,
  showCheckbox = false,
  isSelected = false,
  onToggleSelect,
  showCheckFitButton = false,
  onCheckFit,
  isCheckingFit = false,
}: JobCardProps) {
  const timeAgo = getTimeAgo(job.posted_at)

  const effectiveMatchScore = matchScore ?? ('match_score' in job ? job.match_score : undefined)

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onSave && !isSaving) {
      onSave()
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleSelect) {
      onToggleSelect()
    }
  }

  const handleCheckFitClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onCheckFit && !isCheckingFit) {
      onCheckFit()
    }
  }

  return (
    <div className="relative">
      {/* Checkbox overlay */}
      {showCheckbox && (
        <div
          className="absolute top-3 left-3 z-10"
          onClick={handleCheckboxClick}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'bg-gray-800 border-gray-500 hover:border-blue-400'
            }`}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      <Link href={`/jobs/${job.id}`}>
        <div
          className={`bg-gray-800 rounded-lg p-4 border transition-colors cursor-pointer ${
            isSelected
              ? 'border-blue-500 bg-blue-900/20'
              : 'border-gray-700 hover:border-gray-600'
          } ${showCheckbox ? 'pl-10' : ''}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">
                {job.title}
              </h3>
              <p className="text-gray-400">{job.company}</p>
            </div>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              {/* Match Score Badge */}
              {effectiveMatchScore !== undefined && (
                <span
                  className={`${getMatchScoreColor(
                    effectiveMatchScore
                  )} text-xs font-bold px-2 py-1 rounded-full`}
                >
                  {effectiveMatchScore}%
                </span>
              )}
              <span
                className={`${
                  SOURCE_COLORS[job.source as JobSource] || 'bg-gray-600'
                } text-xs text-white px-2 py-1 rounded`}
              >
                {SOURCE_DISPLAY_NAMES[job.source as JobSource] || job.source}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-3">
            {job.location && (
              <span className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {job.location}
              </span>
            )}
            {job.remote && (
              <span className="bg-green-900/50 text-green-400 px-2 py-0.5 rounded text-xs">
                Remote
              </span>
            )}
            <span className="text-gray-500">{timeAgo}</span>
          </div>

          {job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {job.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {job.tags.length > 5 && (
                <span className="text-gray-500 text-xs">
                  +{job.tags.length - 5} more
                </span>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      job.health_score >= 75
                        ? 'bg-green-500'
                        : job.health_score >= 50
                        ? 'bg-yellow-500'
                        : job.health_score >= 25
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${job.health_score}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {job.health_score}%
                </span>
              </div>

              {/* Check Fit Button */}
              {showCheckFitButton && onCheckFit && (
                <button
                  onClick={handleCheckFitClick}
                  disabled={isCheckingFit}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  {isCheckingFit ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
                      <span>Checking...</span>
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
              )}

              {/* Save Button */}
              {showSaveButton && onSave && (
                <button
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
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
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <span className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              View Details
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}
