# Intelligent Job Application System - V3 (Balanced Architecture)

**Date**: 2026-01-01
**Author**: Claude AI
**Status**: Ready for Approval
**Confidence Level**: 90%
**Type**: Feature Implementation Plan

---

## Executive Summary

This plan uses a **balanced architecture** with **2 specialized agents** + **8 Skills distributed between them**. This avoids both the over-engineering of 8 agents (V1) and the cognitive overload of a single orchestrator (V2).

### Architecture Evolution

| Version | Architecture | Problem |
|---------|-------------|---------|
| V1 | 8 specialized agents | Over-engineered, complex coordination |
| V2 | 1 orchestrator + 8 skills | Too much cognitive load on orchestrator |
| **V3** | **2 agents + 8 skills distributed** | **Balanced: focused context per agent** |

### Why 2 Agents is Optimal

From multi-agent research analysis:

| Agents | Pros | Cons |
|--------|------|------|
| 1 | Simple orchestration | Context overload, no parallelization |
| **2** | **Clean separation, parallel capability, simple coordination** | **Minimal overhead** |
| 3+ | Fine-grained control | Over-engineering, more handoffs |

**Key Insight**: Job matching has two distinct cognitive domains:
1. **Analysis** (read-heavy): Evaluate jobs, research companies, score fit
2. **Generation** (write-heavy): Create resumes, cover letters, responses

These map naturally to 2 specialized agents.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Job Matching Request                               │
│              { userId, jobs[], preferences, actions[] }                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR (Lightweight)                           │
│                                                                              │
│  Responsibilities:                                                           │
│  • Parse user intent (full_application | quick_apply | recruiter_response)  │
│  • Coordinate agents in sequence: Analysis → Generation                     │
│  • Merge outputs into final ApplicationResponse                             │
│  • Handle errors and retries                                                │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│      ANALYSIS AGENT          │    │     GENERATION AGENT         │
│                              │    │                              │
│  Skills (4):                 │    │  Skills (4):                 │
│  ├── job-analysis            │    │  ├── resume-writing          │
│  ├── profile-matching        │    │  ├── cover-letter            │
│  ├── company-evaluation      │    │  ├── question-answering      │
│  └── fit-scoring             │    │  └── recruiter-response      │
│                              │    │                              │
│  Input: Job + Profile        │    │  Input: MatchReport          │
│  Output: MatchReport         │    │  Output: ApplicationKit      │
│  {                           │    │  {                           │
│    job_requirements,         │    │    resume,                   │
│    company_insights,         │    │    cover_letter,             │
│    match_analysis,           │    │    question_answers,         │
│    fit_score (0-100),        │    │    recruiter_email           │
│    talking_points,           │    │  }                           │
│    gaps_to_address           │    │                              │
│  }                           │    │                              │
└──────────────────────────────┘    └──────────────────────────────┘
              │                                     │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION RESPONSE                                 │
│  { matchReport, applicationKit, recommendations, nextSteps }                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Flow Diagram

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                                  │
│  1. Parse intent                                                │
│  2. Validate inputs                                             │
└─────────────────────────────────────────────────────────────────┘
     │
     │ Step 1: Delegate to Analysis Agent
     ▼
┌──────────────────────────┐
│     ANALYSIS AGENT       │
│                          │
│  ┌─────────────────────┐ │
│  │   job-analysis      │ │◄─── Parse requirements, detect red flags
│  └─────────────────────┘ │
│           │              │
│           ▼              │
│  ┌─────────────────────┐ │
│  │  company-evaluation │ │◄─── Research company, 6-category scoring
│  └─────────────────────┘ │
│           │              │
│           ▼              │
│  ┌─────────────────────┐ │
│  │  profile-matching   │ │◄─── Match skills, find gaps
│  └─────────────────────┘ │
│           │              │
│           ▼              │
│  ┌─────────────────────┐ │
│  │    fit-scoring      │ │◄─── Calculate weighted fit score
│  └─────────────────────┘ │
│                          │
│  Output: MatchReport     │
└──────────────────────────┘
     │
     │ MatchReport (passed to Generation Agent)
     ▼
