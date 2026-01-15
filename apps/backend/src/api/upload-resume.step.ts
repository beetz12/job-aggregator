import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import type { UserProfile } from '../types/job-matching'

// ============================================================================
// Schema Definitions
// ============================================================================

const uploadResumeBodySchema = z.object({
  resume_text: z.string().min(1, 'Resume text is required'),
  resume_markdown: z.string().optional()
})

const profileWithResumeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  summary: z.string().optional(),
  skills: z.array(z.string()),
  voiceStyle: z.enum(['andrew_askins', 'professional', 'friendly']).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  // Resume fields
  resume_text: z.string().optional(),
  resume_markdown: z.string().optional(),
  resume_parsed_at: z.string().optional(),
  resume_skills: z.array(z.string()).optional()
})

type ProfileWithResume = z.infer<typeof profileWithResumeSchema>

const uploadResumeResponseSchema = z.object({
  profile: profileWithResumeSchema,
  extracted_skills: z.array(z.string()),
  skill_count: z.number()
})

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

// ============================================================================
// Skill Extraction
// ============================================================================

/**
 * Common technical skills to look for in resumes
 * This is a simple keyword-based extraction
 */
const SKILL_KEYWORDS = [
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'golang',
  'rust', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'haskell',
  'elixir', 'clojure', 'dart', 'lua', 'objective-c', 'assembly', 'fortran', 'cobol',

  // Frontend
  'react', 'reactjs', 'react.js', 'vue', 'vuejs', 'vue.js', 'angular', 'angularjs',
  'svelte', 'next.js', 'nextjs', 'nuxt', 'nuxt.js', 'gatsby', 'remix', 'solid.js',
  'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss',
  'bootstrap', 'material-ui', 'mui', 'chakra', 'styled-components', 'emotion',

  // Backend
  'node', 'nodejs', 'node.js', 'express', 'expressjs', 'fastify', 'nest', 'nestjs',
  'django', 'flask', 'fastapi', 'spring', 'spring boot', 'rails', 'ruby on rails',
  'laravel', 'symfony', 'asp.net', '.net', 'gin', 'echo', 'fiber',

  // Databases
  'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch',
  'cassandra', 'dynamodb', 'firebase', 'supabase', 'sqlite', 'oracle', 'mariadb',
  'neo4j', 'couchdb', 'memcached', 'influxdb', 'timescaledb',

  // Cloud & DevOps
  'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes',
  'k8s', 'terraform', 'ansible', 'jenkins', 'circleci', 'github actions', 'gitlab ci',
  'travis', 'cloudflare', 'vercel', 'netlify', 'heroku', 'digitalocean',
  'linux', 'unix', 'bash', 'shell', 'nginx', 'apache',

  // Data & ML
  'machine learning', 'ml', 'deep learning', 'tensorflow', 'pytorch', 'keras',
  'scikit-learn', 'pandas', 'numpy', 'jupyter', 'data science', 'data analysis',
  'etl', 'data pipeline', 'spark', 'hadoop', 'airflow', 'kafka', 'rabbitmq',
  'tableau', 'power bi', 'looker', 'dbt',

  // Mobile
  'ios', 'android', 'react native', 'flutter', 'xamarin', 'ionic', 'cordova',
  'swiftui', 'jetpack compose',

  // Testing
  'jest', 'mocha', 'chai', 'cypress', 'playwright', 'selenium', 'puppeteer',
  'pytest', 'junit', 'testng', 'rspec', 'vitest', 'testing library',

  // Tools & Practices
  'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'agile', 'scrum',
  'kanban', 'ci/cd', 'tdd', 'bdd', 'api', 'rest', 'restful', 'graphql', 'grpc',
  'microservices', 'monolith', 'serverless', 'websocket', 'oauth', 'jwt',

  // Design & Product
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'ui/ux', 'ux design',
  'product management', 'user research', 'wireframing', 'prototyping'
]

/**
 * Extract skills from resume text using keyword matching
 * Returns deduplicated, normalized skill names
 */
