# Intelligent Job Application System - Implementation Plan

**Date**: 2026-01-01 (Updated with 2025 Best Practices Research)
**Author**: Claude AI
**Status**: Draft - Awaiting Approval
**Type**: Feature
**Version**: 2.0

## Table of Contents
- [Overview](#overview)
- [2025 Best Practices Integration](#2025-best-practices-integration)
- [Legal & Compliance Requirements](#legal--compliance-requirements)
- [Architecture Decision: Computer Use Package](#architecture-decision-computer-use-package)
- [Feature Summary](#feature-summary)
- [Phase 1: Foundation](#phase-1-foundation)
- [Phase 2: Claude Agent SDK Integration](#phase-2-claude-agent-sdk-integration)
- [Phase 3: Fit Analysis Dashboard](#phase-3-fit-analysis-dashboard)
- [Phase 4: Auto-Apply with Computer Use](#phase-4-auto-apply-with-computer-use)
- [Database Schema Changes](#database-schema-changes)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [External Services](#external-services)

---

## Overview

This plan implements 5 new features for the Job Aggregator platform:

1. **Job Matching + Email Notifications** - Users specify job preferences, receive SendGrid email alerts
2. **Deduplication + Date Filtering** - Pass start date to Scraper API to avoid re-fetching saved jobs
3. **Company Research + Document Generation** - Claude Agent SDK with ported beetz12 skills
4. **Fit Analysis Dashboard** - "Check Fit" button with detailed analysis
5. **Auto-Apply with Computer Use** - Automated job applications with human confirmation

---

## 2025 Best Practices Integration

Based on comprehensive research using Perplexity Deep Search, the following best practices are incorporated:

### AI-Powered Job Matching

| Best Practice | Implementation |
|---------------|----------------|
| **Two-Tower Embedding Models** | Use Sentence Transformers (paraphrase-MiniLM-L6-v2) for semantic matching |
| **Multi-Stage Pipeline** | Candidate generation → Filtering → Ranking → Feedback loop |
| **Semantic Search** | Go beyond keywords to understand context (e.g., "Client Success Manager" matches "Account Manager") |
| **Bias Mitigation** | Anonymize identifying information during initial screening |
| **Feedback Loop** | Continuous learning from user interactions |

### Resume Generation & ATS Optimization

| Best Practice | Implementation |
|---------------|----------------|
| **Standard Headings** | Use "Work Experience," "Education," "Skills" |
| **Simple Formatting** | Avoid tables, columns, graphics, text boxes, skill bars |
| **Keyword Integration** | NLP analysis of job description for natural keyword placement |
| **One-Page Target** | Condense to 1-2 pages with scannable structure |
| **Humanization Pass** | Remove repetitive phrasing, adverbs, and AI-sounding language |

### Email Notification Architecture

| Best Practice | Implementation |
|---------------|----------------|
| **Separate Streams** | Transactional emails separate from promotional |
| **Dedicated IPs** | Use dedicated IP for high-volume sends |
| **IP Warmup** | Gradually increase volume on new IPs |
| **SPF/DKIM/DMARC** | Full authentication for deliverability |
| **Frequency Options** | Real-time (critical), Daily digest, Weekly digest |
| **Target Metrics** | 99.5% delivery rate, sub-4-second p90 latency |

### Claude Agent SDK Production Patterns

| Best Practice | Implementation |
|---------------|----------------|
| **Sandboxed Environments** | Use Koyeb Sandboxes or similar isolation |
| **Phased Rollout** | Start with low-risk tasks, graduate to complex |
| **Model Selection** | Sonnet 4.5 for high-volume, Opus 4.5 for complex reasoning |
| **Human-in-the-Loop** | Require approval for sensitive actions |
| **MCP Integration** | Use Model Context Protocol for tool integration |
| **Team Training** | 60% lower productivity without AI prompting training |

---

## Legal & Compliance Requirements

### AI Hiring Regulations (2025-2026)

| Jurisdiction | Effective Date | Requirements |
|--------------|----------------|--------------|
| **California (FEHA/CCPA)** | Oct 2025 / Jan 2026 | Risk assessments, pre-use notice, opt-out rights |
| **Colorado** | Jun 30, 2026 | Bias audits for high-risk AI employment systems |
| **Illinois (HB 3773)** | Jan 1, 2026 | Bans discriminatory AI in recruiting, mandates notice |
| **NYC Local Law 144** | Enforced | Independent bias audits, advance notice, annual updates |

### Required Safeguards

1. **Bias Audits**: Regular independent audits of algorithmic outcomes
2. **Transparency**: Clear disclosure to candidates about AI use
3. **Human-in-the-Loop**: Human review before final decisions
4. **Consent**: Explicit data collection consent
5. **Explainability**: Plain language explanation of AI recommendations
6. **Documentation**: Defensible criteria aligned with job descriptions

### Implementation in System

```typescript
// Required disclosure before AI-powered features
interface AIDisclosure {
  feature: 'job_matching' | 'fit_analysis' | 'resume_generation' | 'auto_apply'
  disclosed_at: string
  user_acknowledged: boolean
  explanation: string
}

// Audit logging for compliance
interface AIAuditLog {
  action: string
  input_data_hash: string  // Anonymized
  output_summary: string
  model_used: string
  timestamp: string
  human_review_required: boolean
  human_reviewed: boolean
}
```

---

## Architecture Decision: Computer Use Package

### Decision: Create Separate `packages/computer-use` Package

Based on multi-agent research analyzing microservices patterns, security requirements, and monorepo best practices, **Computer Use will be a separate package** in the monorepo.

### Rationale

| Factor | Recommendation |
|--------|----------------|
| **Reusability** | Other future apps can consume the same automation service |
| **Independent Scaling** | Browser automation is resource-intensive; scale separately |
| **Security Isolation** | Easier to apply strict controls to isolated package |
| **Docker Deployment** | Clean, minimal container without full backend |
| **Technology Flexibility** | Optimal tools (Playwright) without affecting main app |
| **Resilience** | Automation failures don't cascade to other services |

### New Monorepo Structure

```
job-aggregator/
├── apps/
│   ├── backend/              # Motia backend (consumes computer-use)
│   └── web/                  # Next.js frontend
├── packages/
│   ├── types/                # Shared TypeScript types
│   └── computer-use/         # NEW: Shared automation package
│       ├── src/
│       │   ├── client/       # Client SDK for consumers
│       │   ├── service/      # Worker implementation
│       │   ├── actions/      # Browser actions
│       │   ├── security/     # Sandbox & permissions
│       │   └── types/        # Package-specific types
│       ├── docker/
│       │   └── Dockerfile
│       └── package.json
├── turbo.json
└── package.json
```

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Security Boundary (Docker Container)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Security Policies                                     │  │
│  │  • seccomp/AppArmor profiles                          │  │
│  │  • Network isolation (allowlist only)                 │  │
│  │  • Resource limits (CPU, memory, disk)                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Browser Instance (Playwright)                         │  │
│  │  • Headless mode only                                 │  │
│  │  • Remote debugging disabled                          │  │
│  │  • URL allowlist enforced                             │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Claude Agent                                          │  │
│  │  • Scoped tool permissions                            │  │
│  │  • Human-in-the-loop for submissions                  │  │
│  │  • Complete action audit logging                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Worker Pool Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Queue (Redis)                        │
│    (Separate queues by priority: high/normal/low)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
    ┌─────────────────▼─────────────────┐
    │       Worker Pool Manager          │
    │  • Pool size: 3-10 workers        │
    │  • Prewarm idle instances         │
    │  • Memory threshold restarts      │
    │  • Graceful shutdown              │
    └─────────────────┬─────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │Worker 1 │  │Worker 2 │  │Worker N │
    │(Docker) │  │(Docker) │  │(Docker) │
    └─────────┘  └─────────┘  └─────────┘
```

---

## Feature Summary

| Feature | Description | Dependencies |
|---------|-------------|--------------|
| 1. Email Alerts | SendGrid notifications for matching jobs | SendGrid API |
| 2. Dedup + Filter | Start date param to Scraper API | Scraper API changes |
| 3. Research + Docs | Agent SDK with resume/cover letter generation | Anthropic API, PDF gen |
| 4. Dashboard + Fit | Detailed fit analysis UI | Feature 3 |
| 5. Auto-Apply | Computer Use with human confirmation | Features 3+4, packages/computer-use |

---

## User Decisions

| Question | Decision |
|----------|----------|
| SendGrid | User has account, create placeholder key |
| Auto-Apply Scope | Full auto-apply with human confirmation before submit |
| Profile Data | Parse from uploaded resume (PDF/DOCX) |
| Voice Style | Configurable per user, Andrew Askins as default |
| Computer Use Location | Separate package: `packages/computer-use` |

---

## Phase 1: Foundation (Features 1 & 2)

### 1A: Expand Profile Schema

**File:** `apps/backend/schema.sql`

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_titles TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desired_industries TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS min_salary_requirement INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'daily'
  CHECK (notification_frequency IN ('realtime', 'daily', 'weekly'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS min_match_score_for_notification INTEGER DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_style TEXT DEFAULT 'andrew_askins'
  CHECK (voice_style IN ('andrew_askins', 'professional', 'friendly', 'enthusiastic'));

-- Notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('match', 'digest', 'followup')),
  status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_profile ON notification_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
```

**Files to Modify:**
| File | Change |
|------|--------|
| `apps/backend/src/types/profile.ts` | Add new Zod schema fields |
| `apps/web/src/lib/types.ts` | Mirror profile type changes |
| `apps/web/src/app/profile/page.tsx` | Add job preferences UI section |

### 1B: SendGrid Email Integration

**New Dependencies:**
```bash
npm install @sendgrid/mail --workspace=@job-aggregator/backend
```

**Environment Variables:**
```env
# apps/backend/.env
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=notifications@yourdomain.com
```

**New Files:**

| File | Purpose |
|------|---------|
| `apps/backend/src/services/email-service.ts` | SendGrid wrapper with templates |
| `apps/backend/src/events/send-match-notification.step.ts` | Triggered on new job match |
| `apps/backend/src/cron/send-email-digests.step.ts` | Daily/weekly digest emails |
| `apps/backend/src/api/notification-settings.step.ts` | GET/POST notification prefs |
| `apps/backend/src/api/verify-email.step.ts` | Email verification endpoint |

**Email Service Implementation:**
```typescript
// apps/backend/src/services/email-service.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await sgMail.send({
      to: options.to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: options.subject,
      html: options.html,
      text: options.text
    })
    return true
  } catch (error) {
    console.error('SendGrid error:', error)
    return false
  }
}

export function generateMatchEmailHtml(job: Job, matchScore: number): string {
  return `
    <h1>New Job Match!</h1>
    <p>We found a job that matches your preferences with a ${matchScore}% match score.</p>
    <h2>${job.title}</h2>
    <p><strong>Company:</strong> ${job.company}</p>
    <p><strong>Location:</strong> ${job.location || 'Remote'}</p>
    <a href="${process.env.FRONTEND_URL}/jobs/${job.id}">View Job Details</a>
  `
}

export function generateDigestEmailHtml(jobs: Array<{job: Job, matchScore: number}>): string {
  // Generate HTML for multiple jobs
}
```

### 1C: Enhanced Matching with Semantic Search (2025 Best Practice)

**New Dependencies:**
```bash
npm install @xenova/transformers --workspace=@job-aggregator/backend
```

**New File:** `apps/backend/src/services/semantic-matcher.ts`

```typescript
// Semantic matching using Sentence Transformers (2025 Best Practice)
import { pipeline } from '@xenova/transformers'

let embeddingPipeline: any = null

async function getEmbedding(text: string): Promise<number[]> {
  if (!embeddingPipeline) {
    // Use paraphrase-MiniLM-L6-v2 as recommended by research
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/paraphrase-MiniLM-L6-v2')
  }
  const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
  }
  return dotProduct // Already normalized
}

export async function calculateSemanticMatch(
  profileText: string,  // Skills, experience, preferences combined
  jobText: string       // Title, description, requirements combined
): Promise<number> {
  const [profileEmbed, jobEmbed] = await Promise.all([
    getEmbedding(profileText),
    getEmbedding(jobText)
  ])

  const similarity = cosineSimilarity(profileEmbed, jobEmbed)
  return Math.round(similarity * 100) // 0-100 score
}
```

**Modify:** `apps/backend/src/events/calculate-match-scores.step.ts`

```typescript
import { calculateSemanticMatch } from '../services/semantic-matcher'

// Multi-stage matching pipeline (2025 Best Practice)
async function calculateMatchScore(profile: Profile, job: Job): Promise<MatchScore> {
  // Stage 1: Title matching (fast filter)
  const titleScore = calculateTitleScore(profile, job)

  // Stage 2: Semantic matching (deep understanding)
  const profileText = [
    profile.skills.join(' '),
    profile.title || '',
    profile.bio || '',
    (profile.desired_titles || []).join(' ')
  ].join(' ')

  const jobText = [
    job.title,
    job.company,
    job.description.substring(0, 1000), // First 1000 chars
    (job.tags || []).join(' ')
  ].join(' ')

  const semanticScore = await calculateSemanticMatch(profileText, jobText)

  // Stage 3: Preference matching
  const locationScore = calculateLocationScore(profile, job)
  const salaryScore = calculateSalaryScore(profile, job)
  const seniorityScore = calculateSeniorityScore(profile, job)

  // Weighted total (research-backed weights)
  const totalScore = Math.round(
    semanticScore * 0.40 +     // 40% semantic similarity
    titleScore * 0.25 +        // 25% title match
    locationScore * 0.15 +     // 15% location/remote preference
    seniorityScore * 0.10 +    // 10% seniority level
    salaryScore * 0.10         // 10% salary fit
  )

  return {
    total: totalScore,
    breakdown: { semanticScore, titleScore, locationScore, seniorityScore, salaryScore }
  }
}

// Title matching with synonym support
function calculateTitleScore(profile: Profile, job: Job): number {
  if (!profile.desired_titles?.length) return 50 // Neutral if no preference

  const jobTitleLower = job.title.toLowerCase()

  // Check for exact or close matches
  for (const desired of profile.desired_titles) {
    if (jobTitleLower.includes(desired.toLowerCase())) {
      return 100
    }
  }

  // Semantic matching handles synonyms like "Client Success" ↔ "Account Manager"
  return 0
}
```

### 1D: Notification Event Step

**New File:** `apps/backend/src/events/send-match-notification.step.ts`

```typescript
import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { sendEmail, generateMatchEmailHtml } from '../services/email-service'

export const config: EventConfig = {
  type: 'event',
  name: 'SendMatchNotification',
  description: 'Send email notification when a job matches user preferences',
  subscribes: ['job-matched'],
  emits: [],
  input: z.object({
    profileId: z.string(),
    jobId: z.string(),
    matchScore: z.number()
  }),
  flows: ['notifications']
}

export const handler: Handlers['SendMatchNotification'] = async (input, { state, logger }) => {
  const profile = await state.get('profiles', input.profileId)
  const job = await state.get('jobs', input.jobId)

  if (!profile?.notification_enabled || !profile?.email_verified) {
    logger.info('Notifications disabled or email not verified', { profileId: input.profileId })
    return
  }

  if (input.matchScore < (profile.min_match_score_for_notification || 50)) {
    logger.info('Match score below threshold', {
      matchScore: input.matchScore,
      threshold: profile.min_match_score_for_notification
    })
    return
  }

  // For realtime notifications, send immediately
  if (profile.notification_frequency === 'realtime') {
    const html = generateMatchEmailHtml(job, input.matchScore)
    await sendEmail({
      to: profile.email,
      subject: `New Job Match: ${job.title} at ${job.company}`,
      html
    })
  }
  // For daily/weekly, jobs are batched by the digest cron
}
```

---

## Phase 2: Claude Agent SDK Integration (Feature 3)

### 2A: Resume Parsing Service

**New Dependencies:**
```bash
npm install pdf-parse mammoth --workspace=@job-aggregator/backend
```

**New File:** `apps/backend/src/services/resume-parser.ts`

```typescript
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export interface ParsedResume {
  fullText: string
  sections: {
    contact?: string
    summary?: string
    experience?: string[]
    education?: string[]
    skills?: string[]
  }
}

export async function parseResume(buffer: Buffer, mimeType: string): Promise<ParsedResume> {
  let fullText: string

  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer)
    fullText = data.text
  } else if (mimeType.includes('word') || mimeType.includes('docx')) {
    const result = await mammoth.extractRawText({ buffer })
    fullText = result.value
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`)
  }

  // Parse sections using regex patterns
  return {
    fullText,
    sections: extractSections(fullText)
  }
}
```

### 2B: PDF Generation Service

**New Dependencies:**
```bash
npm install puppeteer --workspace=@job-aggregator/backend
```

**New File:** `apps/backend/src/services/pdf-generator.ts`

```typescript
import puppeteer from 'puppeteer'

export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.setContent(html, { waitUntil: 'networkidle0' })

  const pdfBuffer = await page.pdf({
    format: 'Letter',
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    printBackground: true
  })

  await browser.close()
  return Buffer.from(pdfBuffer)
}
```

### 2C: Claude Agent SDK Integration

**New File:** `apps/backend/src/services/claude-agent/agent-server.ts`

```typescript
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'

export const jobAgentServer = createSdkMcpServer({
  name: 'job-agent',
  version: '1.0.0',
  tools: [
    tool(
      'analyze_job_fit',
      'Analyze how well a job matches a user profile using detailed criteria',
      {
        jobDescription: z.string(),
        userProfile: z.object({
          skills: z.array(z.string()),
          experienceYears: z.number(),
          desiredTitles: z.array(z.string()),
          salaryMin: z.number().optional(),
          remotePreference: z.string()
        }),
        evaluationCriteria: z.object({
          compensation: z.number().default(20),
          culture: z.number().default(25),
          technicalFit: z.number().default(15),
          industry: z.number().default(10),
          potential: z.number().default(10)
        }).optional()
      },
      async (args) => {
        // Implement detailed fit analysis
        return { content: [{ type: 'text', text: JSON.stringify(analysis) }] }
      }
    ),

    tool(
      'research_company',
      'Research a company for background, culture, and fit assessment',
      {
        companyName: z.string(),
        jobUrl: z.string().optional()
      },
      async (args) => {
        // Implement company research with web search
        return { content: [{ type: 'text', text: JSON.stringify(research) }] }
      }
    ),

    tool(
      'generate_resume',
      'Generate a customized, ATS-optimized resume for a specific job',
      {
        jobDescription: z.string(),
        userProfile: z.object({...}),
        format: z.enum(['pdf', 'markdown']),
        voiceStyle: z.enum(['andrew_askins', 'professional', 'friendly', 'enthusiastic'])
      },
      async (args) => {
        // Use ported beetz12 resume-customizer logic
        return { content: [{ type: 'text', text: resume }] }
      }
    ),

    tool(
      'generate_cover_letter',
      'Generate a personalized cover letter with configurable voice style',
      {
        jobDescription: z.string(),
        userProfile: z.object({...}),
        voiceStyle: z.enum(['andrew_askins', 'professional', 'friendly', 'enthusiastic'])
      },
      async (args) => {
        // Use ported beetz12 cover-letter-writer logic
        return { content: [{ type: 'text', text: coverLetter }] }
      }
    ),

    tool(
      'answer_application_questions',
      'Answer custom job application questions authentically',
      {
        questions: z.array(z.string()),
        userProfile: z.object({...}),
        voiceStyle: z.enum(['andrew_askins', 'professional', 'friendly', 'enthusiastic'])
      },
      async (args) => {
        // Use ported beetz12 application-question-responder logic
        return { content: [{ type: 'text', text: JSON.stringify(answers) }] }
      }
    )
  ]
})
```

### 2D: Voice Style Prompts

**New Directory:** `apps/backend/src/services/claude-agent/prompts/`

Copy from beetz12:
- `andrew_askins_style.md` - Default voice style
- `storybrand.md` - StoryBrand framework for resumes
- `ats_optimization.md` - ATS best practices

**New File:** `apps/backend/src/services/claude-agent/prompts/voice-styles.ts`

```typescript
export const VOICE_STYLES = {
  andrew_askins: `
    Write in Andrew Askins' communication style:
    - Authentic, peer-level tone (not supplicant)
    - Direct and specific with concrete examples
    - Humble confidence without arrogance
    - Personal but professional
    - Uses storytelling naturally
  `,
  professional: `
    Write in a professional business style:
    - Formal but accessible tone
    - Clear and concise language
    - Focus on achievements and metrics
    - Standard business communication norms
  `,
  friendly: `
    Write in a friendly, approachable style:
    - Warm and conversational tone
    - Relatable language
    - Shows personality while remaining professional
    - Enthusiastic but not over-the-top
  `,
  enthusiastic: `
    Write in an enthusiastic, energetic style:
    - High-energy and passionate tone
    - Excitement about opportunities
    - Bold statements with supporting evidence
    - Action-oriented language
  `
}
```

### 2E: Document Storage

**New File:** `apps/backend/src/services/document-storage.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function storeDocument(
  profileId: string,
  jobId: string,
  type: 'resume' | 'cover_letter',
  content: Buffer
): Promise<string> {
  const path = `documents/${profileId}/${jobId}/${type}_${Date.now()}.pdf`

  const { error } = await supabase.storage
    .from('job-documents')
    .upload(path, content, { contentType: 'application/pdf' })

  if (error) throw error

  const { data } = supabase.storage
    .from('job-documents')
    .getPublicUrl(path)

  return data.publicUrl
}

export async function getDocument(path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from('job-documents')
    .download(path)

  if (error) throw error
  return Buffer.from(await data.arrayBuffer())
}
```

### 2F: Database Schema for Documents

```sql
-- Generated documents table
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  document_type TEXT CHECK (document_type IN ('resume', 'cover_letter', 'research_summary')),
  storage_path TEXT NOT NULL,
  public_url TEXT,
  voice_style TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_documents_profile ON generated_documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_job ON generated_documents(job_id);

-- Company research cache
CREATE TABLE IF NOT EXISTS company_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  research_data JSONB NOT NULL,
  score INTEGER,
  recommendation TEXT CHECK (recommendation IN ('STRONG_YES', 'YES', 'MAYBE', 'PASS')),
  sources_used TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_company_research_name ON company_research(company_name);
```

---

## Phase 3: Fit Analysis Dashboard (Feature 4)

### 3A: Fit Analysis Database

```sql
CREATE TABLE IF NOT EXISTS fit_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  breakdown JSONB NOT NULL,
  strengths TEXT[] DEFAULT '{}',
  gaps TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  research_summary TEXT,
  voice_style TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_fit_analysis_profile ON fit_analysis(profile_id);
CREATE INDEX IF NOT EXISTS idx_fit_analysis_job ON fit_analysis(job_id);
CREATE INDEX IF NOT EXISTS idx_fit_analysis_score ON fit_analysis(overall_score DESC);
```

### 3B: Check Fit API Endpoint

**New File:** `apps/backend/src/api/check-fit.step.ts`

```typescript
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { jobAgentServer } from '../services/claude-agent/agent-server'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CheckFit',
  description: 'Perform detailed fit analysis for a job',
  path: '/jobs/:id/check-fit',
  method: 'POST',
  emits: ['fit-analysis-complete'],
  flows: ['job-analysis']
}

const inputSchema = z.object({
  profileId: z.string().uuid()
})

export const handler: Handlers['CheckFit'] = async (req, { state, emit, logger }) => {
  const { id: jobId } = req.params
  const { profileId } = inputSchema.parse(req.body)

  const job = await state.get('jobs', jobId)
  const profile = await state.get('profiles', profileId)

  if (!job || !profile) {
    return { status: 404, body: { error: 'Job or profile not found' } }
  }

  // Use Claude Agent SDK for detailed analysis
  const analysis = await performFitAnalysis(job, profile)

  // Store analysis results
  await upsertFitAnalysis(profileId, jobId, analysis)

  await emit({
    topic: 'fit-analysis-complete',
    data: { profileId, jobId, analysis }
  })

  return {
    status: 200,
    body: { analysis }
  }
}
```

### 3C: Frontend Dashboard Enhancement

**Modify:** `apps/web/src/app/matches/page.tsx`

Add to each job card:
- "Check Fit" button
- Expandable analysis panel
- Score breakdown chart
- Strengths/Gaps lists
- "Generate Resume" and "Generate Cover Letter" buttons

**New Components:**
| Component | Purpose |
|-----------|---------|
| `FitAnalysisCard.tsx` | Display detailed fit breakdown |
| `ScoreBreakdownChart.tsx` | Visual score breakdown |
| `StrengthsGapsPanel.tsx` | Show strengths and gaps |
| `DocumentGeneratorPanel.tsx` | Resume/cover letter generation UI |

---

## Phase 4: Auto-Apply with Computer Use (Feature 5)

### 4A: Create `packages/computer-use` Package

**Package Structure:**
```
packages/computer-use/
├── src/
│   ├── index.ts                 # Main exports
│   ├── client/
│   │   └── automation-client.ts # Client SDK for consumers
│   ├── service/
│   │   ├── worker.ts            # Worker process
│   │   ├── worker-pool.ts       # Pool management
│   │   ├── task-queue.ts        # Redis queue integration
│   │   └── browser-manager.ts   # Playwright lifecycle
│   ├── actions/
│   │   ├── navigate.ts          # Page navigation
│   │   ├── fill-form.ts         # Form filling
│   │   ├── upload.ts            # File uploads
│   │   ├── screenshot.ts        # Screenshot capture
│   │   └── submit.ts            # Form submission
│   ├── security/
│   │   ├── sandbox.ts           # Container isolation
│   │   ├── permissions.ts       # URL/action allowlists
│   │   └── audit-logger.ts      # Compliance logging
│   └── types/
│       └── index.ts             # Package types
├── docker/
│   ├── Dockerfile               # Worker container
│   └── docker-compose.yml       # Local development
├── package.json
├── tsconfig.json
└── README.md
```

**New File:** `packages/computer-use/package.json`

```json
{
  "name": "@job-aggregator/computer-use",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "docker:build": "docker build -t job-aggregator/computer-use -f docker/Dockerfile .",
    "docker:run": "docker-compose -f docker/docker-compose.yml up"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.35.0",
    "playwright": "^1.48.0",
    "bullmq": "^5.0.0",
    "ioredis": "^5.4.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  }
}
```

### 4B: Client SDK for Backend Integration

**New File:** `packages/computer-use/src/client/automation-client.ts`

```typescript
import { z } from 'zod'

export const AutomationTaskSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['apply_job', 'fill_form', 'upload_document', 'screenshot']),
  targetUrl: z.string().url(),
  instructions: z.string(),  // Natural language for Claude
  documents: z.object({
    resumeUrl: z.string().optional(),
    coverLetterUrl: z.string().optional()
  }).optional(),
  profile: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    linkedIn: z.string().optional()
  }),
  callbackUrl: z.string().url().optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  timeoutMs: z.number().default(300000),  // 5 minutes
  requireApproval: z.boolean().default(true)
})

