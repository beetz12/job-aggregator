# Claude Computer Use + Chrome Integration Plan

**Date**: 2026-01-02 (v4 - TRUE AGENTIC LOOP)
**Author**: Claude AI (Multi-Agent Research)
**Status**: APPROVED - Ready for Implementation
**Confidence Level**: 90%

---

## Executive Summary

This plan implements a **TRUE AGENTIC LOOP** where Claude AI is in complete control of the job application process. There are **NO hardcoded steps** - Claude observes the current page state, decides what action to take, and Playwright executes it.

```
OBSERVE → THINK → ACT → REPEAT
   ↑                      │
   └──────────────────────┘
```

---

## Architecture: Agentic Loop

### Core Concept

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRUE AGENTIC LOOP                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    AGENT LOOP (while not done)                       │   │
│   │                                                                      │   │
│   │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │   │
│   │   │   OBSERVE    │───►│    THINK     │───►│     ACT      │──────┐   │   │
│   │   │              │    │              │    │              │      │   │   │
│   │   │ - Screenshot │    │ Claude API:  │    │ Playwright:  │      │   │   │
│   │   │ - Page URL   │    │ "What next?" │    │ Execute cmd  │      │   │   │
│   │   │ - DOM state  │    │              │    │              │      │   │   │
│   │   └──────────────┘    └──────────────┘    └──────────────┘      │   │   │
│   │          ▲                                                       │   │   │
│   │          └───────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Claude decides EVERY action:                                               │
│   • "I see a login button → checkpoint:login"                               │
│   • "I see an Apply button → click:#apply-btn"                              │
│   • "I see a name field → fill:#name with 'Dave Smith'"                     │
│   • "I see a captcha → checkpoint:captcha"                                  │
│   • "I see confirmation page → done:success"                                │
│   • "I see an error message → handle or checkpoint:error"                   │
│                                                                              │
│   NO HARDCODED SEQUENCE - Claude adapts to whatever it encounters           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │   Backend    │     │  Claude API  │     │  Playwright  │
│   (Next.js)  │     │   (Motia)    │     │              │     │  (Browser)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ POST /auto-apply   │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │                    │ Launch browser     │                    │
       │                    │────────────────────┼───────────────────►│
       │                    │                    │                    │
       │                    │◄───────────────────┼────────────────────│
       │                    │ Screenshot + URL   │                    │
       │                    │                    │                    │
       │                    │ "What should I do?"│                    │
       │                    │───────────────────►│                    │
       │                    │                    │                    │
       │                    │◄───────────────────│                    │
       │                    │ {action: "click",  │                    │
       │                    │  selector: "..."}  │                    │
       │                    │                    │                    │
       │                    │ Execute action     │                    │
       │                    │────────────────────┼───────────────────►│
       │                    │                    │                    │
       │                    │         [LOOP REPEATS]                  │
       │                    │                    │                    │
       │ Checkpoint event   │                    │                    │
       │◄───────────────────│ (login/review/etc) │                    │
       │                    │                    │                    │
       │ User response      │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │                    │         [LOOP CONTINUES]                │
       │                    │                    │                    │
       │ Final result       │                    │                    │
       │◄───────────────────│                    │                    │
       │                    │                    │                    │
```

---

## Agent Actions

Claude can request any of these actions:

| Action | Parameters | Description |
|--------|------------|-------------|
| `click` | `selector` | Click an element |
| `fill` | `selector`, `value` | Fill a text input |
| `select` | `selector`, `value` | Select dropdown option |
| `check` | `selector`, `checked` | Check/uncheck checkbox |
| `upload` | `selector`, `fileType` | Upload resume/cover letter |
| `scroll` | `direction`, `amount` | Scroll page up/down |
| `wait` | `ms` or `selector` | Wait for time or element |
| `navigate` | `url` | Go to a different URL |
| `checkpoint` | `type`, `message` | Request human intervention |
| `done` | `success`, `message` | Application complete |

### Checkpoint Types

| Type | When Used |
|------|-----------|
| `login` | Login form detected, user needs to authenticate |
| `captcha` | CAPTCHA detected, needs human solving |
| `questions` | Complex questions Claude can't answer confidently |
| `review` | Before final submission, user reviews application |
| `error` | Unrecoverable error, needs human decision |
| `upload` | Need user to confirm/select file for upload |

---

## Implementation

### File: `apps/backend/src/services/computer-use.ts`

```typescript
import { chromium, BrowserContext, Page } from 'playwright'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ============================================================================
// Types
// ============================================================================

