/**
 * Enhanced Text Normalization for Job Deduplication
 *
 * Provides specialized normalization functions to improve deduplication accuracy
 * by handling common variations in job titles, company names, and locations.
 */

/**
 * Common job title level indicators that should be removed for matching
 */
const LEVEL_PATTERNS = [
  // Senior/Junior patterns
  /\b(sr\.?|senior|snr\.?)\b/gi,
  /\b(jr\.?|junior|jnr\.?)\b/gi,
  /\b(mid-?level|mid)\b/gi,
  /\b(entry-?level|entry)\b/gi,
  /\b(lead|principal|staff)\b/gi,

  // Roman numerals and levels
  /\b(i{1,3}|iv|v|vi{0,3})\b/gi, // I, II, III, IV, V, VI, VII
  /\b(level\s*[1-5]|l[1-5])\b/gi,
  /\b([1-5])\b/g, // Single digits often used as levels
]

/**
 * Common company suffixes to remove for matching
 */
const COMPANY_SUFFIXES = [
  /\b(inc\.?|incorporated)\b/gi,
  /\b(llc\.?|l\.l\.c\.?)\b/gi,
  /\b(ltd\.?|limited)\b/gi,
  /\b(corp\.?|corporation)\b/gi,
  /\b(co\.?|company)\b/gi,
  /\b(plc\.?)\b/gi,
  /\b(gmbh)\b/gi,
  /\b(ag)\b/gi,
  /\b(s\.?a\.?|sa)\b/gi,
  /\b(b\.?v\.?|bv)\b/gi,
  /\b(n\.?v\.?|nv)\b/gi,
  /\b(pty\.?\s*ltd\.?)\b/gi,
  /\b(holdings?)\b/gi,
  /\b(group)\b/gi,
  /\b(technologies|technology|tech)\b/gi,
  /\b(solutions?)\b/gi,
  /\b(services?)\b/gi,
  /\b(systems?)\b/gi,
  /\b(software)\b/gi,
  /\b(labs?|laboratories)\b/gi,
]

/**
 * Common title term standardizations
 */
const TITLE_STANDARDIZATIONS: [RegExp, string][] = [
  [/\b(software\s*)?engineer(ing)?\b/gi, 'engineer'],
  [/\b(software\s*)?developer\b/gi, 'developer'],
  [/\bswe\b/gi, 'engineer'],
  [/\bsde\b/gi, 'engineer'],
  [/\bdev\b/gi, 'developer'],
  [/\bprogrammer\b/gi, 'developer'],
  [/\bfront[\s-]?end\b/gi, 'frontend'],
  [/\bback[\s-]?end\b/gi, 'backend'],
  [/\bfull[\s-]?stack\b/gi, 'fullstack'],
  [/\bdevops\b/gi, 'devops'],
  [/\bui\s*\/?\s*ux\b/gi, 'uiux'],
  [/\bux\s*\/?\s*ui\b/gi, 'uiux'],
  [/\bqa\b/gi, 'qa'],
  [/\bquality\s*assurance\b/gi, 'qa'],
  [/\bml\b/gi, 'machine learning'],
  [/\bai\b/gi, 'ai'],
  [/\bartificial\s*intelligence\b/gi, 'ai'],
  [/\bdata\s*scientist?\b/gi, 'data science'],
  [/\bproduct\s*manager?\b/gi, 'product manager'],
  [/\bpm\b/gi, 'pm'],
  [/\bproject\s*manager?\b/gi, 'project manager'],
  [/\bscrum\s*master\b/gi, 'scrum master'],
  [/\btech\s*lead\b/gi, 'tech lead'],
  [/\btechnical\s*lead\b/gi, 'tech lead'],
  [/\bengineering\s*manager\b/gi, 'engineering manager'],
  [/\beng\.?\s*manager\b/gi, 'engineering manager'],
]

/**
 * US state abbreviation to full name mapping
 */
