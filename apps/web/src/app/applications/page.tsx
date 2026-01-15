'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  useApplications,
  useUpdateApplication,
  useDeleteApplication,
} from '@/hooks/useApplications'
import { useAutoApply } from '@/hooks/useAutoApply'
import { Application, ApplicationStatus } from '@/lib/types'
import ResumeViewer from '@/components/ResumeViewer'
import ResumeEditor from '@/components/ResumeEditor'
import CheckpointModal from '@/components/CheckpointModal'

// Type for checkpoint modal state
interface CheckpointModalState {
  isOpen: boolean
  type: 'login' | 'captcha' | 'questions' | 'review' | 'error'
  applicationId: string
  jobTitle: string
  company: string
  data?: {
    questions?: Array<{ question: string; answer?: string }>
    error?: string
    screenshotUrl?: string
    currentUrl?: string
    resumePreview?: string
    coverLetterPreview?: string
  }
}

const statusOptions: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'saved', label: 'Saved' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'generating', label: 'Generating' },
  { value: 'resume_ready', label: 'Resume Ready' },
  { value: 'applying', label: 'Applying' },
  { value: 'needs_input', label: 'Needs Input' },
  { value: 'applied', label: 'Applied' },
  { value: 'failed', label: 'Failed' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offer', label: 'Offer' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

const statusColors: Record<ApplicationStatus, string> = {
  saved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  analyzing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  analyzed: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  generating: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  resume_ready: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  applying: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  needs_input: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  applied: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  interview: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  offer: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  withdrawn: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const statusLabels: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  analyzing: 'Analyzing',
  analyzed: 'Analyzed',
  generating: 'Generating',
  resume_ready: 'Resume Ready',
  applying: 'Applying',
  needs_input: 'Needs Input',
  applied: 'Applied',
  failed: 'Failed',
  interview: 'Interview',
  rejected: 'Rejected',
  offer: 'Offer',
  withdrawn: 'Withdrawn',
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

function ApplicationCard({
  application,
  onUpdateStatus,
  onUpdateNotes,
  onUpdateResume,
  onDelete,
  onStartAutoApply,
  isUpdating,
  isAutoApplying,
}: {
  application: Application
  onUpdateStatus: (id: string, status: ApplicationStatus) => void
  onUpdateNotes: (id: string, notes: string) => void
  onUpdateResume: (id: string, resume: string) => void
  onDelete: (id: string) => void
  onStartAutoApply: (application: Application) => void
  isUpdating: boolean
  isAutoApplying: boolean
}) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(application.notes || '')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [isEditingResume, setIsEditingResume] = useState(false)
  const [editedResume, setEditedResume] = useState(application.custom_resume_markdown || '')

  const handleSaveNotes = () => {
    onUpdateNotes(application.id, notes)
    setShowNotes(false)
  }

  const handleSaveResume = () => {
    onUpdateResume(application.id, editedResume)
    setIsEditingResume(false)
  }

  const hasResume = !!application.custom_resume_markdown
  const hasCoverLetter = !!application.custom_cover_letter_markdown

  return (
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/jobs/${application.job_id}`}>
            <h3 className="text-lg font-semibold text-white hover:text-blue-400 transition-colors truncate">
              {application.job_title}
            </h3>
          </Link>
          <p className="text-gray-400">{application.company}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Status Badge with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={isUpdating}
              className={`${
                statusColors[application.status]
              } border text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity`}
            >
              {statusLabels[application.status]}
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showStatusDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-700 rounded-lg shadow-lg z-10 border border-gray-600">
                {statusOptions
                  .filter((s) => s.value !== 'all')
                  .map((status) => (
                    <button
                      key={status.value}
                      onClick={() => {
                        onUpdateStatus(
                          application.id,
                          status.value as ApplicationStatus
                        )
                        setShowStatusDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg ${
                        application.status === status.value
                          ? 'text-blue-400'
                          : 'text-white'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-3">
        <span className="text-gray-500">Saved {getTimeAgo(application.created_at)}</span>
        {application.applied_at && (
          <span className="text-gray-500">
            Applied {getTimeAgo(application.applied_at)}
          </span>
        )}
        {application.follow_up_date && (
          <span className="text-yellow-500">
            Follow up: {new Date(application.follow_up_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Notes Section */}
      {showNotes ? (
        <div className="mb-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this application..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setNotes(application.notes || '')
                setShowNotes(false)
              }}
              className="text-sm text-gray-400 hover:text-white px-3 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={isUpdating}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              {isUpdating ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      ) : application.notes ? (
        <div
          onClick={() => setShowNotes(true)}
          className="mb-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
        >
          <p className="text-sm text-gray-300">{application.notes}</p>
        </div>
      ) : null}

      {/* Resume Section */}
      {(hasResume || hasCoverLetter) && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            {hasResume && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                Custom Resume
              </span>
            )}
            {hasCoverLetter && (
              <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-1 rounded-full">
                Cover Letter
              </span>
            )}
            {application.custom_resume_generated_at && (
              <span className="text-xs text-gray-500">
                Generated {getTimeAgo(application.custom_resume_generated_at)}
              </span>
            )}
          </div>

          {showResume && hasResume && (
            <div className="mt-3">
              {isEditingResume ? (
                <ResumeEditor
                  value={editedResume}
                  onChange={setEditedResume}
                  onSave={handleSaveResume}
                  onCancel={() => {
                    setEditedResume(application.custom_resume_markdown || '')
                    setIsEditingResume(false)
                  }}
                  isSaving={isUpdating}
                />
              ) : (
                <ResumeViewer
                  markdown={application.custom_resume_markdown || ''}
                  onEdit={() => setIsEditingResume(true)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Submission Details */}
      {application.submission_url && (
        <div className="mb-3 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400 font-medium">Submitted</span>
            {application.submitted_at && (
              <span className="text-gray-400">on {new Date(application.submitted_at).toLocaleDateString()}</span>
            )}
          </div>
          <a
            href={application.submission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 mt-1 block truncate"
          >
            {application.submission_url}
          </a>
        </div>
      )}

      {/* Q&A Responses */}
      {application.qa_responses && application.qa_responses.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => {}}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {application.qa_responses.length} Question{application.qa_responses.length !== 1 ? 's' : ''} Answered
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-gray-700">
        <div className="flex gap-2 flex-wrap">
          {/* Auto-Apply Button - only show for resume_ready status */}
          {application.status === 'resume_ready' && (
            <button
              onClick={() => onStartAutoApply(application)}
              disabled={isUpdating || isAutoApplying}
              className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAutoApplying ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  Applying...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Start Auto-Apply
                </>
              )}
            </button>
          )}
          {hasResume && (
            <button
              onClick={() => setShowResume(!showResume)}
              className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {showResume ? 'Hide Resume' : 'View Resume'}
            </button>
          )}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-400 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            {application.notes ? 'Edit Notes' : 'Add Notes'}
          </button>
          <button
            onClick={() => onDelete(application.id)}
            disabled={isUpdating}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Remove
          </button>
        </div>
        <Link
          href={`/jobs/${application.job_id}`}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View Job
        </Link>
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>(
    'all'
  )
  const {
    data: applicationsData,
    isLoading,
    error,
  } = useApplications(statusFilter === 'all' ? undefined : statusFilter)
  const updateApplication = useUpdateApplication()
  const deleteApplication = useDeleteApplication()
  const autoApply = useAutoApply()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [autoApplyingId, setAutoApplyingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [checkpointModal, setCheckpointModal] = useState<CheckpointModalState | null>(null)
  const [isProcessingCheckpoint, setIsProcessingCheckpoint] = useState(false)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpdateStatus = async (id: string, status: ApplicationStatus) => {
    setUpdatingId(id)
    try {
      await updateApplication.mutateAsync({
        id,
        data: {
          status,
          ...(status === 'applied' && { applied_at: new Date().toISOString() }),
        },
      })
      showToast('success', `Status updated to ${statusLabels[status]}`)
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to update status'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleUpdateNotes = async (id: string, notes: string) => {
    setUpdatingId(id)
    try {
      await updateApplication.mutateAsync({
        id,
        data: { notes },
      })
      showToast('success', 'Notes saved')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to save notes'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this application?')) return

    setUpdatingId(id)
    try {
      await deleteApplication.mutateAsync(id)
      showToast('success', 'Application removed')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to remove application'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleUpdateResume = async (id: string, resume: string) => {
    setUpdatingId(id)
    try {
      await updateApplication.mutateAsync({
        id,
        data: { custom_resume_markdown: resume } as Parameters<typeof updateApplication.mutateAsync>[0]['data'],
      })
      showToast('success', 'Resume updated')
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to update resume'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleStartAutoApply = async (application: Application) => {
    setAutoApplyingId(application.id)
    try {
      const response = await autoApply.mutateAsync(application.id)

      // Check if the response indicates a checkpoint is needed
      // For now, just show success message since the backend handles the flow
      showToast('success', response.message || 'Auto-apply started')

      // If the response includes checkpoint data, open the modal
      // This would be used when the backend returns checkpoint information
      // For now, we just update the status since the backend will handle it

    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to start auto-apply'
      )
    } finally {
      setAutoApplyingId(null)
    }
  }

  const handleCheckpointContinue = async (data?: Record<string, unknown>) => {
    if (!checkpointModal) return

    setIsProcessingCheckpoint(true)
    try {
      // This would call the backend to continue the auto-apply process
      // For now, we just close the modal and show a success message
      showToast('success', 'Continuing application...')
      setCheckpointModal(null)
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to continue application'
      )
    } finally {
      setIsProcessingCheckpoint(false)
    }
  }

  const handleCheckpointCancel = () => {
    setCheckpointModal(null)
    showToast('success', 'Auto-apply cancelled')
  }

  const handleCheckpointClose = () => {
    if (!isProcessingCheckpoint) {
      setCheckpointModal(null)
    }
  }

  const applications = applicationsData?.applications || []

  // Count by status for badges
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gray-800 rounded-lg p-8 border border-red-700 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Error Loading Applications
            </h1>
            <p className="text-gray-400">
              {error instanceof Error
                ? error.message
                : 'Failed to load applications'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="container mx-auto max-w-4xl">
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

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">My Applications</h1>
          <p className="text-gray-400 mt-1">
            Track and manage your job applications
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-700">
          {statusOptions.map((status) => (
            <button
              key={status.value}
              onClick={() =>
                setStatusFilter(status.value as ApplicationStatus | 'all')
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                statusFilter === status.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {status.label}
              {status.value !== 'all' &&
                statusCounts[status.value] !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      statusFilter === status.value
                        ? 'bg-blue-500'
                        : 'bg-gray-700'
                    }`}
                  >
                    {statusCounts[status.value]}
                  </span>
                )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {statusFilter === 'all'
                ? 'No Applications Yet'
                : `No ${statusLabels[statusFilter as ApplicationStatus]} Applications`}
            </h2>
            <p className="text-gray-400 mb-4">
              {statusFilter === 'all'
                ? 'Start saving jobs to track your applications here.'
                : 'No applications with this status.'}
            </p>
            <Link
              href="/jobs"
              className="inline-block text-blue-400 hover:text-blue-300"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onUpdateStatus={handleUpdateStatus}
                onUpdateNotes={handleUpdateNotes}
                onUpdateResume={handleUpdateResume}
                onDelete={handleDelete}
                onStartAutoApply={handleStartAutoApply}
                isUpdating={updatingId === application.id}
                isAutoApplying={autoApplyingId === application.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Checkpoint Modal for auto-apply workflow */}
      {checkpointModal && (
        <CheckpointModal
          isOpen={checkpointModal.isOpen}
          onClose={handleCheckpointClose}
          checkpointType={checkpointModal.type}
          applicationId={checkpointModal.applicationId}
          jobTitle={checkpointModal.jobTitle}
          company={checkpointModal.company}
          checkpointData={checkpointModal.data}
          onContinue={handleCheckpointContinue}
          onCancel={handleCheckpointCancel}
          isProcessing={isProcessingCheckpoint}
        />
      )}
    </div>
  )
}
