import type {
  MatchReport,
  ApplicationKit,
  ApplicationResponse,
  MatchIntent,
  UserProfile,
  FitScore,
  MatchAnalysis,
  ParsedRequirements,
  CompanyInsights,
  RecruiterEmail,
  JobCriteria,
  CriteriaMatch,
  ShouldApply,
  CompensationCriteria,
  LocationCriteria,
  CultureCriteria,
  TechnicalStackCriteria
} from '../../types/job-matching'
import type { Job } from '../../types/job'

/**
 * Job Matching Orchestrator
 *
 * Lightweight coordinator for the 2-agent architecture:
 * - Analysis Agent: Evaluates job fit (job-analysis, company-evaluation, profile-matching, fit-scoring)
 * - Generation Agent: Creates application materials (resume, cover letter, Q&A, recruiter response)
 *
 * This is a stub implementation that will be replaced with actual Anthropic API calls
 * when the agents package is fully implemented.
 */

interface MatchJobsOptions {
  user: UserProfile
  jobs: Job[]
  intent: MatchIntent
  recruiterMessage?: string
  applicationQuestions?: string[]
}

/**
 * Process job matching request
 * Routes to appropriate agents based on intent
 */
export async function matchJobs(options: MatchJobsOptions): Promise<ApplicationResponse> {
  const { user, jobs, intent, recruiterMessage, applicationQuestions } = options
  const now = new Date().toISOString()

  const results = await Promise.all(
    jobs.map(async (job) => {
      // Step 1: Run Analysis (always)
      const matchReport = await analyzeJob(job, user, now)

      // Step 2: Generate materials if needed
      let applicationKit: ApplicationKit | undefined
      if (intent !== 'check_fit' && matchReport.fitScore.composite >= 50) {
        applicationKit = await generateMaterials({
          job,
          user,
          matchReport,
          intent,
          recruiterMessage,
          applicationQuestions,
          now
        })
      }

      // Step 3: Generate recommendations and next steps
      const recommendations = generateRecommendations(matchReport)
      const nextSteps = generateNextSteps(intent, matchReport, !!applicationKit)

      return {
        jobId: job.id,
        matchReport,
        applicationKit,
        recommendations,
        nextSteps
      }
    })
  )

  // Summarize
  const strongMatches = results.filter(r =>
    r.matchReport.fitScore.recommendation === 'STRONG_APPLY'
  ).length

  const applicationsGenerated = results.filter(r =>
    r.applicationKit !== undefined
  ).length

  return {
    results,
    summary: {
      totalJobs: jobs.length,
      strongMatches,
      applicationsGenerated
    }
  }
}

/**
 * Analyze a single job for fit
 * Stub implementation - will call Analysis Agent
 */
async function analyzeJob(job: Job, user: UserProfile, now: string): Promise<MatchReport> {
  // Extract tech stack from description
  const techStack = extractTechStack(job.description)

  // Detect experience level from title
  const experienceLevel = detectExperienceLevel(job.title, job.description)

  // Detect red flags
  const redFlags = detectRedFlags(job.description)

  // Calculate skill matches
  const skillMatches = calculateSkillMatches(user.skills, techStack)

  // Calculate fit score
  const fitScore = calculateFitScore(skillMatches, user, job)

  return {
    jobId: job.id,
    userId: user.id,
    parsedRequirements: {
      mustHave: techStack.slice(0, 5),
      niceToHave: techStack.slice(5),
      techStack,
      experienceLevel,
      responsibilities: extractResponsibilities(job.description),
      redFlags
    },
    companyInsights: {
      overallScore: 75,
      scores: {
        compensation: 15,
        culture: 18,
        familyFriendliness: 14,
        technicalFit: 12,
        industry: 8,
        longTermPotential: 8
      },
      greenFlags: job.remote ? ['Remote-friendly'] : [],
      redFlags,
      recentNews: [],
      recommendation: fitScore.composite >= 70 ? 'YES' : 'MAYBE'
    },
    matchAnalysis: {
      overallMatch: skillMatches.overallMatch,
      strongMatches: skillMatches.strong,
      partialMatches: skillMatches.partial,
      gaps: skillMatches.gaps,
      transferableSkills: []
    },
    fitScore,
    talkingPoints: generateTalkingPoints(skillMatches, job),
    gapsToAddress: skillMatches.gaps.slice(0, 3),
    interviewQuestions: [
      `Tell me about your experience with ${techStack[0] || 'this technology stack'}`,
      `Why are you interested in ${job.company}?`,
      'What are your career goals?'
    ],
    created_at: now
  }
}

