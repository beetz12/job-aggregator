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
  RecruiterEmail
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
    createdAt: now
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
    createdAt: now
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
  if (job.remote && user.preferences?.remotePreference === 'remote-only') {
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

export { analyzeJob, generateMaterials }
