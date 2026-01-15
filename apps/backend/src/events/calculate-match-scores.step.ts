import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { Profile, MatchScore } from '../types/profile'
import type { Job } from '../types/job'

const inputSchema = z.object({
  profile_id: z.string()
})

export const config: EventConfig = {
  type: 'event',
  name: 'CalculateMatchScores',
  description: 'Calculate job-profile compatibility scores when a profile is updated',
  subscribes: ['profile-updated'],
  emits: [],
  input: inputSchema,
  flows: ['profile-matching']
}

/**
 * Calculate skill overlap score (0-50 points)
 * Matches profile skills against job title, description, and tags
 */
function calculateSkillScore(profile: Profile, job: Job): number {
  const profileSkills = profile.skills.map(s => s.toLowerCase())
  if (profileSkills.length === 0) return 0

  // Combine job content for matching
  const jobContent = [
    job.title.toLowerCase(),
    job.description.toLowerCase(),
    ...job.tags.map(t => t.toLowerCase())
  ].join(' ')

  // Count matching skills
  let matchCount = 0
  for (const skill of profileSkills) {
    // Check for exact match or partial match (e.g., "react" matches "reactjs")
    if (jobContent.includes(skill)) {
      matchCount++
    }
  }

  // Calculate percentage of skills matched, max 50 points
  const matchPercentage = matchCount / profileSkills.length
  return Math.round(matchPercentage * 50)
}

/**
 * Calculate seniority alignment score (0-20 points)
 * Infers job seniority from title and matches against profile level
 */
function calculateSeniorityScore(profile: Profile, job: Job): number {
  const titleLower = job.title.toLowerCase()
  const descLower = job.description.toLowerCase()
  const content = titleLower + ' ' + descLower

  // Infer job seniority level
  let jobLevel: 'junior' | 'mid' | 'senior' | 'lead' = 'mid' // default

  if (content.includes('junior') || content.includes('entry') || content.includes('associate') || content.includes('graduate')) {
    jobLevel = 'junior'
  } else if (content.includes('lead') || content.includes('principal') || content.includes('staff') || content.includes('architect')) {
    jobLevel = 'lead'
  } else if (content.includes('senior') || content.includes('sr.') || content.includes('sr ')) {
    jobLevel = 'senior'
  }

  // Score based on match
  const levelOrder = ['junior', 'mid', 'senior', 'lead'] as const
  const profileIndex = levelOrder.indexOf(profile.seniority_level)
  const jobIndex = levelOrder.indexOf(jobLevel)

  // Perfect match = 20 points, 1 level off = 15 points, 2 levels = 10 points, 3 levels = 5 points
  const difference = Math.abs(profileIndex - jobIndex)
  const scores = [20, 15, 10, 5]
  return scores[Math.min(difference, 3)]
}

/**
 * Calculate location/remote fit score (0-15 points)
 */
function calculateLocationScore(profile: Profile, job: Job): number {
  // Remote preference matching
  if (profile.remote_preference === 'remote-only') {
    return job.remote ? 15 : 0
  }

  if (profile.remote_preference === 'onsite') {
    // Prefer non-remote jobs or jobs with matching location
    if (!job.remote) {
      // Check location match
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
    // Moderate preference - any job is somewhat acceptable
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

  // Flexible - all jobs score well
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

/**
 * Calculate salary expectation score (0-15 points)
 * Since most jobs don't have salary info, we give partial credit by default
 */
function calculateSalaryScore(profile: Profile, _job: Job): number {
  // If user has no salary expectation, give full points
  if (!profile.salary_expectation) {
    return 15
  }

  // Since our job schema doesn't include salary, give partial points
  // In a real implementation, you'd compare job.salary with profile.salary_expectation
  return 10
}

/**
 * Calculate total match score for a job-profile pair
 */
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

export const handler: Handlers['CalculateMatchScores'] = async (input, { state, logger }) => {
  const { profile_id } = input

  logger.info('Calculating match scores for profile', { profile_id })

  try {
    // Get the profile
    const profile = await state.get<Profile>('profiles', profile_id)
    if (!profile) {
      logger.warn('Profile not found, skipping match calculation', { profile_id })
      return
    }

    // Get all jobs
    const jobs = await state.getGroup<Job>('jobs')
    logger.info('Found jobs to match against', { profile_id, jobCount: jobs.length })

    if (jobs.length === 0) {
      logger.info('No jobs found, skipping match calculation', { profile_id })
      return
    }

    // Calculate and store match scores for each job
    let processedCount = 0
    for (const job of jobs) {
      const matchScore = calculateMatchScore(profile, job)

      // Store match score with composite key
      const scoreKey = `${profile_id}:${job.id}`
      await state.set('match-scores', scoreKey, matchScore)
      processedCount++

      if (processedCount % 100 === 0) {
        logger.info('Match score calculation progress', { profile_id, processedCount, total: jobs.length })
      }
    }

    logger.info('Match score calculation completed', { profile_id, jobsProcessed: processedCount })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to calculate match scores', { profile_id, error: errorMessage })
  }
}
