'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useResumeStorage, StoredResume } from '@/hooks/useResumeStorage'
import {
  parseResumeFile,
  validateFileSize,
  formatFileSize,
  FILE_ACCEPT,
  ParseResult,
} from '@/lib/resumeParser'

interface ResumeUploaderProps {
  onResumeSubmit: (
    resumeText: string,
    metadata: { fileName?: string; source: 'paste' | 'file' }
  ) => void
  existingResume?: StoredResume | null
  className?: string
}

type ViewMode = 'input' | 'preview' | 'stored'

export default function ResumeUploader({
  onResumeSubmit,
  existingResume,
  className = '',
}: ResumeUploaderProps) {
  const { storedResume, saveResume, clearResume, isClient } = useResumeStorage()
  const [viewMode, setViewMode] = useState<ViewMode>('input')
  const [resumeText, setResumeText] = useState('')
  const [fileName, setFileName] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use either provided existingResume or storedResume from hook
  const activeStoredResume = existingResume || storedResume

  // Initialize view mode based on stored resume
  useEffect(() => {
    if (isClient && activeStoredResume && !resumeText) {
      setViewMode('stored')
    }
  }, [isClient, activeStoredResume, resumeText])

  // Word count for the current text
  const wordCount = useMemo(() => {
    return resumeText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
  }, [resumeText])

  // Character count
  const charCount = useMemo(() => resumeText.length, [resumeText])

  /**
   * Handle file selection from file input or drag-and-drop.
   */
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null)
    setIsLoading(true)

    // Validate file size
    const sizeValidation = validateFileSize(file, 5)
    if (!sizeValidation.valid) {
      setError(sizeValidation.error || 'File too large')
      setIsLoading(false)
      return
    }

    // Parse the file
    const result: ParseResult = await parseResumeFile(file)

    setIsLoading(false)

    if (result.success) {
      setResumeText(result.text)
      setFileName(file.name)
      setViewMode('preview')
    } else {
      setError(result.error || 'Failed to parse file')
    }
  }, [])

  /**
   * Handle file input change.
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
      // Reset the input so the same file can be selected again
      e.target.value = ''
    },
    [handleFileSelect]
  )

  /**
   * Handle drag over event.
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  /**
   * Handle drag leave event.
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  /**
   * Handle drop event.
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  /**
   * Handle paste text submit.
   */
  const handleTextSubmit = useCallback(() => {
    if (!resumeText.trim()) {
      setError('Please enter your resume text')
      return
    }

    const newResume: StoredResume = {
      text: resumeText,
      fileName,
      uploadedAt: new Date().toISOString(),
      source: fileName ? 'file' : 'paste',
    }

    saveResume(newResume)
    onResumeSubmit(resumeText, { fileName, source: fileName ? 'file' : 'paste' })
    setViewMode('stored')
  }, [resumeText, fileName, saveResume, onResumeSubmit])

  /**
   * Use the previously stored resume.
   */
  const handleUsePreviousResume = useCallback(() => {
    if (activeStoredResume) {
      onResumeSubmit(activeStoredResume.text, {
        fileName: activeStoredResume.fileName,
        source: activeStoredResume.source,
      })
    }
  }, [activeStoredResume, onResumeSubmit])

  /**
   * Replace the current resume with a new one.
   */
  const handleReplaceResume = useCallback(() => {
    setResumeText('')
    setFileName(undefined)
    setError(null)
    setViewMode('input')
  }, [])

  /**
   * Clear the stored resume.
   */
  const handleClearResume = useCallback(() => {
    clearResume()
    setResumeText('')
    setFileName(undefined)
    setViewMode('input')
  }, [clearResume])

  /**
   * Format the upload date for display.
   */
  const formatUploadDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Unknown date'
    }
  }

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-white">Resume Upload</h2>
        </div>
        {viewMode === 'stored' && activeStoredResume && (
          <button
            onClick={handleReplaceResume}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Replace Resume
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-300 text-xs hover:text-red-200 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Stored Resume View */}
        {viewMode === 'stored' && activeStoredResume && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-green-400 font-medium">Resume on File</span>
                </div>
                <span className="text-xs text-gray-500">
                  {activeStoredResume.source === 'file' ? 'Uploaded' : 'Pasted'} {formatUploadDate(activeStoredResume.uploadedAt)}
                </span>
              </div>
              {activeStoredResume.fileName && (
                <p className="text-sm text-gray-400 mb-2">
                  <span className="text-gray-500">File:</span> {activeStoredResume.fileName}
                </p>
              )}
              <div className="bg-gray-800 rounded p-3 max-h-48 overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {activeStoredResume.text.slice(0, 500)}
                  {activeStoredResume.text.length > 500 && '...'}
                </pre>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <span>
                  {activeStoredResume.text.split(/\s+/).filter((w) => w.length > 0).length} words
                </span>
                <span>|</span>
                <span>{activeStoredResume.text.length} characters</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUsePreviousResume}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Use This Resume
              </button>
              <button
                onClick={handleClearResume}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Input View */}
        {viewMode === 'input' && (
          <div className="space-y-6">
            {/* Previous Resume Option */}
            {activeStoredResume && (
              <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-indigo-300 text-sm font-medium">
                      You have a previously saved resume
                    </span>
                  </div>
                  <button
                    onClick={() => setViewMode('stored')}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                  >
                    View Saved Resume
                  </button>
                </div>
              </div>
            )}

            {/* Text Input Area */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Paste your resume text
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value)
                  setError(null)
                }}
                placeholder="Paste your resume content here...

You can include:
- Work experience
- Education
- Skills and certifications
- Projects and achievements

Markdown formatting is supported."
                className="w-full h-64 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>{wordCount} words | {charCount} characters</span>
                <span>Markdown supported</span>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-900/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_ACCEPT}
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400" />
                  <p className="text-gray-400">Parsing file...</p>
                </div>
              ) : (
                <>
                  <svg
                    className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-indigo-400' : 'text-gray-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-gray-300 mb-2">
                    {isDragOver ? 'Drop your file here' : 'Drag and drop your resume file'}
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Supports PDF, Markdown (.md), and plain text (.txt)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Choose File
                  </button>
                </>
              )}
            </div>

            {/* Submit Button */}
            {resumeText.trim() && (
              <button
                onClick={handleTextSubmit}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Resume
              </button>
            )}
          </div>
        )}

        {/* Preview View */}
        {viewMode === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Preview</h3>
                {fileName && (
                  <p className="text-sm text-gray-500">{fileName}</p>
                )}
              </div>
              <button
                onClick={handleReplaceResume}
                className="text-gray-400 hover:text-white text-sm"
              >
                Start Over
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 max-h-80 overflow-y-auto border border-gray-700">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {resumeText}
              </pre>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{wordCount} words</span>
              <span>|</span>
              <span>{charCount} characters</span>
              {fileName && (
                <>
                  <span>|</span>
                  <span>{fileName}</span>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTextSubmit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Confirm and Save
              </button>
              <button
                onClick={() => setViewMode('input')}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