/**
 * Generate application materials
 * Stub implementation - will call Generation Agent
 */
interface GenerateMaterialsOptions {
  job: Job
  user: UserProfile
  matchReport: MatchReport
  intent: MatchIntent
  recruiterMessage?: string
  applicationQuestions?: string[]
  now: string
}

async function generateMaterials(options: GenerateMaterialsOptions): Promise<ApplicationKit> {
  const { job, user, matchReport, intent, recruiterMessage, applicationQuestions, now } = options

  const kit: ApplicationKit = {
    jobId: job.id,
    userId: user.id,
    created_at: now
  }

  // Generate resume and cover letter for full/quick apply
  if (intent === 'full_application' || intent === 'quick_apply') {
    kit.resume = {
      markdown: generateResumeMarkdown(user, matchReport),
      highlightedSkills: matchReport.matchAnalysis.strongMatches,
      atsScore: 85
    }

    kit.coverLetter = {
      markdown: generateCoverLetterMarkdown(user, job, matchReport),
      hookType: 'direct_relevance',
      keyPoints: matchReport.talkingPoints
    }
  }

  // Generate question answers if provided
  if (applicationQuestions && applicationQuestions.length > 0) {
    kit.questionAnswers = applicationQuestions.map((question, index) => ({
      question,
      answer: generateQuestionAnswer(question, user, matchReport),
      companyUsed: index === 0 ? user.experience?.[0]?.company : undefined
    }))
  }

  // Generate recruiter response if message provided
  if (intent === 'recruiter_response' && recruiterMessage) {
    kit.recruiterEmail = generateRecruiterResponse(recruiterMessage, matchReport)
  }

  return kit
}

// ============================================================================
// Helper Functions - Will be replaced by Agent Skills
// ============================================================================

function extractTechStack(description: string): string[] {
  const techKeywords = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'AWS', 'Docker',
    'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST',
    'Vue', 'Angular', 'Next.js', 'Express', 'FastAPI', 'Django', 'Go', 'Rust',
    'Java', 'Spring', 'Scala', 'Ruby', 'Rails', 'PHP', 'Laravel', 'C#', '.NET'
  ]

  const found: string[] = []
  const descLower = description.toLowerCase()

  for (const tech of techKeywords) {
    if (descLower.includes(tech.toLowerCase())) {
      found.push(tech)
    }
  }

  return found
}

function detectExperienceLevel(title: string, description: string): 'entry' | 'mid' | 'senior' | 'staff' | 'lead' {
  const titleLower = title.toLowerCase()
  if (titleLower.includes('staff') || titleLower.includes('principal')) return 'staff'
  if (titleLower.includes('senior') || titleLower.includes('sr.') || titleLower.includes('sr ')) return 'senior'
  if (titleLower.includes('lead')) return 'lead'
  if (titleLower.includes('junior') || titleLower.includes('jr.') || titleLower.includes('jr ') || titleLower.includes('entry')) return 'entry'
  return 'mid'
}

function detectRedFlags(description: string): string[] {
  const flags: string[] = []
  const descLower = description.toLowerCase()

  if (descLower.includes('fast-paced')) flags.push('Potential work-life balance concerns')
  if (descLower.includes('competitive salary')) flags.push('Salary may not be disclosed')
  if (descLower.includes('wear many hats')) flags.push('Role scope may be unclear')
  if (descLower.includes('rockstar') || descLower.includes('ninja')) flags.push('Potentially unrealistic expectations')
  if (descLower.includes('unlimited pto')) flags.push('Unlimited PTO may mean pressure not to take time off')

  return flags
}

