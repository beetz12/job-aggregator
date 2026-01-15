'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useJobs } from '@/hooks/useJobs'
import { useJobStream } from '@/hooks/useJobStream'
import { useMyProfile } from '@/hooks/useProfile'
import { useCheckFit, useGenerateApplication } from '@/hooks/useIntelligentApplication'
import { useCreateApplication } from '@/hooks/useApplications'
import { useJobSelection } from '@/hooks/useJobSelection'
import JobList from '@/components/JobList'
import SearchBar from '@/components/SearchBar'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import BatchActionsBar from '@/components/BatchActionsBar'
import FitAnalysisModal from '@/components/FitAnalysisModal'
import ApplyConfirmationModal from '@/components/ApplyConfirmationModal'
import { useHasResume } from '@/hooks/useResumeUpload'
import { JobFilters, Job, MatchedJob, FitAnalysisResult, ApplicationKitResult } from '@/lib/types'

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>({})
  const [newJobCount, setNewJobCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 50

  // Profile for Check Fit
  const { data: profile } = useMyProfile()

  // Job selection state
  const {
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    selectedCount,
    getSelectedIds,
  } = useJobSelection()

  // Fit Analysis state
  const [selectedJob, setSelectedJob] = useState<Job | MatchedJob | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysisResult | null>(null)
  const [applicationKit, setApplicationKit] = useState<ApplicationKitResult | null>(null)
  const [checkingFitJobId, setCheckingFitJobId] = useState<string | null>(null)

  // Mutations
  const checkFitMutation = useCheckFit()
  const generateApplicationMutation = useGenerateApplication()
  const createApplication = useCreateApplication()

  // Batch saving state
  const [isBatchSaving, setIsBatchSaving] = useState(false)

  // Apply flow state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const hasResume = useHasResume()

  // Fetch initial jobs via REST API
  const { data, isLoading, error, refetch } = useJobs({
    ...filters,
    limit: pageSize,
    offset: currentPage * pageSize,
  })

  // Subscribe to real-time job updates
  const streamGroupId = filters.source || 'all'
  const { jobs: streamedJobs, isConnected } = useJobStream({
    groupId: streamGroupId,
    enabled: true,
  })

  // Track new jobs from the stream that aren't in the current data
  useEffect(() => {
    if (data?.jobs && streamedJobs.length > 0) {
      const existingIds = new Set(data.jobs.map((job: Job) => job.id))
      const newJobs = streamedJobs.filter((job: Job) => !existingIds.has(job.id))
      setNewJobCount(newJobs.length)
    }
  }, [streamedJobs, data?.jobs])

  // Handler to show new jobs (refetch from API)
  const handleShowNewJobs = useCallback(() => {
    refetch()
    setNewJobCount(0)
  }, [refetch])

  const handleFilterChange = useCallback((newFilters: JobFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }))
    setNewJobCount(0) // Reset new job count when filters change
    setCurrentPage(0) // Reset to first page when filters change
    clearSelection() // Clear selection when filters change
  }, [clearSelection])

  // Compute if all jobs are selected
  const allSelected = useMemo(() => {
    if (!data?.jobs || data.jobs.length === 0) return false
    return data.jobs.every((job) => isSelected(job.id))
  }, [data?.jobs, isSelected])

  // Handle select all toggle
  const handleSelectAll = useCallback(() => {
    if (data?.jobs) {
      selectAll(data.jobs.map((job) => job.id))
    }
  }, [data?.jobs, selectAll])

  // Handle Check Fit for a single job
  const handleCheckFit = useCallback(async (job: Job | MatchedJob) => {
    if (!profile?.id) {
      // Could show a toast here
      return
    }

    setSelectedJob(job)
    setFitAnalysis(null)
    setApplicationKit(null)
    setIsModalOpen(true)
    setCheckingFitJobId(job.id)

    try {
      const result = await checkFitMutation.mutateAsync({
        job_id: job.id,
        profile_id: profile.id,
      })
      setFitAnalysis(result)
    } catch (error) {
      console.error('Failed to check fit:', error)
    } finally {
      setCheckingFitJobId(null)
    }
  }, [profile?.id, checkFitMutation])

  // Handle batch Check Fit (checks first selected job)
  const handleBatchCheckFit = useCallback(() => {
    const selectedIds = getSelectedIds()
    if (selectedIds.length === 0 || !data?.jobs) return

    // Find the first selected job and check fit
    const firstSelectedJob = data.jobs.find((job) => selectedIds.includes(job.id))
    if (firstSelectedJob) {
      handleCheckFit(firstSelectedJob)
    }
  }, [getSelectedIds, data?.jobs, handleCheckFit])

  // Handle Generate Application
  const handleGenerateApplication = useCallback(async () => {
    if (!selectedJob || !profile?.id) return

    try {
      const result = await generateApplicationMutation.mutateAsync({
        job_id: selectedJob.id,
        profile_id: profile.id,
      })
      setApplicationKit(result)
    } catch (error) {
      console.error('Failed to generate application:', error)
    }
  }, [selectedJob, profile?.id, generateApplicationMutation])

  // Handle batch save
  const handleBatchSave = useCallback(async () => {
    const selectedIds = getSelectedIds()
    if (selectedIds.length === 0 || !data?.jobs) return

    setIsBatchSaving(true)
    const jobsToSave = data.jobs.filter((job) => selectedIds.includes(job.id))

    try {
      for (const job of jobsToSave) {
        await createApplication.mutateAsync({
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          status: 'saved',
        })
      }
      clearSelection()
    } catch (error) {
      console.error('Failed to save jobs:', error)
    } finally {
      setIsBatchSaving(false)
    }
  }, [getSelectedIds, data?.jobs, createApplication, clearSelection])

  // Handle apply button click
  const handleApply = useCallback(() => {
    setIsApplyModalOpen(true)
  }, [])

  // Handle apply confirmation
  const handleApplyConfirm = useCallback(async (generateCustomResumes: boolean) => {
    const selectedIds = getSelectedIds()
    if (selectedIds.length === 0 || !data?.jobs) return

    setIsApplying(true)
    const selectedJobs = data.jobs.filter(job => selectedIds.includes(job.id))

    try {
      // For each selected job, create an application with 'generating' or 'resume_ready' status
      for (const job of selectedJobs) {
        await createApplication.mutateAsync({
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          status: generateCustomResumes ? 'generating' : 'resume_ready',
        })
      }
      clearSelection()
      setIsApplyModalOpen(false)
      // Redirect to applications page
      window.location.href = '/applications?status=generating'
    } catch (error) {
      console.error('Failed to start apply process:', error)
    } finally {
      setIsApplying(false)
    }
  }, [getSelectedIds, data?.jobs, createApplication, clearSelection])

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedJob(null)
    setFitAnalysis(null)
    setApplicationKit(null)
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-2">Job Listings</h1>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
        <p className="text-gray-400">
          {data?.total || 0} jobs from {data?.sources.length || 0} sources
          {filters.search && ` matching "${filters.search}"`}
          {(filters.tags?.length || filters.salaryMin || filters.locations?.length ||
            filters.employmentTypes?.length || filters.experienceLevels?.length) && (
            <span className="ml-2 text-blue-400">(filtered)</span>
          )}
        </p>
      </div>

      {/* New jobs notification banner */}
      {newJobCount > 0 && (
        <button
          onClick={handleShowNewJobs}
          className="w-full mb-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span className="font-medium">
            {newJobCount} new {newJobCount === 1 ? 'job' : 'jobs'} available
          </span>
          <span className="text-blue-200">Click to refresh</span>
        </button>
      )}

      {error && (
        <ApiErrorAlert
          error={error}
          onRetry={() => refetch()}
          className="mb-6"
        />
      )}

      <SearchBar
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />

      {/* Batch Actions Bar */}
      <BatchActionsBar
        selectedCount={selectedCount}
        onCheckFit={handleBatchCheckFit}
        onSaveAll={handleBatchSave}
        onApply={handleApply}
        onClearSelection={clearSelection}
        isCheckingFit={checkFitMutation.isPending}
        isSaving={isBatchSaving}
        isApplying={isApplying}
        hasProfile={!!profile?.id}
        hasResume={hasResume}
      />

      {/* Job List with selection and check fit */}
      <JobList
        jobs={data?.jobs || []}
        isLoading={isLoading}
        showCheckbox={true}
        isSelected={isSelected}
        onToggleSelect={toggleSelection}
        onSelectAll={handleSelectAll}
        allSelected={allSelected}
        showCheckFitButton={!!profile?.id}
        onCheckFit={handleCheckFit}
        checkingFitJobId={checkingFitJobId}
      />

      {data && data.total > pageSize && (
        <div className="flex items-center justify-center gap-4 mt-6 pb-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600 transition-colors"
          >
            Previous
          </button>
          <span className="text-zinc-400">
            Page {currentPage + 1} of {Math.ceil(data.total / pageSize)}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={(currentPage + 1) * pageSize >= data.total}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {data && data.jobs.length > 0 && (
        <div className="text-center mt-2 pb-4">
          <p className="text-gray-500 text-sm">
            Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, data.total)} of {data.total} jobs
          </p>
        </div>
      )}

      {/* Fit Analysis Modal */}
      <FitAnalysisModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        fitAnalysis={fitAnalysis}
        applicationKit={applicationKit}
        isLoadingFit={checkFitMutation.isPending}
        isLoadingApplication={generateApplicationMutation.isPending}
        onGenerateApplication={handleGenerateApplication}
        jobTitle={selectedJob?.title || ''}
        company={selectedJob?.company || ''}
      />

      {/* Apply Confirmation Modal */}
      <ApplyConfirmationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        selectedJobs={
          data?.jobs
            ? data.jobs
                .filter(job => getSelectedIds().includes(job.id))
                .map(job => ({ id: job.id, title: job.title, company: job.company }))
            : []
        }
        hasResume={hasResume}
        onConfirm={handleApplyConfirm}
        isProcessing={isApplying}
      />
    </div>
  )
}
