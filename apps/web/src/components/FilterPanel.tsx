'use client'

import { useState, useCallback, KeyboardEvent } from 'react'
import {
  JobFilters,
  EmploymentType,
  ExperienceLevel,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
} from '@/lib/types'

interface FilterPanelProps {
  filters: JobFilters
  onFiltersChange: (filters: Partial<JobFilters>) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

// Common locations for quick selection
const COMMON_LOCATIONS = [
  'United States',
  'Remote',
  'New York',
  'San Francisco',
  'Los Angeles',
  'London',
  'Berlin',
  'Toronto',
  'Austin',
  'Seattle',
]

// Salary presets in thousands (yearly)
const SALARY_PRESETS = [
  { label: 'Any', min: undefined, max: undefined },
  { label: '$50k+', min: 50000, max: undefined },
  { label: '$75k+', min: 75000, max: undefined },
  { label: '$100k+', min: 100000, max: undefined },
  { label: '$125k+', min: 125000, max: undefined },
  { label: '$150k+', min: 150000, max: undefined },
  { label: '$200k+', min: 200000, max: undefined },
]

export default function FilterPanel({
  filters,
  onFiltersChange,
  isExpanded,
  onToggleExpand,
}: FilterPanelProps) {
  // Local state for tag input
  const [tagInput, setTagInput] = useState('')
  const [locationInput, setLocationInput] = useState('')

  // Count active advanced filters
  const activeFilterCount = [
    (filters.tags?.length || 0) > 0,
    filters.salaryMin !== undefined || filters.salaryMax !== undefined,
    (filters.locations?.length || 0) > 0,
    (filters.employmentTypes?.length || 0) > 0,
    (filters.experienceLevels?.length || 0) > 0,
  ].filter(Boolean).length

  // Handle adding a tag
  const handleAddTag = useCallback(() => {
    const newTag = tagInput.trim()
    if (newTag && !filters.tags?.includes(newTag)) {
      onFiltersChange({
        tags: [...(filters.tags || []), newTag],
      })
    }
    setTagInput('')
  }, [tagInput, filters.tags, onFiltersChange])

  // Handle removing a tag
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onFiltersChange({
        tags: filters.tags?.filter((t) => t !== tagToRemove),
      })
    },
    [filters.tags, onFiltersChange]
  )

  // Handle tag input keydown
  const handleTagKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag]
  )

  // Handle adding a location
  const handleAddLocation = useCallback(() => {
    const newLocation = locationInput.trim()
    if (newLocation && !filters.locations?.includes(newLocation)) {
      onFiltersChange({
        locations: [...(filters.locations || []), newLocation],
      })
    }
    setLocationInput('')
  }, [locationInput, filters.locations, onFiltersChange])

  // Handle removing a location
  const handleRemoveLocation = useCallback(
    (locationToRemove: string) => {
      onFiltersChange({
        locations: filters.locations?.filter((l) => l !== locationToRemove),
      })
    },
    [filters.locations, onFiltersChange]
  )

  // Handle location input keydown
  const handleLocationKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddLocation()
      }
    },
    [handleAddLocation]
  )

  // Handle quick location selection
  const handleQuickLocation = useCallback(
    (location: string) => {
      if (!filters.locations?.includes(location)) {
        onFiltersChange({
          locations: [...(filters.locations || []), location],
        })
      }
    },
    [filters.locations, onFiltersChange]
  )

  // Handle employment type toggle
  const handleEmploymentTypeToggle = useCallback(
    (type: EmploymentType) => {
      const current = filters.employmentTypes || []
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
      onFiltersChange({ employmentTypes: updated.length > 0 ? updated : undefined })
    },
    [filters.employmentTypes, onFiltersChange]
  )

  // Handle experience level toggle
  const handleExperienceLevelToggle = useCallback(
    (level: ExperienceLevel) => {
      const current = filters.experienceLevels || []
      const updated = current.includes(level)
        ? current.filter((l) => l !== level)
        : [...current, level]
      onFiltersChange({ experienceLevels: updated.length > 0 ? updated : undefined })
    },
    [filters.experienceLevels, onFiltersChange]
  )

  // Handle salary preset selection
  const handleSalaryPreset = useCallback(
    (min: number | undefined, max: number | undefined) => {
      onFiltersChange({ salaryMin: min, salaryMax: max })
    },
    [onFiltersChange]
  )

  // Clear all advanced filters
  const handleClearAll = useCallback(() => {
    onFiltersChange({
      tags: undefined,
      salaryMin: undefined,
      salaryMax: undefined,
      locations: undefined,
      employmentTypes: undefined,
      experienceLevels: undefined,
    })
    setTagInput('')
    setLocationInput('')
  }, [onFiltersChange])

  // Get current salary preset label
  const getCurrentSalaryLabel = () => {
    const preset = SALARY_PRESETS.find(
      (p) => p.min === filters.salaryMin && p.max === filters.salaryMax
    )
    return preset?.label || 'Custom'
  }

  return (
    <div className="border-t border-zinc-700 mt-4 pt-4">
      {/* Toggle Button */}
      <button
        onClick={onToggleExpand}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span>Advanced Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* Tags / Keywords */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Skills & Keywords</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type a skill or keyword..."
                className="flex-1 bg-zinc-700 text-white border border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="px-3 py-2 bg-zinc-600 hover:bg-zinc-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-md text-sm transition-colors"
              >
                Add
              </button>
            </div>
            {/* Tag chips */}
            {filters.tags && filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-200 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Minimum Salary (Yearly)
              {filters.salaryMin !== undefined && (
                <span className="ml-2 text-blue-400">
                  Current: {getCurrentSalaryLabel()}
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {SALARY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSalaryPreset(preset.min, preset.max)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    filters.salaryMin === preset.min && filters.salaryMax === preset.max
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {/* Custom salary inputs */}
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={filters.salaryMin || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      salaryMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Min salary"
                  className="w-full bg-zinc-700 text-white border border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-gray-500 self-center">to</span>
              <div className="flex-1">
                <input
                  type="number"
                  value={filters.salaryMax || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      salaryMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Max salary"
                  className="w-full bg-zinc-700 text-white border border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Locations</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleLocationKeyDown}
                placeholder="Enter a city, state, or country..."
                className="flex-1 bg-zinc-700 text-white border border-zinc-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddLocation}
                disabled={!locationInput.trim()}
                className="px-3 py-2 bg-zinc-600 hover:bg-zinc-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-md text-sm transition-colors"
              >
                Add
              </button>
            </div>
            {/* Quick location buttons */}
            <div className="flex flex-wrap gap-1 mb-2">
              {COMMON_LOCATIONS.filter((loc) => !filters.locations?.includes(loc)).map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleQuickLocation(loc)}
                  className="px-2 py-1 bg-zinc-700 text-gray-400 hover:bg-zinc-600 hover:text-white rounded text-xs transition-colors"
                >
                  + {loc}
                </button>
              ))}
            </div>
            {/* Selected location chips */}
            {filters.locations && filters.locations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.locations.map((location) => (
                  <span
                    key={location}
                    className="inline-flex items-center gap-1 bg-green-600/20 text-green-400 px-2 py-1 rounded text-sm"
                  >
                    {location}
                    <button
                      onClick={() => handleRemoveLocation(location)}
                      className="hover:text-green-200 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Employment Type</label>
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleEmploymentTypeToggle(value)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    filters.employmentTypes?.includes(value)
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Experience Level</label>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleExperienceLevelToggle(value)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    filters.experienceLevels?.includes(value)
                      ? 'bg-orange-600 text-white'
                      : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear All Button */}
          {activeFilterCount > 0 && (
            <div className="pt-2 border-t border-zinc-700">
              <button
                onClick={handleClearAll}
                className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Clear all advanced filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
