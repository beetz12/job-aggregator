import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { Profile, MatchScore } from '../types/profile'
import type { Job } from '../types/job'
import { updateJobScore } from '../services/database'
import { query, isDatabaseConfigured } from '../services/postgres'

const inputSchema = z.object({
  profile_id: z.string(),
  limit: z.number().optional().default(100)
})

const responseSchema = z.object({
  scored: z.number(),
  skipped: z.number(),
  total_jobs: z.number()
})

const errorSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ScoreNewJobs',
  path: '/api/v1/score-new',
  method: 'POST',
  description: 'Batch-score new/unscored jobs using keyword matching',
  emits: [],
  flows: ['profile-matching'],
  bodySchema: inputSchema,
  responseSchema: {
    200: responseSchema,
    400: errorSchema,
    404: errorSchema,
    500: errorSchema
  }
}

// ---------------------------------------------------------------------------
// Keyword scoring functions (same logic as calculate-match-scores.step.ts)
// ---------------------------------------------------------------------------

function calculateSkillScore(profile: Profile, job: Job): number {
  const profileSkills = profile.skills.map(s => s.toLowerCase())
  if (profileSkills.length === 0) return 0

  const jobContent = [
    job.title.toLowerCase(),
    job.description.toLowerCase(),
    ...job.tags.map(t => t.toLowerCase())
  ].join(' ')

  let matchCount = 0
  for (const skill of profileSkills) {
    if (jobContent.includes(skill)) {
      matchCount++
    }
  }

  const matchPercentage = matchCount / profileSkills.length
  return Math.round(matchPercentage * 50)
}

function calculateSeniorityScore(profile: Profile, job: Job): number {
  const titleLower = job.title.toLowerCase()
  const descLower = job.description.toLowerCase()
  const content = titleLower + ' ' + descLower

  let jobLevel: 'junior' | 'mid' | 'senior' | 'lead' = 'mid'

  if (content.includes('junior') || content.includes('entry') || content.includes('associate') || content.includes('graduate')) {
    jobLevel = 'junior'
  } else if (content.includes('lead') || content.includes('principal') || content.includes('staff') || content.includes('architect')) {
    jobLevel = 'lead'
  } else if (content.includes('senior') || content.includes('sr.') || content.includes('sr ')) {
    jobLevel = 'senior'
  }

  const levelOrder = ['junior', 'mid', 'senior', 'lead'] as const
  const profileIndex = levelOrder.indexOf(profile.seniority_level)
  const jobIndex = levelOrder.indexOf(jobLevel)

  const difference = Math.abs(profileIndex - jobIndex)
  const scores = [20, 15, 10, 5]
  return scores[Math.min(difference, 3)]
}

function calculateLocationScore(profile: Profile, job: Job): number {
  if (profile.remote_preference === 'remote-only') {
    return job.remote ? 15 : 0
  }

  if (profile.remote_preference === 'onsite') {
    if (!job.remote) {
      if (job.location && profile.preferred_locations.length > 0) {
        const jobLocLower = job.location.toLowerCase()
        const hasMatch = profile.preferred_locations.some(loc =>
          jobLocLower.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLocLower)
        )
        return hasMatch ? 15 : 5
      }
      return 10
    }
    return 0
  }

  if (profile.remote_preference === 'hybrid') {
    if (job.remote) return 10
    if (job.location && profile.preferred_locations.length > 0) {
      const jobLocLower = job.location.toLowerCase()
      const hasMatch = profile.preferred_locations.some(loc =>
        jobLocLower.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLocLower)
      )
      return hasMatch ? 15 : 8
    }
    return 8
  }

  // flexible
  if (job.remote) return 12
  if (job.location && profile.preferred_locations.length > 0) {
    const jobLocLower = job.location.toLowerCase()
    const hasMatch = profile.preferred_locations.some(loc =>
      jobLocLower.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLocLower)
    )
    return hasMatch ? 15 : 10
  }
  return 10
}

function calculateSalaryScore(profile: Profile, _job: Job): number {
  if (!profile.salary_expectation) {
    return 15
  }
  return 10
}

function calculateMatchScore(profile: Profile, job: Job): MatchScore {
  const skill_score = calculateSkillScore(profile, job)
  const seniority_score = calculateSeniorityScore(profile, job)
  const location_score = calculateLocationScore(profile, job)
  const salary_score = calculateSalaryScore(profile, job)

  const total_score = skill_score + seniority_score + location_score + salary_score

  return {
    profile_id: profile.id,
    job_id: job.id,
    total_score,
    breakdown: {
      skill_score,
      seniority_score,
      location_score,
      salary_score
    },
    calculated_at: new Date().toISOString()
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: Handlers['ScoreNewJobs'] = async (req, { state, logger }) => {
  let validatedBody
  try {
    validatedBody = inputSchema.parse(req.body)
  } catch {
    return {
      status: 400,
      body: { error: 'Invalid request body. Required: { profile_id: string, limit?: number }' }
    }
  }

  const { profile_id, limit } = validatedBody

  logger.info('Score new jobs requested', { profile_id, limit })

  // Fetch profile
  const profile = await state.get<Profile>('profiles', profile_id)
  if (!profile) {
    logger.warn('Profile not found', { profile_id })
    return {
      status: 404,
      body: { error: 'Profile not found' }
    }
  }

  try {
    let unscoredJobs: Job[] = []

    if (isDatabaseConfigured()) {
      // Query unscored jobs from DB
      const { rows } = await query<Record<string, unknown>>(
        `SELECT id, title, company, location, remote, description, tags, health_score, source, posted_at, fetched_at
         FROM jobs WHERE match_score IS NULL
         ORDER BY posted_at DESC
         LIMIT $1`,
        [limit]
      )

      unscoredJobs = rows.map(row => ({
        id: row.id as string,
        title: row.title as string,
        company: row.company as string,
        location: row.location as string | undefined,
        remote: row.remote as boolean,
        url: '',
        description: row.description as string,
        source: row.source as Job['source'],
        posted_at: row.posted_at as string,
        fetched_at: row.fetched_at as string,
        tags: (row.tags as string[]) || [],
        health_score: row.health_score as number
      }))
    } else {
      // Fallback: get jobs from state and filter unscored
      const allJobs = await state.getGroup<Job>('jobs')
      const existingScores = await state.getGroup<MatchScore>('match-scores')

      const scoredJobIds = new Set(
        existingScores
          .filter(score => score.profile_id === profile_id)
          .map(score => score.job_id)
      )

      unscoredJobs = allJobs
        .filter(job => !scoredJobIds.has(job.id))
        .slice(0, limit)
    }

    logger.info('Found unscored jobs', { count: unscoredJobs.length, profile_id })

    let scored = 0
    let skipped = 0

    for (const job of unscoredJobs) {
      try {
        const matchScore = calculateMatchScore(profile, job)

        // Store in state
        const scoreKey = `${profile_id}:${job.id}`
        await state.set('match-scores', scoreKey, matchScore)

        // Persist to DB
        try {
          await updateJobScore(job.id, matchScore.total_score, 'keyword')
        } catch {
          // Non-fatal: DB persistence is best-effort
        }

        scored++
      } catch {
        skipped++
      }
    }

    logger.info('Score new jobs completed', { profile_id, scored, skipped, total_jobs: unscoredJobs.length })

    return {
      status: 200,
      body: { scored, skipped, total_jobs: unscoredJobs.length }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to score new jobs', { profile_id, error: errorMessage })
    return {
      status: 500,
      body: { error: `Failed to score new jobs: ${errorMessage}` }
    }
  }
}
