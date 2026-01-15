'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  JobCriteria,
  EnhancedFitAnalysisResult,
} from '@/lib/types'
import { checkFitWithCriteria, getMyProfileId } from '@/lib/api'
import { useMyProfile } from '@/hooks/useProfile'

interface JobDescriptionInputProps {
  jobCriteria: JobCriteria
  profileId: string | null
  onAnalysisComplete: (result: EnhancedFitAnalysisResult) => void
  onBack: () => void
  onProfileNeeded?: () => void
}

const MIN_DESCRIPTION_LENGTH = 50

export default function JobDescriptionInput({
  jobCriteria,
  profileId: propProfileId,
  onAnalysisComplete,
  onBack,
  onProfileNeeded,
}: JobDescriptionInputProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Also fetch profile from API to get the ID if not passed as prop
  const { data: profile } = useMyProfile()

  // Use the prop profileId first, then fall back to profile.id from hook, then localStorage
  const [effectiveProfileId, setEffectiveProfileId] = useState<string | null>(propProfileId)

  useEffect(() => {
    // Determine the best available profile ID
    if (propProfileId) {
      setEffectiveProfileId(propProfileId)
    } else if (profile?.id) {
      setEffectiveProfileId(profile.id)
    } else {
      // Try localStorage as last resort
      const storedId = getMyProfileId()
      setEffectiveProfileId(storedId)
    }
  }, [propProfileId, profile])

  const handleAnalyze = useCallback(async () => {
    if (!jobDescription.trim()) {
      setError('Please paste a job description to analyze')
      return
    }

    if (jobDescription.trim().length < MIN_DESCRIPTION_LENGTH) {
      setError(`Please provide a more detailed job description (at least ${MIN_DESCRIPTION_LENGTH} characters)`)
      return
    }

    if (!effectiveProfileId) {
      setError('Please create a profile first to analyze job fit. Go to Profile page to set up your profile.')
      if (onProfileNeeded) {
        onProfileNeeded()
      }
      return
    }

    setError(null)
    setIsAnalyzing(true)

    try {
      const result = await checkFitWithCriteria({
        job_description: jobDescription.trim(),
        profile_id: effectiveProfileId,
        job_criteria: jobCriteria,
      })
      onAnalysisComplete(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [jobDescription, effectiveProfileId, jobCriteria, onAnalysisComplete, onProfileNeeded])

  const handleClear = () => {
    setJobDescription('')
    setError(null)
  }

  const characterCount = jobDescription.length
  const wordCount = jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Analyze a Job Opportunity
        </h2>
        <p className="text-gray-400">
          Paste a job description below to see how well it matches your Job Criteria document.
          We will analyze the role against your compensation, location, culture, and technical requirements.
        </p>
      </div>

      {/* Job Criteria Summary */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">
            Using Job Criteria:
          </h3>
          <span className="text-xs text-gray-500">
            Updated: {new Date(jobCriteria.lastUpdated).toLocaleDateString()}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {jobCriteria.compensation && (
            <span className="bg-green-900/40 text-green-400 text-xs px-2 py-1 rounded">
              ${(jobCriteria.compensation.floor / 1000).toFixed(0)}k - ${(jobCriteria.compensation.target / 1000).toFixed(0)}k
            </span>
          )}
          {jobCriteria.location && (
            <span className="bg-blue-900/40 text-blue-400 text-xs px-2 py-1 rounded">
              {jobCriteria.location.remote === 'required' ? 'Remote Required' :
               jobCriteria.location.remote === 'preferred' ? 'Remote Preferred' : 'Location Flexible'}
            </span>
          )}
          {jobCriteria.technicalStack?.mustHave && jobCriteria.technicalStack.mustHave.length > 0 && (
            <span className="bg-purple-900/40 text-purple-400 text-xs px-2 py-1 rounded">
              {jobCriteria.technicalStack.mustHave.slice(0, 3).join(', ')}
              {jobCriteria.technicalStack.mustHave.length > 3 && ` +${jobCriteria.technicalStack.mustHave.length - 3} more`}
            </span>
          )}
          {jobCriteria.companyStage && jobCriteria.companyStage !== 'any' && (
            <span className="bg-amber-900/40 text-amber-400 text-xs px-2 py-1 rounded capitalize">
              {jobCriteria.companyStage}
            </span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="mb-4">
        <label htmlFor="job-description" className="block text-sm font-medium text-gray-300 mb-2">
          Job Description
        </label>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => {
            setJobDescription(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Paste the full job description here...

Include:
- Job title and company
- Requirements and qualifications
- Responsibilities
- Salary information (if available)
- Location and remote policy
- Benefits and perks"
          className="w-full min-h-[300px] px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          disabled={isAnalyzing}
        />
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-3">
            <span className={`text-xs ${characterCount >= MIN_DESCRIPTION_LENGTH ? 'text-green-400' : 'text-gray-500'}`}>
              {wordCount} words | {characterCount} characters
              {characterCount > 0 && characterCount < MIN_DESCRIPTION_LENGTH && (
                <span className="text-amber-400 ml-2">
                  (need {MIN_DESCRIPTION_LENGTH - characterCount} more)
                </span>
              )}
            </span>
            {characterCount >= MIN_DESCRIPTION_LENGTH && (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          {jobDescription && (
            <button
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
              disabled={isAnalyzing}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Profile Warning */}
      {!effectiveProfileId && (
        <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
          <p className="text-amber-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            No profile found. Please create a profile on the Profile page to enable job analysis.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
          disabled={isAnalyzing}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Criteria
        </button>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || jobDescription.trim().length < MIN_DESCRIPTION_LENGTH || !effectiveProfileId}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Analyze This Job
            </>
          )}
        </button>
      </div>

      {/* Analysis Loading Overlay */}
      {isAnalyzing && (
        <div className="mt-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-900 border-t-blue-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <h3 className="mt-4 text-lg font-medium text-white">
              Analyzing Job Fit
            </h3>
            <p className="mt-2 text-sm text-gray-400 text-center max-w-sm">
              Evaluating compensation, location, culture, and technical requirements against your criteria...
            </p>
            <div className="mt-4 flex gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
