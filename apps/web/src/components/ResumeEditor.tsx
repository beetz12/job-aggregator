'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

interface ResumeEditorProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
  className?: string
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

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}

function countCharacters(text: string): number {
  return text.length
}

export default function ResumeEditor({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving = false,
  className = '',
}: ResumeEditorProps) {
  const [localValue, setLocalValue] = useState(value)
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync local value with prop when it changes externally
  useEffect(() => {
    setLocalValue(value)
    setHasChanges(false)
  }, [value])

  // Debounced onChange handler
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue)
      setHasChanges(true)

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set new debounced call
      debounceTimeoutRef.current = setTimeout(() => {
        onChange(newValue)
        setLastSaved(new Date())
      }, 500)
    },
    [onChange]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const htmlContent = useMemo(() => parseMarkdownToHtml(localValue), [localValue])
  const wordCount = useMemo(() => countWords(localValue), [localValue])
  const charCount = useMemo(() => countCharacters(localValue), [localValue])

  const handleSave = () => {
    // Ensure final value is synced before saving
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    onChange(localValue)
    onSave()
    setHasChanges(false)
  }

  const handleCancel = () => {
    // Clear any pending changes
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    setLocalValue(value)
    setHasChanges(false)
    onCancel()
  }

  // Format toolbar actions
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = localValue.substring(start, end)
    const newValue =
      localValue.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      localValue.substring(end)

    handleChange(newValue)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Edit Resume</h2>
          {hasChanges && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              Unsaved changes
            </span>
          )}
          {lastSaved && !hasChanges && (
            <span className="text-xs text-gray-500">
              Auto-saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-700 bg-gray-900/50">
        <button
          onClick={() => insertFormatting('**')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Bold (Ctrl+B)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
          </svg>
        </button>
        <button
          onClick={() => insertFormatting('*')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Italic (Ctrl+I)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
          </svg>
        </button>
        <div className="w-px h-6 bg-gray-700 mx-1" />
        <button
          onClick={() => insertFormatting('# ', '')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Heading 1"
        >
          <span className="text-sm font-bold">H1</span>
        </button>
        <button
          onClick={() => insertFormatting('## ', '')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Heading 2"
        >
          <span className="text-sm font-bold">H2</span>
        </button>
        <button
          onClick={() => insertFormatting('### ', '')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Heading 3"
        >
          <span className="text-sm font-bold">H3</span>
        </button>
        <div className="w-px h-6 bg-gray-700 mx-1" />
        <button
          onClick={() => insertFormatting('- ', '')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Bullet List"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => insertFormatting('`')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Inline Code"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
        <button
          onClick={() => insertFormatting('[', '](url)')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      </div>

      {/* Split View: Editor and Preview */}
      <div className="flex-1 flex min-h-0">
        {/* Editor Pane */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="px-4 py-2 bg-gray-900/30 border-b border-gray-700">
            <span className="text-xs text-gray-500 font-medium">MARKDOWN</span>
          </div>
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 w-full p-4 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none placeholder-gray-600"
            placeholder="Write your resume in markdown..."
            spellCheck={false}
          />
        </div>

        {/* Preview Pane */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-gray-900/30 border-b border-gray-700">
            <span className="text-xs text-gray-500 font-medium">PREVIEW</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>

      {/* Footer with stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="text-xs text-gray-500">
          Markdown supported
        </div>
      </div>
    </div>
  )
}