const US_STATES: Record<string, string> = {
  al: 'alabama',
  ak: 'alaska',
  az: 'arizona',
  ar: 'arkansas',
  ca: 'california',
  co: 'colorado',
  ct: 'connecticut',
  de: 'delaware',
  fl: 'florida',
  ga: 'georgia',
  hi: 'hawaii',
  id: 'idaho',
  il: 'illinois',
  in: 'indiana',
  ia: 'iowa',
  ks: 'kansas',
  ky: 'kentucky',
  la: 'louisiana',
  me: 'maine',
  md: 'maryland',
  ma: 'massachusetts',
  mi: 'michigan',
  mn: 'minnesota',
  ms: 'mississippi',
  mo: 'missouri',
  mt: 'montana',
  ne: 'nebraska',
  nv: 'nevada',
  nh: 'new hampshire',
  nj: 'new jersey',
  nm: 'new mexico',
  ny: 'new york',
  nc: 'north carolina',
  nd: 'north dakota',
  oh: 'ohio',
  ok: 'oklahoma',
  or: 'oregon',
  pa: 'pennsylvania',
  ri: 'rhode island',
  sc: 'south carolina',
  sd: 'south dakota',
  tn: 'tennessee',
  tx: 'texas',
  ut: 'utah',
  vt: 'vermont',
  va: 'virginia',
  wa: 'washington',
  wv: 'west virginia',
  wi: 'wisconsin',
  wy: 'wyoming',
  dc: 'washington dc',
}

/**
 * Normalize general text
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove special characters (keep alphanumeric, spaces, hyphens)
 *
 * @param text - The text to normalize
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  if (!text) return ''

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim()
}

/**
 * Normalize job title for deduplication
 * - Applies general normalization
 * - Removes level indicators (Sr, Jr, I, II, III, etc.)
 * - Standardizes common terms (e.g., "SWE" -> "engineer")
 *
 * @param title - The job title to normalize
 * @returns Normalized job title
 */
export function normalizeTitle(title: string): string {
  if (!title) return ''

  let normalized = normalizeText(title)

  // Remove level patterns
  for (const pattern of LEVEL_PATTERNS) {
    normalized = normalized.replace(pattern, ' ')
  }

  // Standardize common terms
  for (const [pattern, replacement] of TITLE_STANDARDIZATIONS) {
    normalized = normalized.replace(pattern, replacement)
  }

  // Clean up extra spaces
  return normalized.replace(/\s+/g, ' ').trim()
}

/**
 * Normalize company name for deduplication
 * - Applies general normalization
 * - Removes common suffixes (Inc, LLC, Corp, etc.)
 * - Removes "The" prefix
 *
 * @param company - The company name to normalize
 * @returns Normalized company name
 */
export function normalizeCompany(company: string): string {
  if (!company) return ''

  let normalized = normalizeText(company)

  // Remove "The" prefix
  normalized = normalized.replace(/^the\s+/i, '')

  // Remove company suffixes
  for (const pattern of COMPANY_SUFFIXES) {
    normalized = normalized.replace(pattern, ' ')
  }

  // Clean up extra spaces
  return normalized.replace(/\s+/g, ' ').trim()
}

/**
 * Normalize location for deduplication
 * - Applies general normalization
 * - Expands US state abbreviations
 * - Standardizes common location patterns
 * - Handles remote indicators
 *
 * @param location - The location to normalize
 * @returns Normalized location
 */
export function normalizeLocation(location: string): string {
  if (!location) return ''

  let normalized = normalizeText(location)

  // Handle common remote variations
  if (/\b(remote|anywhere|distributed|work\s*from\s*home|wfh)\b/i.test(normalized)) {
    // Keep other location info but add standardized remote flag
    normalized = normalized.replace(
      /\b(remote|anywhere|distributed|work\s*from\s*home|wfh)\b/gi,
      'remote'
    )
  }

  // Expand US state abbreviations (when they appear as standalone words)
  for (const [abbr, full] of Object.entries(US_STATES)) {
    const pattern = new RegExp(`\\b${abbr}\\b`, 'gi')
    normalized = normalized.replace(pattern, full)
  }

  // Standardize common separators
  normalized = normalized.replace(/[,/|]/g, ' ')

  // Remove common prefixes
  normalized = normalized.replace(/\b(located\s*(in|at)?|based\s*(in|at)?)\b/gi, '')

  // Clean up extra spaces
  return normalized.replace(/\s+/g, ' ').trim()
}

/**
 * Extract core location (city/region) from a full location string
 * Useful for fuzzy matching where exact match isn't needed
 *
 * @param location - The full location string
 * @returns Core location identifier
 */
export function extractCoreLocation(location: string): string {
  if (!location) return ''

  const normalized = normalizeLocation(location)

  // Split by spaces and take first meaningful parts (typically city)
  const parts = normalized.split(' ').filter((p) => p.length > 2)

  // Return first 2-3 meaningful parts (typically city name)
  return parts.slice(0, 3).join(' ')
}