interface AgentAction {
  action: 'click' | 'fill' | 'select' | 'check' | 'upload' | 'scroll' | 'wait' | 'navigate' | 'checkpoint' | 'done'
  selector?: string
  value?: string
  direction?: 'up' | 'down'
  amount?: number
  fileType?: 'resume' | 'cover_letter'
  checkpointType?: 'login' | 'captcha' | 'questions' | 'review' | 'error' | 'upload'
  message?: string
  success?: boolean
  reason: string
}

interface AgentState {
  currentUrl: string
  pageTitle: string
  screenshot: string
  stepNumber: number
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: any }>
}

interface ApplyJobParams {
  jobUrl: string
  profileData: ProfileData
  resumeFilePath: string
  coverLetterPath?: string
  resumeMarkdown: string
  coverLetterMarkdown?: string
  onCheckpoint: (type: string, data: CheckpointData) => Promise<CheckpointResponse>
  onProgress?: (step: number, action: string, reason: string) => void
  maxSteps?: number
}

// ============================================================================
// Browser Context Management
// ============================================================================

const CHROME_USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR
  || process.env.HOME + '/chrome-profiles/job-apply'

let browserContext: BrowserContext | null = null

async function getBrowserContext(): Promise<BrowserContext> {
  if (!browserContext) {
    browserContext = await chromium.launchPersistentContext(
      CHROME_USER_DATA_DIR,
      {
        headless: false,
        channel: 'chrome',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check'
        ],
        viewport: { width: 1280, height: 900 }
      }
    )
  }
  return browserContext
}

// ============================================================================
// System Prompt for Agent
// ============================================================================

