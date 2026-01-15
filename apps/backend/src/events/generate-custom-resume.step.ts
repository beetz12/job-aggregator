import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import type { Job } from '../types/job'
import type { UserProfile } from '../types/job-matching'
import type { Application } from '../types/application'

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  applicationId: z.string(),
  jobId: z.string(),
  profile_id: z.string()
})

// ============================================================================
// Step Configuration
// ============================================================================

export const config: EventConfig = {
  type: 'event',
  name: 'GenerateCustomResume',
  description: 'Generates custom resume and cover letter when an application is created with generating status',
  subscribes: ['generate-resume-trigger'],
  emits: [
    { topic: 'resume-generated', label: 'Emitted when resume generation is complete' }
  ],
  input: inputSchema,
  flows: ['application-flow', 'profile-matching']
}

// ============================================================================
// Helper Types
// ============================================================================

interface SkillMatches {
  overallMatch: number
  strong: string[]
  partial: string[]
  gaps: string[]
}

// Extended profile type that includes resume fields
type ProfileWithResume = UserProfile & {
  resume_text?: string
  resume_markdown?: string
  resume_parsed_at?: string
  resume_skills?: string[]
}

// ============================================================================
// Helper Functions (adapted from generate-application.step.ts)
// ============================================================================

/**
 * Extract tech stack from job description
 */
function extractTechStack(description: string): string[] {
  const techKeywords = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'AWS', 'Docker',
    'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST',
    'Vue', 'Angular', 'Next.js', 'Express', 'FastAPI', 'Django', 'Go', 'Rust',
    'Java', 'Spring', 'Scala', 'Ruby', 'Rails', 'PHP', 'Laravel', 'C#', '.NET'
  ]

  const found: string[] = []
  const descLower = description.toLowerCase()

  for (const tech of techKeywords) {
    if (descLower.includes(tech.toLowerCase())) {
      found.push(tech)
    }
  }

  return found
}

/**
 * Calculate skill matches between user and job requirements
 */
function calculateSkillMatches(userSkills: string[], jobSkills: string[]): SkillMatches {
  const userSkillsLower = userSkills.map(s => s.toLowerCase())
  const strong: string[] = []
  const partial: string[] = []
  const gaps: string[] = []

  for (const jobSkill of jobSkills) {
    const jobSkillLower = jobSkill.toLowerCase()
    if (userSkillsLower.includes(jobSkillLower)) {
      strong.push(jobSkill)
    } else if (userSkillsLower.some(s => s.includes(jobSkillLower) || jobSkillLower.includes(s))) {
      partial.push(jobSkill)
    } else {
      gaps.push(jobSkill)
    }
  }

  const matchCount = strong.length + partial.length * 0.5
  const totalRequired = jobSkills.length || 1
  const overallMatch = Math.min(100, Math.round((matchCount / totalRequired) * 100))

  return { overallMatch, strong, partial, gaps }
}

/**
 * Generate resume markdown tailored for the job
 */
function generateResumeMarkdown(
  profile: ProfileWithResume,
  skillMatches: SkillMatches,
  job: Job
): string {
  const skills = skillMatches.strong.length > 0
    ? skillMatches.strong.join(', ')
    : profile.skills.slice(0, 5).join(', ')

  return `# ${profile.name}

## Contact
${profile.email}

## Summary
${profile.summary || `Experienced professional with expertise in ${skills}, seeking ${job.title} position at ${job.company}.`}

## Skills
${(skillMatches.strong.length > 0 ? skillMatches.strong : profile.skills.slice(0, 8)).map(s => `- ${s}`).join('\n')}

## Experience
${profile.experience && profile.experience.length > 0
  ? profile.experience.map(exp => `
### ${exp.title} at ${exp.company}
${exp.startDate} - ${exp.endDate || 'Present'}
${exp.description || ''}
${exp.highlights ? exp.highlights.map(h => `- ${h}`).join('\n') : ''}
`).join('\n')
  : `### Professional Experience
Previous roles demonstrating expertise in ${skills}.
`}

## Education
${profile.education && profile.education.length > 0
  ? profile.education.map(edu => `
### ${edu.degree} - ${edu.institution}
${edu.field || ''}
`).join('\n')
  : 'Education details available upon request.'}
`
}

/**
 * Generate cover letter markdown tailored for the job
 */
