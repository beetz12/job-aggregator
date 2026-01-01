'use client'

import { Source } from '@/lib/types'
import { useRefreshSource } from '@/hooks/useJobs'

interface SourceStatusProps {
  sources?: Source[]
  isLoading?: boolean
}

const statusColors: Record<string, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  pending: 'bg-yellow-500',
  unknown: 'bg-gray-500',
}

export default function SourceStatus({ sources, isLoading }: SourceStatusProps) {
  const refreshMutation = useRefreshSource()

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-700 rounded flex-1"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Source Status</h3>
        <button
          onClick={() => refreshMutation.mutate('all')}
          disabled={refreshMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm px-3 py-1.5 rounded-md transition-colors"
        >
          {refreshMutation.isPending ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sources.map((source) => (
          <div
            key={source.name}
            className={`bg-gray-700/50 rounded-lg p-3 flex items-center justify-between ${
              !source.isActive ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${statusColors[source.status]} mr-3`}></div>
              <div>
                <div className="text-white font-medium flex items-center gap-2">
                  {source.displayName || source.name}
                  {!source.isActive && (
                    <span className="text-xs text-gray-500">(legacy)</span>
                  )}
                </div>
                <div className="text-gray-400 text-xs">
                  {source.jobCount} jobs
                  {source.lastFetch && (
                    <span className="ml-2">
                      - {new Date(source.lastFetch).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {source.isActive && (
              <button
                onClick={() => refreshMutation.mutate(source.name)}
                disabled={refreshMutation.isPending}
                className="text-blue-400 hover:text-blue-300 text-xs disabled:text-gray-500"
              >
                Refresh
              </button>
            )}
          </div>
        ))}
      </div>

      {refreshMutation.isError && (
        <div className="mt-2 text-red-400 text-sm">
          Failed to refresh sources. Please try again.
        </div>
      )}
    </div>
  )
}
