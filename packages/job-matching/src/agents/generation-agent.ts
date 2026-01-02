/**
 * Generation Agent
 *
 * Responsible for creating personalized application materials.
 * Uses 4 skills: resume-writing, cover-letter, question-answering, recruiter-response
 *
 * Input: MatchReport + UserProfile + ApplicationRequest
 * Output: ApplicationKit
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  MatchReport,
  UserProfile,
  ApplicationKit,
  ApplicationRequest,
  GeneratedResume,
  GeneratedCoverLetter,
  QuestionAnswer,
  RecruiterEmail,
  HookType,
  EmailResponseType
} from '../types.js'

const GENERATION_SYSTEM_PROMPT = `You are an expert career content writer and personal branding specialist.

Your role is to create compelling, personalized application materials.

## Your Skills (read from .claude/skills/ when needed)
1. resume_writing - Generate tailored resumes (StoryBrand + ATS 2025)
2. cover_letter_writing - Write engaging cover letters (Andrew Askins voice)
3. question_answering - Craft responses to application questions
4. recruiter_response - Draft professional email responses

## Principles
- Every piece of content should be tailored to the specific job
- Emphasize the talking points provided in the MatchReport
- Address gaps proactively with positive framing
- Maintain authentic voice while being professional
- Be concise - hiring managers skim

## Voice (Andrew Askins Style - default)
- Peer-level positioning, not supplicant
- Authentic vulnerability, not performative
- Natural contractions (I am -> I'm, I have -> I've, that is -> that's)
- NO corporate buzzwords (leverage, synergy, passionate, driven)
- Show do not tell - specific examples over generic claims
- Conversational but not casual

## Resume Guidelines (ATS 2025)
- Clean, parseable format
- Keywords from job posting naturally integrated
- Quantified achievements (%, $, #)
- Clear section headers
- No tables, columns, or graphics

## Cover Letter Guidelines
- 250-350 words max
- Hook in first sentence
- Specific company/role connection
- One vulnerability or learning moment
- Clear call to action

## Output
After using tools, provide complete ApplicationKit as JSON with all generated content.
No placeholders - everything should be ready to use.`

const generationTools: Anthropic.Messages.Tool[] = [
  {
    name: 'resume_writing',
    description: 'Generate a tailored resume using StoryBrand framework and ATS 2025 best practices. Returns markdown resume, highlighted skills, and ATS optimization score.',
    input_schema: {
      type: 'object' as const,
      properties: {
        talking_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key points to emphasize from MatchReport'
        },
        strong_matches: {
          type: 'array',
          items: { type: 'string' },
          description: 'Skills that strongly match job requirements'
        },
        gaps_to_address: {
          type: 'array',
          items: { type: 'string' },
          description: 'Gaps to address with positive framing'
        },
        role_type: {
          type: 'string',
          enum: ['fullstack', 'ai_ml', 'frontend', 'backend', 'tech_lead', 'product', 'design'],
          description: 'Type of role for template selection'
        },
        experience_summary: {
          type: 'string',
          description: 'Candidate experience summary'
        }
      },
      required: ['talking_points', 'strong_matches']
    }
  },
  {
    name: 'cover_letter_writing',
    description: 'Write a personalized cover letter using Andrew Askins voice style. Returns markdown cover letter, hook type used, and key points covered.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string', description: 'Target company' },
        job_title: { type: 'string', description: 'Target role' },
        talking_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key points to emphasize'
        },
        company_insights: {
          type: 'object',
          description: 'Company insights from MatchReport'
        },
        hook_type: {
          type: 'string',
          enum: ['direct_relevance', 'vulnerability', 'contrarian', 'achievement'],
          description: 'Type of opening hook to use'
        },
        candidate_summary: {
          type: 'string',
          description: 'Brief candidate background'
        }
      },
      required: ['company_name', 'job_title', 'talking_points']
    }
  },
  {
    name: 'question_answering',
    description: 'Answer application questions with authentic voice and company diversity tracking. Returns array of question-answer pairs with company references used.',
    input_schema: {
      type: 'object' as const,
      properties: {
        questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Application questions to answer'
        },
        candidate_experience: {
          type: 'array',
          items: { type: 'object' },
          description: 'Candidate work experience for examples'
        },
        companies_used: {
          type: 'array',
          items: { type: 'string' },
          description: 'Companies already referenced (for diversity)'
        },
        voice_style: {
          type: 'string',
          enum: ['andrew_askins', 'professional', 'friendly'],
          description: 'Voice style to use'
        }
      },
      required: ['questions', 'candidate_experience']
    }
  },
  {
    name: 'recruiter_response',
    description: 'Draft response to recruiter message with appropriate tone and strategy. Returns email subject, body, and response type.',
    input_schema: {
      type: 'object' as const,
      properties: {
        recruiter_message: {
          type: 'string',
          description: 'Original recruiter message'
        },
        fit_score: {
          type: 'number',
          description: 'Fit score from MatchReport (0-100)'
        },
        recommendation: {
          type: 'string',
          enum: ['STRONG_APPLY', 'APPLY', 'CONDITIONAL', 'SKIP'],
          description: 'Recommendation from MatchReport'
        },
        response_type: {
          type: 'string',
          enum: ['interested', 'decline', 'questions'],
          description: 'Type of response to draft'
        },
        talking_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'Points to emphasize if interested'
        }
      },
      required: ['recruiter_message']
    }
  }
]

interface ResumeWritingInput {
  talking_points: string[]
  strong_matches: string[]
  gaps_to_address?: string[]
  role_type?: string
  experience_summary?: string
}

interface CoverLetterWritingInput {
  company_name: string
  job_title: string
  talking_points: string[]
  company_insights?: Record<string, unknown>
  hook_type?: HookType
  candidate_summary?: string
}

interface QuestionAnsweringInput {
  questions: string[]
  candidate_experience: Array<Record<string, unknown>>
  companies_used?: string[]
  voice_style?: string
}

interface RecruiterResponseInput {
  recruiter_message: string
  fit_score?: number
  recommendation?: string
  response_type?: EmailResponseType
  talking_points?: string[]
}

export class GenerationAgent {
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    })
  }

  async generate(
    matchReport: MatchReport,
    user: UserProfile,
    request: ApplicationRequest
  ): Promise<ApplicationKit> {
    console.log('[GenerationAgent] Generating materials for job ' + matchReport.jobId)

    const prompt = this.buildPrompt(matchReport, user, request)

    const messages: Anthropic.Messages.MessageParam[] = [{
      role: 'user',
      content: prompt
    }]

    let response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: GENERATION_SYSTEM_PROMPT,
      tools: generationTools,
      messages
    })

    // Agentic loop
    while (response.stop_reason === 'tool_use') {
      const toolResults = await this.processToolCalls(response.content, matchReport, user, request)

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
    const talkingPointsList = matchReport.talkingPoints.map(p => '- ' + p).join('\n')
    const gapsToAddressList = matchReport.gapsToAddress.map(g => '- ' + g).join('\n')
    const strongMatchesList = matchReport.matchAnalysis.strongMatches.map(s => '- ' + s).join('\n')
    const experienceList = user.experience.map(exp => {
      const endDate = exp.current ? 'Present' : exp.endDate
      return '- ' + exp.title + ' at ' + exp.company + ' (' + exp.startDate + ' - ' + endDate + ')'
    }).join('\n')

    let prompt = 'Create application materials for this opportunity.\n\n'
    prompt += 'MATCH REPORT (from analysis):\n'
    prompt += 'Fit Score: ' + matchReport.fitScore.composite + '/100\n'
    prompt += 'Recommendation: ' + matchReport.fitScore.recommendation + '\n'
    prompt += 'Reasoning: ' + matchReport.fitScore.reasoning + '\n\n'
    prompt += 'Talking Points to Emphasize:\n' + talkingPointsList + '\n\n'
    prompt += 'Gaps to Address Positively:\n' + gapsToAddressList + '\n\n'
    prompt += 'Strong Skill Matches:\n' + strongMatchesList + '\n\n'
    prompt += 'Company Insights:\n'
    prompt += '- Overall Score: ' + matchReport.companyInsights.overallScore + '/100\n'
    prompt += '- Green Flags: ' + (matchReport.companyInsights.greenFlags.join(', ') || 'None identified') + '\n'
    prompt += '- Red Flags: ' + (matchReport.companyInsights.redFlags.join(', ') || 'None identified') + '\n\n'
    prompt += 'CANDIDATE PROFILE:\n'
    prompt += 'Name: ' + user.name + '\n'
    prompt += 'Email: ' + user.email + '\n'
    prompt += 'Summary: ' + user.summary + '\n'
    prompt += 'Voice Style: ' + (user.voiceStyle || 'andrew_askins') + '\n\n'
    prompt += 'Experience:\n' + experienceList + '\n\n'
    prompt += 'Skills: ' + user.skills.join(', ') + '\n\n'
    prompt += 'INTENT: ' + request.intent + '\n\n'
    prompt += 'REQUIRED OUTPUTS:'

    if (request.intent === 'full_application' || request.intent === 'quick_apply') {
      prompt += '\n1. Tailored resume (use resume_writing skill)'
      prompt += '\n2. Cover letter (use cover_letter_writing skill)'
    }

    if (request.applicationQuestions && request.applicationQuestions.length > 0) {
      prompt += '\n\nAPPLICATION QUESTIONS TO ANSWER:\n'
      prompt += request.applicationQuestions.map((q, i) => (i + 1) + '. ' + q).join('\n')
      prompt += '\n\nUse question_answering skill to answer these with authentic voice.'
    }

    if (request.intent === 'recruiter_response' && request.recruiterMessage) {
      prompt += '\n\nRECRUITER MESSAGE TO RESPOND TO:\n"""\n'
      prompt += request.recruiterMessage
      prompt += '\n"""\n\nUse recruiter_response skill to draft an appropriate reply based on fit score.'
    }

    prompt += '\n\nAfter using the appropriate tools, provide the complete ApplicationKit as JSON with all generated content.'

    return prompt
  }

  private async processToolCalls(
    content: Anthropic.Messages.ContentBlock[],
    matchReport: MatchReport,
    user: UserProfile,
    request: ApplicationRequest
  ): Promise<Anthropic.Messages.ToolResultBlockParam[]> {
    const results: Anthropic.Messages.ToolResultBlockParam[] = []

    for (const block of content) {
      if (block.type === 'tool_use') {
        const result = await this.executeSkill(block.name, block.input, matchReport, user, request)
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
    user: UserProfile,
    _request: ApplicationRequest
  ): Promise<unknown> {
    console.log('[GenerationAgent] Executing skill: ' + name)

    switch (name) {
      case 'resume_writing':
        return this.writeResume(input as ResumeWritingInput, matchReport, user)
      case 'cover_letter_writing':
        return this.writeCoverLetter(input as CoverLetterWritingInput, matchReport, user)
      case 'question_answering':
        return this.answerQuestions(input as QuestionAnsweringInput, user)
      case 'recruiter_response':
        return this.respondToRecruiter(input as RecruiterResponseInput, matchReport)
      default:
        throw new Error('Unknown skill: ' + name)
    }
  }

  // Skill implementations

  private writeResume(
    input: ResumeWritingInput,
    matchReport: MatchReport,
    user: UserProfile
  ): GeneratedResume {
    const talkingPoints = input.talking_points || matchReport.talkingPoints
    const strongMatches = input.strong_matches || matchReport.matchAnalysis.strongMatches

    // Build resume sections
    const sections: string[] = []

    // Header
    sections.push('# ' + user.name)
    sections.push(user.email)
    sections.push('')

    // Summary - tailored to job
    sections.push('## Summary')
    let summary = user.summary
    if (talkingPoints.length > 0) {
      summary += ' Key strengths include ' + talkingPoints.slice(0, 2).join(' and ') + '.'
    }
    sections.push(summary)
    sections.push('')

    // Skills - emphasize matches
    sections.push('## Skills')
    const strongMatchesLower = strongMatches.map(m => m.toLowerCase())
    const skillsList = [...strongMatches, ...user.skills.filter(s =>
      !strongMatchesLower.includes(s.toLowerCase())
    )].slice(0, 15)
    sections.push(skillsList.join(' | '))
    sections.push('')

    // Experience
    sections.push('## Experience')
    for (const exp of user.experience.slice(0, 4)) {
      sections.push('### ' + exp.title)
      const endDate = exp.current ? 'Present' : exp.endDate
      sections.push('**' + exp.company + '** | ' + exp.startDate + ' - ' + endDate)
      sections.push('')
      sections.push(exp.description)
      if (exp.achievements.length > 0) {
        sections.push('')
        for (const achievement of exp.achievements.slice(0, 3)) {
          sections.push('- ' + achievement)
        }
      }
      sections.push('')
    }

    // Education
    if (user.education.length > 0) {
      sections.push('## Education')
      for (const edu of user.education) {
        sections.push('**' + edu.degree + '** in ' + edu.field)
        sections.push(edu.institution + ' | ' + edu.graduationDate)
        sections.push('')
      }
    }

    const markdown = sections.join('\n')

    // Calculate ATS score based on keyword presence
    const atsScore = this.calculateAtsScore(markdown, strongMatches)

    return {
      markdown,
      highlightedSkills: strongMatches,
      atsScore
    }
  }

  private writeCoverLetter(
    input: CoverLetterWritingInput,
    matchReport: MatchReport,
    user: UserProfile
  ): GeneratedCoverLetter {
    const company = input.company_name
    const title = input.job_title
    const talkingPoints = input.talking_points || matchReport.talkingPoints
    const hookType = input.hook_type || this.selectHookType(matchReport)

    const paragraphs: string[] = []

    // Opening hook based on type
    const hook = this.generateHook(hookType, company, title, user)
    paragraphs.push(hook)

    // Connection paragraph
    const connection = this.generateConnectionParagraph(talkingPoints, matchReport)
    paragraphs.push(connection)

    // Value proposition
    const value = this.generateValueParagraph(matchReport)
    paragraphs.push(value)

    // Closing
    const closing = this.generateClosing(company, user.name)
    paragraphs.push(closing)

    const markdown = paragraphs.join('\n\n')

    return {
      markdown,
      hookType,
      keyPoints: talkingPoints.slice(0, 3)
    }
  }

  private answerQuestions(
    input: QuestionAnsweringInput,
    user: UserProfile
  ): QuestionAnswer[] {
    const questions = input.questions
    const companiesUsed = new Set(input.companies_used || [])
    const availableCompanies = user.experience
      .map(e => e.company)
      .filter(c => !companiesUsed.has(c))

    return questions.map((question, index) => {
      // Select company for this answer (rotate through available)
      const companyForAnswer = availableCompanies[index % availableCompanies.length]
        || (user.experience[0] ? user.experience[0].company : 'my previous role')

      const answer = this.generateQuestionAnswer(question, user, companyForAnswer)

      return {
        question,
        answer,
        companyUsed: companyForAnswer
      }
    })
  }

  private respondToRecruiter(
    input: RecruiterResponseInput,
    matchReport: MatchReport
  ): RecruiterEmail {
    const fitScore = input.fit_score !== undefined ? input.fit_score : matchReport.fitScore.composite
    const recommendation = input.recommendation || matchReport.fitScore.recommendation

    // Determine response type based on fit if not specified
    let responseType: EmailResponseType = input.response_type || 'interested'
    if (!input.response_type) {
      if (recommendation === 'SKIP' || fitScore < 40) {
        responseType = 'decline'
      } else if (recommendation === 'CONDITIONAL') {
        responseType = 'questions'
      }
    }

    const emailContent = this.generateRecruiterResponse(
      responseType,
      matchReport,
      input.talking_points
    )

    return {
      subject: emailContent.subject,
      body: emailContent.body,
      type: responseType
    }
  }

  // Helper methods

  private calculateAtsScore(markdown: string, keywords: string[]): number {
    let score = 70 // Base score for clean format

    const contentLower = markdown.toLowerCase()

    // Check keyword presence
    let keywordsFound = 0
    for (const keyword of keywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        keywordsFound++
      }
    }

    if (keywords.length > 0) {
      score += Math.round((keywordsFound / keywords.length) * 20)
    }

    // Check for quantified achievements
    const numbers = markdown.match(/\d+%|\$\d+|\d+\+/g)
    if (numbers && numbers.length > 0) {
      score += Math.min(10, numbers.length * 2)
    }

    return Math.min(100, score)
  }

  private selectHookType(matchReport: MatchReport): HookType {
    // Select hook type based on match analysis
    if (matchReport.fitScore.composite >= 85) {
      return 'direct_relevance'
    }
    if (matchReport.matchAnalysis.gaps.length > 2) {
      return 'vulnerability'
    }
    if (matchReport.companyInsights.greenFlags.length > 0) {
      return 'achievement'
    }
    return 'contrarian'
  }

  private generateHook(
    hookType: HookType,
    company: string,
    title: string,
    user: UserProfile
  ): string {
    switch (hookType) {
      case 'direct_relevance':
        return 'I have been building exactly what ' + company + ' needs for the ' + title + ' role. Here is the honest version of why I am reaching out.'

      case 'vulnerability':
        return 'I am going to skip the usual cover letter script. I have been thinking about my next role, and ' + company + ' caught my attention for a specific reason.'

      case 'contrarian':
        return 'Most applications probably start with "I am excited about this opportunity." I will skip that - you have heard it a thousand times. What I can tell you is why ' + company + ' and I might be a good fit.'

      case 'achievement': {
        const latestAchievement = (user.experience[0] && user.experience[0].achievements[0]) || 'my recent work'
        return 'After ' + latestAchievement + ', I have been looking for a team where I can bring that same impact. ' + company + ' ' + title + ' role looks like that place.'
      }

      default:
        return 'I am writing about the ' + title + ' role at ' + company + '.'
    }
  }

  private generateConnectionParagraph(
    talkingPoints: string[],
    matchReport: MatchReport
  ): string {
    const mainPoint = talkingPoints[0] || 'my experience'
    const strongMatch = matchReport.matchAnalysis.strongMatches[0] || 'the core requirements'

    return 'What draws me to this role is the focus on ' + strongMatch + '. In my current work, I have been focused on ' + mainPoint + '. That is not buzzword padding - I have spent the last few years actually doing this, learning what works and what does not.'
  }

  private generateValueParagraph(matchReport: MatchReport): string {
    const gapCount = matchReport.matchAnalysis.gaps.length

    if (gapCount === 0) {
      return 'I have looked through the requirements, and I am confident I can hit the ground running. The tech stack aligns with my experience, and the problems you are solving are ones I have tackled before.'
    }

    const gaps = matchReport.matchAnalysis.gaps.slice(0, 2).join(' and ')
    return 'I will be upfront: I am still building depth in ' + gaps + '. But I have picked up new technologies quickly before, and I have found that a solid foundation in fundamentals makes that transition smoother. I am not coming in as an expert in everything, but I learn fast and I ship.'
  }

  private generateClosing(company: string, name: string): string {
    return 'I would genuinely like to learn more about what you are building at ' + company + '. Happy to chat whenever works for you.\n\nBest,\n' + name
  }

  private generateQuestionAnswer(
    question: string,
    user: UserProfile,
    companyToUse: string
  ): string {
    const questionLower = question.toLowerCase()

    // Find relevant experience
    const relevantExp = user.experience.find(e => e.company === companyToUse)
      || user.experience[0]

    const companyName = relevantExp ? relevantExp.company : companyToUse
    const description = relevantExp ? relevantExp.description : 'we needed to deliver under pressure'
    const achievement = relevantExp && relevantExp.achievements[0] ? relevantExp.achievements[0] : 'we delivered on time'
    const technologies = relevantExp && relevantExp.technologies.length >= 2
      ? relevantExp.technologies.slice(0, 2).join(' and ')
      : 'cross-functional teams'

    // Pattern: STAR+R (Situation, Task, Action, Result, Reflection)
    if (questionLower.includes('challenge') || questionLower.includes('difficult')) {
      return 'At ' + companyName + ', I faced a situation where ' + description + '. My approach was to break the problem down and tackle it systematically. The result was positive - ' + achievement + '. Looking back, I learned that staying calm and methodical beats panic every time.'
    }

    if (questionLower.includes('team') || questionLower.includes('collaborate')) {
      return 'I believe good collaboration starts with clear communication and genuine respect for different perspectives. At ' + companyName + ', I worked closely with ' + technologies + '. I have found that the best outcomes come from listening first and sharing ideas openly.'
    }

    if (questionLower.includes('why') && questionLower.includes('company')) {
      return 'I have done my research, and what stands out is the approach to solving real problems. I am drawn to teams that value shipping over perfection and learning over posturing. That is the environment where I do my best work.'
    }

    // Default response
    const trackRecord = relevantExp && relevantExp.achievements[0] ? relevantExp.achievements[0] : 'My track record shows'
    return 'This is a thoughtful question. Based on my experience at ' + companyName + ', I would approach this by focusing on outcomes over process. ' + trackRecord + ' that I can deliver results while staying grounded and collaborative.'
  }

  private generateRecruiterResponse(
    responseType: EmailResponseType,
    matchReport: MatchReport,
    talkingPoints?: string[]
  ): { subject: string; body: string } {
    switch (responseType) {
      case 'interested': {
        const talkingPointLine = talkingPoints && talkingPoints[0]
          ? 'I have been working on ' + talkingPoints[0] + ', which seems relevant to what you are describing.'
          : 'The role aligns with what I have been looking for.'
        return {
          subject: 'Re: Opportunity Discussion',
          body: 'Hi,\n\nThanks for reaching out - this caught my attention.\n\n' + talkingPointLine + '\n\nI would be happy to chat more. What times work for you this week or next?\n\nBest'
        }
      }

      case 'decline':
        return {
          subject: 'Re: Opportunity Discussion',
          body: 'Hi,\n\nThanks for thinking of me. After looking into this more, I do not think it is the right fit for where I am headed right now.\n\nI appreciate you reaching out, and I wish you the best in your search.\n\nBest'
        }

      case 'questions': {
        const redFlagLine = matchReport.companyInsights.redFlags.length > 0
          ? '\n3. I noticed some things in my research - would love to hear more about ' + matchReport.companyInsights.redFlags[0] + '.'
          : ''
        return {
          subject: 'Re: Opportunity Discussion - A Few Questions',
          body: 'Hi,\n\nThanks for reaching out. This sounds interesting, but I have a few questions before moving forward:\n\n1. Can you share more about the team structure and who I would be working with?\n2. What does the day-to-day look like for this role?' + redFlagLine + '\n\nLooking forward to hearing more.\n\nBest'
        }
      }
    }
  }

  private extractApplicationKit(
    content: Anthropic.Messages.ContentBlock[],
    jobId: string,
    userId: string
  ): ApplicationKit {
    const textBlock = content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from generation agent')
    }

    // Try to extract JSON from markdown code block
    const jsonPattern = /```json\n([\s\S]*?)\n```/
    const jsonMatch = textBlock.text.match(jsonPattern)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        return this.normalizeApplicationKit(parsed, jobId, userId)
      } catch {
        // Fall through to try parsing entire response
      }
    }

    // Try to parse entire response as JSON
    try {
      const parsed = JSON.parse(textBlock.text)
      return this.normalizeApplicationKit(parsed, jobId, userId)
    } catch {
      console.warn('[GenerationAgent] Could not parse ApplicationKit, using defaults')
      return this.createDefaultApplicationKit(jobId, userId)
    }
  }

  private normalizeApplicationKit(
    parsed: Partial<ApplicationKit>,
    jobId: string,
    userId: string
  ): ApplicationKit {
    return {
      jobId,
      userId,
      resume: parsed.resume || {
        markdown: '# Resume\n\nContent not generated',
        highlightedSkills: [],
        atsScore: 0
      },
      coverLetter: parsed.coverLetter || {
        markdown: 'Cover letter not generated',
        hookType: 'direct_relevance',
        keyPoints: []
      },
      questionAnswers: parsed.questionAnswers,
      recruiterEmail: parsed.recruiterEmail
    }
  }

  private createDefaultApplicationKit(jobId: string, userId: string): ApplicationKit {
    return {
      jobId,
      userId,
      resume: {
        markdown: '# Resume\n\nContent generation failed. Please try again.',
        highlightedSkills: [],
        atsScore: 0
      },
      coverLetter: {
        markdown: 'Cover letter generation failed. Please try again.',
        hookType: 'direct_relevance',
        keyPoints: []
      }
    }
  }
}
