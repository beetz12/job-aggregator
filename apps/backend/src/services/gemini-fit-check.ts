import { getGeminiModel } from './gemini-client'
import { getRateLimiter } from './rate-limiter'
import type { Job } from '../types/job'
import type { UserProfile } from '../types/job-matching'

export interface GeminiFitResult {
  jobId: string
  fitScore: number
  matchReasons: string[]
  skillGaps: string[]
  scoreSource: 'gemini'
}

function buildProfileSummary(profile: UserProfile): string {
  const parts: string[] = []

  parts.push(`Name: ${profile.name}`)
  if (profile.summary) parts.push(`Summary: ${profile.summary}`)
  parts.push(`Skills: ${profile.skills.join(', ')}`)

  if (profile.experience?.length) {
    parts.push('Experience:')
    for (const exp of profile.experience) {
      const line = `  - ${exp.title} at ${exp.company} (${exp.startDate}–${exp.endDate || 'present'})`
      parts.push(line)
      if (exp.description) parts.push(`    ${exp.description}`)
    }
  }

  if (profile.education?.length) {
    parts.push('Education:')
    for (const edu of profile.education) {
      parts.push(`  - ${edu.degree}${edu.field ? ` in ${edu.field}` : ''} from ${edu.institution}`)
    }
  }

  if (profile.preferences) {
    const prefs = profile.preferences
    if (prefs.targetRoles?.length) parts.push(`Target roles: ${prefs.targetRoles.join(', ')}`)
    if (prefs.locations?.length) parts.push(`Preferred locations: ${prefs.locations.join(', ')}`)
    if (prefs.remote_preference) parts.push(`Remote preference: ${prefs.remote_preference}`)
    if (prefs.minSalary) parts.push(`Min salary: ${prefs.minSalary}${prefs.currency ? ` ${prefs.currency}` : ''}`)
  }

  return parts.join('\n')
}

function buildPrompt(profile: UserProfile, job: Job): string {
  const profileText = buildProfileSummary(profile)

  return `You are a job fit analyst. Analyze how well this candidate matches the job posting.

## Candidate Profile
${profileText}

## Job Posting
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Remote: ${job.remote ? 'Yes' : 'No'}

Full Description:
${job.description}

## Instructions
Evaluate the candidate's fit for this role. Consider:
1. Skills alignment (both required and nice-to-have)
2. Experience level and relevance
3. Location/remote compatibility
4. Career trajectory alignment

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "fit_score": <number 0-100>,
  "match_reasons": [<string>, ...],
  "skill_gaps": [<string>, ...]
}

- fit_score: 0-100 overall fit score
- match_reasons: 2-5 specific reasons this candidate matches
- skill_gaps: 0-5 skills or qualifications the candidate is missing`
}

function parseGeminiResponse(text: string): { fit_score: number; match_reasons: string[]; skill_gaps: string[] } {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(text)
    return parsed
  } catch {
    // Fallback: extract JSON from response using regex
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // Fall through to default
      }
    }
  }

  // Last resort default
  return {
    fit_score: 50,
    match_reasons: ['Unable to parse AI response'],
    skill_gaps: ['Analysis unavailable']
  }
}

export async function geminiFitCheck(profile: UserProfile, jobs: Job[]): Promise<GeminiFitResult[]> {
  const model = getGeminiModel()
  const limiter = getRateLimiter()
  const results: GeminiFitResult[] = []

  for (const job of jobs) {
    const prompt = buildPrompt(profile, job)

    await limiter.acquire()
    try {
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      const parsed = parseGeminiResponse(text)

      results.push({
        jobId: job.id,
        fitScore: Math.max(0, Math.min(100, parsed.fit_score)),
        matchReasons: parsed.match_reasons || [],
        skillGaps: parsed.skill_gaps || [],
        scoreSource: 'gemini'
      })
    } catch (error) {
      console.error(`Gemini fit check failed for job ${job.id}:`, error)
      results.push({
        jobId: job.id,
        fitScore: 0,
        matchReasons: [],
        skillGaps: ['Fit check failed due to API error'],
        scoreSource: 'gemini'
      })
    } finally {
      limiter.release()
    }
  }

  return results
}