function generateCoverLetterMarkdown(
  profile: ProfileWithResume,
  job: Job,
  skillMatches: SkillMatches
): string {
  const strongSkillsText = skillMatches.strong.length > 0
    ? skillMatches.strong.slice(0, 3).join(', ')
    : profile.skills.slice(0, 3).join(', ')

  return `Dear ${job.company} Hiring Team,

I am reaching out about the ${job.title} role because my background in ${strongSkillsText} directly aligns with your requirements.

${skillMatches.strong.length > 0
  ? `My experience with ${skillMatches.strong.slice(0, 3).join(', ')} makes me well-suited for this position. I have a proven track record of delivering results using these technologies.`
  : 'I bring relevant experience that would contribute meaningfully to your team.'}

${skillMatches.gaps.length > 0
  ? `While I am continuing to develop my expertise in ${skillMatches.gaps[0]}, I am a quick learner committed to continuous improvement and staying current with industry trends.`
  : 'I am committed to continuous improvement and staying current with industry trends.'}

${job.remote
  ? 'I am experienced in remote collaboration and have a dedicated home office setup for productive remote work.'
  : `I am excited about the opportunity to work with the team at ${job.company}'s location.`}

I would welcome the opportunity to discuss how my skills and experience can contribute to ${job.company}'s success. Looking forward to connecting.

Best regards,
${profile.name}
`
}

// ============================================================================
// Handler
// ============================================================================

export const handler: Handlers['GenerateCustomResume'] = async (input, { state, emit, logger }) => {
  const { applicationId, jobId, profile_id } = input

  logger.info('Starting custom resume generation', { applicationId, jobId, profile_id })

  try {
    // 1. Get the application
    const application = await state.get<Application>('applications', applicationId)
    if (!application) {
      logger.error('Application not found', { applicationId })
      return
    }

    // 2. Get the job details
    const job = await state.get<Job>('jobs', jobId)
    if (!job) {
      logger.error('Job not found', { jobId })
      // Update application with error status
      await state.set('applications', applicationId, {
        ...application,
        checkpoint_status: 'error',
        checkpoint_data: { error: 'Job not found' },
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      return
    }

    // 3. Get the profile with resume
    const profile = await state.get<ProfileWithResume>('user-profiles', profile_id)
    if (!profile) {
      logger.error('Profile not found', { profile_id })
      // Update application with error status
      await state.set('applications', applicationId, {
        ...application,
        checkpoint_status: 'error',
        checkpoint_data: { error: 'Profile not found' },
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      return
    }

    logger.info('Generating application materials', {
      applicationId,
      jobTitle: job.title,
      company: job.company,
      profileName: profile.name
    })

    // 4. Generate custom resume and cover letter
    const techStack = extractTechStack(job.description)
    const skillMatches = calculateSkillMatches(profile.skills || [], techStack)

    const customResumeMarkdown = generateResumeMarkdown(profile, skillMatches, job)
    const customCoverLetterMarkdown = generateCoverLetterMarkdown(profile, skillMatches, job)

    const now = new Date().toISOString()

    // 5. Update the application with generated content
    const updatedApplication: Application = {
      ...application,
      custom_resume_markdown: customResumeMarkdown,
      custom_resume_generated_at: now,
      custom_cover_letter_markdown: customCoverLetterMarkdown,
      checkpoint_status: 'resume_ready',
      status: 'resume_ready',
      updated_at: now
    }

    await state.set('applications', applicationId, updatedApplication)

    logger.info('Custom resume and cover letter generated', {
      applicationId,
      jobId,
      profile_id,
      resumeLength: customResumeMarkdown.length,
      coverLetterLength: customCoverLetterMarkdown.length,
      skillMatchScore: skillMatches.overallMatch,
      strongSkills: skillMatches.strong.length,
      gaps: skillMatches.gaps.length
    })

    // 6. Emit resume-generated event
    await emit({
      topic: 'resume-generated',
      data: {
        applicationId,
        jobId,
        profile_id,
        skillMatchScore: skillMatches.overallMatch,
        strongSkills: skillMatches.strong,
        gaps: skillMatches.gaps,
        generatedAt: now
      }
    })

    logger.info('Resume generation complete, event emitted', { applicationId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to generate custom resume', {
      applicationId,
      jobId,
      profile_id,
      error: errorMessage
    })

    // Update application with error status
    try {
      const application = await state.get<Application>('applications', applicationId)
      if (application) {
        await state.set('applications', applicationId, {
          ...application,
          checkpoint_status: 'error',
          checkpoint_data: { error: errorMessage },
          status: 'failed',
          updated_at: new Date().toISOString()
        })
      }
    } catch (updateError) {
      logger.error('Failed to update application error status', {
        applicationId,
        error: updateError instanceof Error ? updateError.message : 'Unknown error'
      })
    }
  }
}
