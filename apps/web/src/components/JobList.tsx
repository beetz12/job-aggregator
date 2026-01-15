'use client'

import { useState } from 'react'
import { Job, MatchedJob } from '@/lib/types'
import { useMyProfile } from '@/hooks/useProfile'
import { useCreateApplication } from '@/hooks/useApplications'
import JobCard from './JobCard'

interface JobListProps {
  jobs: (Job | MatchedJob)[]
  isLoading?: boolean
  showSaveButton?: boolean
  // Selection props
  showCheckbox?: boolean
  isSelected?: (jobId: string) => boolean
  onToggleSelect?: (jobId: string) => void
  onSelectAll?: () => void
  allSelected?: boolean
  // Check Fit props
  showCheckFitButton?: boolean
  onCheckFit?: (job: Job | MatchedJob) => void
  checkingFitJobId?: string | null
}

export default function JobList({
  jobs,
  isLoading,
  showSaveButton = true,
  showCheckbox = false,
  isSelected,
  onToggleSelect,
  onSelectAll,
  allSelected = false,
  showCheckFitButton = false,
  onCheckFit,
  checkingFitJobId,
}: JobListProps) {
  const { data: profile } = useMyProfile()
  const createApplication = useCreateApplication()
  const [savingJobId, setSavingJobId] = useState<string | null>(null)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveJob = async (job: Job | MatchedJob) => {
    if (savedJobs.has(job.id)) {
      showToast('error', 'Job already saved')
      return
    }

    setSavingJobId(job.id)
    try {
      await createApplication.mutateAsync({
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        status: 'saved',
      })
      setSavedJobs((prev) => new Set(Array.from(prev).concat(job.id)))
      showToast('success', 'Job saved to your applications!')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to save job'
      )
    } finally {
      setSavingJobId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse"
          >
            <div className="h-6 bg-gray-700 rounded mb-2 w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded mb-4 w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded mb-2 w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No jobs found</div>
        <p className="text-gray-500">
          Try refreshing the sources or adjusting your filters
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Select All Header */}
      {showCheckbox && onSelectAll && jobs.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-2">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                allSelected
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-gray-800 border-gray-500 hover:border-blue-400'
              }`}
            >
              {allSelected && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
          <span className="text-gray-500 text-sm">
            ({jobs.length} jobs)
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onSave={showSaveButton ? () => handleSaveJob(job) : undefined}
            isSaving={savingJobId === job.id}
            showSaveButton={showSaveButton && !savedJobs.has(job.id)}
            showCheckbox={showCheckbox}
            isSelected={isSelected ? isSelected(job.id) : false}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(job.id) : undefined}
            showCheckFitButton={showCheckFitButton}
            onCheckFit={onCheckFit ? () => onCheckFit(job) : undefined}
            isCheckingFit={checkingFitJobId === job.id}
          />
        ))}
      </div>
    </>
  )
}
