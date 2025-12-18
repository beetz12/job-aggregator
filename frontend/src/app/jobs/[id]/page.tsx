'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useJob } from '@/hooks/useJobs'

const sourceColors: Record<string, string> = {
  arbeitnow: 'bg-blue-600',
  hackernews: 'bg-orange-500',
  reddit: 'bg-red-600',
}

export default function JobDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data: job, isLoading, error } = useJob(id)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="h-6 bg-gray-800 rounded w-32 animate-pulse" />
          </div>

          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <div className="space-y-6">
              <div className="h-8 bg-gray-700 rounded w-3/4 animate-pulse" />
              <div className="h-6 bg-gray-700 rounded w-1/2 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-700 rounded w-24 animate-pulse" />
                <div className="h-6 bg-gray-700 rounded w-24 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-700 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/jobs" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
            ← Back to Jobs
          </Link>

          <div className="bg-gray-800 rounded-lg p-8 border border-red-700">
            <h1 className="text-2xl font-bold text-white mb-4">Error Loading Job</h1>
            <p className="text-gray-400 mb-6">
              {error instanceof Error ? error.message : 'Failed to load job details'}
            </p>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!job) {
    return null
  }

  const timeAgo = getTimeAgo(job.postedAt)

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/jobs" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
          ← Back to Jobs
        </Link>

        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          {/* Header */}
          <div className="border-b border-gray-700 pb-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {job.title}
                </h1>
                <p className="text-xl text-gray-300">{job.company}</p>
              </div>
              <span className={`${sourceColors[job.source] || 'bg-gray-600'} text-sm text-white px-3 py-1.5 rounded flex-shrink-0 ml-4`}>
                {job.source}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-gray-400">
              {job.location && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {job.location}
                </span>
              )}
              {job.remote && (
                <span className="bg-green-900/50 text-green-400 px-3 py-1 rounded text-sm font-medium">
                  Remote
                </span>
              )}
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Posted {timeAgo}
              </span>
            </div>
          </div>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Skills & Technologies
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Health Score */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Job Health Score
            </h2>
            <div className="flex items-center">
              <div className="flex-1 max-w-md h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    job.healthScore >= 75 ? 'bg-green-500' :
                    job.healthScore >= 50 ? 'bg-yellow-500' :
                    job.healthScore >= 25 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${job.healthScore}%` }}
                />
              </div>
              <span className="text-lg font-semibold text-white ml-4">
                {job.healthScore}%
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Based on job description quality, completeness, and data availability
            </p>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Job Description
            </h2>
            <div className="text-gray-300 leading-relaxed prose prose-invert max-w-none
              prose-headings:text-white prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
              prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
              prose-p:text-gray-300 prose-p:mb-4
              prose-strong:text-white prose-strong:font-semibold
              prose-em:text-gray-200 prose-em:italic
              prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-ul:space-y-2
              prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4 prose-ol:space-y-2
              prose-li:text-gray-300 prose-li:marker:text-gray-500
              prose-a:text-blue-400 prose-a:underline hover:prose-a:text-blue-300
              prose-code:bg-gray-700 prose-code:text-gray-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-gray-700 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
              prose-blockquote:border-l-4 prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400
              prose-hr:border-gray-700"
            >
              <ReactMarkdown>{job.description}</ReactMarkdown>
            </div>
          </div>

          {/* Apply Button */}
          <div className="pt-6 border-t border-gray-700">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Apply for this Position →
            </a>
            <p className="text-center text-gray-500 text-sm mt-3">
              You will be redirected to the job posting
            </p>
          </div>
        </div>
      </div>
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