┌──────────────────────────┐
│    GENERATION AGENT      │
│                          │
│  ┌─────────────────────┐ │
│  │   resume-writing    │ │◄─── Tailored resume (StoryBrand + ATS)
│  └─────────────────────┘ │
│           │              │
│           ▼              │
│  ┌─────────────────────┐ │
│  │    cover-letter     │ │◄─── Cover letter (Andrew Askins voice)
│  └─────────────────────┘ │
│           │              │
│           ▼              │
│  ┌─────────────────────┐ │
│  │ question-answering  │ │◄─── Application Q&A (company diversity)
│  └─────────────────────┘ │
│           │              │
│           ▼              │
│  ┌─────────────────────┐ │
│  │ recruiter-response  │ │◄─── Email responses (if needed)
│  └─────────────────────┘ │
│                          │
│  Output: ApplicationKit  │
└──────────────────────────┘
     │
     │ Step 3: Synthesize
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                                  │
│  • Merge MatchReport + ApplicationKit                           │
│  • Generate recommendations based on fit score                  │
│  • Define next steps                                            │
│  • Return ApplicationResponse                                    │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
ApplicationResponse → User Dashboard / Email Notification
```

---

## Directory Structure

```
job-aggregator/
├── .claude/
│   └── skills/                          # Skills loaded by agents
│       │
│       │   # === ANALYSIS AGENT SKILLS (4) ===
│       ├── job-analysis/
│       │   └── SKILL.md
│       ├── profile-matching/
│       │   └── SKILL.md
│       ├── company-evaluation/
│       │   ├── SKILL.md
│       │   ├── SCORING_RUBRIC.md        # 6-category scoring details
│       │   └── INDUSTRY_EXCLUSIONS.md   # Hard-no industries
│       ├── fit-scoring/
│       │   └── SKILL.md
│       │
│       │   # === GENERATION AGENT SKILLS (4) ===
│       ├── resume-writing/
│       │   ├── SKILL.md
│       │   ├── STORYBRAND.md            # Framework
│       │   ├── ATS_OPTIMIZATION.md      # 2025 ATS rules
│       │   └── ROLE_ADAPTATIONS.md      # Role-specific templates
│       ├── cover-letter/
│       │   ├── SKILL.md
│       │   └── ANDREW_ASKINS_VOICE.md   # Voice style guide
│       ├── question-answering/
│       │   ├── SKILL.md
│       │   └── COMPANY_POOL.md          # Company diversity tracking
│       └── recruiter-response/
│           ├── SKILL.md
│           └── NEGOTIATION_STRATEGY.md  # Timing strategy
│
├── packages/
│   ├── job-matching/                    # Core matching package
│   │   ├── src/
│   │   │   ├── orchestrator.ts          # Lightweight coordinator
│   │   │   ├── agents/
│   │   │   │   ├── analysis-agent.ts    # Analysis Agent implementation
│   │   │   │   └── generation-agent.ts  # Generation Agent implementation
│   │   │   ├── mcp-server.ts            # MCP tools for data access
│   │   │   └── types.ts                 # Shared types
│   │   └── package.json
│   │
│   └── computer-use/                    # Auto-apply (Phase 5)
│       └── ...
│
└── apps/
    ├── backend/                         # Motia backend
    └── web/                             # Next.js frontend
```

---

## Core Types

```typescript
// packages/job-matching/src/types.ts

export interface UserProfile {
  id: string
  name: string
  email: string
  summary: string
  experience: WorkExperience[]
  skills: string[]
  education: Education[]
  preferences: JobPreferences
  voiceStyle: 'andrew_askins' | 'professional' | 'friendly'  // Default: andrew_askins
}

export interface JobPosting {
  id: string
  title: string
  company: string
  description: string
  requirements: string[]
  url: string
  source: string
  postedAt: string
}

// === ANALYSIS AGENT OUTPUT ===
export interface MatchReport {
  jobId: string
  userId: string

  // From job-analysis skill
  parsedRequirements: {
    mustHave: string[]
    niceToHave: string[]
    techStack: string[]
    experienceLevel: 'entry' | 'mid' | 'senior' | 'staff' | 'lead'
    responsibilities: string[]
    redFlags: string[]
  }

  // From company-evaluation skill
  companyInsights: {
    overallScore: number  // 0-100
    scores: {
      compensation: number      // 0-20
      culture: number           // 0-25
      familyFriendliness: number // 0-20
      technicalFit: number      // 0-15
      industry: number          // 0-10
      longTermPotential: number // 0-10
    }
    greenFlags: string[]
    redFlags: string[]
    recentNews: string[]
    recommendation: 'STRONG_YES' | 'YES' | 'MAYBE' | 'PASS'
  }

  // From profile-matching skill
  matchAnalysis: {
    overallMatch: number  // 0-100
    strongMatches: string[]
    partialMatches: string[]
    gaps: string[]
    transferableSkills: string[]
  }

  // From fit-scoring skill
  fitScore: {
    composite: number  // 0-100
    confidence: number
    recommendation: 'STRONG_APPLY' | 'APPLY' | 'CONDITIONAL' | 'SKIP'
    reasoning: string
  }

