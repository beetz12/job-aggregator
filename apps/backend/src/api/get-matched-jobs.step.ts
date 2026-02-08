import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { jobSchema, type Job } from '../types/job'
import { matchScoreSchema, type MatchScore, type Profile } from '../types/profile'
import { query, isDatabaseConfigured } from '../services/postgres'

const matchedJobSchema = z.object({
  job: jobSchema,
  matchScore: matchScoreSchema,
  score_source: z.enum(['keyword', 'gemini']).optional().nullable()
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
  score_source?: 'keyword' | 'gemini' | null
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

    // Try DB-first: query pre-scored jobs directly from PostgreSQL
    if (isDatabaseConfigured()) {
      try {
        const { rows } = await query<Record<string, unknown>>(
          `SELECT * FROM jobs WHERE match_score IS NOT NULL AND match_score >= $1 ORDER BY match_score DESC LIMIT $2`,
          [minScoreNum, limitNum]
        )

        if (rows.length > 0) {
          const dbMatches: MatchedJob[] = rows.map(row => ({
            job: {
              id: row.id as string,
              title: row.title as string,
              company: row.company as string,
              location: row.location as string | undefined,
              remote: row.remote as boolean,
              url: row.url as string,
              description: row.description as string,
              source: row.source as Job['source'],
              posted_at: row.posted_at as string,
              fetched_at: row.fetched_at as string,
              tags: (row.tags as string[]) || [],
              health_score: row.health_score as number,
              ai_summary: row.ai_summary as string | undefined,
              skills: (row.skills as string[]) || [],
              source_id: row.source_id as string | undefined,
              company_url: row.company_url as string | undefined,
              location_parsed: row.location_parsed as Job['location_parsed'],
              salary: row.salary as Job['salary'],
              employment_type: row.employment_type as Job['employment_type'],
              experience_level: row.experience_level as Job['experience_level'],
              content_hash: row.content_hash as string | undefined,
              score_source: row.score_source as Job['score_source'],
              match_score: row.match_score as number | undefined,
              scored_at: row.scored_at as string | undefined,
            },
            matchScore: {
              profile_id,
              job_id: row.id as string,
              total_score: (row.match_score as number) || 0,
              breakdown: {
                skill_score: 0,
                seniority_score: 0,
                location_score: 0,
                salary_score: 0
              },
              calculated_at: (row.scored_at as string) || new Date().toISOString()
            },
            score_source: row.score_source as 'keyword' | 'gemini' | null
          }))

          logger.info('Returning matched jobs from DB', {
            profile_id,
            totalMatches: dbMatches.length,
            returnedMatches: dbMatches.length
          })

          return {
            status: 200,
            headers: {
              'Cache-Control': 'public, max-age=60'
            },
            body: {
              matches: dbMatches,
              total: dbMatches.length,
              profile_id
            }
          }
        }
      } catch (dbError) {
        const dbErrorMsg = dbError instanceof Error ? dbError.message : 'Unknown DB error'
        logger.warn('DB query failed, falling back to Motia state', { profile_id, error: dbErrorMsg })
      }
    }

    // Fallback: Motia state-based matching
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
          matchScore: score,
          score_source: job.score_source
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
      status: 404,
      body: { error: 'Failed to fetch matched jobs' }
    }
  }
}