export type AutomationTask = z.infer<typeof AutomationTaskSchema>

export interface AutomationResult {
  taskId: string
  status: 'pending_approval' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  screenshots: string[]
  actionLog: Array<{
    action: string
    timestamp: string
    success: boolean
    details?: string
  }>
  error?: string
  durationMs?: number
}

export class AutomationClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async submitTask(task: AutomationTask): Promise<{ taskId: string }> {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(task)
    })
    return response.json()
  }

  async getTaskStatus(taskId: string): Promise<AutomationResult> {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    })
    return response.json()
  }

  async approveTask(taskId: string): Promise<void> {
    await fetch(`${this.baseUrl}/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    })
  }

  async cancelTask(taskId: string): Promise<void> {
    await fetch(`${this.baseUrl}/tasks/${taskId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    })
  }
}
```

### 4C: Safety Configuration (Compliance-First Design)

**Critical Safety Requirements (2025 Legal Compliance):**

| Requirement | Implementation |
|-------------|----------------|
| **Human Approval** | REQUIRED before each submission (NYC Law 144) |
| **AI Disclosure** | User acknowledges AI is applying on their behalf |
| **Audit Logging** | Complete action trail for compliance audits |
| **Rate Limiting** | Max 5 applications per day per user |
| **Security Isolation** | Docker with seccomp/AppArmor profiles |
| **URL Allowlisting** | Only approved job board domains |

**New File:** `packages/computer-use/src/security/permissions.ts`

```typescript
// URL allowlist for job application sites
export const ALLOWED_DOMAINS = [
  'linkedin.com',
  'indeed.com',
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'icims.com',
  'smartrecruiters.com',
  'bamboohr.com',
  'ashbyhq.com',
  'jobs.lever.co',
  'boards.greenhouse.io',
  // Add more as needed
]

