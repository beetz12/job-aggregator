'use client'

import { useState } from 'react'
import { useJobs } from '@/hooks/useJobs'
import JobList from '@/components/JobList'
import SearchBar from '@/components/SearchBar'

export default function JobsPage() {
  const [filters, setFilters] = useState<{
    source?: string
    remote?: boolean
  }>({})

  const { data, isLoading } = useJobs({
    ...filters,
    limit: 50,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Job Listings</h1>
        <p className="text-gray-400">
          {data?.total || 0} jobs from {data?.sources.length || 0} sources
        </p>
      </div>

      <SearchBar
        onFilterChange={setFilters}
        initialSource={filters.source}
        initialRemote={filters.remote}
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
