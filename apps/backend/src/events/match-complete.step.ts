import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { type UserProfile } from '../types/job-matching'

const inputSchema = z.object({
  userId: z.string(),
  strongMatches: z.array(z.object({
    jobId: z.string(),
    fitScore: z.number(),
    recommendation: z.enum(['STRONG_APPLY', 'APPLY', 'CONDITIONAL', 'SKIP'])
  })),
  totalMatched: z.number()
})

export const config: EventConfig = {
  type: 'event',
  name: 'MatchComplete',
  description: 'Handles match completion events. Sends email notifications for strong matches via SendGrid.',
  subscribes: ['match-complete'],
  emits: ['notification-sent'],
  input: inputSchema,
  flows: ['job-matching']
}

export const handler: Handlers['MatchComplete'] = async (input, { state, emit, logger }) => {
  const { userId, strongMatches, totalMatched } = input

  logger.info('Processing match-complete event', {
    userId,
    matchCount: strongMatches.length,
    totalMatched
  })

  try {
    // Fetch user profile for email
    const userProfile = await state.get<UserProfile>('user-profiles', userId)

    if (!userProfile) {
      logger.warn('User profile not found, skipping notification', { userId })
      return
    }

    // Only send notification if there are strong matches
    if (strongMatches.length === 0) {
      logger.info('No strong matches, skipping notification', { userId })
      return
    }

    // Get job details for the notification
    const jobDetails = await Promise.all(
      strongMatches.slice(0, 5).map(async (match) => {
        const job = await state.get<{ title: string; company: string }>('jobs', match.jobId)
        return {
          ...match,
          title: job?.title || 'Unknown Position',
          company: job?.company || 'Unknown Company'
        }
      })
    )

    // Build email content
    const emailSubject = `${strongMatches.length} strong job match${strongMatches.length > 1 ? 'es' : ''} found!`

    const emailBody = buildEmailBody({
      userName: userProfile.name,
      matches: jobDetails,
      totalMatched
    })

    // In production, this would call SendGrid
    // For now, we log the notification
    logger.info('Would send email notification', {
      to: userProfile.email,
      subject: emailSubject,
      matchCount: strongMatches.length
    })

    // TODO: Integrate SendGrid when API key is configured
    // await sendGridClient.send({
    //   to: userProfile.email,
    //   from: 'noreply@jobmatcher.com',
    //   subject: emailSubject,
    //   html: emailBody
    // })

    // Store notification record
    const notificationId = `notification-${Date.now()}-${userId}`
    await state.set('notifications', notificationId, {
      id: notificationId,
      userId,
      type: 'match-complete',
      subject: emailSubject,
      matchCount: strongMatches.length,
      created_at: new Date().toISOString(),
      status: 'logged' // Would be 'sent' in production
    })

    // Emit notification sent event
    await emit({
      topic: 'notification-sent',
      data: {
        notificationId,
        userId,
        type: 'match-complete',
        matchCount: strongMatches.length
      }
    })

    logger.info('Match-complete processing finished', {
      userId,
      notificationId,
      matchCount: strongMatches.length
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to process match-complete event', {
      userId,
      error: errorMessage
    })
    // Don't throw - allow the event to be marked as processed
  }
}

interface EmailTemplateData {
  userName: string
  matches: Array<{
    jobId: string
    fitScore: number
    recommendation: string
    title: string
    company: string
  }>
  totalMatched: number
}

function buildEmailBody(data: EmailTemplateData): string {
  const { userName, matches, totalMatched } = data

  const matchList = matches.map(m =>
    `<li><strong>${m.title}</strong> at ${m.company} - Fit Score: ${m.fitScore}%</li>`
  ).join('\n')

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .match-list { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .cta { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Great news, ${userName}!</h1>
    </div>
    <div class="content">
      <p>We found <strong>${totalMatched} strong job match${totalMatched > 1 ? 'es' : ''}</strong> based on your profile!</p>

      <div class="match-list">
        <h3>Top Matches:</h3>
        <ul>
          ${matchList}
        </ul>
      </div>

      <p>These positions align well with your skills and preferences. We recommend applying soon!</p>

      <a href="#" class="cta">View All Matches</a>
    </div>
    <div class="footer">
      <p>Job Matcher - Your AI-powered job search assistant</p>
    </div>
  </div>
</body>
</html>
`
}