// Actions that require human approval
export const APPROVAL_REQUIRED_ACTIONS = [
  'submit_application',
  'click_apply',
  'confirm_submission',
  'send_message'
]

// Actions that are always allowed
export const AUTO_APPROVED_ACTIONS = [
  'navigate',
  'screenshot',
  'fill_field',
  'scroll',
  'read_page'
]

export function isAllowedDomain(url: string): boolean {
  const hostname = new URL(url).hostname
  return ALLOWED_DOMAINS.some(domain =>
    hostname === domain || hostname.endsWith(`.${domain}`)
  )
}

export function requiresApproval(action: string): boolean {
  return APPROVAL_REQUIRED_ACTIONS.includes(action)
}
```

### 4D: Database Schema

```sql
-- Auto-apply queue
CREATE TABLE IF NOT EXISTS auto_apply_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'in_progress', 'review_needed',
    'completed', 'failed', 'cancelled'
  )),
  resume_url TEXT,
  cover_letter_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  screenshots TEXT[] DEFAULT '{}',
  session_log JSONB DEFAULT '[]',
  -- Compliance fields
  ai_disclosure_acknowledged BOOLEAN DEFAULT FALSE,
  ai_disclosure_acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auto_apply_queue_profile ON auto_apply_queue(profile_id);
