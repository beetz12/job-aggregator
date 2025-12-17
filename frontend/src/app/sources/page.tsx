'use client'

import { useSources, useRefreshSource } from '@/hooks/useJobs'

const statusColors: Record<string, string> = {
  success: 'text-green-400 bg-green-400/10',
  error: 'text-red-400 bg-red-400/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
  unknown: 'text-gray-400 bg-gray-400/10',
}

const statusLabels: Record<string, string> = {
  success: 'Healthy',
  error: 'Error',
  pending: 'Pending',
  unknown: 'Unknown',
}

export default function SourcesPage() {
  const { data, isLoading } = useSources()
  const refreshMutation = useRefreshSource()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Sources</h1>
          <p className="text-gray-400">
            Manage and monitor job data sources
          </p>
        </div>
        <button
          onClick={() => refreshMutation.mutate('all')}
          disabled={refreshMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {refreshMutation.isPending ? 'Refreshing...' : 'Refresh All Sources'}
        </button>
      </div>

      <div className="grid gap-4">
        {data?.sources.map((source) => (
          <div
            key={source.name}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className="mr-4">
                  <div className="text-xl font-semibold text-white capitalize">
                    {source.name}
                  </div>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs mt-1 ${statusColors[source.status]}`}>
                    {statusLabels[source.status]}
                  </div>
                </div>
              </div>
              <button
                onClick={() => refreshMutation.mutate(source.name)}
                disabled={refreshMutation.isPending}
                className="text-blue-400 hover:text-blue-300 disabled:text-gray-500"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
              <div>
                <div className="text-gray-400 text-sm">Jobs Fetched</div>
                <div className="text-2xl font-bold text-white">{source.jobCount}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Last Fetch</div>
                <div className="text-lg text-white">
                  {source.lastFetch
                    ? new Date(source.lastFetch).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Status</div>
                <div className="text-lg text-white capitalize">{source.status}</div>
              </div>
              {source.error && (
                <div>
                  <div className="text-gray-400 text-sm">Error</div>
                  <div className="text-red-400 text-sm">{source.error}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