function extractResponsibilities(description: string): string[] {
  // Simple extraction - would be more sophisticated with LLM
  const lines = description.split('\n').filter(line =>
    line.trim().startsWith('-') ||
    line.trim().startsWith('*') ||
    line.trim().match(/^\d+\./)
  )
  return lines.slice(0, 5).map(line => line.replace(/^[-*\d.]+\s*/, '').trim())
}

interface SkillMatches {
  overallMatch: number
  strong: string[]
  partial: string[]
  gaps: string[]
}

function calculateSkillMatches(userSkills: string[], jobSkills: string[]): SkillMatches {
  const userSkillsLower = userSkills.map(s => s.toLowerCase())
  const strong: string[] = []
  const partial: string[] = []
  const gaps: string[] = []

  for (const jobSkill of jobSkills) {
    const jobSkillLower = jobSkill.toLowerCase()
    if (userSkillsLower.includes(jobSkillLower)) {
      strong.push(jobSkill)
    } else if (userSkillsLower.some(s => s.includes(jobSkillLower) || jobSkillLower.includes(s))) {
      partial.push(jobSkill)
    } else {
      gaps.push(jobSkill)
    }
  }

  const matchCount = strong.length + partial.length * 0.5
  const totalRequired = jobSkills.length || 1
  const overallMatch = Math.min(100, Math.round((matchCount / totalRequired) * 100))

  return { overallMatch, strong, partial, gaps }
}

function calculateFitScore(skillMatches: SkillMatches, user: UserProfile, job: Job): FitScore {
  // Base score from skill matching
  let composite = skillMatches.overallMatch

  // Bonus for remote preference match
  if (job.remote && user.preferences?.remote_preference === 'remote-only') {
    composite = Math.min(100, composite + 10)
  }

  // Determine recommendation
  let recommendation: 'STRONG_APPLY' | 'APPLY' | 'CONDITIONAL' | 'SKIP'
  if (composite >= 80) {
    recommendation = 'STRONG_APPLY'
  } else if (composite >= 60) {
    recommendation = 'APPLY'
  } else if (composite >= 40) {
    recommendation = 'CONDITIONAL'
  } else {
    recommendation = 'SKIP'
  }

  return {
    composite,
    confidence: Math.min(95, 70 + skillMatches.strong.length * 5),
    recommendation,
    reasoning: generateFitReasoning(skillMatches, recommendation)
  }
}

function generateFitReasoning(skillMatches: SkillMatches, recommendation: string): string {
  if (recommendation === 'STRONG_APPLY') {
    return `Strong match with ${skillMatches.strong.length} core skills aligned. Minimal gaps to address.`
  } else if (recommendation === 'APPLY') {
    return `Good match with relevant experience. ${skillMatches.gaps.length} skills to highlight as growth areas.`
  } else if (recommendation === 'CONDITIONAL') {
    return `Moderate fit. Consider upskilling in ${skillMatches.gaps.slice(0, 2).join(', ')} before applying.`
  } else {
    return `Limited skill overlap. May not be the best use of application effort.`
  }
}

function generateTalkingPoints(skillMatches: SkillMatches, job: Job): string[] {
  const points: string[] = []

  if (skillMatches.strong.length > 0) {
    points.push(`Emphasize experience with ${skillMatches.strong.slice(0, 3).join(', ')}`)
  }

  if (job.remote) {
    points.push('Highlight remote work experience and self-management skills')
  }

  points.push(`Research ${job.company} recent developments before interview`)

  return points
}

