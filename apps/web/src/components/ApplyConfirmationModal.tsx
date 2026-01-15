'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ApplyConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedJobs: Array<{ id: string; title: string; company: string }>
  hasResume: boolean
  onConfirm: (generateCustomResumes: boolean) => void
  isProcessing?: boolean
}

export default function ApplyConfirmationModal({
  isOpen,
  onClose,
  selectedJobs,
  hasResume,
  onConfirm,
  isProcessing = false,
}: ApplyConfirmationModalProps) {
  const [generateCustomResumes, setGenerateCustomResumes] = useState(true)
  const maxPreviewJobs = 5

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(generateCustomResumes)
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 transition-opacity" />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl max-w-lg w-full overflow-hidden border border-gray-700 shadow-2xl transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Start Application Process</h2>
              <p className="text-sm text-gray-400">
                {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {isProcessing ? (
            /* Processing State */
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-white font-medium mt-4">Processing Applications...</p>
              <p className="text-sm text-gray-400 mt-2 text-center">
                {generateCustomResumes
                  ? 'Generating custom resumes and preparing applications'
                  : 'Preparing your applications'}
              </p>
              <p className="text-xs text-gray-500 mt-4">
                This may take a few moments
              </p>
            </div>
          ) : !hasResume ? (
            /* No Resume State */
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Resume Required</h3>
              <p className="text-gray-400 mb-6">
                Please upload your resume before starting the application process.
                This allows us to generate tailored applications for each position.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Go to Profile to Upload Resume
                </Link>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Has Resume - Confirmation State */
            <div className="space-y-6">
              {/* Selected Jobs Preview */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Selected Jobs</h3>
                <div className="bg-gray-900 rounded-lg border border-gray-700 divide-y divide-gray-700 max-h-48 overflow-y-auto">
                  {selectedJobs.slice(0, maxPreviewJobs).map((job) => (
                    <div key={job.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{job.title}</p>
                        <p className="text-xs text-gray-400 truncate">{job.company}</p>
                      </div>
                    </div>
                  ))}
                  {selectedJobs.length > maxPreviewJobs && (
                    <div className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-400">
                        + {selectedJobs.length - maxPreviewJobs} more job{selectedJobs.length - maxPreviewJobs !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="flex-shrink-0 pt-0.5">
                    <input
                      type="checkbox"
                      checked={generateCustomResumes}
                      onChange={(e) => setGenerateCustomResumes(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-medium">Generate custom resumes for each job</span>
                    <p className="text-sm text-gray-400 mt-1">
                      AI will tailor your resume to highlight relevant skills and experience for each position. Recommended for better results.
                    </p>
                  </div>
                </label>
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg border border-blue-800/50">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-300">
                  You will have a chance to review and edit each application before submitting.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Proceed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
