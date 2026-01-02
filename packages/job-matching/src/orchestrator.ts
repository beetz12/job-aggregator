/**
 * Application Orchestrator
 *
 * Lightweight coordinator for the 2-agent architecture.
 * Manages the Analysis -> Generation flow and handles parallelization.
 *
 * Benefits:
 * - Clean separation: Analysis (read-heavy) vs Generation (write-heavy)
 * - Natural data flow: MatchReport passes from Analysis -> Generation
 * - Parallel potential: Can analyze multiple jobs simultaneously
 * - Focused context: Each agent has 4 skills, not 8
 */

import { AnalysisAgent } from './agents/analysis-agent.js'
import { GenerationAgent } from './agents/generation-agent.js'
import type {
  ApplicationRequest,
  ApplicationResponse,
  ApplicationResult,
  MatchReport,
  ApplicationKit,
  JobPosting,
  FitRecommendation
} from './types.js'

export interface OrchestratorOptions {
  /** Anthropic API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string
  /** Maximum number of parallel job analyses */
  maxParallel?: number
  /** Minimum fit score to generate materials (default: 50) */
  minFitScoreForGeneration?: number
}

export class ApplicationOrchestrator {
  private analysisAgent: AnalysisAgent
  private generationAgent: GenerationAgent
  private options: Required<OrchestratorOptions>

  constructor(options: OrchestratorOptions = {}) {
    this.options = {
      apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY || '',
      maxParallel: options.maxParallel || 5,
      minFitScoreForGeneration: options.minFitScoreForGeneration || 50
    }

    this.analysisAgent = new AnalysisAgent(this.options.apiKey)
    this.generationAgent = new GenerationAgent(this.options.apiKey)
  }

  /**
   * Process an application request for one or more jobs.
   *
   * Flow:
   * 1. Parse intent and validate inputs
   * 2. Run Analysis Agent for each job (parallel)
   * 3. Run Generation Agent for qualifying jobs (based on fit score)
   * 4. Synthesize results with recommendations
   */
  async processApplication(request: ApplicationRequest): Promise<ApplicationResponse> {
    console.log(`[Orchestrator] Processing ${request.intent} for ${request.jobs.length} job(s)`)

    // Validate request
    this.validateRequest(request)

    // Process jobs in parallel batches
    const results = await this.processJobsInBatches(request)

    // Calculate summary statistics
    const summary = this.calculateSummary(results)

    console.log(`[Orchestrator] Complete: ${summary.strongMatches} strong matches, ${summary.applicationsGenerated} applications generated`)

    return {
      results,
      summary
    }
  }

  /**
   * Quick check fit for a single job without generating materials
   */
  async checkFit(job: JobPosting, request: ApplicationRequest): Promise<MatchReport> {
    console.log(`[Orchestrator] Quick fit check for ${job.id}`)
    return this.analysisAgent.analyze(job, request.user)
  }

  /**
   * Generate materials for a job with existing MatchReport
   */
  async generateMaterials(
    matchReport: MatchReport,
    request: ApplicationRequest
  ): Promise<ApplicationKit> {
    console.log(`[Orchestrator] Generating materials for ${matchReport.jobId}`)
    return this.generationAgent.generate(matchReport, request.user, request)
  }

  private validateRequest(request: ApplicationRequest): void {
    if (!request.user) {
      throw new Error('User profile is required')
    }
    if (!request.jobs || request.jobs.length === 0) {
      throw new Error('At least one job is required')
    }
    if (!request.intent) {
      throw new Error('Intent is required')
    }

    // Validate recruiter response has message
    if (request.intent === 'recruiter_response' && !request.recruiterMessage) {
      throw new Error('Recruiter message is required for recruiter_response intent')
    }
  }

  private async processJobsInBatches(
    request: ApplicationRequest
  ): Promise<ApplicationResult[]> {
    const results: ApplicationResult[] = []
    const jobs = request.jobs

    // Process in batches to respect maxParallel
    for (let i = 0; i < jobs.length; i += this.options.maxParallel) {
      const batch = jobs.slice(i, i + this.options.maxParallel)

      const batchResults = await Promise.all(
        batch.map(job => this.processJob(job, request))
      )

      results.push(...batchResults)
    }

    return results
  }

