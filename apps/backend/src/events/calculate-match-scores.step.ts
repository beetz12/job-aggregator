import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { Profile, MatchScore } from '../types/profile'
import type { Job } from '../types/job'

const inputSchema = z.object({
  profileId: z.string()
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
  const profileIndex = levelOrder.indexOf(profile.seniorityLevel)
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
  if (profile.remotePreference === 'remote-only') {
    return job.remote ? 15 : 0
  }

  if (profile.remotePreference === 'onsite') {
    // Prefer non-remote jobs or jobs with matching location
    if (!job.remote) {
      // Check location match
      if (job.location && profile.preferredLocations.length > 0) {
        const jobLocLower = job.location.toLowerCase()
        const hasMatch = profile.preferredLocations.some(loc =>
          jobLocLower.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLocLower)
        )
        return hasMatch ? 15 : 5
      }
      return 10
    }
    return 0
  }

  if (profile.remotePreference === 'hybrid') {
    // Moderate preference - any job is somewhat acceptable
    if (job.remote) return 10
    if (job.location && profile.preferredLocations.length > 0) {
      const jobLocLower = job.location.toLowerCase()
      const hasMatch = profile.preferredLocations.some(loc =>
        jobLocLower.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLocLower)
      )
      return hasMatch ? 15 : 8
    }
    return 8
  }

  // Flexible - all jobs score well
  if (job.remote) return 12
  if (job.location && profile.preferredLocations.length > 0) {
    const jobLocLower = job.location.toLowerCase()
    const hasMatch = profile.preferredLocations.some(loc =>
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
  if (!profile.salaryExpectation) {
    return 15
  }

  // Since our job schema doesn't include salary, give partial points
  // In a real implementation, you'd compare job.salary with profile.salaryExpectation
  return 10
}

/**
 * Calculate total match score for a job-profile pair
 */
function calculateMatchScore(profile: Profile, job: Job): MatchScore {
  const skillScore = calculateSkillScore(profile, job)
  const seniorityScore = calculateSeniorityScore(profile, job)
  const locationScore = calculateLocationScore(profile, job)
  const salaryScore = calculateSalaryScore(profile, job)

  const totalScore = skillScore + seniorityScore + locationScore + salaryScore

  return {
    profileId: profile.id,
    jobId: job.id,
    totalScore,
    breakdown: {
      skillScore,
      seniorityScore,
      locationScore,
      salaryScore
    },
    calculatedAt: new Date().toISOString()
  }
}

export const handler: Handlers['CalculateMatchScores'] = async (input, { state, logger }) => {
  const { profileId } = input

  logger.info('Calculating match scores for profile', { profileId })

  try {
    // Get the profile
    const profile = await state.get<Profile>('profiles', profileId)
    if (!profile) {
      logger.warn('Profile not found, skipping match calculation', { profileId })
      return
    }

    // Get all jobs
    const jobs = await state.getGroup<Job>('jobs')
    logger.info('Found jobs to match against', { profileId, jobCount: jobs.length })

    if (jobs.length === 0) {
      logger.info('No jobs found, skipping match calculation', { profileId })
      return
    }

    // Calculate and store match scores for each job
    let processedCount = 0
    for (const job of jobs) {
      const matchScore = calculateMatchScore(profile, job)

      // Store match score with composite key
      const scoreKey = `${profileId}:${job.id}`
      await state.set('match-scores', scoreKey, matchScore)
      processedCount++

      if (processedCount % 100 === 0) {
        logger.info('Match score calculation progress', { profileId, processedCount, total: jobs.length })
      }
    }

    logger.info('Match score calculation completed', { profileId, jobsProcessed: processedCount })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to calculate match scores', { profileId, error: errorMessage })
  }
}
