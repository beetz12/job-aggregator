'use client'

import { useState, useEffect } from 'react'

interface CheckpointModalProps {
  isOpen: boolean
  onClose: () => void
  checkpointType: 'login' | 'captcha' | 'questions' | 'review' | 'error'
  applicationId: string
  jobTitle: string
  company: string
  checkpointData?: {
    questions?: Array<{ question: string; answer?: string }>
    error?: string
    screenshotUrl?: string
    currentUrl?: string
    resumePreview?: string
    coverLetterPreview?: string
  }
  onContinue: (data?: Record<string, unknown>) => void
  onCancel: () => void
  isProcessing?: boolean
}

function getCheckpointConfig(type: CheckpointModalProps['checkpointType']) {
  switch (type) {
    case 'login':
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        ),
        iconBg: 'bg-yellow-600',
        title: 'Login Required',
        borderColor: 'border-yellow-600',
      }
    case 'captcha':
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        iconBg: 'bg-orange-600',
        title: 'Captcha Verification',
        borderColor: 'border-orange-600',
      }
    case 'questions':
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        iconBg: 'bg-blue-600',
        title: 'Additional Questions',
        borderColor: 'border-blue-600',
      }
    case 'review':
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        iconBg: 'bg-green-600',
        title: 'Review Application',
        borderColor: 'border-green-600',
      }
    case 'error':
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        iconBg: 'bg-red-600',
        title: 'Application Error',
        borderColor: 'border-red-600',
      }
  }
}

