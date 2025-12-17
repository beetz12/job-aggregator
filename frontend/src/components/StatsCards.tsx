interface StatsCardsProps {
  totalJobs: number
  sources: string[]
  lastUpdated?: string
}

export default function StatsCards({ totalJobs, sources, lastUpdated }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-gray-400 text-sm mb-1">Total Jobs</div>
        <div className="text-3xl font-bold text-white">{totalJobs.toLocaleString()}</div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-gray-400 text-sm mb-1">Active Sources</div>
        <div className="text-3xl font-bold text-white">{sources.length}</div>
        <div className="text-sm text-gray-500 mt-1">
          {sources.join(', ') || 'None'}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-gray-400 text-sm mb-1">Last Updated</div>
        <div className="text-lg font-medium text-white">
          {lastUpdated
            ? new Date(lastUpdated).toLocaleTimeString()
            : 'Never'}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {lastUpdated
            ? new Date(lastUpdated).toLocaleDateString()
            : ''}
        </div>
      </div>
    </div>
  )
}