  // Synthesized for generation agent
  talkingPoints: string[]
  gapsToAddress: string[]
  interviewQuestions: string[]
}

// === GENERATION AGENT OUTPUT ===
export interface ApplicationKit {
  jobId: string
  userId: string

  resume: {
    markdown: string
    pdfPath?: string
    highlightedSkills: string[]
    atsScore: number
  }

  coverLetter: {
    markdown: string
    pdfPath?: string
    hookType: 'direct_relevance' | 'vulnerability' | 'contrarian' | 'achievement'
    keyPoints: string[]
  }

  questionAnswers?: {
    question: string
    answer: string
    companyUsed: string  // For diversity tracking
  }[]

  recruiterEmail?: {
    subject: string
    body: string
    type: 'interested' | 'decline' | 'questions'
  }
}

// === ORCHESTRATOR REQUEST/RESPONSE ===
export interface ApplicationRequest {
  user: UserProfile
  jobs: JobPosting[]  // Can be 1 or many
  intent: 'full_application' | 'quick_apply' | 'check_fit' | 'recruiter_response'
  recruiterMessage?: string
  applicationQuestions?: string[]
}

export interface ApplicationResponse {
  results: {
    jobId: string
    matchReport: MatchReport
    applicationKit?: ApplicationKit  // Only if intent includes generation
    recommendations: string[]
    nextSteps: string[]
  }[]
  summary: {
    totalJobs: number
    strongMatches: number
    applicationsGenerated: number
  }
}
```

---

## Agent Implementations

### Analysis Agent

```typescript
// packages/job-matching/src/agents/analysis-agent.ts

import Anthropic from '@anthropic-ai/sdk'
import type { JobPosting, UserProfile, MatchReport } from '../types'

const ANALYSIS_SYSTEM_PROMPT = `You are an expert job market analyst and career advisor.

Your role is to thoroughly analyze job opportunities and evaluate candidate fit.

## Your Skills (read from .claude/skills/ when needed)
1. job-analysis - Parse job postings to extract structured requirements
2. company-evaluation - Research company using 6-category scoring (see SCORING_RUBRIC.md)
3. profile-matching - Compare candidate profile against job requirements
4. fit-scoring - Calculate composite fit score with recommendation

## Workflow
1. ALWAYS start with job-analysis to understand the role
2. Run company-evaluation to assess the employer
3. Use profile-matching to identify alignment and gaps
4. Calculate final fit-score with reasoning

## Output
Synthesize findings into a MatchReport with:
- Clear talking points the candidate should emphasize
- Honest gaps they should address or prepare for
- Overall recommendation (STRONG_APPLY, APPLY, CONDITIONAL, SKIP)

Be thorough but concise. Focus on actionable insights.`

// Tool definitions for skills
const analysisTools: Anthropic.Tool[] = [
  {
    name: 'job_analysis',
    description: 'Parse a job posting to extract requirements, signals, and red flags',
    input_schema: {
      type: 'object',
      properties: {
        job_description: { type: 'string', description: 'Full job posting text' }
      },
      required: ['job_description']
    }
  },
  {
    name: 'company_evaluation',
    description: 'Research and score a company using 6-category rubric',
    input_schema: {
      type: 'object',
      properties: {
        company_name: { type: 'string' },
        job_posting: { type: 'string' }
      },
      required: ['company_name']
    }
  },
  {
    name: 'profile_matching',
    description: 'Match candidate profile to job requirements',
    input_schema: {
      type: 'object',
      properties: {
        requirements: { type: 'array', items: { type: 'string' } },
        profile: { type: 'object' }
      },
      required: ['requirements', 'profile']
    }
  },
  {
    name: 'fit_scoring',
    description: 'Calculate composite fit score with recommendation',
    input_schema: {
      type: 'object',
      properties: {
        job_analysis: { type: 'object' },
        company_evaluation: { type: 'object' },
        profile_match: { type: 'object' }
      },
      required: ['job_analysis', 'profile_match']
    }
  }
]