  private async processJob(
    job: JobPosting,
    request: ApplicationRequest
  ): Promise<ApplicationResult> {
    console.log(`[Orchestrator] Processing job ${job.id}: ${job.title} at ${job.company}`)

    try {
      // Step 1: Run Analysis Agent
      console.log(`[Orchestrator] Delegating to Analysis Agent for ${job.id}`)
      const matchReport = await this.analysisAgent.analyze(job, request.user)
      console.log(`[Orchestrator] Analysis complete. Fit: ${matchReport.fitScore.composite}/100 (${matchReport.fitScore.recommendation})`)

      // Step 2: Decide if we should generate materials
      const shouldGenerate = this.shouldGenerateMaterials(request, matchReport)

      let applicationKit: ApplicationKit | undefined

      if (shouldGenerate) {
        // Step 3: Run Generation Agent
        console.log(`[Orchestrator] Delegating to Generation Agent for ${job.id}`)
        applicationKit = await this.generationAgent.generate(
          matchReport,
          request.user,
          request
        )
        console.log(`[Orchestrator] Generation complete for ${job.id}`)
      } else {
        console.log(`[Orchestrator] Skipping generation for ${job.id} (fit: ${matchReport.fitScore.composite}, intent: ${request.intent})`)
      }

      // Step 4: Generate recommendations and next steps
      const recommendations = this.generateRecommendations(matchReport, job)
      const nextSteps = this.generateNextSteps(request.intent, matchReport, !!applicationKit)

      return {
        jobId: job.id,
        matchReport,
        applicationKit,
        recommendations,
        nextSteps
      }
    } catch (error) {
      console.error(`[Orchestrator] Error processing job ${job.id}:`, error)

      // Return a result with error information
      return {
        jobId: job.id,
        matchReport: this.createErrorMatchReport(job.id, request.user.id, error),
        recommendations: ['An error occurred during analysis'],
        nextSteps: ['Please try again or contact support']
      }
    }
  }

  private shouldGenerateMaterials(
    request: ApplicationRequest,
    matchReport: MatchReport
  ): boolean {
    // Never generate for check_fit intent
    if (request.intent === 'check_fit') {
      return false
    }

    // Always generate for recruiter_response (even for declines)
    if (request.intent === 'recruiter_response') {
      return true
    }

    // For full_application and quick_apply, check fit score threshold
    return matchReport.fitScore.composite >= this.options.minFitScoreForGeneration
  }

  private generateRecommendations(matchReport: MatchReport, job: JobPosting): string[] {
    const recommendations: string[] = []
    const rec = matchReport.fitScore.recommendation

    // Primary recommendation based on fit
    switch (rec) {
      case 'STRONG_APPLY':
        recommendations.push(`Strong match for ${job.title} at ${job.company} - prioritize this application`)
        break
      case 'APPLY':
        recommendations.push(`Good match - worth pursuing with tailored materials`)
        break
      case 'CONDITIONAL':
        recommendations.push(`Moderate match - consider if you can address the skill gaps`)
        break
      case 'SKIP':
        recommendations.push(`Low match - may not be the best use of time`)
        break
    }

    // Skill gap recommendations
    if (matchReport.matchAnalysis.gaps.length > 0 && rec !== 'SKIP') {
      const topGaps = matchReport.matchAnalysis.gaps.slice(0, 2).join(' and ')
      recommendations.push(`Prepare to address gaps in: ${topGaps}`)
    }

    // Company-specific recommendations
    if (matchReport.companyInsights.greenFlags.length > 0) {
      recommendations.push(`Highlight alignment with: ${matchReport.companyInsights.greenFlags[0]}`)
    }

    if (matchReport.companyInsights.redFlags.length > 0 && rec !== 'SKIP') {
      recommendations.push(`Research and prepare questions about: ${matchReport.companyInsights.redFlags[0]}`)
    }

    // Talking points recommendation
    if (matchReport.talkingPoints.length > 0 && rec !== 'SKIP') {
      recommendations.push(`Emphasize: ${matchReport.talkingPoints[0]}`)
    }

    // Company news recommendation
    if (matchReport.companyInsights.recentNews.length > 0) {
      recommendations.push('Reference recent company developments to show you did your research')
    }

    return recommendations
  }

