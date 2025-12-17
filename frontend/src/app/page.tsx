'use client'

import { useJobs, useSources } from '@/hooks/useJobs'
import StatsCards from '@/components/StatsCards'
import JobList from '@/components/JobList'
import SourceStatus from '@/components/SourceStatus'

export default function Dashboard() {
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ limit: 12 })
  const { data: sourcesData, isLoading: sourcesLoading } = useSources()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Real-time job aggregation powered by Motia
        </p>
      </div>

      <StatsCards
        totalJobs={jobsData?.total || 0}
        sources={jobsData?.sources || []}
        lastUpdated={jobsData?.lastUpdated}
      />

      <SourceStatus
        sources={sourcesData?.sources}
        isLoading={sourcesLoading}
      />

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