export class AnalysisAgent {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic()
  }

  async analyze(job: JobPosting, user: UserProfile): Promise<MatchReport> {
    console.log(`[AnalysisAgent] Analyzing job ${job.id} for user ${user.id}`)

    const messages: Anthropic.MessageParam[] = [{
      role: 'user',
      content: `Analyze this job opportunity for the candidate.

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Requirements: ${job.requirements.join(', ')}
URL: ${job.url}

CANDIDATE PROFILE:
Name: ${user.name}
Summary: ${user.summary}
Skills: ${user.skills.join(', ')}
Experience: ${JSON.stringify(user.experience, null, 2)}

Use your skills to:
1. Parse the job requirements (job_analysis)
2. Evaluate the company (company_evaluation)
3. Match the candidate's profile (profile_matching)
4. Score the fit (fit_scoring)

Return a comprehensive MatchReport as JSON.`
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
    content: Anthropic.ContentBlock[],
    job: JobPosting,
    user: UserProfile
  ): Promise<Anthropic.ToolResultBlockParam[]> {
    const results: Anthropic.ToolResultBlockParam[] = []

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
    // Skills execute their logic here
    // In production, these would be more sophisticated
    switch (name) {
      case 'job_analysis':
        return this.analyzeJob(job)
      case 'company_evaluation':
        return this.evaluateCompany(job.company, job)
      case 'profile_matching':
        return this.matchProfile(job, user)
      case 'fit_scoring':
        return this.scoreFit(input)
      default:
        throw new Error(`Unknown skill: ${name}`)
    }
  }

  // Skill implementations (simplified - would read from SKILL.md in production)
  private analyzeJob(job: JobPosting) {
    // Parse job posting using job-analysis skill logic
    return {
      mustHave: job.requirements.slice(0, 5),
      niceToHave: job.requirements.slice(5),
      techStack: this.extractTechStack(job.description),
      experienceLevel: this.detectExperienceLevel(job.title, job.description),
      redFlags: this.detectRedFlags(job.description)
    }
  }

  private evaluateCompany(company: string, job: JobPosting) {
    // Would use WebSearch to research company
    // Returns 6-category scoring
    return {
      overallScore: 75,
      scores: {
        compensation: 15,
        culture: 18,
        familyFriendliness: 14,
        technicalFit: 12,
        industry: 8,
        longTermPotential: 8
      },
      recommendation: 'YES',
      greenFlags: ['Remote-first', 'Series B funded'],
      redFlags: []
    }
  }

  private matchProfile(job: JobPosting, user: UserProfile) {
    // Compare skills, experience, etc.
    return {
      overallMatch: 78,
      strongMatches: user.skills.slice(0, 3),
      partialMatches: user.skills.slice(3, 5),
      gaps: ['Kubernetes', 'GraphQL'],
      transferableSkills: ['Docker → container orchestration']
    }
  }

  private scoreFit(input: unknown) {
    // Synthesize all inputs into final score
    return {
      composite: 76,
      confidence: 85,
      recommendation: 'APPLY',
      reasoning: 'Strong technical match with minor gaps that can be addressed'
    }
  }

  // Helper methods
  private extractTechStack(description: string): string[] {
    const techKeywords = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker']
    return techKeywords.filter(tech =>
      description.toLowerCase().includes(tech.toLowerCase())
    )
  }

  private detectExperienceLevel(title: string, description: string): string {
    if (title.includes('Staff') || title.includes('Principal')) return 'staff'
    if (title.includes('Senior') || title.includes('Sr')) return 'senior'
    if (title.includes('Lead')) return 'lead'
    if (title.includes('Junior') || title.includes('Jr')) return 'entry'
    return 'mid'
  }

  private detectRedFlags(description: string): string[] {
    const flags: string[] = []
    if (description.includes('fast-paced')) flags.push('Potential work-life balance issues')
    if (description.includes('competitive salary')) flags.push('Vague compensation')
    if (description.includes('wear many hats')) flags.push('Role scope unclear')
    return flags
  }

  private extractMatchReport(
    content: Anthropic.ContentBlock[],
    jobId: string,
    userId: string
  ): MatchReport {
    const textBlock = content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from analysis agent')
    }

    // Extract JSON from response
    const jsonMatch = textBlock.text.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      return { jobId, userId, ...JSON.parse(jsonMatch[1]) }
    }

    // Fallback: try to parse entire response as JSON
    try {
      return { jobId, userId, ...JSON.parse(textBlock.text) }
    } catch {
      throw new Error('Could not parse MatchReport from response')
    }
  }
}
```

### Generation Agent

```typescript
// packages/job-matching/src/agents/generation-agent.ts

import Anthropic from '@anthropic-ai/sdk'
import type {
  MatchReport,
  UserProfile,
  ApplicationKit,
  ApplicationRequest
} from '../types'

