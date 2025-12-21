import type { CronConfig, Handlers } from 'motia'
import { type Application } from '../types/application'

export const config: CronConfig = {
  type: 'cron',
  name: 'FollowUpReminders',
  description: 'Check for applications that need follow-up reminders (daily at 9:00 AM)',
  cron: '0 9 * * *',
  emits: ['followup-due'],
  flows: ['application-tracking']
}

const DAYS_UNTIL_FOLLOWUP = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

export const handler: Handlers['FollowUpReminders'] = async ({ emit, logger, state }) => {
  logger.info('Starting follow-up reminder check')

  const applications = await state.getGroup<Application>('applications')

  // Filter applications that:
  // 1. Have status 'applied'
  // 2. Have appliedAt date that is 7+ days ago
  // 3. Don't have a followUpDate set
  const now = new Date()
  const remindersNeeded: Application[] = []

  for (const app of applications) {
    // Only check applications with 'applied' status
    if (app.status !== 'applied') {
      continue
    }

    // Skip if appliedAt is not set
    if (!app.appliedAt) {
      continue
    }

    // Skip if followUpDate is already set (user has scheduled their own follow-up)
    if (app.followUpDate) {
      continue
    }

    // Check if 7+ days have passed since application
    const appliedDate = new Date(app.appliedAt)
    const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / MS_PER_DAY)

    if (daysSinceApplied >= DAYS_UNTIL_FOLLOWUP) {
      remindersNeeded.push(app)
    }
  }

  logger.info('Follow-up reminders check complete', {
    totalApplications: applications.length,
    appliedApplications: applications.filter(a => a.status === 'applied').length,
    remindersNeeded: remindersNeeded.length
  })

  // Emit followup-due event for each application needing a reminder
  for (const app of remindersNeeded) {
    const appliedDate = new Date(app.appliedAt!)
    const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / MS_PER_DAY)

    logger.info('Follow-up reminder due', {
      applicationId: app.id,
      company: app.company,
      jobTitle: app.jobTitle,
      appliedAt: app.appliedAt,
      daysSinceApplied
    })

    // In production, this event would trigger notifications (email, Slack, etc.)
    await emit({
      topic: 'followup-due',
      data: {
        applicationId: app.id,
        jobId: app.jobId,
        company: app.company,
        jobTitle: app.jobTitle,
        appliedAt: app.appliedAt,
        daysSinceApplied
      }
    })
  }

  logger.info('Follow-up reminder processing complete', {
    remindersEmitted: remindersNeeded.length
  })
}
