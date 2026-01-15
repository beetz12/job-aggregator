import { JobCriteria, InterviewAnswers } from './types'

interface GenerateCriteriaInput {
  resumeText: string
  interviewAnswers: InterviewAnswers
  userName?: string
}

/**
 * Known technical keywords for parsing
 */
const TECH_KEYWORDS = [
  // Languages
  'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'c++', 'c#',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'elixir', 'clojure', 'haskell',
  // Frontend
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'material-ui', 'mui',
  // Backend
  'node', 'nodejs', 'express', 'fastify', 'nestjs', 'django', 'flask', 'fastapi',
  'spring', 'rails', 'laravel', 'gin', 'fiber',
  // Databases
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'dynamodb', 'cassandra', 'sqlite', 'oracle', 'sql server',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'kubernetes', 'k8s', 'docker',
  'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab ci', 'circleci',
  // Data & ML
  'machine learning', 'ml', 'ai', 'deep learning', 'tensorflow', 'pytorch',
  'pandas', 'numpy', 'scikit-learn', 'spark', 'hadoop', 'kafka',
  // Mobile
  'react native', 'flutter', 'ios', 'android', 'mobile',
  // Other
  'graphql', 'rest', 'api', 'microservices', 'serverless', 'websockets',
  'agile', 'scrum', 'ci/cd', 'git', 'linux', 'unix',
]

/**
 * Position keywords commonly found in job titles
 */
const POSITION_KEYWORDS = [
  'software engineer', 'senior software engineer', 'staff engineer',
  'principal engineer', 'engineering manager', 'tech lead', 'technical lead',
  'frontend engineer', 'backend engineer', 'fullstack engineer', 'full stack engineer',
  'devops engineer', 'sre', 'site reliability engineer', 'platform engineer',
  'data engineer', 'data scientist', 'ml engineer', 'machine learning engineer',
  'mobile engineer', 'ios engineer', 'android engineer',
  'architect', 'solutions architect', 'software architect',
  'cto', 'vp engineering', 'director of engineering',
]

/**
 * Parse salary/compensation information from natural language
 */
function parseCompensation(answer: string | undefined): JobCriteria['compensation'] {
  const defaultComp: JobCriteria['compensation'] = {
    floor: 100000,
    target: 150000,
    currency: 'USD',
    equity: false,
  }

  if (!answer) return defaultComp

  const lowerAnswer = answer.toLowerCase()

  // Extract numbers (handling k/K notation)
  const numberMatches = answer.match(/\$?\d+(?:,\d{3})*(?:\.\d+)?(?:k|K)?/g) || []
  const numbers = numberMatches
    .map((match) => {
      let num = parseFloat(match.replace(/[$,]/g, ''))
      if (match.toLowerCase().includes('k')) {
        num *= 1000
      }
      return num
    })
    .filter((n) => n > 1000) // Filter out small numbers that likely aren't salaries
    .sort((a, b) => a - b)

  if (numbers.length >= 2) {
    defaultComp.floor = numbers[0]
    defaultComp.target = numbers[numbers.length - 1]
  } else if (numbers.length === 1) {
    // Single number - use as target, set floor at 80%
    defaultComp.target = numbers[0]
    defaultComp.floor = Math.round(numbers[0] * 0.8)
  }

  // Check for equity mentions
  if (
    lowerAnswer.includes('equity') ||
    lowerAnswer.includes('stock') ||
    lowerAnswer.includes('options') ||
    lowerAnswer.includes('shares')
  ) {
    defaultComp.equity = true

    if (lowerAnswer.includes('critical') || lowerAnswer.includes('must have')) {
      defaultComp.equityImportance = 'critical'
    } else if (lowerAnswer.includes('important') || lowerAnswer.includes('prefer')) {
      defaultComp.equityImportance = 'important'
    } else {
      defaultComp.equityImportance = 'nice-to-have'
    }
  }

  // Extract benefits
  const benefitKeywords = [
    '401k', '401(k)', 'health insurance', 'dental', 'vision',
    'pto', 'vacation', 'parental leave', 'remote work', 'flexible hours',
    'professional development', 'education budget', 'home office',
  ]
  const benefits = benefitKeywords.filter((b) => lowerAnswer.includes(b.toLowerCase()))
  if (benefits.length > 0) {
    defaultComp.benefits = benefits
  }

  return defaultComp
}

/**
 * Parse location preferences from natural language
 */