function generateRecommendations(matchReport: MatchReport): string[] {
  const recommendations: string[] = []

  switch (matchReport.fitScore.recommendation) {
    case 'STRONG_APPLY':
      recommendations.push('Strong match - prioritize this application')
      break
    case 'APPLY':
      recommendations.push('Good match - worth pursuing with tailored materials')
      break
    case 'CONDITIONAL':
      recommendations.push('Moderate match - consider if you can address the gaps')
      break
    case 'SKIP':
      recommendations.push('Low match - may not be the best use of time')
      break
  }

  if (matchReport.matchAnalysis.gaps.length > 0) {
    recommendations.push(
      `Address these gaps in your interview: ${matchReport.matchAnalysis.gaps.slice(0, 2).join(', ')}`
    )
  }

  if (matchReport.companyInsights?.recentNews && matchReport.companyInsights.recentNews.length > 0) {
    recommendations.push('Reference recent company news to show you did your research')
  }

  return recommendations
}

function generateNextSteps(
  intent: MatchIntent,
  matchReport: MatchReport,
  hasApplicationKit: boolean
): string[] {
  const steps: string[] = []

  if (intent === 'check_fit') {
    if (matchReport.fitScore.recommendation === 'STRONG_APPLY' ||
        matchReport.fitScore.recommendation === 'APPLY') {
      steps.push('Request full application materials')
    }
    steps.push('Review detailed match analysis')
    return steps
  }

  if (hasApplicationKit) {
    steps.push('Review and personalize the generated resume')
    steps.push('Customize the cover letter opening paragraph')
    steps.push('Submit application through company portal')
    steps.push('Set reminder to follow up in 1 week')
  }

  if (intent === 'recruiter_response') {
    steps.push('Review and send the email response')
    steps.push('Prepare for potential screening call')
  }

  if (matchReport.matchAnalysis.gaps.length > 0) {
    steps.push('Consider upskilling in gap areas before interviews')
  }

  return steps
}

function generateResumeMarkdown(user: UserProfile, matchReport: MatchReport): string {
  const skills = matchReport.matchAnalysis.strongMatches.join(', ')

  return `# ${user.name}

## Contact
${user.email}

## Summary
${user.summary || 'Experienced professional with expertise in ' + skills}

## Skills
${matchReport.matchAnalysis.strongMatches.map(s => `- ${s}`).join('\n')}

## Experience
${user.experience?.map(exp => `
### ${exp.title} at ${exp.company}
${exp.startDate} - ${exp.endDate || 'Present'}
${exp.description || ''}
`).join('\n') || 'Experience details to be added'}

## Education
${user.education?.map(edu => `
### ${edu.degree} - ${edu.institution}
${edu.field || ''}
`).join('\n') || 'Education details to be added'}
`
}

function generateCoverLetterMarkdown(user: UserProfile, job: Job, matchReport: MatchReport): string {
  return `Dear ${job.company} Hiring Team,

I'm reaching out about the ${job.title} role because ${matchReport.talkingPoints[0] || 'I believe my skills align well with what you are looking for'}.

${matchReport.matchAnalysis.strongMatches.length > 0
  ? `My experience with ${matchReport.matchAnalysis.strongMatches.slice(0, 3).join(', ')} directly maps to your requirements.`
  : 'I bring relevant experience that would contribute to your team.'}

${matchReport.matchAnalysis.gaps.length > 0
  ? `While I am still developing my expertise in ${matchReport.matchAnalysis.gaps[0]}, I am a quick learner committed to continuous improvement.`
  : ''}

I would love to discuss how I can contribute to ${job.company}. Looking forward to connecting.

Best regards,
${user.name}
`
}

function generateQuestionAnswer(question: string, user: UserProfile, matchReport: MatchReport): string {
  const questionLower = question.toLowerCase()

  if (questionLower.includes('why') && questionLower.includes('company')) {
    return `I am drawn to this opportunity because of the chance to work with ${matchReport.matchAnalysis.strongMatches[0] || 'cutting-edge technology'} and contribute to meaningful projects.`
  }

  if (questionLower.includes('experience')) {
    return `I have ${user.experience?.length || 'several'} years of experience working with ${matchReport.matchAnalysis.strongMatches.slice(0, 2).join(' and ') || 'relevant technologies'}.`
  }

  if (questionLower.includes('strength')) {
    return `My key strengths include ${matchReport.matchAnalysis.strongMatches.slice(0, 2).join(', ')}, combined with strong problem-solving abilities.`
  }

  return `Based on my experience, I would approach this by leveraging my skills in ${matchReport.matchAnalysis.strongMatches[0] || 'relevant areas'}.`
}

