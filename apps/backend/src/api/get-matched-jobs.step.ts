import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { jobSchema, type Job } from '../types/job'
import { matchScoreSchema, type MatchScore, type Profile } from '../types/profile'

const matchedJobSchema = z.object({
  job: jobSchema,
  matchScore: matchScoreSchema
})

const responseSchema = z.object({
  matches: z.array(matchedJobSchema),
  total: z.number(),
  profile_id: z.string()
})

const errorResponseSchema = z.object({
  error: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetMatchedJobs',
  path: '/profile/:id/matches',
  method: 'GET',
  description: 'Get jobs sorted by match score for a profile',
  emits: [],
  flows: ['profile-matching'],
  queryParams: [
    { name: 'limit', description: 'Number of results (default: 50, max: 100)' },
    { name: 'minScore', description: 'Minimum match score to include (0-100, default: 0)' }
  ],
  responseSchema: {
    200: responseSchema,
    404: errorResponseSchema
  }
}

interface MatchedJob {
  job: Job
  matchScore: MatchScore
}

export const handler: Handlers['GetMatchedJobs'] = async (req, { state, logger }) => {
  const { id: profile_id } = req.pathParams
  const { limit = '50', minScore = '0' } = req.queryParams as Record<string, string>

  const limitNum = Math.min(parseInt(limit) || 50, 100)
  const minScoreNum = parseInt(minScore) || 0

  logger.info('Fetching matched jobs', { profile_id, limit: limitNum, minScore: minScoreNum })

  try {
    // Verify profile exists
    const profile = await state.get<Profile>('profiles', profile_id)
    if (!profile) {
      logger.info('Profile not found', { profile_id })
      return {
        status: 404,
        body: { error: 'Profile not found' }
      }
    }

    // Get all match scores for this profile
    const allMatchScores = await state.getGroup<MatchScore>('match-scores')

    // Filter to only this profile's scores
    const profileScores = allMatchScores.filter(score => score.profile_id === profile_id)

    logger.info('Found match scores', { profile_id, scoreCount: profileScores.length })

    if (profileScores.length === 0) {
      logger.info('No match scores found for profile', { profile_id })
      return {
        status: 200,
        body: {
          matches: [],
          total: 0,
          profile_id
        }
      }
    }

    // Get all jobs
    const jobs = await state.getGroup<Job>('jobs')
    const jobsMap = new Map(jobs.map(job => [job.id, job]))

    // Join scores with jobs and filter by minimum score
    const matchedJobs: MatchedJob[] = []
    for (const score of profileScores) {
      if (score.total_score < minScoreNum) continue

      const job = jobsMap.get(score.job_id)
      if (job) {
        matchedJobs.push({
          job,
          matchScore: score
        })
      }
    }

    // Sort by match score descending, then by job health_score
    matchedJobs.sort((a, b) => {
      const scoreDiff = b.matchScore.total_score - a.matchScore.total_score
      if (scoreDiff !== 0) return scoreDiff
      return b.job.health_score - a.job.health_score
    })

    // Apply limit
    const topMatches = matchedJobs.slice(0, limitNum)

    logger.info('Returning matched jobs', {
      profile_id,
      totalMatches: matchedJobs.length,
      returnedMatches: topMatches.length
    })

    return {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60'
      },
      body: {
        matches: topMatches,
        total: matchedJobs.length,
        profile_id
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch matched jobs', { profile_id, error: errorMessage })
    return {
      status: 500,
      body: { error: 'Failed to fetch matched jobs' }
    }
  }
}
