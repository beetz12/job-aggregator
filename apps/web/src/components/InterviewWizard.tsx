'use client'

import { useState, useEffect, useCallback } from 'react'
import QuestionCard from './QuestionCard'
import { useInterviewStorage } from '@/hooks/useInterviewStorage'
import { generateInterviewQuestions } from '@/lib/api'
import {
  INTERVIEW_QUESTIONS,
  CATEGORY_STYLES,
  type InterviewQuestion,
  type InterviewAnswers,
} from '@/lib/interviewQuestions'
import type { ResumeInsights } from '@/lib/types'

interface InterviewWizardProps {
  resumeText: string
  onComplete: (answers: InterviewAnswers) => void
  onBack: () => void
}

export default function InterviewWizard({
  resumeText,
  onComplete,
  onBack,
}: InterviewWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<InterviewAnswers>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dynamic questions state
  const [questions, setQuestions] = useState<InterviewQuestion[]>(INTERVIEW_QUESTIONS)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [questionsGenerated, setQuestionsGenerated] = useState(false)
  const [resumeInsights, setResumeInsights] = useState<ResumeInsights | null>(null)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  const {
    storedAnswers,
    saveAnswers,
    isClient,
  } = useInterviewStorage()

  // Load stored answers on mount
  useEffect(() => {
    if (isClient && storedAnswers) {
      setAnswers(storedAnswers)
    }
  }, [isClient, storedAnswers])

  // Auto-save answers when they change
  useEffect(() => {
    if (isClient && Object.keys(answers).length > 0) {
      saveAnswers(answers)
    }
  }, [answers, isClient, saveAnswers])

  // Generate dynamic questions based on resume
  useEffect(() => {
    let isMounted = true

    async function loadDynamicQuestions() {
      // Only generate if resume text is substantial enough
      if (!resumeText || resumeText.trim().length < 100) {
        setIsLoadingQuestions(false)
        setLoadingError('Resume text too short for personalized questions')
        return
      }

      try {
        setIsLoadingQuestions(true)
        setLoadingError(null)

        const response = await generateInterviewQuestions(resumeText, 5)

        if (!isMounted) return

        if (response.questions && response.questions.length > 0) {
          setQuestions(response.questions)
          setQuestionsGenerated(response.generated)
          if (response.resume_insights) {
            setResumeInsights(response.resume_insights)
          }
        }
      } catch (error) {
        if (!isMounted) return

        console.error('Failed to generate dynamic questions:', error)
        setLoadingError(error instanceof Error ? error.message : 'Failed to generate questions')
        // Keep using default questions on error
        setQuestions(INTERVIEW_QUESTIONS)
        setQuestionsGenerated(false)
      } finally {
        if (isMounted) {
          setIsLoadingQuestions(false)
        }
      }
    }

    loadDynamicQuestions()

    return () => {
      isMounted = false
    }
  }, [resumeText])

  const currentQuestion = questions[currentStep]
  const totalQuestions = questions.length

  const handleAnswerChange = useCallback((answer: string) => {
    if (!currentQuestion) return
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }))
  }, [currentQuestion])

  const handleNext = useCallback(() => {
    if (currentStep < totalQuestions - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep, totalQuestions])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    if (!currentQuestion) return
    // Skip saves empty string for current question and moves to next
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: prev[currentQuestion.id] || '',
    }))
    handleNext()
  }, [currentQuestion, handleNext])

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true)
    try {
      // Save final answers before completing
      saveAnswers(answers)
      await onComplete(answers)
    } finally {
      setIsSubmitting(false)
    }
  }, [answers, onComplete, saveAnswers])

  const currentAnswer = answers[currentQuestion?.id] || ''
  const isLastQuestion = currentStep === totalQuestions - 1
  const hasCurrentAnswer = currentAnswer.trim().length > 0

  // Count answered questions
  const answeredCount = questions.filter(
    (q) => answers[q.id]?.trim().length > 0
  ).length

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    )
  }

  // Show loading state while generating questions
  if (isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-gray-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Resume
          </button>

          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-white">
              Analyzing Your Resume
            </h2>
            <p className="mt-2 text-gray-400 text-center max-w-md">
              Our AI is reviewing your experience to create personalized interview questions
              tailored to your background...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Resume
          </button>

          <h1 className="text-2xl font-bold text-white mb-2">
            Career Preferences Interview
          </h1>
          <p className="text-gray-400">
            Help us understand your preferences beyond what&apos;s in your resume.
            Your answers will help us find better job matches.
          </p>
        </div>

        {/* Dynamic questions indicator */}
        {questionsGenerated && (
          <div className="mb-6 p-3 bg-green-900/30 border border-green-700 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <div>
                <p className="text-sm text-green-300 font-medium">
                  Personalized Questions Generated
                </p>
                <p className="text-sm text-green-400/80">
                  These questions are tailored based on your resume
                  {resumeInsights?.detected_skills && resumeInsights.detected_skills.length > 0 && (
                    <> - we detected skills in {resumeInsights.detected_skills.slice(0, 3).join(', ')}
                      {resumeInsights.detected_skills.length > 3 && ' and more'}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fallback indicator */}
        {!questionsGenerated && loadingError && (
          <div className="mb-6 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm text-yellow-300 font-medium">
                  Using Standard Questions
                </p>
                <p className="text-sm text-yellow-400/80">
                  We are using our standard interview questions. These still provide excellent insights.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{answeredCount} of {totalQuestions} answered</span>
            <span>{Math.round(((currentStep + 1) / totalQuestions) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Category indicators */}
          <div className="flex gap-2 mt-4">
            {questions.map((q, index) => {
              const style = CATEGORY_STYLES[q.category]
              const isCompleted = answers[q.id]?.trim().length > 0
              const isCurrent = index === currentStep

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentStep(index)}
                  className={`
                    flex-1 h-1.5 rounded-full transition-all
                    ${isCurrent ? style.bgColor : isCompleted ? 'bg-gray-500' : 'bg-gray-700'}
                    hover:opacity-80 cursor-pointer
                  `}
                  aria-label={`Go to question ${index + 1}: ${style.label}`}
                  title={`${style.label}${isCompleted ? ' (answered)' : ''}`}
                />
              )
            })}
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            answer={currentAnswer}
            onAnswerChange={handleAnswerChange}
            questionNumber={currentStep + 1}
            totalQuestions={totalQuestions}
          />
        )}

        {/* Resume context hint */}
        {resumeText && (
          <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
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
              <div>
                <p className="text-sm text-gray-400">
                  <span className="text-blue-400 font-medium">Tip:</span> Your resume is already loaded.
                  Focus on preferences and requirements not mentioned in your resume.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white border border-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>
          </div>

          <div className="flex gap-3">
            {!isLastQuestion && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                Skip
              </button>
            )}

            {isLastQuestion ? (
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Interview
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className={`
                  flex items-center gap-2 px-6 py-2 font-medium rounded-lg transition-colors
                  ${hasCurrentAnswer
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }
                `}
              >
                Next
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Summary of answers */}
        <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Progress Summary</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, index) => {
              const style = CATEGORY_STYLES[q.category]
              const isCompleted = answers[q.id]?.trim().length > 0
              const isCurrent = index === currentStep

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentStep(index)}
                  className={`
                    p-2 rounded-lg border transition-all text-center
                    ${isCurrent
                      ? 'border-blue-500 bg-blue-900/30'
                      : isCompleted
                        ? 'border-green-600 bg-green-900/20'
                        : 'border-gray-700 bg-gray-800/50'
                    }
                    hover:border-gray-500
                  `}
                  title={`${style.label}: ${isCompleted ? 'Answered' : 'Not answered'}`}
                >
                  <span className={`text-xs ${style.textColor}`}>
                    {style.label.split(' ')[0]}
                  </span>
                  <div className="mt-1">
                    {isCompleted ? (
                      <svg
                        className="w-4 h-4 text-green-400 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-600 mx-auto" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