function generateRecruiterResponse(message: string, matchReport: MatchReport): RecruiterEmail {
  const isInterested = matchReport.fitScore.recommendation !== 'SKIP'

  if (isInterested) {
    return {
      subject: 'Re: Opportunity Discussion',
      body: `Hi,

Thank you for reaching out. I am interested in learning more about this opportunity.

Based on my background in ${matchReport.matchAnalysis.strongMatches.slice(0, 2).join(' and ')}, I believe I could be a strong fit for this role.

I am available to discuss further at your convenience. Would you be able to share more details about the role and team?

Best regards`,
      type: 'interested'
    }
  } else {
    return {
      subject: 'Re: Opportunity Discussion',
      body: `Hi,

Thank you for thinking of me for this opportunity. After reviewing the role, I do not think it is the right fit for my current career goals.

I appreciate you reaching out and wish you the best in your search.

Best regards`,
      type: 'decline'
    }
  }
}

// ============================================================================
// Enhanced Check-Fit Helper Functions - Career Advisor Integration (Phase 6)
// ============================================================================

/**
 * Calculate salary alignment based on job salary and user criteria
 */
export function calculateSalaryAlignment(
  jobSalary: { min?: number | null; max?: number | null; normalized_yearly?: { min?: number | null; max?: number | null } | null } | null | undefined,
  compensation: CompensationCriteria
): 'above' | 'within' | 'below' | 'unknown' {
  // Use normalized yearly salary if available, otherwise use raw values
  const salaryMin = jobSalary?.normalized_yearly?.min ?? jobSalary?.min
  const salaryMax = jobSalary?.normalized_yearly?.max ?? jobSalary?.max

  // If no salary information available
  if (salaryMin == null && salaryMax == null) {
    return 'unknown'
  }

  const { floor, target } = compensation

  // Use the max salary for comparison if available, otherwise use min
  const compareSalary = salaryMax ?? salaryMin

  if (compareSalary == null) {
    return 'unknown'
  }

  // Above target is great
  if (compareSalary >= target) {
    return 'above'
  }

  // Between floor and target is acceptable
  if (compareSalary >= floor) {
    return 'within'
  }

  // Below floor
  return 'below'
}

/**
 * Check if job location matches user preferences
 */
export function checkLocationMatch(
  job: Job,
  locationCriteria: LocationCriteria
): boolean {
  const { remote: remotePref, geoRestrictions } = locationCriteria

  // Check remote preference
  if (remotePref === 'required') {
    // Must be remote
    if (!job.remote) {
      // Check if location_parsed indicates remote
      if (!job.location_parsed?.is_remote) {
        return false
      }
    }
  } else if (remotePref === 'preferred') {
    // Remote is preferred but not required - always passes
  }
  // 'flexible' - any location works

  // Check geographic restrictions if provided
  if (geoRestrictions && geoRestrictions.length > 0) {
    // If job has no location and is not remote, might not match
    if (!job.location && !job.remote) {
      return false
    }

    // If job is fully remote, it matches geo restrictions
    if (job.remote) {
      return true
    }

    // Check if job location matches any of the geo restrictions
    const jobLocation = job.location?.toLowerCase() || ''
    const parsedCountry = job.location_parsed?.country?.toLowerCase() || ''
    const parsedCity = job.location_parsed?.city?.toLowerCase() || ''
    const parsedState = job.location_parsed?.state?.toLowerCase() || ''

    return geoRestrictions.some(geo => {
      const geoLower = geo.toLowerCase()
      return jobLocation.includes(geoLower) ||
             parsedCountry.includes(geoLower) ||
             parsedCity.includes(geoLower) ||
             parsedState.includes(geoLower)
    })
  }

  return true
}

/**
 * Analyze culture fit based on job description and user criteria
 */