CREATE INDEX IF NOT EXISTS idx_auto_apply_queue_status ON auto_apply_queue(status);

-- Auto-apply user configuration
CREATE TABLE IF NOT EXISTS auto_apply_config (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  max_per_day INTEGER DEFAULT 5,
  require_approval BOOLEAN DEFAULT TRUE,  -- Cannot be disabled (legal requirement)
  excluded_companies TEXT[] DEFAULT '{}',
  excluded_domains TEXT[] DEFAULT '{}',
  min_match_score INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI audit log for compliance
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('job_matching', 'fit_analysis', 'resume_generation', 'auto_apply')),
  action TEXT NOT NULL,
  input_data_hash TEXT,  -- SHA256 hash of input (anonymized)
  output_summary TEXT,
  model_used TEXT,
  human_review_required BOOLEAN DEFAULT FALSE,
  human_reviewed BOOLEAN DEFAULT FALSE,
  human_reviewed_at TIMESTAMPTZ,
  human_reviewer_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_profile ON ai_audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_feature ON ai_audit_log(feature);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_created ON ai_audit_log(created_at);
```

### 4E: Docker Configuration

**New File:** `packages/computer-use/docker/Dockerfile`

```dockerfile
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled code
COPY dist/ ./dist/

# Security hardening
RUN useradd -m -s /bin/bash worker
USER worker

