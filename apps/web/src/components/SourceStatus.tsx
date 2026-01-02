'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  const [refreshingSource, setRefreshingSource] = useState<string | null>(null)

  const handleRefreshSource = (sourceName: string) => {
    setRefreshingSource(sourceName)
    refreshMutation.mutate(sourceName, {
      onSettled: () => setRefreshingSource(null)
    })
  }

  const handleRefreshAll = () => {
    setRefreshingSource('all')
    refreshMutation.mutate('all', {
      onSettled: () => setRefreshingSource(null)
    })
  }

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
          onClick={handleRefreshAll}
          disabled={refreshingSource === 'all'}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
        >
          {refreshingSource === 'all' ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Refreshing...
            </>
          ) : 'Refresh All'}
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
            <Link
              href={`/jobs?source=${source.name}`}
              className="flex items-center flex-1 hover:opacity-80 transition-opacity"
            >
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
            </Link>
            {source.isActive && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleRefreshSource(source.name)
                }}
                disabled={refreshingSource === source.name}
                className={`text-xs flex items-center gap-1 transition-colors ml-2 ${
                  refreshingSource === source.name
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                {refreshingSource === source.name ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Refreshing...
                  </>
                ) : 'Refresh'}
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