export function analyzeCultureFit(
  job: Job,
  cultureCriteria: CultureCriteria
): { green: string[]; red: string[] } {
  const description = job.description.toLowerCase()
  const greenFlags: string[] = []
  const redFlags: string[] = []

  // Check for positive culture indicators
  const cultureValueKeywords: Record<string, string[]> = {
    'work-life balance': ['work-life balance', 'work life balance', 'flexible hours', 'flexible schedule', 'family friendly', 'parental leave'],
    'remote work': ['remote', 'work from home', 'wfh', 'distributed team', 'async'],
    'learning & growth': ['learning', 'development', 'growth', 'mentorship', 'training', 'conferences', 'education'],
    'diversity & inclusion': ['diversity', 'inclusion', 'dei', 'belonging', 'inclusive', 'equal opportunity'],
    'collaboration': ['collaborative', 'team-oriented', 'cross-functional', 'teamwork'],
    'innovation': ['innovation', 'cutting-edge', 'greenfield', 'r&d', 'experiment'],
    'transparency': ['transparent', 'open communication', 'feedback culture'],
    'autonomy': ['autonomous', 'self-directed', 'ownership', 'empowerment']
  }

  for (const value of cultureCriteria.values) {
    const valueLower = value.toLowerCase()
    const keywords = cultureValueKeywords[valueLower] || [valueLower]

    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        greenFlags.push(`Found "${value}" indicator: ${keyword}`)
        break
      }
    }
  }

  // Check for red flags
  const redFlagKeywords: Record<string, string[]> = {
    'overwork culture': ['fast-paced', '24/7', 'hustle', 'high pressure', 'intense environment', 'work hard play hard'],
    'unclear expectations': ['wear many hats', 'rockstar', 'ninja', 'guru', 'unicorn'],
    'micromanagement': ['micromanage', 'closely monitored', 'strict supervision'],
    'low compensation': ['competitive salary', 'market rate', 'commensurate with experience'],
    'high turnover': ['growing team', 'rapid expansion', 'hiring spree'],
    'startup chaos': ['pre-revenue', 'pre-seed', 'bootstrap', 'no funding']
  }

  for (const flag of cultureCriteria.redFlags) {
    const flagLower = flag.toLowerCase()
    const keywords = redFlagKeywords[flagLower] || [flagLower]

    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        redFlags.push(`Detected "${flag}": found "${keyword}"`)
        break
      }
    }
  }

  // Also check leadership style if specified
  if (cultureCriteria.leadershipStyle) {
    const style = cultureCriteria.leadershipStyle.toLowerCase()
    const leadershipKeywords: Record<string, string[]> = {
      'servant leadership': ['servant leader', 'supportive', 'empowering', 'coach'],
      'collaborative': ['collaborative', 'consensus', 'team decision'],
      'visionary': ['vision', 'strategic', 'innovative leadership'],
      'hands-off': ['autonomous', 'self-directed', 'independence']
    }

    const keywords = leadershipKeywords[style] || [style]
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        greenFlags.push(`Leadership style match: ${style}`)
        break
      }
    }
  }

  return { green: greenFlags, red: redFlags }
}

/**
 * Calculate tech stack coverage percentage
 */
export function calculateTechStackCoverage(
  job: Job,
  techCriteria: TechnicalStackCriteria
): number {
  const description = job.description.toLowerCase()
  const jobSkills = job.skills || []
  const jobSkillsLower = jobSkills.map(s => s.toLowerCase())

  const { mustHave, avoid } = techCriteria

  if (mustHave.length === 0) {
    return 100 // No requirements means full coverage
  }

  let matchCount = 0
  let avoidCount = 0

  // Check must-have technologies
  for (const tech of mustHave) {
    const techLower = tech.toLowerCase()
    if (jobSkillsLower.includes(techLower) || description.includes(techLower)) {
      matchCount++
    }
  }

  // Check avoided technologies (penalty)
  if (avoid && avoid.length > 0) {
    for (const tech of avoid) {
      const techLower = tech.toLowerCase()
      if (jobSkillsLower.includes(techLower) || description.includes(techLower)) {
        avoidCount++
      }
    }
  }

  // Calculate base coverage
  let coverage = (matchCount / mustHave.length) * 100

  // Apply penalty for avoided technologies (reduce by 10% per avoided tech found)
  if (avoidCount > 0) {
    coverage = Math.max(0, coverage - (avoidCount * 10))
  }

  return Math.round(coverage)
}

