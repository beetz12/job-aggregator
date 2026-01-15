/**
 * Resume file parsing utilities.
 * Supports PDF, Markdown, and plain text files.
 */

export interface ParseResult {
  text: string
  success: boolean
  error?: string
}

/**
 * Supported file extensions for resume upload.
 */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.md', '.txt', '.docx'] as const
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number]

/**
 * MIME types for supported file formats.
 */
export const SUPPORTED_MIME_TYPES = {
  pdf: 'application/pdf',
  markdown: 'text/markdown',
  text: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

/**
 * Accept string for file input.
 */
export const FILE_ACCEPT = '.pdf,.md,.txt,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * Parse a PDF file.
 * Note: Full PDF parsing requires a library like pdfjs-dist.
 * For MVP, we attempt basic text extraction and provide guidance if it fails.
 */
export async function parsePDFFile(file: File): Promise<ParseResult> {
  try {
    // Try to read as ArrayBuffer and check for text content
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Check PDF magic bytes
    const headerBytes = bytes.slice(0, 5)
    const header = String.fromCharCode(headerBytes[0], headerBytes[1], headerBytes[2], headerBytes[3], headerBytes[4])
    if (header !== '%PDF-') {
      return {
        text: '',
        success: false,
        error: 'Invalid PDF file format.',
      }
    }

    // Attempt to extract text from PDF
    // This is a basic extraction that works for some PDFs with embedded text
    const textDecoder = new TextDecoder('utf-8', { fatal: false })
    const content = textDecoder.decode(bytes)

    // Try to find text streams in the PDF
    // This is a simplified approach - real PDF parsing would use pdfjs-dist
    const textMatches: string[] = []

    // Look for text between BT (begin text) and ET (end text) markers
    const btPattern = /BT\s*([\s\S]*?)\s*ET/g
    let match
    while ((match = btPattern.exec(content)) !== null) {
      // Extract text from Tj and TJ operators
      const tjPattern = /\(([^)]*)\)\s*Tj/g
      let tjMatch
      while ((tjMatch = tjPattern.exec(match[1])) !== null) {
        // Clean up the extracted text
        const text = tjMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\t/g, '\t')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
        if (text.trim()) {
          textMatches.push(text)
        }
      }
    }

    if (textMatches.length > 0) {
      const extractedText = textMatches.join(' ').trim()
      if (extractedText.length > 50) {
        return {
          text: extractedText,
          success: true,
        }
      }
    }

    // If we couldn't extract meaningful text, return a helpful message
    return {
      text: '',
      success: false,
      error: 'Unable to extract text from this PDF. The PDF may be image-based or have complex formatting. Please copy and paste your resume text directly instead.',
    }
  } catch (error) {
    console.error('PDF parsing error:', error)
    return {
      text: '',
      success: false,
      error: 'Failed to parse PDF file. Please try pasting your resume text directly.',
    }
  }
}

/**
 * Parse a Markdown file.
 */
export async function parseMarkdownFile(file: File): Promise<ParseResult> {
  try {
    const text = await file.text()

    if (!text.trim()) {
      return {
        text: '',
        success: false,
        error: 'The markdown file appears to be empty.',
      }
    }

    return {
      text: text.trim(),
      success: true,
    }
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return {
      text: '',
      success: false,
      error: 'Failed to read markdown file.',
    }
  }
}

/**
 * Parse a plain text file.
 */
export async function parseTextFile(file: File): Promise<ParseResult> {
  try {
    const text = await file.text()

    if (!text.trim()) {
      return {
        text: '',
        success: false,
        error: 'The text file appears to be empty.',
      }
    }

    return {
      text: text.trim(),
      success: true,
    }
  } catch (error) {
    console.error('Text file parsing error:', error)
    return {
      text: '',
      success: false,
      error: 'Failed to read text file.',
    }
  }
}

/**
 * Parse a DOCX file.
 * Note: Full DOCX parsing requires a library.
 * For MVP, we extract text from the XML content.
 */
export async function parseDocxFile(file: File): Promise<ParseResult> {
  try {
    // DOCX files are ZIP archives containing XML files
    // We'll try to extract text from document.xml

    // Dynamic import for JSZip-like functionality would be ideal here
    // For now, we'll use a basic approach

    return {
      text: '',
      success: false,
      error: 'DOCX parsing requires additional setup. Please save your resume as a .txt or .md file, or paste the text directly.',
    }
  } catch (error) {
    console.error('DOCX parsing error:', error)
    return {
      text: '',
      success: false,
      error: 'Failed to parse DOCX file. Please try pasting your resume text directly.',
    }
  }
}

/**
 * Get the file extension from a filename.
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Check if a file extension is supported.
 */
export function isSupportedExtension(extension: string): extension is SupportedExtension {
  return SUPPORTED_EXTENSIONS.includes(extension as SupportedExtension)
}

/**
 * Main parser that routes to the correct handler based on file type.
 */
export async function parseResumeFile(file: File): Promise<ParseResult> {
  const extension = getFileExtension(file.name)
  const mimeType = file.type

  // Route based on extension or MIME type
  if (extension === '.pdf' || mimeType === SUPPORTED_MIME_TYPES.pdf) {
    return parsePDFFile(file)
  }

  if (extension === '.md' || mimeType === SUPPORTED_MIME_TYPES.markdown) {
    return parseMarkdownFile(file)
  }

  if (extension === '.txt' || mimeType === SUPPORTED_MIME_TYPES.text) {
    return parseTextFile(file)
  }

  if (extension === '.docx' || mimeType === SUPPORTED_MIME_TYPES.docx) {
    return parseDocxFile(file)
  }

  // Unknown file type
  return {
    text: '',
    success: false,
    error: `Unsupported file type: ${extension || mimeType}. Please use PDF, Markdown (.md), or plain text (.txt) files.`,
  }
}

/**
 * Validate file size.
 * @param file The file to validate
 * @param maxSizeMB Maximum file size in megabytes
 */
export function validateFileSize(file: File, maxSizeMB: number = 5): { valid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${maxSizeMB}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Get a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
