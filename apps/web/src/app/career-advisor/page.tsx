'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ResumeUploader from '@/components/ResumeUploader'
import InterviewWizard from '@/components/InterviewWizard'
import JobCriteriaDocument from '@/components/JobCriteriaDocument'
import JobDescriptionInput from '@/components/JobDescriptionInput'
import FitResultsDisplay from '@/components/FitResultsDisplay'
import { useResumeStorage } from '@/hooks/useResumeStorage'
import { useJobCriteria } from '@/hooks/useCriteriaStorage'
import { useMyProfile } from '@/hooks/useProfile'
import { generateJobCriteria } from '@/lib/criteriaGenerator'
import { getMyProfileId } from '@/lib/api'
import { JobCriteria, EnhancedFitAnalysisResult } from '@/lib/types'
import { InterviewAnswers } from '@/lib/interviewQuestions'

type WizardStep = 1 | 2 | 3 | 4

interface StepInfo {
  number: WizardStep
  title: string
  description: string
  icon: React.ReactNode
}

const steps: StepInfo[] = [
  {
    number: 1,
    title: 'Resume Upload',
    description: 'Upload your resume to get started',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    number: 2,
    title: 'AI Interview',
    description: 'Answer questions to refine your profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Job Criteria Review',
    description: 'Review and confirm your preferences',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    number: 4,
    title: 'Job Analysis',
    description: 'Get personalized job recommendations',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export default function CareerAdvisorPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [resumeText, setResumeText] = useState<string>('')
  const [isClient, setIsClient] = useState(false)
  const [fitResult, setFitResult] = useState<EnhancedFitAnalysisResult | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  // Track if user has manually navigated to prevent auto-advance from overriding
  const [hasUserNavigated, setHasUserNavigated] = useState(false)

  const { storedResume } = useResumeStorage()
  const { criteria, setCriteria, isLoading: criteriaLoading } = useJobCriteria()

  // Use the useMyProfile hook to get the profile ID from the API/localStorage
  const { data: profile, isLoading: profileLoading } = useMyProfile()

  // Handle hydration and get profile ID from multiple sources
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Update profileId when profile data is available
  useEffect(() => {
    if (profile?.id) {
      setProfileId(profile.id)
    } else if (!profileLoading) {
      // Fallback to localStorage if profile hook returns null
      const storedProfileId = getMyProfileId()
      if (storedProfileId) {
        setProfileId(storedProfileId)
      }
    }
  }, [profile, profileLoading])

  /**
   * Handle when user needs to create a profile
   */
  const handleProfileNeeded = useCallback(() => {
    // Navigate to profile page
    router.push('/profile')
  }, [router])

  // Auto-advance based on existing data (only on initial load, not after user actions)
  useEffect(() => {
    if (!isClient || criteriaLoading || hasUserNavigated) return

    // If we have criteria, go to step 4 (returning user)
    if (criteria) {
      if (storedResume?.text) {
        setResumeText(storedResume.text)
      }
      setCurrentStep(4) // Go directly to job analysis
      return
    }

    // If we have a resume but no criteria, go to step 2
    if (storedResume?.text) {
      setResumeText(storedResume.text)
      // Stay at step 1 to let user confirm/use the resume
    }
  }, [isClient, criteriaLoading, criteria, storedResume, hasUserNavigated])

  /**
   * Handle resume submission from ResumeUploader
   */
  const handleResumeSubmit = useCallback((text: string, metadata: { fileName?: string; source: 'paste' | 'file' }) => {
    setHasUserNavigated(true) // Mark that user has started the flow
    setResumeText(text)
    setCurrentStep(2)
  }, [])

  /**
   * Handle interview completion
   */
  const handleInterviewComplete = useCallback((answers: InterviewAnswers) => {
    // Ensure user navigation flag is set to prevent auto-advance override
    setHasUserNavigated(true)

    // Generate job criteria from resume and answers
    const newCriteria = generateJobCriteria({
      resumeText,
      interviewAnswers: answers,
    })

    setCriteria(newCriteria)
    setCurrentStep(3)
  }, [resumeText, setCriteria])

  /**
   * Handle criteria document continue
   */
  const handleCriteriaContinue = useCallback(() => {
    setCurrentStep(4)
    setShowResults(false)
    setFitResult(null)
  }, [])

  /**
   * Handle criteria edit (placeholder for future implementation)
   */
  const handleCriteriaEdit = useCallback((section: string) => {
    // TODO: Implement section editing modal
    console.log('Edit section:', section)
  }, [])

  /**
   * Handle fit analysis complete
   */
  const handleAnalysisComplete = useCallback((result: EnhancedFitAnalysisResult) => {
    setFitResult(result)
    setShowResults(true)
  }, [])

  /**
   * Handle analyze another job
   */
  const handleAnalyzeAnother = useCallback(() => {
    setFitResult(null)
    setShowResults(false)
  }, [])

  /**
   * Navigate back from fit results to job input
   */
  const handleBackFromResults = useCallback(() => {
    setShowResults(false)
    setFitResult(null)
  }, [])

  /**
   * Navigate back from job input to criteria
   */
  const handleBackToCriteria = useCallback(() => {
    setCurrentStep(3)
  }, [])

  /**
   * Navigate to a specific step
   */
  const goToStep = (step: WizardStep) => {
    // Only allow going to completed steps or current step
    if (step <= currentStep) {
      setCurrentStep(step)
      if (step !== 4) {
        setShowResults(false)
        setFitResult(null)
      }
    }
  }

  /**
   * Start over - reset all state
   */
  const handleStartOver = useCallback(() => {
    setCurrentStep(1)
    setResumeText('')
    setFitResult(null)
    setShowResults(false)
    setHasUserNavigated(false) // Reset to allow auto-advance on next visit
  }, [])

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl">🧭</span>
                Career Advisor
              </h1>
              <p className="text-gray-400 mt-2">
                Let our AI guide you through finding your perfect job match
              </p>
            </div>
            {currentStep > 1 && (
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start Over
              </button>
            )}
          </div>
        </div>

        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step Circle */}
                <button
                  onClick={() => goToStep(step.number)}
                  disabled={step.number > currentStep}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold transition-all ${
                    currentStep === step.number
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : currentStep > step.number
                      ? 'bg-green-600 border-green-600 text-white cursor-pointer hover:bg-green-500'
                      : 'border-gray-600 text-gray-400'
                  }`}
                >
                  {currentStep > step.number ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </button>

                {/* Step Label (visible on larger screens) */}
                <div className="hidden md:block ml-3">
                  <p className={`text-sm font-medium ${currentStep >= step.number ? 'text-white' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div
                      className={`h-1 rounded ${
                        currentStep > step.number ? 'bg-green-600' : 'bg-gray-700'
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Step Label */}
          <div className="md:hidden mt-4 text-center">
            <p className="text-white font-medium">{steps[currentStep - 1].title}</p>
            <p className="text-gray-400 text-sm">{steps[currentStep - 1].description}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[500px]">
          {/* Step 1: Resume Upload */}
          {currentStep === 1 && (
            <ResumeUploader
              onResumeSubmit={handleResumeSubmit}
              existingResume={storedResume}
            />
          )}

          {/* Step 2: AI Interview */}
          {currentStep === 2 && (
            <InterviewWizard
              resumeText={resumeText}
              onComplete={handleInterviewComplete}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {/* Step 3: Job Criteria Review */}
          {currentStep === 3 && criteria && (
            <JobCriteriaDocument
              criteria={criteria}
              onEdit={handleCriteriaEdit}
              onContinue={handleCriteriaContinue}
              editable={true}
            />
          )}

          {/* Step 4: Job Analysis */}
          {currentStep === 4 && criteria && (
            <>
              {!showResults ? (
                <JobDescriptionInput
                  jobCriteria={criteria}
                  profileId={profileId}
                  onAnalysisComplete={handleAnalysisComplete}
                  onBack={handleBackToCriteria}
                  onProfileNeeded={handleProfileNeeded}
                />
              ) : fitResult ? (
                <FitResultsDisplay
                  result={fitResult}
                  onAnalyzeAnother={handleAnalyzeAnother}
                  onBack={handleBackFromResults}
                />
              ) : null}
            </>
          )}

          {/* Loading State for Criteria */}
          {currentStep === 3 && !criteria && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mb-4" />
                <p className="text-gray-400">Generating your job criteria...</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Footer */}
        {criteria && currentStep >= 3 && (
          <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-400">
                  Job Criteria saved • Last updated {new Date(criteria.lastUpdated).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    currentStep === 3
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Review Criteria
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(4)
                    setShowResults(false)
                    setFitResult(null)
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    currentStep === 4
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Analyze Jobs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