/**
 * Detect company stage from job description
 */
export function detectCompanyStage(job: Job): 'startup' | 'growth' | 'enterprise' | 'unknown' {
  const description = job.description.toLowerCase()
  const company = job.company.toLowerCase()

  // Startup indicators
  const startupKeywords = ['startup', 'seed', 'series a', 'early-stage', 'pre-revenue', 'founded 202', 'founded 2024', 'founded 2023', 'small team', 'first hire']
  for (const keyword of startupKeywords) {
    if (description.includes(keyword) || company.includes(keyword)) {
      return 'startup'
    }
  }

  // Enterprise indicators
  const enterpriseKeywords = ['fortune 500', 'fortune500', 'enterprise', 'global company', '10,000', '10000 employees', 'publicly traded', 'nasdaq', 'nyse', 'established company']
  for (const keyword of enterpriseKeywords) {
    if (description.includes(keyword) || company.includes(keyword)) {
      return 'enterprise'
    }
  }

  // Growth indicators
  const growthKeywords = ['series b', 'series c', 'series d', 'scale-up', 'scaleup', 'hypergrowth', 'rapid growth', 'expanding team', '100-500', '200-1000']
  for (const keyword of growthKeywords) {
    if (description.includes(keyword) || company.includes(keyword)) {
      return 'growth'
    }
  }

  return 'unknown'
}

/**
 * Calculate full criteria match
 */
export function calculateCriteriaMatch(
  job: Job,
  criteria: JobCriteria
): CriteriaMatch {
  // Salary alignment
  const salaryAlignment = criteria.compensation
    ? calculateSalaryAlignment(job.salary, criteria.compensation)
    : 'unknown'

  // Location match
  const locationMatch = criteria.location
    ? checkLocationMatch(job, criteria.location)
    : true

  // Culture fit
  const cultureFlags = criteria.culture
    ? analyzeCultureFit(job, criteria.culture)
    : { green: [], red: [] }

  // Tech stack coverage
  const techStackCoverage = criteria.technicalStack
    ? calculateTechStackCoverage(job, criteria.technicalStack)
    : 100

  // Company stage match
  let companyStageMatch = true
  if (criteria.companyStage && criteria.companyStage !== 'any') {
    const detectedStage = detectCompanyStage(job)
    companyStageMatch = detectedStage === 'unknown' || detectedStage === criteria.companyStage
  }

  return {
    salaryAlignment,
    locationMatch,
    cultureFlags,
    techStackCoverage,
    companyStageMatch
  }
}

/**
 * Determine shouldApply recommendation based on all factors
 */