const GENERATION_SYSTEM_PROMPT = `You are an expert career content writer and personal branding specialist.

Your role is to create compelling, personalized application materials.

## Your Skills (read from .claude/skills/ when needed)
1. resume-writing - Generate tailored resumes (StoryBrand + ATS 2025)
2. cover-letter - Write engaging cover letters (Andrew Askins voice)
3. question-answering - Craft responses to application questions
4. recruiter-response - Draft professional email responses

## Principles
- Every piece of content should be tailored to the specific job
- Emphasize the talking points provided in the MatchReport
- Address gaps proactively with positive framing
- Maintain authentic voice while being professional
- Be concise - hiring managers skim

## Voice (Andrew Askins Style - default)
- Peer-level positioning, not supplicant
- Authentic vulnerability, not performative
- Natural contractions (I'm, I've, that's)
- NO corporate buzzwords (leverage, synergy, passionate)

## Output
Provide complete, ready-to-use content. No placeholders.`

const generationTools: Anthropic.Tool[] = [
  {
    name: 'resume_writing',
    description: 'Generate a tailored resume using StoryBrand framework and ATS optimization',
    input_schema: {
      type: 'object',
      properties: {
        match_report: { type: 'object', description: 'MatchReport from analysis' },
        profile: { type: 'object', description: 'Full user profile' },
        role_type: { type: 'string', enum: ['fullstack', 'ai_ml', 'frontend', 'backend', 'tech_lead'] }
      },
      required: ['match_report', 'profile']
    }
  },
  {
    name: 'cover_letter_writing',
    description: 'Write a personalized cover letter with appropriate hook type',
    input_schema: {
      type: 'object',
      properties: {
        match_report: { type: 'object' },
        profile: { type: 'object' },
        hook_type: { type: 'string', enum: ['direct_relevance', 'vulnerability', 'contrarian', 'achievement'] }
      },
      required: ['match_report', 'profile']
    }
  },
  {
    name: 'question_answering',
    description: 'Answer application questions with company diversity',
    input_schema: {
      type: 'object',
      properties: {
        questions: { type: 'array', items: { type: 'string' } },
        profile: { type: 'object' },
        companies_used: { type: 'array', items: { type: 'string' }, description: 'Already used companies to avoid' }
      },
      required: ['questions', 'profile']
    }
  },
  {
    name: 'recruiter_response',
    description: 'Draft response to recruiter message',
    input_schema: {
      type: 'object',
      properties: {
        recruiter_message: { type: 'string' },
        match_report: { type: 'object' },
        response_type: { type: 'string', enum: ['interested', 'decline', 'questions'] }
      },
      required: ['recruiter_message']
    }
  }
]

