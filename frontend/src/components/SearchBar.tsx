'use client'

import { useState } from 'react'

interface SearchBarProps {
  onFilterChange: (filters: {
    source?: string
    remote?: boolean
  }) => void
  initialSource?: string
  initialRemote?: boolean
}

export default function SearchBar({ onFilterChange, initialSource, initialRemote }: SearchBarProps) {
  const [source, setSource] = useState(initialSource || '')
  const [remote, setRemote] = useState(initialRemote || false)

  const handleSourceChange = (value: string) => {
    setSource(value)
    onFilterChange({ source: value || undefined, remote })
  }

  const handleRemoteChange = (value: boolean) => {
    setRemote(value)
    onFilterChange({ source: source || undefined, remote: value })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-400 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sources</option>
            <option value="arbeitnow">Arbeitnow</option>
            <option value="hackernews">HackerNews</option>
            <option value="reddit">Reddit</option>
          </select>
        </div>

        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={remote}
              onChange={(e) => handleRemoteChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800 bg-gray-700"
            />
            <span className="ml-2 text-gray-300">Remote only</span>
          </label>
        </div>
      </div>
    </div>
  )
}
