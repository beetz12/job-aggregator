'use client'

import { useState, useEffect, useCallback } from 'react'

interface SearchBarProps {
  onFilterChange: (filters: {
    source?: string
    remote?: boolean
    search?: string
  }) => void
  initialSource?: string
  initialRemote?: boolean
  initialSearch?: string
}

export default function SearchBar({ onFilterChange, initialSource, initialRemote, initialSearch }: SearchBarProps) {
  const [source, setSource] = useState(initialSource || '')
  const [remote, setRemote] = useState(initialRemote || false)
  const [search, setSearch] = useState(initialSearch || '')
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch || '')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Trigger filter change when debounced search changes
  useEffect(() => {
    onFilterChange({
      source: source || undefined,
      remote,
      search: debouncedSearch || undefined
    })
  }, [debouncedSearch, source, remote, onFilterChange])

  const handleSourceChange = (value: string) => {
    setSource(value)
  }

  const handleRemoteChange = (value: boolean) => {
    setRemote(value)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const clearSearch = useCallback(() => {
    setSearch('')
  }, [])

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-[2] min-w-[250px]">
          <label className="block text-sm text-gray-400 mb-1">Search</label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search jobs by title, company, or description..."
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-md pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-[150px]">
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

        <div className="flex items-center pb-2">
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
