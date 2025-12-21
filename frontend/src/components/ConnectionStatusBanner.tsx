'use client'

import { useConnectionStatus } from '@/hooks/useConnectionStatus'

export default function ConnectionStatusBanner() {
  const { status, error, isLoading, refetch } = useConnectionStatus()

  // Don't show anything if connected or still checking on initial load
  if (status === 'connected' || (status === 'checking' && isLoading)) {
    return null
  }

  const getBannerConfig = () => {
    switch (status) {
      case 'disconnected':
        return {
          bgColor: 'bg-red-600',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
              />
            </svg>
          ),
          title: 'Backend Disconnected',
          message: 'Unable to connect to the Job Aggregator backend. Please start the backend server.',
          showRetry: true,
        }
      case 'wrong-backend':
        return {
          bgColor: 'bg-orange-600',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ),
          title: 'Wrong Backend',
          message: 'Connected to a different service. Please check the API URL in .env.local points to the Job Aggregator backend.',
          showRetry: true,
        }
      case 'checking':
        return {
          bgColor: 'bg-blue-600',
          icon: (
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          ),
          title: 'Checking Connection',
          message: 'Verifying backend connection...',
          showRetry: false,
        }
      default:
        return null
    }
  }

  const config = getBannerConfig()
  if (!config) return null

  return (
    <div className={`${config.bgColor} text-white px-4 py-3`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <span className="font-semibold">{config.title}:</span>{' '}
            <span className="opacity-90">{config.message}</span>
          </div>
        </div>
        {config.showRetry && (
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Checking...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