function parseLocation(answer: string | undefined): JobCriteria['location'] {
  const defaultLocation: JobCriteria['location'] = {
    remote: 'flexible',
  }

  if (!answer) return defaultLocation

  const lowerAnswer = answer.toLowerCase()

  // Determine remote preference
  if (
    lowerAnswer.includes('fully remote') ||
    lowerAnswer.includes('100% remote') ||
    lowerAnswer.includes('remote only') ||
    lowerAnswer.includes('must be remote') ||
    lowerAnswer.includes('remote required')
  ) {
    defaultLocation.remote = 'required'
  } else if (
    lowerAnswer.includes('prefer remote') ||
    lowerAnswer.includes('remote preferred') ||
    lowerAnswer.includes('ideally remote')
  ) {
    defaultLocation.remote = 'preferred'
  } else if (
    lowerAnswer.includes('hybrid') ||
    lowerAnswer.includes('flexible') ||
    lowerAnswer.includes('onsite') ||
    lowerAnswer.includes('on-site') ||
    lowerAnswer.includes('office')
  ) {
    defaultLocation.remote = 'flexible'
  }

  // Extract cities/locations (common US cities and tech hubs)
  const cityPatterns = [
    'san francisco', 'sf', 'bay area', 'silicon valley',
    'new york', 'nyc', 'new york city',
    'seattle', 'austin', 'denver', 'boston', 'los angeles', 'la',
    'chicago', 'miami', 'atlanta', 'portland', 'san diego',
    'london', 'berlin', 'toronto', 'vancouver', 'amsterdam',
  ]

  const foundLocations = cityPatterns.filter((city) => lowerAnswer.includes(city))
  if (foundLocations.length > 0) {
    // Capitalize properly
    defaultLocation.preferredLocations = foundLocations.map((loc) =>
      loc
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
  }

  // Extract timezone preferences
  const timezonePatterns = [
    { pattern: /pst|pacific/i, tz: 'Pacific Time (PST/PDT)' },
    { pattern: /est|eastern/i, tz: 'Eastern Time (EST/EDT)' },
    { pattern: /cst|central/i, tz: 'Central Time (CST/CDT)' },
    { pattern: /mst|mountain/i, tz: 'Mountain Time (MST/MDT)' },
    { pattern: /gmt|utc/i, tz: 'GMT/UTC' },
    { pattern: /cet|central european/i, tz: 'Central European Time (CET)' },
  ]

  for (const { pattern, tz } of timezonePatterns) {
    if (pattern.test(answer)) {
      defaultLocation.timezonePreference = tz
      break
    }
  }

  return defaultLocation
}

/**
 * Parse culture and values from natural language
 */
function parseCulture(answer: string | undefined): JobCriteria['culture'] {
  const defaultCulture: JobCriteria['culture'] = {
    values: [],
    redFlags: [],
  }

  if (!answer) {
    // Provide sensible defaults
    defaultCulture.values = ['Work-life balance', 'Continuous learning', 'Collaboration']
    defaultCulture.redFlags = ['Micromanagement', 'Unrealistic deadlines']
    return defaultCulture
  }

  const lowerAnswer = answer.toLowerCase()

  // Common values/positive keywords
  const valueKeywords = [
    { keywords: ['work-life balance', 'work life balance', 'balance'], value: 'Work-life balance' },
    { keywords: ['learning', 'growth', 'development'], value: 'Continuous learning' },
    { keywords: ['collaboration', 'teamwork', 'team'], value: 'Collaboration' },
    { keywords: ['autonomy', 'independence', 'ownership'], value: 'Autonomy' },
    { keywords: ['innovation', 'innovative', 'cutting edge'], value: 'Innovation' },
    { keywords: ['transparency', 'open', 'honest'], value: 'Transparency' },
    { keywords: ['diversity', 'inclusion', 'inclusive'], value: 'Diversity & Inclusion' },
    { keywords: ['mentorship', 'mentor'], value: 'Mentorship' },
    { keywords: ['impact', 'meaningful', 'purpose'], value: 'Meaningful impact' },
    { keywords: ['flexibility', 'flexible'], value: 'Flexibility' },
  ]

  for (const { keywords, value } of valueKeywords) {
    if (keywords.some((kw) => lowerAnswer.includes(kw))) {
      defaultCulture.values.push(value)
    }
  }

  // Common red flags
  const redFlagKeywords = [
    { keywords: ['micromanagement', 'micromanage'], flag: 'Micromanagement' },
    { keywords: ['crunch', 'overtime', 'long hours'], flag: 'Mandatory overtime/crunch' },
    { keywords: ['toxic', 'politics'], flag: 'Toxic environment' },
    { keywords: ['no remote', 'office only'], flag: 'No remote flexibility' },
    { keywords: ['unclear', 'ambiguous', 'chaotic'], flag: 'Unclear expectations' },
    { keywords: ['burnout', 'stress'], flag: 'Burnout culture' },
    { keywords: ['legacy', 'outdated', 'old tech'], flag: 'Outdated technology' },
  ]

  for (const { keywords, flag } of redFlagKeywords) {
    if (keywords.some((kw) => lowerAnswer.includes(kw))) {
      defaultCulture.redFlags.push(flag)
    }
  }

  // Work style
  if (lowerAnswer.includes('async') || lowerAnswer.includes('asynchronous')) {
    defaultCulture.workStyle = 'async'
  } else if (lowerAnswer.includes('sync') || lowerAnswer.includes('real-time')) {
    defaultCulture.workStyle = 'sync'
  } else if (lowerAnswer.includes('hybrid') || lowerAnswer.includes('mix')) {
    defaultCulture.workStyle = 'hybrid'
  }

  // Team size
  if (lowerAnswer.includes('small team') || lowerAnswer.includes('startup')) {
    defaultCulture.teamSize = 'small'
  } else if (lowerAnswer.includes('medium') || lowerAnswer.includes('mid-size')) {
    defaultCulture.teamSize = 'medium'
  } else if (lowerAnswer.includes('large') || lowerAnswer.includes('enterprise')) {
    defaultCulture.teamSize = 'large'
  }

  // Provide defaults if nothing was extracted
  if (defaultCulture.values.length === 0) {
    defaultCulture.values = ['Work-life balance', 'Continuous learning']
  }
  if (defaultCulture.redFlags.length === 0) {
    defaultCulture.redFlags = ['Micromanagement']
  }

  return defaultCulture
}

/**
 * Parse technical stack requirements from natural language
 */
function parseTechnical(answer: string | undefined): JobCriteria['technicalStack'] {
  const defaultTech: JobCriteria['technicalStack'] = {
    mustHave: [],
    niceToHave: [],
  }

  if (!answer) return defaultTech

  const lowerAnswer = answer.toLowerCase()

  // Find all mentioned technologies
  const foundTech = TECH_KEYWORDS.filter((tech) => lowerAnswer.includes(tech.toLowerCase()))

  // Try to categorize by context
  const mustHavePatterns = ['must', 'require', 'need', 'essential', 'primary', 'main', 'core']
  const niceToHavePatterns = ['nice to have', 'prefer', 'bonus', 'plus', 'optional', 'ideally']
  const avoidPatterns = ['avoid', "don't want", 'not interested', 'no', 'dislike']

  // Simple heuristic: first half of mentioned tech goes to must-have
  // second half goes to nice-to-have (if not explicitly categorized)
  const midpoint = Math.ceil(foundTech.length / 2)

  foundTech.forEach((tech, index) => {
    const techLower = tech.toLowerCase()

    // Check if explicitly mentioned in context
    const techIndex = lowerAnswer.indexOf(techLower)
    const contextBefore = lowerAnswer.substring(Math.max(0, techIndex - 50), techIndex)
    const contextAfter = lowerAnswer.substring(techIndex, Math.min(lowerAnswer.length, techIndex + 50))
    const context = contextBefore + contextAfter

    if (avoidPatterns.some((p) => context.includes(p))) {
      if (!defaultTech.avoid) defaultTech.avoid = []
      defaultTech.avoid.push(tech)
    } else if (mustHavePatterns.some((p) => context.includes(p))) {
      defaultTech.mustHave.push(tech)
    } else if (niceToHavePatterns.some((p) => context.includes(p))) {
      defaultTech.niceToHave.push(tech)
    } else {
      // Default categorization based on position
      if (index < midpoint) {
        defaultTech.mustHave.push(tech)
      } else {
        defaultTech.niceToHave.push(tech)
      }
    }
  })

  // Capitalize tech names properly
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  defaultTech.mustHave = defaultTech.mustHave.map(capitalize)
  defaultTech.niceToHave = defaultTech.niceToHave.map(capitalize)
  if (defaultTech.avoid) {
    defaultTech.avoid = defaultTech.avoid.map(capitalize)
  }

  // Extract domains if mentioned
  const domainKeywords = [
    'fintech', 'healthtech', 'edtech', 'e-commerce', 'ecommerce',
    'saas', 'b2b', 'b2c', 'enterprise', 'consumer', 'gaming',
    'social', 'media', 'ai/ml', 'devtools', 'infrastructure',
    'cybersecurity', 'blockchain', 'crypto', 'web3',
  ]

  const foundDomains = domainKeywords.filter((d) => lowerAnswer.includes(d))
  if (foundDomains.length > 0) {
    defaultTech.domains = foundDomains.map((d) =>
      d
        .split(/[-/]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('/')
    )
  }

  return defaultTech
}

/**
 * Parse company stage preference
 */
function parseCompanyStage(
  answer: string | undefined
): JobCriteria['companyStage'] {
  if (!answer) return 'any'

  const lowerAnswer = answer.toLowerCase()

  if (
    lowerAnswer.includes('startup') ||
    lowerAnswer.includes('early stage') ||
    lowerAnswer.includes('seed') ||
    lowerAnswer.includes('series a')
  ) {
    return 'startup'
  }

  if (
    lowerAnswer.includes('growth') ||
    lowerAnswer.includes('series b') ||
    lowerAnswer.includes('series c') ||
    lowerAnswer.includes('scale')
  ) {
    return 'growth'
  }

  if (
    lowerAnswer.includes('enterprise') ||
    lowerAnswer.includes('large company') ||
    lowerAnswer.includes('established') ||
    lowerAnswer.includes('public') ||
    lowerAnswer.includes('fortune')
  ) {
    return 'enterprise'
  }

  return 'any'
}

/**
 * Extract target positions from resume text
 */
function extractTargetPositions(resumeText: string): string[] {
  if (!resumeText) return ['Software Engineer']

  const lowerResume = resumeText.toLowerCase()

  // Find matching position keywords
  const foundPositions = POSITION_KEYWORDS.filter((pos) =>
    lowerResume.includes(pos.toLowerCase())
  )

  if (foundPositions.length === 0) {
    return ['Software Engineer']
  }

  // Capitalize properly and dedupe
  const uniquePositions = [...new Set(foundPositions)]
    .map((pos) =>
      pos
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .slice(0, 5) // Limit to 5 positions

  return uniquePositions
}

/**
 * Generate executive summary from all inputs
 */
function generateSummary(input: GenerateCriteriaInput): string {
  const { resumeText, interviewAnswers, userName } = input

  const name = userName || 'This candidate'

  // Extract key info
  const compensation = parseCompensation(interviewAnswers.compensation)
  const location = parseLocation(interviewAnswers.location)
  const technical = parseTechnical(interviewAnswers.technical)
  const companyStage = parseCompanyStage(interviewAnswers.company_stage)

  // Build summary
  const parts: string[] = []

  parts.push(
    `${name} is seeking a ${companyStage === 'any' ? '' : companyStage + ' stage '}technology role`
  )

  if (technical.mustHave.length > 0) {
    parts.push(`with expertise in ${technical.mustHave.slice(0, 3).join(', ')}`)
  }

  parts.push(
    `. Target compensation range is ${formatCurrency(compensation.floor)} to ${formatCurrency(compensation.target)}`
  )

  if (location.remote === 'required') {
    parts.push(', with fully remote work being essential')
  } else if (location.remote === 'preferred') {
    parts.push(', preferring remote work arrangements')
  }

  if (location.preferredLocations && location.preferredLocations.length > 0) {
    parts.push(` (${location.preferredLocations.slice(0, 2).join(', ')})`)
  }

  parts.push('.')

  // Add custom summary from interview if available
  if (interviewAnswers.summary) {
    parts.push(` ${interviewAnswers.summary}`)
  }

  return parts.join('')
}

/**
 * Format currency for summary
 */
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`
  }
  return `$${amount}`
}

/**
 * Main function to generate job criteria from resume and interview answers
 */
export function generateJobCriteria(input: GenerateCriteriaInput): JobCriteria {
  const { resumeText, interviewAnswers, userName } = input

  return {
    name: userName || 'Job Seeker',
    lastUpdated: new Date().toISOString(),
    executiveSummary: generateSummary(input),
    compensation: parseCompensation(interviewAnswers.compensation),
    location: parseLocation(interviewAnswers.location),
    culture: parseCulture(interviewAnswers.culture),
    technicalStack: parseTechnical(interviewAnswers.technical),
    companyStage: parseCompanyStage(interviewAnswers.company_stage),
    targetPositions: extractTargetPositions(resumeText),
  }
}

/**
 * Merge existing criteria with new interview answers
 * Useful for partial updates
 */
export function updateJobCriteria(
  existingCriteria: JobCriteria,
  updates: Partial<InterviewAnswers>,
  resumeText?: string
): JobCriteria {
  const newCriteria = { ...existingCriteria }
  newCriteria.lastUpdated = new Date().toISOString()

  if (updates.compensation) {
    newCriteria.compensation = parseCompensation(updates.compensation)
  }

  if (updates.location) {
    newCriteria.location = parseLocation(updates.location)
  }

  if (updates.culture) {
    newCriteria.culture = parseCulture(updates.culture)
  }

  if (updates.technical) {
    newCriteria.technicalStack = parseTechnical(updates.technical)
  }

  if (updates.company_stage) {
    newCriteria.companyStage = parseCompanyStage(updates.company_stage)
  }

  if (resumeText) {
    newCriteria.targetPositions = extractTargetPositions(resumeText)
  }

  return newCriteria
}
