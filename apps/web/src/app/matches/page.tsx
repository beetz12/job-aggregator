'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMyProfile, useMatchedJobs } from '@/hooks/useProfile'
import { useCreateApplication } from '@/hooks/useApplications'
import { MatchedJobItem, Job } from '@/lib/types'

const sourceColors: Record<string, string> = {
  arbeitnow: 'bg-blue-600',
  hackernews: 'bg-orange-500',
  reddit: 'bg-red-600',
  remotive: 'bg-purple-600',
}

function getMatchScoreColor(score: number): string {
  if (score >= 75) return 'bg-green-500 text-green-50'
  if (score >= 50) return 'bg-yellow-500 text-yellow-50'
  if (score >= 25) return 'bg-orange-500 text-orange-50'
  return 'bg-red-500 text-red-50'
}

function getMatchScoreBorderColor(score: number): string {
  if (score >= 75) return 'border-green-500/30'
  if (score >= 50) return 'border-yellow-500/30'
  if (score >= 25) return 'border-orange-500/30'
  return 'border-red-500/30'
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

function MatchedJobCard({
  match,
  onSave,
  isSaving,
}: {
  match: MatchedJobItem
  onSave: (job: Job) => void
  isSaving: boolean
}) {
  const { job, matchScore } = match
  const timeAgo = getTimeAgo(job.postedAt)
  const score = matchScore.totalScore

  // Generate match reasons from breakdown
  const matchReasons: string[] = []
  if (matchScore.breakdown.skillScore > 30) {
    matchReasons.push('Strong skill match')
  } else if (matchScore.breakdown.skillScore > 15) {
    matchReasons.push('Partial skill match')
  }
  if (matchScore.breakdown.seniorityScore > 15) {
    matchReasons.push('Seniority aligned')
  }
  if (matchScore.breakdown.locationScore > 10) {
    matchReasons.push('Location fit')
  }
  if (matchScore.breakdown.salaryScore > 10) {
    matchReasons.push('Salary range match')
  }

  return (
    <div
      className={`bg-gray-800 rounded-lg p-5 border-2 ${getMatchScoreBorderColor(
        score
      )} hover:border-gray-500 transition-colors`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/jobs/${job.id}`}>
            <h3 className="text-lg font-semibold text-white hover:text-blue-400 transition-colors truncate">
              {job.title}
            </h3>
          </Link>
          <p className="text-gray-400">{job.company}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <span
            className={`${getMatchScoreColor(
              score
            )} text-sm font-bold px-3 py-1.5 rounded-full`}
          >
            {score}% Match
          </span>
          <span
            className={`${
              sourceColors[job.source] || 'bg-gray-600'
            } text-xs text-white px-2 py-1 rounded`}
          >
            {job.source}
          </span>
        </div>
      </div>

      {/* Match Reasons */}
      {matchReasons.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {matchReasons.slice(0, 3).map((reason, idx) => (
              <span
                key={idx}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
              >
                {reason}
              </span>
            ))}
            {matchReasons.length > 3 && (
              <span className="text-xs text-gray-500">
                +{matchReasons.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

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

      <div className="flex justify-between items-center pt-3 border-t border-gray-700">
        <button
          onClick={() => onSave(job)}
          disabled={isSaving}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
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
          {isSaving ? 'Saving...' : 'Save Job'}
        </button>
        <Link
          href={`/jobs/${job.id}`}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

export default function MatchesPage() {
  const { data: profile, isLoading: profileLoading } = useMyProfile()
  const {
    data: matchesData,
    isLoading: matchesLoading,
    error: matchesError,
  } = useMatchedJobs(profile?.id || '')
  const createApplication = useCreateApplication()
  const [savingJobId, setSavingJobId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveJob = async (job: Job) => {
    if (!profile) return

    setSavingJobId(job.id)
    try {
      // Pass required fields: jobId, jobTitle, company (no profileId needed)
      await createApplication.mutateAsync({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'saved',
      })
      showToast('success', 'Job saved to your applications!')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to save job'
      )
    } finally {
      setSavingJobId(null)
    }
  }

  // Loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-48" />
            <div className="h-4 bg-gray-800 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 bg-gray-800 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // No profile - show prompt to create one
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Create Your Profile First
            </h1>
            <p className="text-gray-400 mb-6">
              To see personalized job matches, you need to create a profile with
              your skills, experience, and preferences.
            </p>
            <Link
              href="/profile"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Create Profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (matchesError) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-gray-800 rounded-lg p-8 border border-red-700 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Error Loading Matches
            </h1>
            <p className="text-gray-400 mb-6">
              {matchesError instanceof Error
                ? matchesError.message
                : 'Failed to load matched jobs'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Use 'matches' field from backend response (not 'jobs')
  const matches = matchesData?.matches || []

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="container mx-auto">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Matched Jobs</h1>
              <p className="text-gray-400 mt-1">
                {matches.length} jobs matched to your profile
              </p>
            </div>
            <Link
              href="/profile"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit Profile
            </Link>
          </div>

          {/* Profile Summary */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Matching based on:</span>
            {profile.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 5 && (
              <span className="text-xs text-gray-500">
                +{profile.skills.length - 5} more skills
              </span>
            )}
          </div>
        </div>

        {matchesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 bg-gray-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              No Matches Yet
            </h2>
            <p className="text-gray-400 mb-4">
              We could not find jobs matching your profile. Try updating your
              skills or check back later as new jobs are added.
            </p>
            <Link
              href="/profile"
              className="text-blue-400 hover:text-blue-300"
            >
              Update your profile
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match) => (
              <MatchedJobCard
                key={match.job.id}
                match={match}
                onSave={handleSaveJob}
                isSaving={savingJobId === match.job.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
