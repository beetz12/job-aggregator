'use client'

import { useState } from 'react'
import {
  EnhancedFitAnalysisResult,
  ShouldApply,
} from '@/lib/types'

interface FitResultsDisplayProps {
  result: EnhancedFitAnalysisResult
  onAnalyzeAnother: () => void
  onBack: () => void
}

// Helper function to get recommendation styling
function getRecommendationConfig(shouldApply: ShouldApply): {
  bgColor: string
  textColor: string
  borderColor: string
  icon: React.ReactNode
  label: string
  description: string
} {
  switch (shouldApply) {
    case 'DEFINITELY':
      return {
        bgColor: 'bg-green-900/50',
        textColor: 'text-green-400',
        borderColor: 'border-green-500',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        label: 'Definitely Apply',
        description: 'This role is an excellent match for your criteria',
      }
    case 'LIKELY':
      return {
        bgColor: 'bg-emerald-900/40',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
        ),
        label: 'Likely Worth Applying',
        description: 'Good match with minor gaps to consider',
      }
    case 'MAYBE':
      return {
        bgColor: 'bg-yellow-900/40',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-500',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        label: 'Maybe',
        description: 'Mixed signals - weigh the pros and cons carefully',
      }
    case 'PROBABLY_NOT':
      return {
        bgColor: 'bg-orange-900/40',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        label: 'Probably Not',
        description: 'Significant concerns that may not be worth your time',
      }
    case 'NO':
      return {
        bgColor: 'bg-red-900/40',
        textColor: 'text-red-400',
        borderColor: 'border-red-500',
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        label: 'Skip This One',
        description: 'Clear misalignment with your criteria',
      }
  }
}

// Score bar component
function ScoreBar({
  label,
  score,
  maxScore = 100
}: {
  label: string
  score: number
  maxScore?: number
}) {
  const percentage = (score / maxScore) * 100
  const getColor = () => {
    if (percentage >= 70) return 'bg-green-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-300 w-12 text-right font-medium">
        {score}%
      </span>
    </div>
  )
}

// Expandable section component
function ExpandableSection({
  title,
  children,
  defaultExpanded = false
}: {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <span className="font-medium text-white">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          {children}
        </div>
      )}
    </div>
  )
}

