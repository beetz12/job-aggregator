'use client'

import { useState } from 'react'
import {
  FitAnalysisResult,
  ApplicationKitResult,
  FitRecommendation,
  CompanyRecommendation,
} from '@/lib/types'

interface FitAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  fitAnalysis: FitAnalysisResult | null
  applicationKit: ApplicationKitResult | null
  isLoadingFit: boolean
  isLoadingApplication: boolean
  onGenerateApplication: () => void
  jobTitle: string
  company: string
}

function getRecommendationColor(rec: FitRecommendation): string {
  switch (rec) {
    case 'STRONG_APPLY':
      return 'bg-green-500 text-white'
    case 'APPLY':
      return 'bg-blue-500 text-white'
    case 'CONDITIONAL':
      return 'bg-yellow-500 text-black'
    case 'SKIP':
      return 'bg-red-500 text-white'
  }
}

function getCompanyRecColor(rec: CompanyRecommendation): string {
  switch (rec) {
    case 'STRONG_YES':
      return 'text-green-400'
    case 'YES':
      return 'text-blue-400'
    case 'MAYBE':
      return 'text-yellow-400'
    case 'PASS':
      return 'text-red-400'
  }
}

function ScoreBar({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const percentage = (score / maxScore) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-28">{label}</span>
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-300 w-10 text-right">
        {score}/{maxScore}
      </span>
    </div>
  )
}