export class GenerationAgent {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic()
  }

  async generate(
    matchReport: MatchReport,
    user: UserProfile,
    request: ApplicationRequest
  ): Promise<ApplicationKit> {
    console.log(`[GenerationAgent] Generating materials for job ${matchReport.jobId}`)

    const prompt = this.buildPrompt(matchReport, user, request)

    const messages: Anthropic.MessageParam[] = [{
      role: 'user',
      content: prompt
    }]

    let response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,  // Larger for content generation
      system: GENERATION_SYSTEM_PROMPT,
      tools: generationTools,
      messages
    })

    // Agentic loop
    while (response.stop_reason === 'tool_use') {
      const toolResults = await this.processToolCalls(response.content, matchReport, user)

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: GENERATION_SYSTEM_PROMPT,
        tools: generationTools,
        messages
      })
    }

    return this.extractApplicationKit(response.content, matchReport.jobId, user.id)
  }

  private buildPrompt(
    matchReport: MatchReport,
    user: UserProfile,
    request: ApplicationRequest
  ): string {
    let prompt = `Create application materials for this opportunity.

MATCH REPORT (from analysis):
Fit Score: ${matchReport.fitScore.composite}/100
Recommendation: ${matchReport.fitScore.recommendation}
Talking Points: ${matchReport.talkingPoints.join(', ')}
Gaps to Address: ${matchReport.gapsToAddress.join(', ')}

CANDIDATE PROFILE:
Name: ${user.name}
Summary: ${user.summary}
Voice Style: ${user.voiceStyle || 'andrew_askins'}

INTENT: ${request.intent}

REQUIRED OUTPUTS:`

    if (request.intent === 'full_application' || request.intent === 'quick_apply') {
      prompt += `
- Tailored resume (use resume_writing skill)
- Cover letter (use cover_letter_writing skill)`
    }

    if (request.applicationQuestions?.length) {
      prompt += `

APPLICATION QUESTIONS:
${request.applicationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Use question_answering skill to answer these.`
    }

    if (request.intent === 'recruiter_response' && request.recruiterMessage) {
      prompt += `

RECRUITER MESSAGE TO RESPOND TO:
${request.recruiterMessage}

Use recruiter_response skill to draft reply.`
    }

    prompt += `

Return complete ApplicationKit as JSON with all generated content.`

    return prompt
  }

  private async processToolCalls(
    content: Anthropic.ContentBlock[],
    matchReport: MatchReport,
    user: UserProfile
  ): Promise<Anthropic.ToolResultBlockParam[]> {
    const results: Anthropic.ToolResultBlockParam[] = []

    for (const block of content) {
      if (block.type === 'tool_use') {
        const result = await this.executeSkill(block.name, block.input, matchReport, user)
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result)
        })
      }
    }

    return results
  }

  private async executeSkill(
    name: string,
    input: unknown,
    matchReport: MatchReport,
    user: UserProfile
  ): Promise<unknown> {
    switch (name) {
      case 'resume_writing':
        return this.writeResume(matchReport, user)
      case 'cover_letter_writing':
        return this.writeCoverLetter(matchReport, user, input)
      case 'question_answering':
        return this.answerQuestions(input, user)
      case 'recruiter_response':
        return this.respondToRecruiter(input, matchReport)
      default:
        throw new Error(`Unknown skill: ${name}`)
    }
  }

  // Skill implementations
  private writeResume(matchReport: MatchReport, user: UserProfile) {
    // Would implement full resume-writing skill logic
    // StoryBrand framework + ATS optimization
    return {
      markdown: `# ${user.name}\n\n## Summary\n${user.summary}\n\n...`,
      highlightedSkills: matchReport.matchAnalysis.strongMatches,
      atsScore: 85
    }
  }

  private writeCoverLetter(matchReport: MatchReport, user: UserProfile, input: unknown) {
    // Would implement full cover-letter skill logic
    // Andrew Askins voice + hook type selection
    return {
      markdown: `Dear Hiring Team,\n\nHere's the honest version of why I'm reaching out...`,
      hookType: 'direct_relevance',
      keyPoints: matchReport.talkingPoints
    }
  }

  private answerQuestions(input: unknown, user: UserProfile) {
    // Would implement question-answering skill logic
    // With company diversity tracking
    const typedInput = input as { questions: string[]; companies_used?: string[] }
    return typedInput.questions.map((q, i) => ({
      question: q,
      answer: `Response using STAR+R format...`,
      companyUsed: `Company${i + 1}`  // Would track and diversify
    }))
  }

  private respondToRecruiter(input: unknown, matchReport: MatchReport) {
    // Would implement recruiter-response skill logic
    const typedInput = input as { recruiter_message: string; response_type?: string }
    return {
      subject: 'Re: Opportunity Discussion',
      body: `Hi [Name],\n\nThanks for reaching out...`,
      type: typedInput.response_type || 'interested'
    }
  }

  private extractApplicationKit(
    content: Anthropic.ContentBlock[],
    jobId: string,
    userId: string
  ): ApplicationKit {
    const textBlock = content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from generation agent')
    }

    const jsonMatch = textBlock.text.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      return { jobId, userId, ...JSON.parse(jsonMatch[1]) }
    }

    try {
      return { jobId, userId, ...JSON.parse(textBlock.text) }
    } catch {
      throw new Error('Could not parse ApplicationKit from response')
    }
  }
}
```

### Orchestrator

```typescript
// packages/job-matching/src/orchestrator.ts

import { AnalysisAgent } from './agents/analysis-agent'
import { GenerationAgent } from './agents/generation-agent'
import type {
  ApplicationRequest,
  ApplicationResponse,
  MatchReport,
  JobPosting
} from './types'

/**
 * Lightweight orchestrator that coordinates Analysis and Generation agents.
 *
 * Benefits of 2-agent architecture:
 * - Clean separation: Analysis (read-heavy) vs Generation (write-heavy)
 * - Natural data flow: MatchReport passes from Analysis → Generation
 * - Parallel potential: Can analyze multiple jobs simultaneously
 * - Focused context: Each agent has 4 skills, not 8
 */
export class ApplicationOrchestrator {
  private analysisAgent: AnalysisAgent
  private generationAgent: GenerationAgent

  constructor() {
    this.analysisAgent = new AnalysisAgent()
    this.generationAgent = new GenerationAgent()
  }

  async processApplication(request: ApplicationRequest): Promise<ApplicationResponse> {
    console.log(`[Orchestrator] Processing ${request.intent} for ${request.jobs.length} job(s)`)

    const results = await Promise.all(
      request.jobs.map(job => this.processJob(job, request))
    )

    // Summarize results
    const strongMatches = results.filter(r =>
      r.matchReport.fitScore.recommendation === 'STRONG_APPLY'
    ).length

    const applicationsGenerated = results.filter(r =>
      r.applicationKit !== undefined
    ).length

    return {
      results,
      summary: {
        totalJobs: request.jobs.length,
        strongMatches,
        applicationsGenerated
      }
    }
  }