# Environment
ENV NODE_ENV=production
ENV DISPLAY=:99

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('./dist/health-check').check()"

CMD ["node", "dist/service/worker.js"]
```

**New File:** `packages/computer-use/docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  computer-use-worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - BACKEND_API_URL=http://host.docker.internal:4000
      - WORKER_ID=${HOSTNAME:-worker-1}
    depends_on:
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1'
    security_opt:
      - seccomp:unconfined  # Required for Playwright
    cap_drop:
      - ALL
    cap_add:
      - SYS_ADMIN  # Required for Chromium sandbox

volumes:
  redis-data:
```

### 4F: Backend Integration

**Modify:** `apps/backend/package.json` (add dependency)

```json
{
  "dependencies": {
    "@job-aggregator/computer-use": "workspace:*"
  }
}
```

**New File:** `apps/backend/src/events/process-auto-apply.step.ts`

```typescript
import type { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { AutomationClient, AutomationTaskSchema } from '@job-aggregator/computer-use'

const client = new AutomationClient(
  process.env.COMPUTER_USE_API_URL!,
  process.env.COMPUTER_USE_API_KEY!
)

export const config: EventConfig = {
  type: 'event',
  name: 'ProcessAutoApply',
  description: 'Submit approved auto-apply job to Computer Use service',
  subscribes: ['auto-apply-approved'],
  emits: ['auto-apply-started', 'auto-apply-failed'],
  flows: ['auto-apply']
}

export const handler: Handlers['ProcessAutoApply'] = async (input, { emit, state, logger }) => {
  const { queueId, profileId, jobId } = input

  const profile = await state.get('profiles', profileId)
  const job = await state.get('jobs', jobId)
  const queueItem = await getAutoApplyQueueItem(queueId)

  if (!queueItem.ai_disclosure_acknowledged) {
    logger.error('AI disclosure not acknowledged', { queueId })
    await emit({ topic: 'auto-apply-failed', data: { queueId, error: 'AI disclosure required' } })
    return
  }

  const task = {
    id: queueId,
    type: 'apply_job' as const,
    targetUrl: job.url,
    instructions: `Apply to the ${job.title} position at ${job.company}. Fill in all required fields using the provided profile information.`,
    documents: {
      resumeUrl: queueItem.resume_url,
      coverLetterUrl: queueItem.cover_letter_url
    },
    profile: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      linkedIn: profile.linkedIn
    },
    callbackUrl: `${process.env.BACKEND_URL}/webhooks/auto-apply/${queueId}`,
    requireApproval: true
  }

  try {
    const { taskId } = await client.submitTask(task)
    await emit({ topic: 'auto-apply-started', data: { queueId, taskId } })
  } catch (error) {
    logger.error('Failed to submit auto-apply task', { error })
    await emit({ topic: 'auto-apply-failed', data: { queueId, error: error.message } })
  }
}
```

### 4G: Auto-Apply API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/profile/:id/auto-apply/config` | GET/POST | Manage auto-apply settings |
| `/applications/:id/auto-apply` | POST | Add job to auto-apply queue |
| `/applications/:id/auto-apply/acknowledge` | POST | Acknowledge AI disclosure |
| `/applications/:id/auto-apply/approve` | POST | Approve pending application |
| `/applications/:id/auto-apply/status` | GET | Get auto-apply status |
| `/applications/:id/auto-apply/cancel` | POST | Cancel in-progress auto-apply |
| `/profile/:id/auto-apply/queue` | GET | List pending auto-apply jobs |
| `/webhooks/auto-apply/:id` | POST | Webhook from Computer Use service |