  private generateNextSteps(
    intent: string,
    matchReport: MatchReport,
    hasApplicationKit: boolean
  ): string[] {
    const steps: string[] = []
    const rec = matchReport.fitScore.recommendation

    // Check fit only - suggest next actions
    if (intent === 'check_fit') {
      if (rec === 'STRONG_APPLY' || rec === 'APPLY') {
        steps.push('Request full application materials')
        steps.push('Review the detailed match analysis')
      } else if (rec === 'CONDITIONAL') {
        steps.push('Consider upskilling in gap areas first')
        steps.push('Request materials if you can address the gaps')
      } else {
        steps.push('Consider other opportunities that better match your profile')
      }
      return steps
    }

    // With generated materials
    if (hasApplicationKit) {
      steps.push('Review and personalize the generated resume')
      steps.push('Customize the cover letter opening paragraph')
      steps.push('Submit application through company portal')
      steps.push('Set reminder to follow up in 1 week')
    }

    // Recruiter response specific
    if (intent === 'recruiter_response') {
      steps.push('Review and send the email response')
      if (rec !== 'SKIP') {
        steps.push('Prepare for potential screening call')
        steps.push('Research interviewer backgrounds on LinkedIn')
      }
    }

    // Gap preparation
    if (matchReport.matchAnalysis.gaps.length > 0 && rec !== 'SKIP') {
      steps.push('Study gap areas before interviews')
      if (matchReport.interviewQuestions.length > 0) {
        steps.push('Practice answers for likely interview questions')
      }
    }

    // Interview prep for strong matches
    if (rec === 'STRONG_APPLY' || rec === 'APPLY') {
      steps.push('Prepare STAR examples for each talking point')
      steps.push('Research recent company news and developments')
    }

    return steps
  }

  private calculateSummary(results: ApplicationResult[]): {
    totalJobs: number
    strongMatches: number
    applicationsGenerated: number
  } {
    const strongMatches = results.filter(r =>
      r.matchReport.fitScore.recommendation === 'STRONG_APPLY' ||
      r.matchReport.fitScore.recommendation === 'APPLY'
    ).length

    const applicationsGenerated = results.filter(r =>
      r.applicationKit !== undefined
    ).length

    return {
      totalJobs: results.length,
      strongMatches,
      applicationsGenerated
    }
  }

  private createErrorMatchReport(
    jobId: string,
    userId: string,
    error: unknown
  ): MatchReport {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      jobId,
      userId,
      parsedRequirements: {
        mustHave: [],
        niceToHave: [],
        techStack: [],
        experienceLevel: 'mid',
        responsibilities: [],
        redFlags: ['Analysis failed due to error']
      },
      companyInsights: {
        overallScore: 0,
        scores: {
          compensation: 0,
          culture: 0,
          familyFriendliness: 0,
          technicalFit: 0,
          industry: 0,
          longTermPotential: 0
        },
        greenFlags: [],
        redFlags: ['Unable to evaluate company'],
        recentNews: [],
        recommendation: 'PASS'
      },
      matchAnalysis: {
        overallMatch: 0,
        strongMatches: [],
        partialMatches: [],
        gaps: [],
        transferableSkills: []
      },
      fitScore: {
        composite: 0,
        confidence: 0,
        recommendation: 'SKIP',
        reasoning: `Analysis failed: ${errorMessage}`
      },
      talkingPoints: [],
      gapsToAddress: [],
      interviewQuestions: []
    }
  }
}

// Export singleton factory for easy Motia integration
export function createOrchestrator(options?: OrchestratorOptions): ApplicationOrchestrator {
  return new ApplicationOrchestrator(options)
}