  private async processJob(
    job: JobPosting,
    request: ApplicationRequest
  ): Promise<{
    jobId: string
    matchReport: MatchReport
    applicationKit?: ApplicationKit
    recommendations: string[]
    nextSteps: string[]
  }> {
    // Step 1: Run Analysis Agent
    console.log(`[Orchestrator] Delegating to Analysis Agent for ${job.id}`)
    const matchReport = await this.analysisAgent.analyze(job, request.user)
    console.log(`[Orchestrator] Analysis complete. Fit: ${matchReport.fitScore.composite}`)

    // Step 2: Decide if we should generate materials
    const shouldGenerate =
      request.intent !== 'check_fit' &&
      matchReport.fitScore.composite >= 50  // Skip generation for poor matches

    let applicationKit = undefined

    if (shouldGenerate) {
      // Step 3: Run Generation Agent
      console.log(`[Orchestrator] Delegating to Generation Agent`)
      applicationKit = await this.generationAgent.generate(
        matchReport,
        request.user,
        request
      )
      console.log(`[Orchestrator] Generation complete`)
    }

    // Step 4: Generate recommendations and next steps
    const recommendations = this.generateRecommendations(matchReport)
    const nextSteps = this.generateNextSteps(request.intent, matchReport, !!applicationKit)

    return {
      jobId: job.id,
      matchReport,
      applicationKit,
      recommendations,
      nextSteps
    }
  }

  private generateRecommendations(matchReport: MatchReport): string[] {
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

    if (matchReport.companyInsights?.recentNews?.length > 0) {
      recommendations.push('Reference recent company news to show you did your research')
    }

    return recommendations
  }

