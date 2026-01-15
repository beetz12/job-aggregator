'use client'

import { useMemo } from 'react'

interface ResumeViewerProps {
  markdown: string
  highlightedSkills?: string[]
  atsScore?: number
  onEdit?: () => void
  className?: string
}

function getAtsScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500 text-white'
  if (score >= 60) return 'bg-blue-500 text-white'
  if (score >= 40) return 'bg-yellow-500 text-black'
  return 'bg-red-500 text-white'
}

function parseMarkdownToHtml(markdown: string): string {
  let html = markdown
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold"><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-700 text-blue-300 px-1 py-0.5 rounded text-sm">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-gray-700 my-4" />')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 text-gray-300">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-gray-300 list-decimal">$1</li>')
    // Paragraphs (lines with content that aren't already wrapped)
    .replace(/^(?!<[hla-z]|<li|<hr)(.+)$/gm, '<p class="text-gray-300 mb-2">$1</p>')
    // Wrap consecutive li elements in ul
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
      if (match.includes('list-decimal')) {
        return `<ol class="list-decimal list-inside space-y-1 mb-3">${match}</ol>`
      }
      return `<ul class="list-disc list-inside space-y-1 mb-3">${match}</ul>`
    })
    // Clean up empty paragraphs
    .replace(/<p class="[^"]*"><\/p>/g, '')
    // Add spacing between sections
    .replace(/<\/ul>\n?<h/g, '</ul>\n\n<h')
    .replace(/<\/ol>\n?<h/g, '</ol>\n\n<h')

  return html
}

export default function ResumeViewer({
  markdown,
  highlightedSkills = [],
  atsScore,
  onEdit,
  className = '',
}: ResumeViewerProps) {
  const htmlContent = useMemo(() => parseMarkdownToHtml(markdown), [markdown])

  const handleDownloadPdf = () => {
    // Placeholder for PDF download functionality
    alert('PDF download feature coming soon!')
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Resume</h2>
          {atsScore !== undefined && (
            <span className={`${getAtsScoreColor(atsScore)} text-sm font-bold px-3 py-1 rounded-full`}>
              ATS Score: {atsScore}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyToClipboard}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
            title="Copy to clipboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Highlighted Skills */}
      {highlightedSkills.length > 0 && (
        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Highlighted Skills</h3>
          <div className="flex flex-wrap gap-2">
            {highlightedSkills.map((skill, index) => (
              <span
                key={index}
                className="bg-blue-900/50 text-blue-300 text-sm px-3 py-1 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resume Content */}
      <div className="p-6 overflow-y-auto max-h-[600px]">
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  )
}