function LoginCheckpoint({
  checkpointData,
  onContinue,
  onCancel,
  isProcessing,
}: {
  checkpointData: CheckpointModalProps['checkpointData']
  onContinue: () => void
  onCancel: () => void
  isProcessing: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-300 mb-4">
          The application website requires you to log in to continue. Please complete the login in the browser window that has been opened.
        </p>
        {checkpointData?.currentUrl && (
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800 rounded px-3 py-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate">{checkpointData.currentUrl}</span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 bg-yellow-900/20 rounded-lg border border-yellow-800/50">
        <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-yellow-300">
          After logging in, click &quot;Continue&quot; to resume the application process.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Skip This Job
        </button>
        <button
          onClick={onContinue}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              Continue
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function CaptchaCheckpoint({
  checkpointData,
  onContinue,
  onCancel,
  isProcessing,
}: {
  checkpointData: CheckpointModalProps['checkpointData']
  onContinue: () => void
  onCancel: () => void
  isProcessing: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-300 mb-4">
          A captcha verification has appeared on the application page. Please solve the captcha in the browser window to continue.
        </p>
        {checkpointData?.screenshotUrl && (
          <div className="mt-4 rounded-lg overflow-hidden border border-gray-700">
            <img
              src={checkpointData.screenshotUrl}
              alt="Current page screenshot"
              className="w-full max-h-48 object-contain bg-gray-800"
            />
          </div>
        )}
        {checkpointData?.currentUrl && (
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800 rounded px-3 py-2 mt-4">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate">{checkpointData.currentUrl}</span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 bg-orange-900/20 rounded-lg border border-orange-800/50">
        <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-orange-300">
          After completing the captcha, click &quot;Continue&quot; to resume the application.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Skip This Job
        </button>
        <button
          onClick={onContinue}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              Continue
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function QuestionsCheckpoint({
  checkpointData,
  onContinue,
  onCancel,
  isProcessing,
}: {
  checkpointData: CheckpointModalProps['checkpointData']
  onContinue: (data: Record<string, unknown>) => void
  onCancel: () => void
  isProcessing: boolean
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({})

  useEffect(() => {
    // Initialize with existing answers
    if (checkpointData?.questions) {
      const initial: Record<number, string> = {}
      checkpointData.questions.forEach((q, i) => {
        initial[i] = q.answer || ''
      })
      setAnswers(initial)
    }
  }, [checkpointData?.questions])

  const handleSubmit = () => {
    const formattedAnswers = checkpointData?.questions?.map((q, i) => ({
      question: q.question,
      answer: answers[i] || '',
    }))
    onContinue({ answers: formattedAnswers })
  }

  const allAnswered = checkpointData?.questions?.every((_, i) => answers[i]?.trim())

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-300 mb-4">
          The application requires answers to the following questions. Please provide your responses below.
        </p>
      </div>

      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
        {checkpointData?.questions?.map((q, index) => (
          <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <label className="block">
              <span className="text-sm font-medium text-gray-300 mb-2 block">
                {index + 1}. {q.question}
              </span>
              <textarea
                value={answers[index] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [index]: e.target.value }))}
                placeholder="Enter your answer..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </label>
          </div>
        ))}
      </div>

      {!allAnswered && (
        <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg border border-blue-800/50">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-300">
            Please answer all questions to continue with the application.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Skip This Job
        </button>
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !allAnswered}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Answers
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ReviewCheckpoint({
  checkpointData,
  onContinue,
  onCancel,
  isProcessing,
}: {
  checkpointData: CheckpointModalProps['checkpointData']
  onContinue: () => void
  onCancel: () => void
  isProcessing: boolean
}) {
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume')

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-300">
          Please review the application materials below before submitting. Make sure everything looks correct.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('resume')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'resume'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Resume
        </button>
        <button
          onClick={() => setActiveTab('coverLetter')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'coverLetter'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Cover Letter
        </button>
      </div>

      {/* Content */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-h-[40vh] overflow-y-auto">
        {activeTab === 'resume' ? (
          <div className="p-4">
            {checkpointData?.resumePreview ? (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {checkpointData.resumePreview}
              </pre>
            ) : (
              <p className="text-gray-500 text-center py-8">No resume preview available</p>
            )}
          </div>
        ) : (
          <div className="p-4">
            {checkpointData?.coverLetterPreview ? (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {checkpointData.coverLetterPreview}
              </pre>
            ) : (
              <p className="text-gray-500 text-center py-8">No cover letter preview available</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 bg-green-900/20 rounded-lg border border-green-800/50">
        <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-green-300">
          Once you click &quot;Submit Application&quot;, your application will be sent to the employer.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit Application
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ErrorCheckpoint({
  checkpointData,
  onContinue,
  onCancel,
  isProcessing,
}: {
  checkpointData: CheckpointModalProps['checkpointData']
  onContinue: () => void
  onCancel: () => void
  isProcessing: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="bg-red-900/20 rounded-lg p-4 border border-red-800/50">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-red-400 font-medium mb-1">An error occurred</h4>
            <p className="text-gray-300">
              {checkpointData?.error || 'An unexpected error occurred while processing your application.'}
            </p>
          </div>
        </div>
      </div>

      {checkpointData?.screenshotUrl && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700 bg-gray-800">
            <span className="text-sm text-gray-400">Page Screenshot</span>
          </div>
          <img
            src={checkpointData.screenshotUrl}
            alt="Error page screenshot"
            className="w-full max-h-48 object-contain bg-gray-800"
          />
        </div>
      )}

      {checkpointData?.currentUrl && (
        <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 rounded-lg px-4 py-3 border border-gray-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="truncate">{checkpointData.currentUrl}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          Skip This Job
        </button>
        <button
          onClick={onContinue}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Retrying...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function CheckpointModal({
  isOpen,
  onClose,
  checkpointType,
  applicationId,
  jobTitle,
  company,
  checkpointData,
  onContinue,
  onCancel,
  isProcessing = false,
}: CheckpointModalProps) {
  if (!isOpen) return null

  const config = getCheckpointConfig(checkpointType)

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose()
    }
  }

  const renderContent = () => {
    switch (checkpointType) {
      case 'login':
        return (
          <LoginCheckpoint
            checkpointData={checkpointData}
            onContinue={() => onContinue()}
            onCancel={onCancel}
            isProcessing={isProcessing}
          />
        )
      case 'captcha':
        return (
          <CaptchaCheckpoint
            checkpointData={checkpointData}
            onContinue={() => onContinue()}
            onCancel={onCancel}
            isProcessing={isProcessing}
          />
        )
      case 'questions':
        return (
          <QuestionsCheckpoint
            checkpointData={checkpointData}
            onContinue={onContinue}
            onCancel={onCancel}
            isProcessing={isProcessing}
          />
        )
      case 'review':
        return (
          <ReviewCheckpoint
            checkpointData={checkpointData}
            onContinue={() => onContinue()}
            onCancel={onCancel}
            isProcessing={isProcessing}
          />
        )
      case 'error':
        return (
          <ErrorCheckpoint
            checkpointData={checkpointData}
            onContinue={() => onContinue()}
            onCancel={onCancel}
            isProcessing={isProcessing}
          />
        )
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
      <div className={`relative bg-gray-800 rounded-xl max-w-xl w-full overflow-hidden border ${config.borderColor} shadow-2xl transform transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${config.iconBg} rounded-lg text-white`}>
              {config.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{config.title}</h2>
              <p className="text-sm text-gray-400">
                {jobTitle} at {company}
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
          {renderContent()}
        </div>

        {/* Application ID footer */}
        <div className="px-6 py-3 bg-gray-900 border-t border-gray-700">
          <span className="text-xs text-gray-500">
            Application ID: {applicationId}
          </span>
        </div>
      </div>
    </div>
  )
}