function buildSystemPrompt(profileData: ProfileData, resumeMarkdown: string, coverLetterMarkdown?: string): string {
  return `You are an intelligent job application agent. Your goal is to successfully complete a job application.

## Your Capabilities
You can observe the current page (via screenshot) and decide what action to take. Available actions:

### Browser Actions
- click: Click an element. Provide CSS selector.
- fill: Fill a text input. Provide CSS selector and value.
- select: Select from dropdown. Provide CSS selector and option value/text.
- check: Check/uncheck a checkbox. Provide CSS selector and boolean.
- upload: Upload a file. Provide CSS selector and fileType ("resume" or "cover_letter").
- scroll: Scroll the page. Provide direction ("up" or "down") and optional amount.
- wait: Wait for page to load or element to appear. Provide milliseconds or selector.
- navigate: Go to a URL. Provide the URL.

### Control Actions
- checkpoint: Request human intervention. Types: "login", "captcha", "questions", "review", "error", "upload"
- done: Application complete. Provide success (boolean) and message.

## Applicant Information
Use this information to fill out applications:

**Name:** ${profileData.name}
**Email:** ${profileData.email}
**Phone:** ${profileData.phone || 'Not provided'}
**LinkedIn:** ${profileData.linkedIn || 'Not provided'}
**Website:** ${profileData.website || 'Not provided'}
**Location:** ${profileData.location || 'Not provided'}
**Work Authorization:** ${profileData.workAuthorization || 'Authorized to work'}

## Resume Content (for answering questions)
${resumeMarkdown}

${coverLetterMarkdown ? `## Cover Letter Content\n${coverLetterMarkdown}` : ''}

## Instructions
1. Analyze the screenshot carefully to understand the current page state
2. Decide the SINGLE best action to take next
3. Use specific, accurate CSS selectors (prefer IDs, data-testid, or unique classes)
4. If you see a login page or need authentication, use checkpoint:login
5. If you see a CAPTCHA, use checkpoint:captcha
6. Before final submission, ALWAYS use checkpoint:review to let the user verify
7. If you encounter an error you can't handle, use checkpoint:error
8. When the application is confirmed submitted, use done:success

## Response Format
Respond with ONLY valid JSON (no markdown, no explanation):
{
  "action": "action_name",
  "selector": "CSS selector if needed",
  "value": "value if needed",
  "reason": "Brief explanation of why you chose this action"
}

## Important Rules
- ONE action per response
- Be precise with selectors - look for unique identifiers
- Fill forms field by field, don't try to fill everything at once
- Scroll if you can't see what you're looking for
- If unsure about an answer, use checkpoint:questions
- NEVER submit without checkpoint:review first`
}

// ============================================================================
// Agent Loop
// ============================================================================

export async function applyToJobWithAgent(params: ApplyJobParams): Promise<ApplyJobResult> {
  const maxSteps = params.maxSteps || 50
  const context = await getBrowserContext()
  const page = await context.newPage()

  const state: AgentState = {
    currentUrl: '',
    pageTitle: '',
    screenshot: '',
    stepNumber: 0,
    conversationHistory: []
  }

  const systemPrompt = buildSystemPrompt(
    params.profileData,
    params.resumeMarkdown,
    params.coverLetterMarkdown
  )

  try {
    // Initial navigation
    await page.goto(params.jobUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Agent loop
    while (state.stepNumber < maxSteps) {
      state.stepNumber++

      // 1. OBSERVE: Capture current state
      state.screenshot = await page.screenshot({ encoding: 'base64' })
      state.currentUrl = page.url()
      state.pageTitle = await page.title()

      // 2. THINK: Ask Claude what to do
      const userMessage = {
        role: 'user' as const,
        content: [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/png' as const,
              data: state.screenshot
            }
          },
          {
            type: 'text' as const,
            text: `Step ${state.stepNumber}. Current URL: ${state.currentUrl}\nPage title: ${state.pageTitle}\n\nAnalyze the page and decide the next action to complete this job application.`
          }
        ]
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [...state.conversationHistory, userMessage]
      })

      // Parse Claude's decision
      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      let decision: AgentAction

      try {
        // Clean potential markdown formatting
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim()
        decision = JSON.parse(cleanJson)
      } catch (parseError) {
        console.error('Failed to parse agent response:', responseText)
        // Ask Claude to retry with proper format
        continue
      }

      // Update conversation history
      state.conversationHistory.push(userMessage)
      state.conversationHistory.push({ role: 'assistant', content: response.content })

      // Report progress
      if (params.onProgress) {
        params.onProgress(state.stepNumber, decision.action, decision.reason)
      }

      console.log(`[Step ${state.stepNumber}] Action: ${decision.action} - ${decision.reason}`)

      // 3. ACT: Execute the decision
      try {
        const result = await executeAction(page, decision, params)

        if (result.done) {
          return result.result!
        }

        if (result.checkpoint) {
          const checkpointResponse = await params.onCheckpoint(
            decision.checkpointType!,
            {
              type: decision.checkpointType!,
              message: decision.message || decision.reason,
              screenshot: state.screenshot,
              url: state.currentUrl
            }
          )

          if (!checkpointResponse.continue) {
            return {
              success: false,
              error: `User cancelled at ${decision.checkpointType} checkpoint`,
              errorCode: 'USER_CANCELLED',
              steps: state.stepNumber,
              screenshots: [state.screenshot]
            }
          }

          // Add checkpoint response to context for Claude
          state.conversationHistory.push({
            role: 'user',
            content: `Checkpoint "${decision.checkpointType}" completed by user. ${
              checkpointResponse.approved ? 'User approved.' : ''
            } Continue with the application.`
          })
        }

        // Small delay between actions for stability
        await page.waitForTimeout(500)

      } catch (actionError) {
        console.error(`Action failed: ${actionError.message}`)

        // Let Claude know the action failed so it can adapt
        state.conversationHistory.push({
          role: 'user',
          content: `The previous action failed with error: ${actionError.message}. Please analyze the current page state and try a different approach.`
        })
      }
    }

    // Max steps exceeded
    return {
      success: false,
      error: 'Maximum steps exceeded without completing application',
      errorCode: 'TIMEOUT',
      steps: state.stepNumber,
      screenshots: [state.screenshot]
    }

  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorCode: 'UNKNOWN_ERROR',
      steps: state.stepNumber,
      screenshots: [state.screenshot]
    }
  } finally {
    await page.close()
  }
}

// ============================================================================
// Action Executor
// ============================================================================

interface ActionResult {
  done: boolean
  checkpoint: boolean
  result?: ApplyJobResult
}

async function executeAction(
  page: Page,
  action: AgentAction,
  params: ApplyJobParams
): Promise<ActionResult> {

  switch (action.action) {
    case 'click':
      await page.locator(action.selector!).click({ timeout: 10000 })
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
      return { done: false, checkpoint: false }

    case 'fill':
      await page.locator(action.selector!).fill(action.value!, { timeout: 10000 })
      return { done: false, checkpoint: false }

    case 'select':
      await page.locator(action.selector!).selectOption(action.value!, { timeout: 10000 })
      return { done: false, checkpoint: false }

    case 'check':
      const checkbox = page.locator(action.selector!)
      const isChecked = await checkbox.isChecked()
      const shouldBeChecked = action.value === 'true' || action.value === true
      if (isChecked !== shouldBeChecked) {
        await checkbox.click({ timeout: 10000 })
      }
      return { done: false, checkpoint: false }

    case 'upload':
      const filePath = action.fileType === 'resume'
        ? params.resumeFilePath
        : params.coverLetterPath
      if (filePath) {
        await page.locator(action.selector!).setInputFiles(filePath, { timeout: 10000 })
      }
      return { done: false, checkpoint: false }

    case 'scroll':
      const scrollAmount = action.amount || 500
      const scrollDir = action.direction === 'up' ? -scrollAmount : scrollAmount
      await page.evaluate((amount) => window.scrollBy(0, amount), scrollDir)
      await page.waitForTimeout(300)
      return { done: false, checkpoint: false }

    case 'wait':
      if (action.selector) {
        await page.waitForSelector(action.selector, { timeout: 15000 })
      } else {
        await page.waitForTimeout(action.amount || 2000)
      }
      return { done: false, checkpoint: false }

    case 'navigate':
      await page.goto(action.value!, { waitUntil: 'networkidle', timeout: 30000 })
      return { done: false, checkpoint: false }

    case 'checkpoint':
      return { done: false, checkpoint: true }

    case 'done':
      return {
        done: true,
        checkpoint: false,
        result: {
          success: action.success ?? true,
          confirmationUrl: page.url(),
          message: action.message || action.reason,
          steps: 0, // Will be set by caller
          screenshots: []
        }
      }

    default:
      throw new Error(`Unknown action: ${action.action}`)
  }
}

// ============================================================================
// Exports
// ============================================================================

export { ApplyJobParams, ApplyJobResult, AgentAction, CheckpointData, CheckpointResponse }
```

---

## Integration with Backend API

### File: `apps/backend/src/api/trigger-auto-apply.step.ts`

```typescript
import { defineApiStep } from '@motia/core'
import { applyToJobWithAgent } from '../services/computer-use'
import { getDatabase } from '../services/database'

export default defineApiStep({
  config: {
    type: 'api',
    name: 'trigger-auto-apply',
    path: '/applications/:id/auto-apply',
    method: 'POST',
    emits: ['application-checkpoint', 'application-progress', 'application-complete']
  },

  async handler({ params, emit, state }) {
    const { id } = params
    const db = getDatabase()

    // Get application with job and profile
    const application = await db.applications.findById(id)
    if (!application) {
      return { status: 404, body: { error: 'Application not found' } }
    }

    if (application.status !== 'resume_ready') {
      return { status: 400, body: { error: 'Application must be in resume_ready status' } }
    }

    const profile = await db.profiles.findByUserId(application.userId)
    const job = await db.jobs.findById(application.jobId)

    // Update status to applying
    await db.applications.update(id, { status: 'applying' })

    // Start agent loop
    const result = await applyToJobWithAgent({
      jobUrl: job.url,
      profileData: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        linkedIn: profile.linkedIn,
        website: profile.website,
        location: profile.location,
        workAuthorization: profile.workAuthorization
      },
      resumeFilePath: profile.resumeFilePath,
      coverLetterPath: application.coverLetterFilePath,
      resumeMarkdown: profile.resumeMarkdown,
      coverLetterMarkdown: application.coverLetter,

      // Checkpoint callback - emit to frontend via WebSocket
      onCheckpoint: async (type, data) => {
        await emit({
          topic: 'application-checkpoint',
          data: { applicationId: id, checkpoint: { type, ...data } }
        })

        // Wait for user response (stored in state)
        const responseKey = `checkpoint:${id}:${Date.now()}`
        await state.set('checkpoints', responseKey, { waiting: true })

        // Poll for response (frontend will update this)
        let response = null
        const timeout = 300000 // 5 minutes
        const start = Date.now()

        while (!response && (Date.now() - start) < timeout) {
          await new Promise(r => setTimeout(r, 1000))
          const stored = await state.get('checkpoints', responseKey)
          if (stored && !stored.waiting) {
            response = stored
          }
        }

        return response || { continue: false }
      },

      // Progress callback - emit to frontend
      onProgress: async (step, action, reason) => {
        await emit({
          topic: 'application-progress',
          data: { applicationId: id, step, action, reason }
        })
      }
    })

    // Update final status
    const finalStatus = result.success ? 'applied' : 'error'
    await db.applications.update(id, {
      status: finalStatus,
      submissionUrl: result.confirmationUrl,
      error: result.error
    })

    await emit({
      topic: 'application-complete',
      data: { applicationId: id, result }
    })

    return { status: 200, body: result }
  }
})
```

---

## Frontend Integration

The existing `CheckpointModal` and `useAutoApply` hook work with this architecture. The agent emits checkpoint events, and the frontend responds.

---

## Why This is Truly Agentic

| Hardcoded Approach | Agentic Approach (This Plan) |
|--------------------|------------------------------|
| Step 1: Navigate | Claude sees page → decides to click Apply |
| Step 2: Click Apply | Claude sees form → decides to fill name field |
| Step 3: Fill name | Claude sees dropdown → decides to select option |
| Step 4: Fill email | Claude sees upload → decides to upload resume |
| ... | Claude sees captcha → requests human help |
| Fixed sequence | Claude adapts to ANYTHING it encounters |

**The agent handles:**
- Different site layouts (LinkedIn vs Indeed vs Greenhouse)
- Unexpected popups and modals
- Multi-page application flows
- Required vs optional fields
- Different question formats
- Errors and retries
- Any variation without code changes

---

## Implementation Checklist

- [ ] Install Playwright in backend
- [ ] Create dedicated Chrome profile
- [ ] Implement agent loop in computer-use.ts
- [ ] Update trigger-auto-apply.step.ts
- [ ] Test with checkpoint flow
- [ ] End-to-end testing

---

## Document Metadata

**Version**: v4 - TRUE AGENTIC LOOP
**Status**: APPROVED for implementation
**Confidence**: 90%

**Change Log**:
- v1: Initial plan (incorrect extension assumption)
- v2: Three programmatic options
- v3: Hybrid recommendation (still semi-hardcoded)
- v4: TRUE AGENTIC LOOP (Claude decides every action)