---

## Database Schema Changes Summary

### New Tables
1. `notification_log` - Email notification history
2. `generated_documents` - Stored resumes/cover letters
3. `company_research` - Cached company research
4. `fit_analysis` - Detailed fit analysis results
5. `auto_apply_queue` - Auto-apply job queue
6. `auto_apply_config` - User auto-apply preferences

### Profile Table Additions
- `desired_titles TEXT[]`
- `desired_industries TEXT[]`
- `min_salary_requirement INTEGER`
- `email_verified BOOLEAN`
- `notification_enabled BOOLEAN`
- `notification_frequency TEXT`
- `min_match_score_for_notification INTEGER`
- `last_notification_sent_at TIMESTAMPTZ`
- `voice_style TEXT`
- `work_history JSONB`
- `education JSONB`
- `uploaded_resume_url TEXT`

---

## API Endpoints Summary

### Phase 1 (Email Notifications)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/profile/:id/notifications/settings` | GET/POST | Notification preferences |
| `/notifications/verify-email` | POST | Send verification email |
| `/notifications/verify-callback` | GET | Verify email token |

### Phase 2 (Research + Documents)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/jobs/:id/research` | POST | Research company/position |
| `/jobs/:id/research` | GET | Get cached research |
| `/jobs/:id/resume` | POST | Generate tailored resume |
| `/jobs/:id/cover-letter` | POST | Generate cover letter (enhanced) |
| `/profile/:id/documents` | GET | List generated documents |
| `/profile/:id/upload-resume` | POST | Upload resume for parsing |