  private generateNextSteps(
    intent: string,
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
}

// Export singleton for Motia integration
export const orchestrator = new ApplicationOrchestrator()
```

---

## 8 Skills (Ported from beetz12)

Each skill follows Anthropic's SKILL.md format. Skills are distributed between agents:

### Analysis Agent Skills (4)

#### Skill 1: job-analysis
Same as V2 - Parse job postings to extract requirements, signals, and red flags.

#### Skill 2: profile-matching
Same as V2 - Match user profiles to job requirements with semantic understanding.

#### Skill 3: company-evaluation
Same as V2 - Evaluate companies using 6-category scoring with immediate disqualifiers.

#### Skill 4: fit-scoring
Same as V2 - Synthesize job analysis, profile matching, and company evaluation into final recommendation.

### Generation Agent Skills (4)

#### Skill 5: resume-writing
Same as V2 - Create tailored resumes using StoryBrand framework and ATS 2025 best practices.

#### Skill 6: cover-letter
Same as V2 - Write personalized cover letters using Andrew Askins voice style.

#### Skill 7: question-answering
Same as V2 - Answer custom job application questions with authentic voice and company diversity.

#### Skill 8: recruiter-response
Same as V2 - Screen recruiter messages and draft authentic responses.

---

## MCP Tools (Data Access Only)

```typescript
// packages/job-matching/src/mcp-server.ts

import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"

export const jobMatchingMcpServer = createSdkMcpServer({
  name: "job-matching",
  version: "1.0.0",
  tools: [
    // Data retrieval
    tool("get_job_details", "Get full job posting details",
      { jobId: z.string() },
      async (args) => fetchJobFromDB(args.jobId)
    ),

    tool("get_user_profile", "Get user profile with skills and experience",
      { userId: z.string() },
      async (args) => fetchProfileFromDB(args.userId)
    ),

    tool("get_voice_style", "Get voice style configuration",
      { style: z.enum(["andrew_askins", "professional", "friendly"]) },
      async (args) => loadVoiceStyle(args.style)
    ),

    // Computation
    tool("semantic_match", "Calculate semantic similarity between texts",
      { text1: z.string(), text2: z.string() },
      async (args) => calculateEmbeddingSimilarity(args.text1, args.text2)
    ),

    // Document generation
    tool("generate_pdf", "Convert markdown to PDF",
      { markdown: z.string(), outputPath: z.string() },
      async (args) => convertToPDF(args.markdown, args.outputPath)
    ),

    // Notifications
    tool("send_notification", "Send email notification via SendGrid",
      { userId: z.string(), subject: z.string(), body: z.string() },
      async (args) => sendEmail(args)
    ),

    // Storage
    tool("save_document", "Save generated document to storage",
      { type: z.enum(["resume", "cover_letter", "response"]), content: z.string(), opportunityId: z.string() },
      async (args) => saveToStorage(args)
    )
  ]
})
```

---

## Comparison: V1 vs V2 vs V3

| Aspect | V1 (8 Agents) | V2 (1 + 8 Skills) | V3 (2 Agents + 8 Skills) |
|--------|---------------|-------------------|--------------------------|
| **Agents** | 8 | 1 | **2** |
| **Skills per agent** | 1 | 8 | **4** |
| **Context efficiency** | Poor (fragmented) | Poor (overloaded) | **Good (focused)** |
| **Parallelization** | Complex | None | **Natural (Analysis \|\| Generation)** |
| **Cognitive load** | Low per agent | Very high | **Balanced** |
| **Coordination** | Complex | None | **Simple (sequential)** |
| **Data flow** | Multiple handoffs | N/A | **Clean (MatchReport → Generation)** |
| **Error handling** | Scattered | Centralized | **Grouped by domain** |
| **Testability** | Fine-grained | Monolithic | **2 testable units** |

---

## Implementation Phases

### Phase 1: Skills Setup (Week 1)

1. **Create .claude/skills/ directory**
2. **Port beetz12 skills to SKILL.md format**:
   - Analysis skills: job-analysis, company-evaluation, profile-matching, fit-scoring
   - Generation skills: resume-writing, cover-letter, question-answering, recruiter-response

### Phase 2: Agents & MCP (Week 2)

3. **Create packages/job-matching**
4. **Implement Analysis Agent** with 4 skills
5. **Implement Generation Agent** with 4 skills
6. **Implement Orchestrator** for coordination
7. **Implement MCP server** with data access tools

### Phase 3: Backend Integration (Week 3)

8. **Motia API endpoints**:
   - POST /api/v1/match-jobs (check fit for multiple jobs)
   - POST /api/v1/apply (generate full application materials)
   - POST /api/v1/recruiter-response (handle recruiter emails)

9. **Event handlers**:
   - match-complete → send-notification (via SendGrid)

### Phase 4: Frontend (Week 4)

10. **Dashboard updates**:
    - Job matching results with fit scores
    - Fit analysis display (breakdown by category)
    - Document generation UI (resume + cover letter preview)
    - "Check Fit" button on job cards
    - "Generate Application" action

### Phase 5: Auto-Apply (Week 5+)

11. **Computer Use package** for automated form filling
    - Human confirmation before each submit
    - Progress tracking in dashboard

---

## Why 90% Confidence

| Component | Confidence | Reasoning |
|-----------|------------|-----------|
| 2-agent architecture | 95% | Natural cognitive separation, research-validated |
| Skills distribution (4+4) | 90% | Balanced load, clear ownership |
| Orchestrator pattern | 95% | Simple coordination, proven pattern |
| beetz12 portability | 95% | Already structured as procedures |
| MCP tools | 90% | Standard SDK pattern |
| **Overall** | **90%** |

### Key Benefits of V3

1. **Balanced complexity**: Not too simple (V2), not too complex (V1)
2. **Natural data flow**: Analysis produces MatchReport → Generation consumes it
3. **Focused agents**: Each agent has 4 related skills, not 8 unrelated ones
4. **Parallel potential**: Can analyze multiple jobs in parallel
5. **Clear testing**: Two discrete units to test independently
6. **Anthropic aligned**: Uses Skills paradigm with appropriate agent count

### Remaining Risks

- Agent handoff overhead (low risk - only 1 handoff)
- Context window for large job batches (mitigated by parallel processing)

---

## Summary

| What | How |
|------|-----|
| **Analysis** | Analysis Agent with 4 skills (job, company, profile, fit) |
| **Generation** | Generation Agent with 4 skills (resume, cover letter, Q&A, recruiter) |
| **Coordination** | Lightweight orchestrator |
| **Data access** | MCP tools |
| **Data flow** | MatchReport passed from Analysis → Generation |
| **Parallelization** | Multiple jobs analyzed in parallel |
| **Document generation** | Skills + PDF tool |
| **Auto-apply** | Computer Use package (Phase 5) |

---

## Document Metadata

**Last Updated**: 2026-01-01
**Implementation Status**: In Progress
**Related Documents**:
- [FEATURE_SCRAPER_API_DATE_FILTER.md](./FEATURE_SCRAPER_API_DATE_FILTER.md)
- [new_feature_request.md](./new_feature_request.md)

**Change Log**:
- 2026-01-01 - V3: Balanced architecture with 2 agents + 8 skills
- 2026-01-01 - V2: Skills-first with single orchestrator (overcorrected)
- 2026-01-01 - V1: Initial 8-agent architecture (over-engineered)
