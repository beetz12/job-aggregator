'use client'

import { type InterviewQuestion, CATEGORY_STYLES } from '@/lib/interviewQuestions'

interface QuestionCardProps {
  question: InterviewQuestion
  answer: string
  onAnswerChange: (answer: string) => void
  questionNumber: number
  totalQuestions: number
}

export default function QuestionCard({
  question,
  answer,
  onAnswerChange,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  const categoryStyle = CATEGORY_STYLES[question.category]

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg">
      {/* Header with progress and category */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span
          className={`${categoryStyle.bgColor} ${categoryStyle.textColor} text-xs font-medium px-3 py-1 rounded-full`}
        >
          {categoryStyle.label}
        </span>
      </div>

      {/* Question */}
      <h2 className="text-xl font-semibold text-white mb-2 leading-relaxed">
        {question.question}
      </h2>

      {/* Help text */}
      {question.helpText && (
        <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {question.helpText}
        </p>
      )}

      {/* Answer textarea */}
      <div className="relative">
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder={question.placeholder}
          className="w-full h-48 bg-gray-900 text-white border border-gray-600 rounded-lg p-4 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 transition-all"
          aria-label={`Answer for: ${question.question}`}
        />
        {/* Character count */}
        <div className="absolute bottom-3 right-3 text-xs text-gray-500">
          {answer.length} characters
        </div>
      </div>

      {/* Answer status indicator */}
      <div className="mt-3 flex items-center gap-2">
        {answer.trim().length > 0 ? (
          <>
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-400">Answered</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-gray-600" />
            <span className="text-xs text-gray-500">Not yet answered</span>
          </>
        )}
      </div>
    </div>
  )
}