export default function FitResultsDisplay({
  result,
  onAnalyzeAnother,
  onBack,
}: FitResultsDisplayProps) {
  const recommendationConfig = getRecommendationConfig(result.should_apply)

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Recommendation Header */}
      <div className={`p-6 ${recommendationConfig.bgColor} border-b ${recommendationConfig.borderColor}`}>
        <div className="flex items-center gap-4">
          <div className={`${recommendationConfig.textColor}`}>
            {recommendationConfig.icon}
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${recommendationConfig.textColor}`}>
              {recommendationConfig.label}
            </h2>
            <p className="text-gray-400 mt-1">
              {recommendationConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Fit Score Circle */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${result.fit_score.composite * 3.52} 352`}
                className={`${
                  result.fit_score.composite >= 70 ? 'text-green-500' :
                  result.fit_score.composite >= 40 ? 'text-yellow-500' : 'text-red-500'
                } transition-all duration-1000`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{result.fit_score.composite}</span>
              <span className="text-sm text-gray-400">Fit Score</span>
            </div>
          </div>
        </div>

        {/* Criteria Match Section */}
        {result.criteria_match && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Criteria Alignment</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Salary Alignment */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  result.criteria_match.salaryAlignment === 'above' ? 'bg-green-900/50' :
                  result.criteria_match.salaryAlignment === 'within' ? 'bg-blue-900/50' :
                  result.criteria_match.salaryAlignment === 'below' ? 'bg-red-900/50' : 'bg-gray-700'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Salary</p>
                  <p className={`font-medium capitalize ${
                    result.criteria_match.salaryAlignment === 'above' ? 'text-green-400' :
                    result.criteria_match.salaryAlignment === 'within' ? 'text-blue-400' :
                    result.criteria_match.salaryAlignment === 'below' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {result.criteria_match.salaryAlignment === 'unknown' ? 'Not disclosed' : result.criteria_match.salaryAlignment}
                  </p>
                </div>
              </div>

              {/* Location Match */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  result.criteria_match.locationMatch ? 'bg-green-900/50' : 'bg-red-900/50'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Location</p>
                  <p className={`font-medium ${result.criteria_match.locationMatch ? 'text-green-400' : 'text-red-400'}`}>
                    {result.criteria_match.locationMatch ? 'Matches' : 'Mismatch'}
                  </p>
                </div>
              </div>

              {/* Tech Stack Coverage */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  result.criteria_match.techStackCoverage >= 70 ? 'bg-green-900/50' :
                  result.criteria_match.techStackCoverage >= 40 ? 'bg-yellow-900/50' : 'bg-red-900/50'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Tech Stack</p>
                  <p className={`font-medium ${
                    result.criteria_match.techStackCoverage >= 70 ? 'text-green-400' :
                    result.criteria_match.techStackCoverage >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {result.criteria_match.techStackCoverage}% covered
                  </p>
                </div>
              </div>

              {/* Company Stage Match */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  result.criteria_match.companyStageMatch ? 'bg-green-900/50' : 'bg-yellow-900/50'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Company Stage</p>
                  <p className={`font-medium ${result.criteria_match.companyStageMatch ? 'text-green-400' : 'text-yellow-400'}`}>
                    {result.criteria_match.companyStageMatch ? 'Matches' : 'Different'}
                  </p>
                </div>
              </div>
            </div>

            {/* Culture Flags */}
            {(result.criteria_match.cultureFlags.green.length > 0 || result.criteria_match.cultureFlags.red.length > 0) && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                {result.criteria_match.cultureFlags.green.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Culture Positives
                    </h4>
                    <ul className="space-y-1">
                      {result.criteria_match.cultureFlags.green.map((flag, i) => (
                        <li key={i} className="text-sm text-gray-300">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.criteria_match.cultureFlags.red.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Red Flags
                    </h4>
                    <ul className="space-y-1">
                      {result.criteria_match.cultureFlags.red.map((flag, i) => (
                        <li key={i} className="text-sm text-gray-300">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Detailed Reasoning */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Analysis Summary</h3>
          <ul className="space-y-2">
            {result.detailed_reasoning.map((reason, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">&#x2022;</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Skills Match */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Skills Match</h3>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              result.match_analysis.overall_match >= 70 ? 'bg-green-900/50 text-green-400' :
              result.match_analysis.overall_match >= 40 ? 'bg-yellow-900/50 text-yellow-400' :
              'bg-red-900/50 text-red-400'
            }`}>
              {result.match_analysis.overall_match}% match
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {result.match_analysis.strong_matches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-2">Strong Matches</h4>
                <div className="flex flex-wrap gap-1">
                  {result.match_analysis.strong_matches.map((skill, i) => (
                    <span key={i} className="bg-green-900/40 text-green-300 text-xs px-2 py-1 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.match_analysis.partial_matches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-400 mb-2">Partial Matches</h4>
                <div className="flex flex-wrap gap-1">
                  {result.match_analysis.partial_matches.map((skill, i) => (
                    <span key={i} className="bg-yellow-900/40 text-yellow-300 text-xs px-2 py-1 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.match_analysis.gaps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-medium text-orange-400 mb-2">Skills to Develop</h4>
              <div className="flex flex-wrap gap-1">
                {result.match_analysis.gaps.map((gap, i) => (
                  <span key={i} className="bg-orange-900/40 text-orange-300 text-xs px-2 py-1 rounded">
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Company Scores */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Company Evaluation</h3>
          <div className="space-y-3">
            <ScoreBar label="Compensation" score={result.company_insights.scores.compensation * 5} />
            <ScoreBar label="Culture" score={result.company_insights.scores.culture * 4} />
            <ScoreBar label="Work-Life Balance" score={result.company_insights.scores.family_friendliness * 5} />
            <ScoreBar label="Technical Fit" score={Math.round(result.company_insights.scores.technical_fit * 6.67)} />
            <ScoreBar label="Industry" score={result.company_insights.scores.industry * 10} />
            <ScoreBar label="Long-term Potential" score={result.company_insights.scores.long_term_potential * 10} />
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="space-y-3">
          {result.talking_points.length > 0 && (
            <ExpandableSection title="Interview Talking Points" defaultExpanded={true}>
              <ul className="space-y-2">
                {result.talking_points.map((point, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">&#x2022;</span>
                    {point}
                  </li>
                ))}
              </ul>
            </ExpandableSection>
          )}

          {result.gaps_to_address.length > 0 && (
            <ExpandableSection title="Gaps to Address">
              <ul className="space-y-2">
                {result.gaps_to_address.map((gap, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">!</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </ExpandableSection>
          )}

          {result.interview_questions.length > 0 && (
            <ExpandableSection title="Prepare for These Questions">
              <ol className="space-y-2 list-decimal list-inside">
                {result.interview_questions.map((question, i) => (
                  <li key={i} className="text-sm text-gray-300">
                    {question}
                  </li>
                ))}
              </ol>
            </ExpandableSection>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Criteria
          </button>

          <button
            onClick={onAnalyzeAnother}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Analyze Another Job
          </button>
        </div>
      </div>
    </div>
  )
}
