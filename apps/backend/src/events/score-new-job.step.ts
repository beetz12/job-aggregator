import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { Profile, MatchScore } from '../types/profile'
import type { Job } from '../types/job'
import { updateJobScore } from '../services/database'

const inputSchema = z.object({
  job_id: z.string(),
  profile_id: z.string().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'ScoreNewJob',
  description: 'Auto-score a newly stored job using keyword matching',
  subscribes: ['job-stored'],
  emits: [],
  input: inputSchema,
  flows: ['profile-matching']
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

export const handler: Handlers['ScoreNewJob'] = async (input, { state, logger }) => {
  const { job_id, profile_id } = input

  logger.info('Auto-scoring new job', { job_id, profile_id })

  try {
    // Get the job from state
    const job = await state.get<Job>('jobs', job_id)
    if (!job) {
      logger.warn('Job not found in state, skipping auto-score', { job_id })
      return
    }

    // Get the profile
    let profile: Profile | null = null

    if (profile_id) {
      profile = await state.get<Profile>('profiles', profile_id)
    }

    if (!profile) {
      // Try to get the first available profile
      const profiles = await state.getGroup<Profile>('profiles')
      if (profiles.length > 0) {
        profile = profiles[0]
      }
    }

    if (!profile) {
      logger.info('No profile available, skipping auto-score', { job_id })
      return
    }

    // Calculate keyword score
    const matchScore = calculateMatchScore(profile, job)

    // Store in state
    const scoreKey = `${profile.id}:${job.id}`
    await state.set('match-scores', scoreKey, matchScore)

    // Persist to DB
    try {
      await updateJobScore(job.id, matchScore.total_score, 'keyword')
    } catch {
      // Non-fatal: DB persistence is best-effort
    }

    logger.info('Auto-scored new job', {
      job_id,
      profile_id: profile.id,
      score: matchScore.total_score
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to auto-score job', { job_id, error: errorMessage })
  }
}