export default function FitAnalysisModal({
  isOpen,
  onClose,
  fitAnalysis,
  applicationKit,
  isLoadingFit,
  isLoadingApplication,
  onGenerateApplication,
  jobTitle,
  company,
}: FitAnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'application'>('analysis')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">{jobTitle}</h2>
            <p className="text-sm text-gray-400">{company}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Fit Analysis
          </button>
          <button
            onClick={() => setActiveTab('application')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'application'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Application Materials
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'analysis' ? (
            isLoadingFit ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4" />
                <p className="text-gray-400">Analyzing job fit...</p>
                <p className="text-xs text-gray-500 mt-2">This uses AI to deeply evaluate the opportunity</p>
              </div>
            ) : fitAnalysis ? (
              <div className="space-y-6">
                {/* Fit Score Summary */}
                <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
                  <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-gray-800 border-4 border-blue-500">
                    <span className="text-2xl font-bold text-white">{fitAnalysis.fitScore.composite}</span>
                    <span className="text-xs text-gray-400">/ 100</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getRecommendationColor(fitAnalysis.fitScore.recommendation)}`}>
                        {fitAnalysis.fitScore.recommendation.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-400">
                        {fitAnalysis.fitScore.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-gray-300">{fitAnalysis.fitScore.reasoning}</p>
                  </div>
                </div>

                {/* Company Insights */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    Company Insights
                    <span className={`text-sm ${getCompanyRecColor(fitAnalysis.companyInsights.recommendation)}`}>
                      ({fitAnalysis.companyInsights.recommendation.replace('_', ' ')})
                    </span>
                  </h3>

                  <div className="space-y-2 mb-4">
                    <ScoreBar label="Compensation" score={fitAnalysis.companyInsights.scores.compensation} maxScore={20} />
                    <ScoreBar label="Culture" score={fitAnalysis.companyInsights.scores.culture} maxScore={25} />
                    <ScoreBar label="Family-Friendly" score={fitAnalysis.companyInsights.scores.familyFriendliness} maxScore={20} />
                    <ScoreBar label="Technical Fit" score={fitAnalysis.companyInsights.scores.technicalFit} maxScore={15} />
                    <ScoreBar label="Industry" score={fitAnalysis.companyInsights.scores.industry} maxScore={10} />
                    <ScoreBar label="Long-term" score={fitAnalysis.companyInsights.scores.longTermPotential} maxScore={10} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {fitAnalysis.companyInsights.greenFlags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-400 mb-2">Green Flags</h4>
                        <ul className="space-y-1">
                          {fitAnalysis.companyInsights.greenFlags.map((flag, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-green-400">+</span>
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fitAnalysis.companyInsights.redFlags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-red-400 mb-2">Red Flags</h4>
                        <ul className="space-y-1">
                          {fitAnalysis.companyInsights.redFlags.map((flag, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-red-400">-</span>
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Analysis */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Skills Match ({fitAnalysis.matchAnalysis.overallMatch}%)
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {fitAnalysis.matchAnalysis.strongMatches.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-400 mb-2">Strong Matches</h4>
                        <div className="flex flex-wrap gap-1">
                          {fitAnalysis.matchAnalysis.strongMatches.map((skill, i) => (
                            <span key={i} className="bg-green-900/50 text-green-300 text-xs px-2 py-1 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {fitAnalysis.matchAnalysis.gaps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-yellow-400 mb-2">Gaps to Address</h4>
                        <div className="flex flex-wrap gap-1">
                          {fitAnalysis.matchAnalysis.gaps.map((gap, i) => (
                            <span key={i} className="bg-yellow-900/50 text-yellow-300 text-xs px-2 py-1 rounded">
                              {gap}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Talking Points */}
                {fitAnalysis.talkingPoints.length > 0 && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Talking Points</h3>
                    <ul className="space-y-2">
                      {fitAnalysis.talkingPoints.map((point, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">&#x2022;</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Interview Questions */}
                {fitAnalysis.interviewQuestions.length > 0 && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Prepare for These Questions</h3>
                    <ol className="space-y-2 list-decimal list-inside">
                      {fitAnalysis.interviewQuestions.map((question, i) => (
                        <li key={i} className="text-sm text-gray-300">
                          {question}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Generate Application Button */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={onGenerateApplication}
                    disabled={isLoadingApplication}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoadingApplication ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Application Materials
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                No analysis data available
              </div>
            )
          ) : (
            // Application Tab
            isLoadingApplication ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4" />
                <p className="text-gray-400">Generating application materials...</p>
                <p className="text-xs text-gray-500 mt-2">Creating tailored resume and cover letter</p>
              </div>
            ) : applicationKit ? (
              <div className="space-y-6">
                {/* Resume */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Tailored Resume</h3>
                    <span className="bg-green-900/50 text-green-400 text-sm px-3 py-1 rounded">
                      ATS Score: {applicationKit.resume.atsScore}%
                    </span>
                  </div>
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Highlighted Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {applicationKit.resume.highlightedSkills.map((skill, i) => (
                        <span key={i} className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                      {applicationKit.resume.markdown}
                    </pre>
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Cover Letter</h3>
                    <span className="bg-purple-900/50 text-purple-400 text-sm px-3 py-1 rounded capitalize">
                      {applicationKit.coverLetter.hookType.replace('_', ' ')} Hook
                    </span>
                  </div>
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Key Points</h4>
                    <div className="flex flex-wrap gap-1">
                      {applicationKit.coverLetter.keyPoints.map((point, i) => (
                        <span key={i} className="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded">
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                      {applicationKit.coverLetter.markdown}
                    </pre>
                  </div>
                </div>

                {/* Question Answers */}
                {applicationKit.questionAnswers && applicationKit.questionAnswers.length > 0 && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Application Q&A</h3>
                    <div className="space-y-4">
                      {applicationKit.questionAnswers.map((qa, i) => (
                        <div key={i} className="border-l-2 border-blue-500 pl-4">
                          <p className="text-sm font-medium text-gray-300 mb-1">{qa.question}</p>
                          <p className="text-sm text-gray-400">{qa.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy Buttons */}
                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => navigator.clipboard.writeText(applicationKit.resume.markdown)}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Resume
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(applicationKit.coverLetter.markdown)}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Cover Letter
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">
                  Generate personalized application materials tailored to this role
                </p>
                <button
                  onClick={onGenerateApplication}
                  disabled={isLoadingApplication || !fitAnalysis}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors disabled:opacity-50"
                >
                  {!fitAnalysis ? 'Run Fit Analysis First' : 'Generate Application Materials'}
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
