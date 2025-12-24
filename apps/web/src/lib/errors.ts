/**
 * API Error handling utilities - 2025 best practices
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public isNetworkError: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ApiError(
        'Unable to connect to server. Please check if the backend is running.',
        undefined,
        'NETWORK_ERROR',
        true
      )
    }

    if (error instanceof Error) {
      // Check for common network errors
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ECONNREFUSED')
      ) {
        return new ApiError(
          'Unable to connect to server. Please check if the backend is running.',
          undefined,
          'NETWORK_ERROR',
          true
        )
      }
      return new ApiError(error.message)
    }

    return new ApiError('An unexpected error occurred')
  }
}

export interface ErrorDetails {
  title: string
  message: string
  suggestion?: string
  isRetryable: boolean
  isNetworkError: boolean
}

export function getErrorDetails(error: unknown): ErrorDetails {
  const apiError = ApiError.fromError(error)

  if (apiError.isNetworkError) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the Job Aggregator backend.',
      suggestion: 'Please ensure the backend is running on the correct port. Run "npm run dev" in the job-aggregator directory.',
      isRetryable: true,
      isNetworkError: true,
    }
  }

  if (apiError.status === 404) {
    return {
      title: 'Not Found',
      message: apiError.message || 'The requested resource was not found.',
      suggestion: 'The API endpoint may not exist or the backend may be a different service.',
      isRetryable: false,
      isNetworkError: false,
    }
  }

  if (apiError.status === 500) {
    return {
      title: 'Server Error',
      message: 'The server encountered an error processing your request.',
      suggestion: 'Please try again later or check the backend logs.',
      isRetryable: true,
      isNetworkError: false,
    }
  }

  if (apiError.status === 401 || apiError.status === 403) {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.',
      isRetryable: false,
      isNetworkError: false,
    }
  }

  return {
    title: 'Error',
    message: apiError.message || 'An unexpected error occurred.',
    isRetryable: true,
    isNetworkError: false,
  }
}

/**
 * Format error for display in toast notifications
 */
export function formatErrorForToast(error: unknown): string {
  const details = getErrorDetails(error)
  return details.message
}
