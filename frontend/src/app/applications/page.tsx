'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  useApplications,
  useUpdateApplication,
  useDeleteApplication,
} from '@/hooks/useApplications'
import { Application, ApplicationStatus } from '@/lib/types'

const statusOptions: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

const statusColors: Record<ApplicationStatus, string> = {
  saved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  applied: 'bg-green-500/20 text-green-400 border-green-500/30',
  interviewing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  offered: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  withdrawn: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const statusLabels: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offered: 'Offered',
  rejected: 'Rejected',
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
  onDelete,
  isUpdating,
}: {
  application: Application
  onUpdateStatus: (id: string, status: ApplicationStatus) => void
  onUpdateNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
  isUpdating: boolean
}) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(application.notes || '')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  const handleSaveNotes = () => {
    onUpdateNotes(application.id, notes)
    setShowNotes(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/jobs/${application.jobId}`}>
            <h3 className="text-lg font-semibold text-white hover:text-blue-400 transition-colors truncate">
              {application.jobTitle}
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
        <span className="text-gray-500">Saved {getTimeAgo(application.createdAt)}</span>
        {application.appliedAt && (
          <span className="text-gray-500">
            Applied {getTimeAgo(application.appliedAt)}
          </span>
        )}
        {application.followUpDate && (
          <span className="text-yellow-500">
            Follow up: {new Date(application.followUpDate).toLocaleDateString()}
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

      <div className="flex justify-between items-center pt-3 border-t border-gray-700">
        <div className="flex gap-2">
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
          href={`/jobs/${application.jobId}`}
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
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

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
          ...(status === 'applied' && { appliedAt: new Date().toISOString() }),
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
                onDelete={handleDelete}
                isUpdating={updatingId === application.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
