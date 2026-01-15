/**
 * Formats plain text job descriptions into readable markdown
 * Handles common patterns found in job postings
 */
export function formatJobDescription(text: string | null | undefined): string {
  if (!text) return ''

  let formatted = text

  // Normalize line endings
  formatted = formatted.replace(/\r\n/g, '\n')

  // Convert multiple spaces to single space (but preserve newlines)
  formatted = formatted.replace(/[^\S\n]+/g, ' ')

  // Detect and format section headers (lines in ALL CAPS or ending with :)
  // Match lines that are mostly uppercase (allow some lowercase for things like "WHAT WE'RE LOOKING FOR")
  formatted = formatted.replace(/^([A-Z][A-Z\s']{2,}):?\s*$/gm, '\n## $1\n')

  // Match title-case headers ending with colon (e.g., "Requirements:", "About Us:")
  formatted = formatted.replace(/^([A-Za-z][^:\n]{2,50}):$/gm, '\n### $1\n')

  // Convert common bullet point characters to markdown lists
  // Handles: -, *, bullet, arrow, and indented versions
  formatted = formatted.replace(/^[\s]*[-*\u2022\u25CF\u25E6\u2023>\u2043]\s+/gm, '- ')

  // Convert numbered lists (1. or 1) formats)
  formatted = formatted.replace(/^[\s]*(\d+)[.)]\s+/gm, '$1. ')

  // Convert letter lists (a. or a) formats) to bullet points
  formatted = formatted.replace(/^[\s]*[a-zA-Z][.)]\s+/gm, '- ')

  // Handle common section markers that aren't headers
  // "About the role", "What you'll do", etc.
  formatted = formatted.replace(
    /^(About (?:the |this )?(?:role|position|job|company|us)|What (?:you'll|we) (?:do|offer|need|expect)|Your (?:responsibilities|role|mission)|(?:Key |Core )?(?:Responsibilities|Requirements|Qualifications|Benefits|Perks)|Nice to have|Must have|Who (?:you are|we're looking for))[\s:]*$/gim,
    '\n### $1\n'
  )

  // Add paragraph breaks for multiple consecutive newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n')

  // Ensure proper spacing around headers (header should have blank line after)
  formatted = formatted.replace(/\n(##+ .+)\n(?!\n)/g, '\n$1\n\n')

  // Ensure headers have blank line before them (but not at start of text)
  formatted = formatted.replace(/([^\n])\n(##+ )/g, '$1\n\n$2')

  // Bold common emphasis patterns like **text** or __text__ (preserve existing)
  // Also convert ALL CAPS words in the middle of sentences to bold (if 3+ chars)
  formatted = formatted.replace(/\b([A-Z]{3,})\b(?![:\n])/g, (match, word) => {
    // Don't bold common acronyms that should stay as-is
    const commonAcronyms = ['API', 'CSS', 'HTML', 'SQL', 'AWS', 'GCP', 'CEO', 'CTO', 'USA', 'UK', 'EU', 'REST', 'SDK', 'CLI', 'IDE', 'JSON', 'XML', 'HTTP', 'HTTPS', 'SaaS', 'B2B', 'B2C']
    if (commonAcronyms.includes(word)) {
      return word
    }
    return `**${word.charAt(0)}${word.slice(1).toLowerCase()}**`
  })

  // Clean up excessive whitespace at start and end
  formatted = formatted.trim()

  // Ensure the text doesn't start with excessive newlines
  formatted = formatted.replace(/^\n+/, '')

  return formatted
}

/**
 * Extracts a plain text summary from a job description
 * Useful for previews and cards
 */
export function extractDescriptionSummary(
  text: string | null | undefined,
  maxLength: number = 200
): string {
  if (!text) return ''

  // Remove markdown formatting
  let plain = text
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // Remove bold/italic
    .replace(/[-*]\s+/g, '') // Remove list markers
    .replace(/\d+\.\s+/g, '') // Remove numbered list markers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()

  if (plain.length <= maxLength) {
    return plain
  }

  // Truncate at word boundary
  const truncated = plain.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  return (lastSpace > maxLength * 0.8 ? truncated.slice(0, lastSpace) : truncated) + '...'
}