### Phase 3 (Fit Analysis)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/jobs/:id/check-fit` | POST | Perform detailed fit analysis |
| `/jobs/:id/fit-analysis/:profileId` | GET | Get cached fit analysis |

### Phase 4 (Auto-Apply)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/profile/:id/auto-apply/config` | GET/POST | Auto-apply settings |
| `/applications/:id/auto-apply` | POST | Queue for auto-apply |
| `/applications/:id/auto-apply/approve` | POST | Approve application |
| `/applications/:id/auto-apply/status` | GET | Get status |
| `/applications/:id/auto-apply/cancel` | POST | Cancel |
| `/profile/:id/auto-apply/queue` | GET | List queue |

---

## Frontend Components Summary

### New Pages
- `/profile/notifications` - Notification settings
- `/jobs/:id/fit` - Detailed fit analysis view
- `/auto-apply` - Auto-apply queue management

### New Components
| Component | Purpose |
|-----------|---------|
| `NotificationSettings.tsx` | Email notification preferences |
| `JobPreferencesForm.tsx` | Desired titles, industries, salary |
| `ResumeUploader.tsx` | Upload and parse resume |
| `FitAnalysisCard.tsx` | Detailed fit breakdown |
| `ScoreBreakdownChart.tsx` | Visual score chart |
| `DocumentGeneratorPanel.tsx` | Resume/cover letter generation |
| `AutoApplyQueue.tsx` | Manage auto-apply jobs |
| `AutoApplyApproval.tsx` | Review and approve applications |
| `AutoApplyStatus.tsx` | Status/progress indicator |

