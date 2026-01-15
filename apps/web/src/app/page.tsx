'use client'

import Link from 'next/link'
import { useJobs, useSources } from '@/hooks/useJobs'
import StatsCards from '@/components/StatsCards'
import JobList from '@/components/JobList'
import SourceStatus from '@/components/SourceStatus'
import ApiErrorAlert from '@/components/ApiErrorAlert'

export default function Dashboard() {
  const { data: jobsData, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useJobs({ limit: 12 })
  const { data: sourcesData, isLoading: sourcesLoading, error: sourcesError, refetch: refetchSources } = useSources()

  const hasError = jobsError || sourcesError
  const primaryError = jobsError || sourcesError

  const handleRetry = () => {
    refetchJobs()
    refetchSources()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Real-time job aggregation powered by Motia
        </p>
      </div>

      {hasError && (
        <ApiErrorAlert
          error={primaryError}
          onRetry={handleRetry}
          className="mb-6"
        />
      )}

      <StatsCards
        totalJobs={jobsData?.total || 0}
        sources={jobsData?.sources || []}
        lastUpdated={jobsData?.last_updated}
      />

      <SourceStatus
        sources={sourcesData?.sources}
        isLoading={sourcesLoading}
      />

      <div className="flex justify-end mb-6">
        <Link
          href="/jobs"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          View All Jobs
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Jobs</h2>
          <a
            href="/jobs"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            View all →
          </a>
        </div>
        <JobList jobs={jobsData?.jobs || []} isLoading={jobsLoading} />
      </section>
    </div>
  )
}