function extractSkillsFromText(text: string): string[] {
  const normalizedText = text.toLowerCase()
  const foundSkills = new Set<string>()

  for (const skill of SKILL_KEYWORDS) {
    // Create word boundary regex to match whole words
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(normalizedText)) {
      // Normalize skill name (capitalize first letter of each word)
      const normalized = skill
        .split(/[\s-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace('.js', '.js') // Keep .js lowercase
        .replace('Js', 'JS')   // Fix JS capitalization
      foundSkills.add(normalized)
    }
  }

  return Array.from(foundSkills).sort()
}

// ============================================================================
// Step Configuration
// ============================================================================

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'UploadResume',
  path: '/profile/:id/resume',
  method: 'POST',
  description: 'Upload or update resume for a profile. Extracts skills from resume text.',
  emits: [
    { topic: 'resume-uploaded', label: 'Emitted when resume is uploaded or updated' }
  ],
  flows: ['profile-matching'],
  bodySchema: uploadResumeBodySchema,
  responseSchema: {
    200: uploadResumeResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

// ============================================================================
// Handler
// ============================================================================

export const handler: Handlers['UploadResume'] = async (req, { state, emit, logger }) => {
  const profile_id = req.pathParams.id

  logger.info('Uploading resume for profile', { profile_id })

  try {
    // Validate request body
    const validatedInput = uploadResumeBodySchema.parse(req.body)

    // Fetch existing profile from state
    const existingProfile = await state.get<UserProfile & {
      resume_text?: string
      resume_markdown?: string
      resume_parsed_at?: string
      resume_skills?: string[]
    }>('user-profiles', profile_id)

    if (!existingProfile) {
      logger.warn('Profile not found', { profile_id })
      return {
        status: 404,
        body: {
          error: 'Profile not found',
          details: `No profile exists with id: ${profile_id}`
        }
      }
    }

    // Extract skills from resume text
    const extractedSkills = extractSkillsFromText(validatedInput.resume_text)

    logger.info('Extracted skills from resume', {
      profile_id,
      skillCount: extractedSkills.length,
      skills: extractedSkills.slice(0, 10) // Log first 10 for debugging
    })

    const now = new Date().toISOString()

    // Merge extracted skills with existing profile skills (deduplicate)
    const existingSkills = existingProfile.skills || []
    const allSkills = Array.from(new Set([...existingSkills, ...extractedSkills])).sort()

    // Update profile with resume data
    const updatedProfile: ProfileWithResume = {
      id: existingProfile.id,
      name: existingProfile.name,
      email: existingProfile.email,
      summary: existingProfile.summary,
      skills: allSkills,
      voiceStyle: existingProfile.voiceStyle,
      created_at: existingProfile.created_at,
      updated_at: now,
      resume_text: validatedInput.resume_text,
      resume_markdown: validatedInput.resume_markdown,
      resume_parsed_at: now,
      resume_skills: extractedSkills
    }

    // Store updated profile in state
    await state.set('user-profiles', profile_id, updatedProfile)

    logger.info('Profile updated with resume data', {
      profile_id,
      extractedSkillCount: extractedSkills.length,
      totalSkillCount: allSkills.length,
      hasMarkdown: !!validatedInput.resume_markdown
    })

    // Emit event for downstream processing (e.g., re-matching jobs)
    await emit({
      topic: 'resume-uploaded',
      data: {
        profile_id,
        extractedSkills,
        totalSkills: allSkills,
        resumeParsedAt: now
      }
    })

    logger.info('Emitted resume-uploaded event', { profile_id })

    return {
      status: 200,
      body: {
        profile: updatedProfile,
        extracted_skills: extractedSkills,
        skill_count: extractedSkills.length
      }
    }
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Validation failed', { errors: error.errors })
      return {
        status: 400,
        body: {
          error: 'Validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        }
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to upload resume', { error: errorMessage, profile_id })
    return {
      status: 500,
      body: {
        error: 'Failed to upload resume',
        details: errorMessage
      }
    }
  }
}