export function determineShouldApply(
  fitScore: FitScore,
  criteriaMatch: CriteriaMatch | undefined
): ShouldApply {
  // Base score from fit analysis
  const baseScore = fitScore.composite

  if (!criteriaMatch) {
    // No criteria provided - use fit score alone
    if (baseScore >= 80) return 'DEFINITELY'
    if (baseScore >= 65) return 'LIKELY'
    if (baseScore >= 50) return 'MAYBE'
    if (baseScore >= 35) return 'PROBABLY_NOT'
    return 'NO'
  }

  // With criteria, we need to consider multiple factors
  let score = baseScore
  const negatives: string[] = []

  // Salary is critical
  if (criteriaMatch.salaryAlignment === 'below') {
    score -= 30
    negatives.push('salary')
  } else if (criteriaMatch.salaryAlignment === 'above') {
    score += 10
  }

  // Location mismatch is often a dealbreaker
  if (!criteriaMatch.locationMatch) {
    score -= 40
    negatives.push('location')
  }

  // Red flags are concerning
  if (criteriaMatch.cultureFlags.red.length > 0) {
    score -= criteriaMatch.cultureFlags.red.length * 10
    negatives.push('culture')
  }

  // Green flags are positive
  if (criteriaMatch.cultureFlags.green.length > 0) {
    score += criteriaMatch.cultureFlags.green.length * 5
  }

  // Tech stack coverage matters
  if (criteriaMatch.techStackCoverage < 50) {
    score -= 20
    negatives.push('tech stack')
  } else if (criteriaMatch.techStackCoverage >= 80) {
    score += 10
  }

  // Company stage mismatch
  if (!criteriaMatch.companyStageMatch) {
    score -= 15
    negatives.push('company stage')
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  // Critical dealbreakers
  if (negatives.includes('location') || (negatives.includes('salary') && criteriaMatch.salaryAlignment === 'below')) {
    return score >= 40 ? 'PROBABLY_NOT' : 'NO'
  }

  // Final determination
  if (score >= 80) return 'DEFINITELY'
  if (score >= 65) return 'LIKELY'
  if (score >= 50) return 'MAYBE'
  if (score >= 35) return 'PROBABLY_NOT'
  return 'NO'
}

/**
 * Generate detailed reasoning for the recommendation
 */
export function generateDetailedReasoning(
  fitScore: FitScore,
  matchAnalysis: MatchAnalysis,
  criteriaMatch: CriteriaMatch | undefined,
  shouldApply: ShouldApply
): string[] {
  const reasoning: string[] = []

  // Overall fit
  reasoning.push(`Overall skill match: ${matchAnalysis.overallMatch}% (${fitScore.recommendation})`)

  // Skill details
  if (matchAnalysis.strongMatches.length > 0) {
    reasoning.push(`Strong matches: ${matchAnalysis.strongMatches.slice(0, 5).join(', ')}`)
  }

  if (matchAnalysis.gaps.length > 0) {
    reasoning.push(`Skill gaps to address: ${matchAnalysis.gaps.slice(0, 3).join(', ')}`)
  }

  // Criteria-specific reasoning
  if (criteriaMatch) {
    // Salary
    switch (criteriaMatch.salaryAlignment) {
      case 'above':
        reasoning.push('Salary: Above your target - great compensation match')
        break
      case 'within':
        reasoning.push('Salary: Within your acceptable range')
        break
      case 'below':
        reasoning.push('Salary: Below your minimum floor - may not meet compensation needs')
        break
      case 'unknown':
        reasoning.push('Salary: Not disclosed - recommend clarifying early in process')
        break
    }

    // Location
    if (criteriaMatch.locationMatch) {
      reasoning.push('Location: Matches your preferences')
    } else {
      reasoning.push('Location: Does not match your requirements')
    }

    // Culture
    if (criteriaMatch.cultureFlags.green.length > 0) {
      reasoning.push(`Culture positives: ${criteriaMatch.cultureFlags.green.length} indicators found`)
    }
    if (criteriaMatch.cultureFlags.red.length > 0) {
      reasoning.push(`Culture concerns: ${criteriaMatch.cultureFlags.red.join('; ')}`)
    }

    // Tech stack
    reasoning.push(`Tech stack coverage: ${criteriaMatch.techStackCoverage}% of your must-have technologies`)

    // Company stage
    if (criteriaMatch.companyStageMatch) {
      reasoning.push('Company stage: Matches your preference')
    } else {
      reasoning.push('Company stage: May not match your preference')
    }
  }

  // Final recommendation
  const recommendationText: Record<ShouldApply, string> = {
    'DEFINITELY': 'Strong recommendation to apply - this role aligns well with your criteria',
    'LIKELY': 'Worth applying - good overall fit with minor considerations',
    'MAYBE': 'Consider carefully - mixed signals on fit',
    'PROBABLY_NOT': 'Significant concerns - may not be the best match',
    'NO': 'Not recommended - key criteria not met'
  }
  reasoning.push(recommendationText[shouldApply])

  return reasoning
}

export { analyzeJob, generateMaterials }
