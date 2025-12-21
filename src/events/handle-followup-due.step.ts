import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  applicationId: z.string(),
  jobId: z.string(),
  company: z.string(),
  jobTitle: z.string(),
  appliedAt: z.string(),
  daysSinceApplied: z.number()
})

export const config: EventConfig = {
  type: 'event',
  name: 'HandleFollowUpDue',
  description: 'Handle follow-up reminders for job applications (would send notifications in production)',
  subscribes: ['followup-due'],
  emits: [],
  flows: ['application-tracking'],
  input: inputSchema
}

export const handler: Handlers['HandleFollowUpDue'] = async (input, { logger }) => {
  const { applicationId, company, jobTitle, appliedAt, daysSinceApplied } = input

  logger.info('Processing follow-up reminder', {
    applicationId,
    company,
    jobTitle,
    appliedAt,
    daysSinceApplied
  })

  // In production, this would:
  // 1. Send an email notification
  // 2. Send a Slack message
  // 3. Create a browser notification
  // 4. Update a dashboard widget

  // For now, just log the reminder
  logger.info(`FOLLOW-UP REMINDER: It's been ${daysSinceApplied} days since you applied to "${jobTitle}" at ${company}. Consider sending a follow-up email!`)

  // Example of what production implementation might look like:
  // await emailService.send({
  //   to: user.email,
  //   subject: `Follow-up reminder: ${jobTitle} at ${company}`,
  //   body: `It's been ${daysSinceApplied} days since you applied. Consider sending a follow-up email to check on your application status.`
  // })
}
