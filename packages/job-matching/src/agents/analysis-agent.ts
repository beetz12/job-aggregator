/**
 * Analysis Agent
 *
 * Responsible for analyzing job opportunities and evaluating candidate fit.
 * Uses 4 skills: job-analysis, company-evaluation, profile-matching, fit-scoring
 *
 * Input: JobPosting + UserProfile
 * Output: MatchReport
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  JobPosting,
  UserProfile,
  MatchReport,
  ParsedRequirements,
  CompanyInsights,
  MatchAnalysis,
  FitScore,
  ExperienceLevel,
  CompanyRecommendation,
  FitRecommendation
} from '../types.js'

const ANALYSIS_SYSTEM_PROMPT = `You are an expert job market analyst and career advisor.

Your role is to thoroughly analyze job opportunities and evaluate candidate fit.

## Your Skills (read from .claude/skills/ when needed)
1. job-analysis - Parse job postings to extract structured requirements
2. company-evaluation - Research company using 6-category scoring (see SCORING_RUBRIC.md)
3. profile-matching - Compare candidate profile against job requirements
4. fit-scoring - Calculate composite fit score with recommendation

## Workflow
1. ALWAYS start with job_analysis to understand the role
2. Run company_evaluation to assess the employer
3. Use profile_matching to identify alignment and gaps
4. Calculate final fit_scoring with reasoning

## Output
After using all tools, synthesize findings into a complete MatchReport as JSON with:
- parsedRequirements: Structured job requirements
- companyInsights: Company evaluation scores and flags
- matchAnalysis: Skills matching with gaps
- fitScore: Final composite score and recommendation
- talkingPoints: Key points candidate should emphasize
- gapsToAddress: Areas to prepare for
- interviewQuestions: Likely interview questions

Be thorough but concise. Focus on actionable insights.`

// Tool definitions for skills
const analysisTools: Anthropic.Messages.Tool[] = [
  {
    name: 'job_analysis',
    description: 'Parse a job posting to extract requirements, signals, and red flags. Returns structured requirements including must-have skills, nice-to-have skills, tech stack, experience level, and any red flags detected.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_title: { type: 'string', description: 'Job title' },
        job_description: { type: 'string', description: 'Full job posting text' },
        requirements_list: {
          type: 'array',
          items: { type: 'string' },
          description: 'Listed requirements from posting'
        }
      },
      required: ['job_title', 'job_description']
    }
  },
  {
    name: 'company_evaluation',
    description: 'Research and score a company using 6-category rubric: compensation (0-20), culture (0-25), family-friendliness (0-20), technical fit (0-15), industry (0-10), long-term potential (0-10). Returns overall score, green/red flags, and recommendation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string', description: 'Company name' },
        job_posting: { type: 'string', description: 'Job posting for context' },
        known_info: { type: 'string', description: 'Any known information about the company' }
      },
      required: ['company_name']
    }
  },
  {
    name: 'profile_matching',
    description: 'Match candidate profile to job requirements. Identifies strong matches, partial matches, gaps, and transferable skills. Returns overall match percentage and detailed breakdown.',
    input_schema: {
      type: 'object' as const,
      properties: {
        requirements: {
          type: 'object',
          description: 'Parsed job requirements from job_analysis',
          properties: {
            mustHave: { type: 'array', items: { type: 'string' } },
            niceToHave: { type: 'array', items: { type: 'string' } },
            techStack: { type: 'array', items: { type: 'string' } }
          }
        },
        candidate_skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'Candidate skills list'
        },
        candidate_experience: {
          type: 'string',
          description: 'Summary of candidate experience'
        }
      },
      required: ['requirements', 'candidate_skills']
    }
  },
  {
    name: 'fit_scoring',
    description: 'Calculate composite fit score combining job analysis, company evaluation, and profile match. Returns score 0-100, confidence level, recommendation (STRONG_APPLY, APPLY, CONDITIONAL, SKIP), and reasoning.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_analysis_result: {
          type: 'object',
          description: 'Result from job_analysis'
        },
        company_evaluation_result: {
          type: 'object',
          description: 'Result from company_evaluation'
        },
        profile_match_result: {
          type: 'object',
          description: 'Result from profile_matching'
        }
      },
      required: ['job_analysis_result', 'profile_match_result']
    }
  }
]

interface JobAnalysisInput {
  job_title: string
  job_description: string
  requirements_list?: string[]
}

interface CompanyEvaluationInput {
  company_name: string
  job_posting?: string
  known_info?: string
}

interface ProfileMatchingInput {
  requirements: {
    mustHave?: string[]
    niceToHave?: string[]
    techStack?: string[]
  }
  candidate_skills: string[]
  candidate_experience?: string
}

interface FitScoringInput {
  job_analysis_result: ParsedRequirements
  company_evaluation_result?: CompanyInsights
  profile_match_result: MatchAnalysis
}

export class AnalysisAgent {
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    })
  }

  async analyze(job: JobPosting, user: UserProfile): Promise<MatchReport> {
    console.log(`[AnalysisAgent] Analyzing job ${job.id} for user ${user.id}`)

    const messages: Anthropic.Messages.MessageParam[] = [{
      role: 'user',
      content: `Analyze this job opportunity for the candidate.

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Requirements: ${job.requirements.join(', ')}
URL: ${job.url}
Source: ${job.source}
Posted: ${job.postedAt}
${job.location ? `Location: ${job.location}` : ''}
${job.remote !== undefined ? `Remote: ${job.remote}` : ''}

CANDIDATE PROFILE:
Name: ${user.name}
Summary: ${user.summary}
Skills: ${user.skills.join(', ')}
Experience: ${JSON.stringify(user.experience, null, 2)}
Preferences: ${JSON.stringify(user.preferences, null, 2)}

Use your skills in order:
1. job_analysis - Parse the job requirements
2. company_evaluation - Evaluate the company
3. profile_matching - Match the candidate's profile
4. fit_scoring - Calculate the final fit score

After using all tools, provide the complete MatchReport as JSON.`
    }]

    let response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: ANALYSIS_SYSTEM_PROMPT,
      tools: analysisTools,
      messages
    })

    // Agentic loop - process tool calls
    while (response.stop_reason === 'tool_use') {
      const toolResults = await this.processToolCalls(response.content, job, user)

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: ANALYSIS_SYSTEM_PROMPT,
        tools: analysisTools,
        messages
      })
    }

    return this.extractMatchReport(response.content, job.id, user.id)
  }

  private async processToolCalls(
    content: Anthropic.Messages.ContentBlock[],
    job: JobPosting,
    user: UserProfile
  ): Promise<Anthropic.Messages.ToolResultBlockParam[]> {
    const results: Anthropic.Messages.ToolResultBlockParam[] = []

    for (const block of content) {
      if (block.type === 'tool_use') {
        const result = await this.executeSkill(block.name, block.input, job, user)
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        })
      }
    }

    return results
  }

  private async executeSkill(
    name: string,
    input: unknown,
    job: JobPosting,
    user: UserProfile
  ): Promise<unknown> {
    console.log(`[AnalysisAgent] Executing skill: ${name}`)

    switch (name) {
      case 'job_analysis':
        return this.analyzeJob(input as JobAnalysisInput, job)
      case 'company_evaluation':
        return this.evaluateCompany(input as CompanyEvaluationInput, job)
      case 'profile_matching':
        return this.matchProfile(input as ProfileMatchingInput, job, user)
      case 'fit_scoring':
        return this.scoreFit(input as FitScoringInput)
      default:
        throw new Error(`Unknown skill: ${name}`)
    }
  }

  // Skill implementations

  private analyzeJob(input: JobAnalysisInput, job: JobPosting): ParsedRequirements {
    const description = input.job_description || job.description
    const requirements = input.requirements_list || job.requirements

    return {
      mustHave: requirements.slice(0, 5),
      niceToHave: requirements.slice(5),
      techStack: this.extractTechStack(description),
      experienceLevel: this.detectExperienceLevel(input.job_title || job.title, description),
      responsibilities: this.extractResponsibilities(description),
      redFlags: this.detectRedFlags(description)
    }
  }

  private evaluateCompany(input: CompanyEvaluationInput, job: JobPosting): CompanyInsights {
    // In production, this would use WebSearch to research the company
    // For now, return a reasonable default based on job posting signals
    const description = input.job_posting || job.description

    const scores = {
      compensation: this.scoreCompensation(description),
      culture: this.scoreCulture(description),
      familyFriendliness: this.scoreFamilyFriendliness(description),
      technicalFit: 12,
      industry: 8,
      longTermPotential: 7
    }

    const overallScore = Object.values(scores).reduce((a, b) => a + b, 0)

    return {
      overallScore,
      scores,
      greenFlags: this.detectGreenFlags(description),
      redFlags: this.detectCompanyRedFlags(description),
      recentNews: [],
      recommendation: this.getCompanyRecommendation(overallScore)
    }
  }

  private matchProfile(
    input: ProfileMatchingInput,
    job: JobPosting,
    user: UserProfile
  ): MatchAnalysis {
    const requirements = input.requirements || {
      mustHave: job.requirements.slice(0, 5),
      niceToHave: job.requirements.slice(5),
      techStack: this.extractTechStack(job.description)
    }

    const candidateSkills = input.candidate_skills || user.skills
    const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase())

    const mustHave = requirements.mustHave || []
    const niceToHave = requirements.niceToHave || []
    const techStack = requirements.techStack || []

    const allRequirements = [...mustHave, ...niceToHave, ...techStack]

    const strongMatches: string[] = []
    const partialMatches: string[] = []
    const gaps: string[] = []

    for (const req of allRequirements) {
      const reqLower = req.toLowerCase()
      if (candidateSkillsLower.some(skill =>
        skill.includes(reqLower) || reqLower.includes(skill)
      )) {
        strongMatches.push(req)
      } else if (this.hasPartialMatch(reqLower, candidateSkillsLower)) {
        partialMatches.push(req)
      } else {
        gaps.push(req)
      }
    }

    const overallMatch = allRequirements.length > 0
      ? Math.round(((strongMatches.length + partialMatches.length * 0.5) / allRequirements.length) * 100)
      : 50

    return {
      overallMatch,
      strongMatches,
      partialMatches,
      gaps,
      transferableSkills: this.findTransferableSkills(candidateSkills, gaps)
    }
  }

  private scoreFit(input: FitScoringInput): FitScore {
    const jobAnalysis = input.job_analysis_result
    const companyEval = input.company_evaluation_result
    const profileMatch = input.profile_match_result

    // Weighted scoring
    const skillMatchWeight = 0.4
    const companyWeight = 0.3
    const alignmentWeight = 0.3

    const skillScore = profileMatch.overallMatch
    const companyScore = companyEval?.overallScore ?? 70
    const alignmentScore = this.calculateAlignmentScore(jobAnalysis, profileMatch)

    const composite = Math.round(
      skillScore * skillMatchWeight +
      companyScore * companyWeight +
      alignmentScore * alignmentWeight
    )

    const confidence = this.calculateConfidence(profileMatch, companyEval)
    const recommendation = this.getRecommendation(composite, profileMatch.gaps.length)

    return {
      composite,
      confidence,
      recommendation,
      reasoning: this.generateReasoning(composite, profileMatch, companyEval)
    }
  }

  // Helper methods

  private extractTechStack(description: string): string[] {
    const techKeywords = [
      'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Go', 'Rust',
      'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
      'Redis', 'GraphQL', 'REST', 'Next.js', 'Vue', 'Angular', 'Django',
      'FastAPI', 'Express', 'Spring', 'Java', 'C#', '.NET', 'Ruby', 'Rails'
    ]
    return techKeywords.filter(tech =>
      description.toLowerCase().includes(tech.toLowerCase())
    )
  }

  private detectExperienceLevel(title: string, description: string): ExperienceLevel {
    const combined = `${title} ${description}`.toLowerCase()
    if (combined.includes('staff') || combined.includes('principal')) return 'staff'
    if (combined.includes('senior') || combined.includes('sr.') || combined.includes('sr ')) return 'senior'
    if (combined.includes('lead') || combined.includes('manager')) return 'lead'
    if (combined.includes('junior') || combined.includes('jr.') || combined.includes('jr ') ||
        combined.includes('entry') || combined.includes('associate')) return 'entry'
    return 'mid'
  }

  private extractResponsibilities(description: string): string[] {
    const lines = description.split(/[\n\r]+/)
    const responsibilities: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
        const cleaned = trimmed.replace(/^[-*\d.]+\s*/, '')
        if (cleaned.length > 10 && cleaned.length < 200) {
          responsibilities.push(cleaned)
        }
      }
    }

    return responsibilities.slice(0, 10)
  }

  private detectRedFlags(description: string): string[] {
    const flags: string[] = []
    const descLower = description.toLowerCase()

    if (descLower.includes('fast-paced') || descLower.includes('fast paced')) {
      flags.push('Potential work-life balance issues (fast-paced environment)')
    }
    if (descLower.includes('competitive salary') && !descLower.match(/\$[\d,]+/)) {
      flags.push('Vague compensation (competitive salary without specifics)')
    }
    if (descLower.includes('wear many hats') || descLower.includes('wear multiple hats')) {
      flags.push('Role scope unclear (wear many hats)')
    }
    if (descLower.includes('like a family') || descLower.includes('we\'re a family')) {
      flags.push('Potential boundary issues (family culture rhetoric)')
    }
    if (descLower.includes('unlimited pto') || descLower.includes('unlimited vacation')) {
      flags.push('Verify PTO culture (unlimited policies often result in less time off)')
    }
    if (descLower.includes('ninja') || descLower.includes('rockstar') || descLower.includes('guru')) {
      flags.push('Dated job posting language')
    }

    return flags
  }

  private scoreCompensation(description: string): number {
    // Score 0-20
    if (description.match(/\$\d{3},?\d{3}/) || description.toLowerCase().includes('equity')) {
      return 18
    }
    if (description.match(/\$\d{2,3}k/i)) {
      return 15
    }
    if (description.toLowerCase().includes('competitive')) {
      return 10
    }
    return 8
  }

  private scoreCulture(description: string): number {
    // Score 0-25
    let score = 12
    const descLower = description.toLowerCase()

    if (descLower.includes('remote') || descLower.includes('flexible')) score += 5
    if (descLower.includes('learning') || descLower.includes('growth')) score += 3
    if (descLower.includes('diverse') || descLower.includes('inclusive')) score += 3
    if (descLower.includes('work-life') || descLower.includes('work life')) score += 2

    return Math.min(25, score)
  }

  private scoreFamilyFriendliness(description: string): number {
    // Score 0-20
    let score = 10
    const descLower = description.toLowerCase()

    if (descLower.includes('parental leave')) score += 5
    if (descLower.includes('remote') || descLower.includes('flexible hours')) score += 3
    if (descLower.includes('healthcare') || descLower.includes('health insurance')) score += 2

    return Math.min(20, score)
  }

  private detectGreenFlags(description: string): string[] {
    const flags: string[] = []
    const descLower = description.toLowerCase()

    if (descLower.includes('remote-first') || descLower.includes('fully remote')) {
      flags.push('Remote-first culture')
    }
    if (descLower.includes('series') || descLower.includes('funded')) {
      flags.push('Well-funded company')
    }
    if (descLower.includes('transparent')) {
      flags.push('Transparency valued')
    }
    if (description.match(/\$[\d,]+\s*-\s*\$[\d,]+/)) {
      flags.push('Salary range disclosed')
    }

    return flags
  }

  private detectCompanyRedFlags(description: string): string[] {
    const flags: string[] = []
    const descLower = description.toLowerCase()

    if (descLower.includes('startup') && descLower.includes('equity only')) {
      flags.push('Equity-only compensation risk')
    }
    if (descLower.includes('pre-revenue') || descLower.includes('pre revenue')) {
      flags.push('Pre-revenue stage (higher risk)')
    }

    return flags
  }

  private getCompanyRecommendation(score: number): CompanyRecommendation {
    if (score >= 85) return 'STRONG_YES'
    if (score >= 70) return 'YES'
    if (score >= 50) return 'MAYBE'
    return 'PASS'
  }

  private hasPartialMatch(requirement: string, skills: string[]): boolean {
    const reqWords = requirement.split(/\s+/)
    return reqWords.some(word =>
      word.length > 3 && skills.some(skill => skill.includes(word))
    )
  }

  private findTransferableSkills(candidateSkills: string[], gaps: string[]): string[] {
    const transferable: string[] = []

    const skillMappings: Record<string, string[]> = {
      'docker': ['container orchestration', 'kubernetes'],
      'react': ['frontend frameworks', 'vue', 'angular'],
      'python': ['scripting', 'automation'],
      'javascript': ['typescript', 'frontend development'],
      'sql': ['database management', 'postgresql', 'mysql'],
      'aws': ['cloud infrastructure', 'gcp', 'azure'],
    }

    for (const skill of candidateSkills) {
      const skillLower = skill.toLowerCase()
      const mappedSkills = skillMappings[skillLower] || []

      for (const mapped of mappedSkills) {
        if (gaps.some(gap => gap.toLowerCase().includes(mapped))) {
          transferable.push(`${skill} -> ${mapped}`)
        }
      }
    }

    return transferable.slice(0, 5)
  }

  private calculateAlignmentScore(
    jobAnalysis: ParsedRequirements,
    profileMatch: MatchAnalysis
  ): number {
    const gapPenalty = Math.min(30, profileMatch.gaps.length * 5)
    const redFlagPenalty = Math.min(20, jobAnalysis.redFlags.length * 5)
    const transferableBonus = Math.min(15, profileMatch.transferableSkills.length * 3)

    return Math.max(0, 85 - gapPenalty - redFlagPenalty + transferableBonus)
  }

  private calculateConfidence(
    profileMatch: MatchAnalysis,
    companyEval?: CompanyInsights
  ): number {
    let confidence = 70

    if (profileMatch.strongMatches.length > 3) confidence += 10
    if (profileMatch.gaps.length < 3) confidence += 10
    if (companyEval && companyEval.recentNews.length > 0) confidence += 5

    return Math.min(100, confidence)
  }

  private getRecommendation(composite: number, gapCount: number): FitRecommendation {
    if (composite >= 85 && gapCount <= 2) return 'STRONG_APPLY'
    if (composite >= 70) return 'APPLY'
    if (composite >= 50) return 'CONDITIONAL'
    return 'SKIP'
  }

  private generateReasoning(
    composite: number,
    profileMatch: MatchAnalysis,
    companyEval?: CompanyInsights
  ): string {
    const parts: string[] = []

    if (profileMatch.strongMatches.length > 0) {
      parts.push(`Strong alignment on ${profileMatch.strongMatches.length} key requirements`)
    }

    if (profileMatch.gaps.length > 0) {
      parts.push(`${profileMatch.gaps.length} skill gaps to address`)
    }

    if (companyEval) {
      if (companyEval.greenFlags.length > 0) {
        parts.push(`Company shows positive signals: ${companyEval.greenFlags[0]}`)
      }
      if (companyEval.redFlags.length > 0) {
        parts.push(`Consider: ${companyEval.redFlags[0]}`)
      }
    }

    if (profileMatch.transferableSkills.length > 0) {
      parts.push('Transferable skills can help bridge gaps')
    }

    return parts.join('. ') + '.'
  }

  private extractMatchReport(
    content: Anthropic.Messages.ContentBlock[],
    jobId: string,
    userId: string
  ): MatchReport {
    const textBlock = content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from analysis agent')
    }

    // Try to extract JSON from markdown code block
    const jsonMatch = textBlock.text.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        return this.normalizeMatchReport(parsed, jobId, userId)
      } catch {
        // Fall through to try parsing entire response
      }
    }

    // Try to parse entire response as JSON
    try {
      const parsed = JSON.parse(textBlock.text)
      return this.normalizeMatchReport(parsed, jobId, userId)
    } catch {
      // Return a default report if parsing fails
      console.warn('[AnalysisAgent] Could not parse MatchReport, using defaults')
      return this.createDefaultMatchReport(jobId, userId)
    }
  }

  private normalizeMatchReport(
    parsed: Partial<MatchReport>,
    jobId: string,
    userId: string
  ): MatchReport {
    return {
      jobId,
      userId,
      parsedRequirements: parsed.parsedRequirements || {
        mustHave: [],
        niceToHave: [],
        techStack: [],
        experienceLevel: 'mid',
        responsibilities: [],
        redFlags: []
      },
      companyInsights: parsed.companyInsights || {
        overallScore: 70,
        scores: {
          compensation: 15,
          culture: 18,
          familyFriendliness: 14,
          technicalFit: 12,
          industry: 8,
          longTermPotential: 8
        },
        greenFlags: [],
        redFlags: [],
        recentNews: [],
        recommendation: 'MAYBE'
      },
      matchAnalysis: parsed.matchAnalysis || {
        overallMatch: 50,
        strongMatches: [],
        partialMatches: [],
        gaps: [],
        transferableSkills: []
      },
      fitScore: parsed.fitScore || {
        composite: 50,
        confidence: 70,
        recommendation: 'CONDITIONAL',
        reasoning: 'Insufficient data for detailed analysis'
      },
      talkingPoints: parsed.talkingPoints || [],
      gapsToAddress: parsed.gapsToAddress || [],
      interviewQuestions: parsed.interviewQuestions || []
    }
  }

  private createDefaultMatchReport(jobId: string, userId: string): MatchReport {
    return {
      jobId,
      userId,
      parsedRequirements: {
        mustHave: [],
        niceToHave: [],
        techStack: [],
        experienceLevel: 'mid',
        responsibilities: [],
        redFlags: []
      },
      companyInsights: {
        overallScore: 70,
        scores: {
          compensation: 15,
          culture: 18,
          familyFriendliness: 14,
          technicalFit: 12,
          industry: 8,
          longTermPotential: 8
        },
        greenFlags: [],
        redFlags: [],
        recentNews: [],
        recommendation: 'MAYBE'
      },
      matchAnalysis: {
        overallMatch: 50,
        strongMatches: [],
        partialMatches: [],
        gaps: [],
        transferableSkills: []
      },
      fitScore: {
        composite: 50,
        confidence: 50,
        recommendation: 'CONDITIONAL',
        reasoning: 'Analysis could not be completed'
      },
      talkingPoints: [],
      gapsToAddress: [],
      interviewQuestions: []
    }
  }
}
