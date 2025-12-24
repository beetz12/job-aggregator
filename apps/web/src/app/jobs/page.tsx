'use client'

import { useState, useCallback, useEffect } from 'react'
import { useJobs } from '@/hooks/useJobs'
import { useJobStream } from '@/hooks/useJobStream'
import JobList from '@/components/JobList'
import SearchBar from '@/components/SearchBar'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import { JobFilters, Job } from '@/lib/types'

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>({})
  const [newJobCount, setNewJobCount] = useState(0)

  // Fetch initial jobs via REST API
  const { data, isLoading, error, refetch } = useJobs({
    ...filters,
    limit: 50,
  })

  // Subscribe to real-time job updates
  const streamGroupId = filters.source || 'all'
  const { jobs: streamedJobs, isConnected } = useJobStream({
    groupId: streamGroupId,
    enabled: true,
  })

  // Track new jobs from the stream that aren't in the current data
  useEffect(() => {
    if (data?.jobs && streamedJobs.length > 0) {
      const existingIds = new Set(data.jobs.map((job: Job) => job.id))
      const newJobs = streamedJobs.filter((job: Job) => !existingIds.has(job.id))
      setNewJobCount(newJobs.length)
    }
  }, [streamedJobs, data?.jobs])

  // Handler to show new jobs (refetch from API)
  const handleShowNewJobs = useCallback(() => {
    refetch()
    setNewJobCount(0)
  }, [refetch])

  const handleFilterChange = useCallback((newFilters: {
    source?: string
    remote?: boolean
    search?: string
  }) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }))
    setNewJobCount(0) // Reset new job count when filters change
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-2">Job Listings</h1>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
        <p className="text-gray-400">
          {data?.total || 0} jobs from {data?.sources.length || 0} sources
          {filters.search && ` matching "${filters.search}"`}
        </p>
      </div>

      {/* New jobs notification banner */}
      {newJobCount > 0 && (
        <button
          onClick={handleShowNewJobs}
          className="w-full mb-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span className="font-medium">
            {newJobCount} new {newJobCount === 1 ? 'job' : 'jobs'} available
          </span>
          <span className="text-blue-200">Click to refresh</span>
        </button>
      )}

      {error && (
        <ApiErrorAlert
          error={error}
          onRetry={() => refetch()}
          className="mb-6"
        />
      )}

      <SearchBar
        onFilterChange={handleFilterChange}
        initialSource={filters.source}
        initialRemote={filters.remote}
        initialSearch={filters.search}
      />

      <JobList jobs={data?.jobs || []} isLoading={isLoading} />

      {data && data.jobs.length > 0 && data.jobs.length < data.total && (
        <div className="text-center mt-8">
          <p className="text-gray-400">
            Showing {data.jobs.length} of {data.total} jobs
          </p>
        </div>
      )}
    </div>
  )
}