---

## External Services Required

| Service | Purpose | Setup |
|---------|---------|-------|
| SendGrid | Email notifications | API key in .env |
| Anthropic API | Agent SDK + Computer Use | API key in .env |
| Supabase Storage | Document storage | Already configured |
| Docker | Computer Use sandbox | For auto-apply worker |

---

## Environment Variables

Add to `apps/backend/.env`:
```env
# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=notifications@yourdomain.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Anthropic (may already exist)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

---

## Implementation Order

1. **Phase 1A**: Profile schema changes + migrations
2. **Phase 1B**: SendGrid integration + email service
3. **Phase 1C**: Enhanced matching algorithm
4. **Phase 1D**: Notification event steps + cron
5. **Phase 2A**: Resume parsing service
6. **Phase 2B**: PDF generation service
7. **Phase 2C**: Claude Agent SDK tools
8. **Phase 2D**: Voice style prompts
9. **Phase 2E**: Document storage
10. **Phase 3A**: Fit analysis database
11. **Phase 3B**: Check fit API
12. **Phase 3C**: Frontend dashboard
13. **Phase 4A**: Auto-apply database
14. **Phase 4B**: Docker configuration
15. **Phase 4C**: Auto-apply APIs
16. **Phase 4D**: Auto-apply frontend

---

## Document Metadata

**Last Updated**: 2026-01-01
**Implementation Status**: Not Started
**Related Documents**:
- [FEATURE_JOB_AGGREGATOR_INTEGRATION.md](./FEATURE_JOB_AGGREGATOR_INTEGRATION.md)
- [FEATURE_JOB_SCRAPER_API.md](./FEATURE_JOB_SCRAPER_API.md)
- [FEATURE_SCRAPER_API_DATE_FILTER.md](./FEATURE_SCRAPER_API_DATE_FILTER.md)

**Change Log**:
- 2026-01-01 - Initial creation from multi-agent analysis
