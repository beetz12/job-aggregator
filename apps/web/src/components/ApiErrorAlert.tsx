'use client'

import { getErrorDetails } from '@/lib/errors'

interface ApiErrorAlertProps {
  error: unknown
  onRetry?: () => void
  className?: string
}

export default function ApiErrorAlert({ error, onRetry, className = '' }: ApiErrorAlertProps) {
  const details = getErrorDetails(error)

  return (
    <div
      className={`rounded-lg border p-6 ${
        details.isNetworkError
          ? 'bg-orange-900/20 border-orange-700'
          : 'bg-red-900/20 border-red-700'
      } ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            details.isNetworkError ? 'bg-orange-600/30' : 'bg-red-600/30'
          }`}
        >
          {details.isNetworkError ? (
            <svg
              className="w-5 h-5 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-lg font-semibold ${
              details.isNetworkError ? 'text-orange-300' : 'text-red-300'
            }`}
          >
            {details.title}
          </h3>
          <p className="text-gray-300 mt-1">{details.message}</p>
          {details.suggestion && (
            <p className="text-gray-400 text-sm mt-2">{details.suggestion}</p>
          )}

          {/* Actions */}
          {details.isRetryable && onRetry && (
            <button
              onClick={onRetry}
              className={`mt-4 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                details.isNetworkError
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline error message for smaller contexts
 */
export function InlineError({ error, className = '' }: { error: unknown; className?: string }) {
  const details = getErrorDetails(error)

  return (
    <div
      className={`flex items-center gap-2 text-sm ${
        details.isNetworkError ? 'text-orange-400' : 'text-red-400'
      } ${className}`}
      role="alert"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{details.message}</span>
    </div>
  )
}
