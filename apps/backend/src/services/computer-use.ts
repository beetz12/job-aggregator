/**
 * Computer Use Service - TRUE AGENTIC LOOP
 *
 * This service implements an intelligent agent that uses Claude AI to make
 * decisions about how to complete job applications. Unlike hardcoded automation,
 * Claude observes each page and decides the optimal action.
 *
 * Architecture: OBSERVE → THINK → ACT → REPEAT
 *
 * Environment Variables:
 * - ANTHROPIC_API_KEY: API key for Anthropic services
 * - CHROME_USER_DATA_DIR: Path to Chrome profile for persistent sessions
 */

import Anthropic from '@anthropic-ai/sdk'

// Dynamic import for Playwright to avoid bundling issues with Motia/esbuild
// Playwright has native dependencies that can't be bundled
// Using Function constructor to completely avoid static analysis

interface PlaywrightChromium {
  launchPersistentContext(
    userDataDir: string,
    options: {
      headless: boolean
      channel: string
      args: string[]
      viewport: { width: number; height: number }
      timeout: number
    }
  ): Promise<BrowserContext>
}

interface BrowserContext {
  browser(): { isConnected(): boolean } | null
  newPage(): Promise<Page>
  close(): Promise<void>
}

interface Page {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>
  url(): string
  title(): Promise<string>
  screenshot(options?: { type?: string; encoding?: string }): Promise<Buffer>
  locator(selector: string): Locator
  waitForLoadState(state: string, options?: { timeout?: number }): Promise<void>
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<unknown>
  waitForTimeout(ms: number): Promise<void>
  evaluate<R>(fn: string | ((arg: unknown) => R), arg?: unknown): Promise<R>
  close(): Promise<void>
}

interface Locator {
  click(options?: { timeout?: number }): Promise<void>
  fill(value: string, options?: { timeout?: number }): Promise<void>
  selectOption(value: string, options?: { timeout?: number }): Promise<void>
  isChecked(): Promise<boolean>
  setInputFiles(files: string, options?: { timeout?: number }): Promise<void>
}

let playwrightModule: { chromium: PlaywrightChromium } | null = null

async function getPlaywright(): Promise<{ chromium: PlaywrightChromium }> {
  if (!playwrightModule) {
    // Use Function constructor to avoid static analysis by esbuild
    // This ensures Playwright is only loaded at runtime, not bundled
    const dynamicRequire = new Function('moduleName', 'return require(moduleName)')
    playwrightModule = dynamicRequire('playwright') as { chromium: PlaywrightChromium }
  }
  return playwrightModule
}

// ============================================================================
// Types
// ============================================================================

/**
 * Actions the agent can request
 */
export interface AgentAction {
  action:
    | 'click'
    | 'fill'
    | 'select'
    | 'check'
    | 'upload'
    | 'scroll'
    | 'wait'
    | 'navigate'
    | 'checkpoint'
    | 'done'
  selector?: string
  value?: string | boolean
  direction?: 'up' | 'down'
  amount?: number
  fileType?: 'resume' | 'cover_letter'
  checkpointType?: CheckpointType
  message?: string
  success?: boolean
  reason: string
}

/**
 * Internal state for the agent loop
 */
interface AgentState {
  currentUrl: string
  pageTitle: string
  screenshot: string
  stepNumber: number
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: unknown
  }>
}

/**
 * Checkpoint types that require human intervention
 */
export type CheckpointType =
  | 'login'
  | 'captcha'
  | 'questions'
  | 'review'
  | 'error'
  | 'upload'
  | 'custom'

/**
 * Data passed to checkpoint handlers
 */
export interface CheckpointData {
  type: CheckpointType
  message: string
  screenshot?: string
  url?: string
  questions?: Array<{
    id: string
    text: string
    type: 'text' | 'select' | 'checkbox' | 'radio' | 'textarea'
    options?: string[]
    required?: boolean
  }>
  error?: {
    code: string
    message: string
    recoverable: boolean
  }
  metadata?: Record<string, unknown>
}

/**
 * Response from checkpoint handler
 */
export interface CheckpointResponse {
  continue: boolean
  answers?: Record<string, string>
  credentials?: {
    username?: string
    password?: string
  }
  captchaSolution?: string
  approved?: boolean
  action?: string
}

/**
 * Profile data for job applications
 */
export interface ProfileData {
  name: string
  email: string
  phone?: string
  linkedIn?: string
  website?: string
  location?: string
  workAuthorization?: string
  expectedSalary?: string
  availableDate?: string
}

/**
 * Parameters for applying to a job
 */
export interface ApplyJobParams {
  jobUrl: string
  profileData: ProfileData
  resumeFilePath?: string
  coverLetterPath?: string
  resumeMarkdown: string
  coverLetterMarkdown?: string
  onCheckpoint: (
    type: CheckpointType,
    data: CheckpointData
  ) => Promise<CheckpointResponse>
  onProgress?: (step: number, action: string, reason: string) => void
  maxSteps?: number
}

/**
 * Result of a job application attempt
 */
export interface ApplyJobResult {
  success: boolean
  confirmationUrl?: string
  confirmationId?: string
  message?: string
  error?: string
  errorCode?: ApplicationErrorCode
  steps: number
  screenshots: string[]
  qaResponses?: Array<{ question: string; answer: string }>
  durationMs?: number
}

/**
 * Error codes for application failures
 */
export type ApplicationErrorCode =
  | 'NAVIGATION_FAILED'
  | 'APPLY_BUTTON_NOT_FOUND'
  | 'FORM_FILL_FAILED'
  | 'UPLOAD_FAILED'
  | 'LOGIN_REQUIRED'
  | 'CAPTCHA_FAILED'
  | 'SUBMISSION_FAILED'
  | 'TIMEOUT'
  | 'USER_CANCELLED'
  | 'UNKNOWN_ERROR'

/**
 * Result of executing a single action
 */
interface ActionResult {
  done: boolean
  checkpoint: boolean
  result?: ApplyJobResult
}

// ============================================================================
// Configuration
// ============================================================================

const CHROME_USER_DATA_DIR =
  process.env.CHROME_USER_DATA_DIR ||
  (process.env.HOME || '/tmp') + '/chrome-profiles/job-apply'

const DEFAULT_MAX_STEPS = 50
const ACTION_TIMEOUT = 10000
const NAVIGATION_TIMEOUT = 30000
const CHECKPOINT_TIMEOUT = 300000 // 5 minutes

// ============================================================================
// Browser Context Management
// ============================================================================

let browserContext: BrowserContext | null = null

/**
 * Get or create a persistent browser context using Chrome user profile
 */
async function getBrowserContext(): Promise<BrowserContext> {
  if (!browserContext || !browserContext.browser()?.isConnected()) {
    console.log(
      `[ComputerUse] Launching browser with user data dir: ${CHROME_USER_DATA_DIR}`
    )

    const playwright = await getPlaywright()
    browserContext = await playwright.chromium.launchPersistentContext(
      CHROME_USER_DATA_DIR,
      {
        headless: false,
        channel: 'chrome',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check',
        ],
        viewport: { width: 1280, height: 900 },
        timeout: 60000,
      }
    )

    console.log('[ComputerUse] Browser context created successfully')
  }

  return browserContext
}

/**
 * Close the browser context
 */
export async function closeBrowserContext(): Promise<void> {
  if (browserContext) {
    await browserContext.close()
    browserContext = null
    console.log('[ComputerUse] Browser context closed')
  }
}

// ============================================================================
// System Prompt Builder
// ============================================================================

/**
 * Build the system prompt for Claude with applicant information
 */
function buildSystemPrompt(
  profileData: ProfileData,
  resumeMarkdown: string,
  coverLetterMarkdown?: string
): string {
  return `You are an intelligent job application agent. Your goal is to successfully complete a job application by analyzing each page and deciding the optimal action.

## Your Capabilities
You observe the current page (via screenshot) and decide what single action to take next.

### Browser Actions
- click: Click an element. Provide CSS selector.
- fill: Fill a text input. Provide CSS selector and value.
- select: Select from dropdown. Provide CSS selector and option value/text.
- check: Check/uncheck a checkbox. Provide CSS selector and "true"/"false".
- upload: Upload a file. Provide CSS selector and fileType ("resume" or "cover_letter").
- scroll: Scroll the page. Provide direction ("up" or "down") and optional amount (pixels).
- wait: Wait for page to load. Provide milliseconds (number) or selector (string).
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
**Website/Portfolio:** ${profileData.website || 'Not provided'}
**Location:** ${profileData.location || 'Not provided'}
**Work Authorization:** ${profileData.workAuthorization || 'Authorized to work'}
**Expected Salary:** ${profileData.expectedSalary || 'Negotiable'}
**Available Start Date:** ${profileData.availableDate || 'Immediately'}

## Resume Content
Use this to answer application questions:
${resumeMarkdown}

${coverLetterMarkdown ? `## Cover Letter Content\n${coverLetterMarkdown}` : ''}

## Instructions
1. Analyze each screenshot carefully to understand the current page state
2. Decide the SINGLE best action to take next
3. Use specific, accurate CSS selectors (prefer IDs, data-testid, aria-labels, or unique classes)
4. If you see a login page or need authentication, use checkpoint with type "login"
5. If you see a CAPTCHA, use checkpoint with type "captcha"
6. Before final submission, ALWAYS use checkpoint with type "review" to let the user verify
7. If you encounter an error you cannot handle, use checkpoint with type "error"
8. When the application is confirmed submitted or you see a success/confirmation page, use done with success=true

## Response Format
Respond with ONLY valid JSON (no markdown code blocks, no explanation outside JSON):
{
  "action": "action_name",
  "selector": "CSS selector if needed",
  "value": "value if needed",
  "direction": "up or down for scroll",
  "amount": 500,
  "fileType": "resume or cover_letter for upload",
  "checkpointType": "login, captcha, questions, review, error for checkpoint",
  "message": "message for checkpoint or done",
  "success": true,
  "reason": "Brief explanation of why you chose this action"
}

## Important Rules
- ONE action per response
- Be precise with selectors - look for unique identifiers in order: id, data-testid, aria-label, name, unique class
- Fill forms field by field, one at a time
- Scroll down if you cannot see what you need
- If a selector fails, try an alternative approach
- If unsure about an answer to a question, use checkpoint with type "questions"
- NEVER submit the final application without checkpoint:review first
- When you see confirmation text like "Application submitted", "Thank you for applying", use done:success`
}

// ============================================================================
// Anthropic Client
// ============================================================================

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required for Computer Use'
      )
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

// ============================================================================
// Agent Loop - Main Entry Point
// ============================================================================

/**
 * Apply to a job using the TRUE AGENTIC LOOP
 *
 * Claude observes each page, decides what action to take, and Playwright executes it.
 * No hardcoded sequences - Claude adapts to whatever it encounters.
 */
export async function applyToJobWithAgent(
  params: ApplyJobParams
): Promise<ApplyJobResult> {
  const maxSteps = params.maxSteps || DEFAULT_MAX_STEPS
  const startTime = Date.now()
  const screenshots: string[] = []

  const state: AgentState = {
    currentUrl: '',
    pageTitle: '',
    screenshot: '',
    stepNumber: 0,
    conversationHistory: [],
  }

  const systemPrompt = buildSystemPrompt(
    params.profileData,
    params.resumeMarkdown,
    params.coverLetterMarkdown
  )

  const anthropic = getAnthropicClient()
  let page: Page | null = null

  try {
    // Get browser context and create new page
    const context = await getBrowserContext()
    page = await context.newPage()

    console.log(`[ComputerUse] Starting application for: ${params.jobUrl}`)

    // Initial navigation
    await page.goto(params.jobUrl, {
      waitUntil: 'networkidle',
      timeout: NAVIGATION_TIMEOUT,
    })

    // Agent loop: OBSERVE → THINK → ACT → REPEAT
    while (state.stepNumber < maxSteps) {
      state.stepNumber++

      // ====== 1. OBSERVE: Capture current state ======
      try {
        state.screenshot = (await page.screenshot({ type: 'png' })).toString(
          'base64'
        )
        state.currentUrl = page.url()
        state.pageTitle = await page.title()
        screenshots.push(state.screenshot)

        // Keep only last 5 screenshots to manage memory
        if (screenshots.length > 5) {
          screenshots.shift()
        }
      } catch (screenshotError) {
        console.error(
          '[ComputerUse] Failed to capture screenshot:',
          screenshotError
        )
        continue
      }

      // ====== 2. THINK: Ask Claude what to do ======
      const userMessage = {
        role: 'user' as const,
        content: [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/png' as const,
              data: state.screenshot,
            },
          },
          {
            type: 'text' as const,
            text: `Step ${state.stepNumber}. Current URL: ${state.currentUrl}\nPage title: ${state.pageTitle}\n\nAnalyze the page and decide the next action to complete this job application.`,
          },
        ],
      }

      let decision: AgentAction

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...state.conversationHistory.slice(-10),
            userMessage,
          ] as Anthropic.MessageParam[],
        })

        // Parse Claude's decision
        const responseText =
          response.content[0].type === 'text' ? response.content[0].text : ''

        try {
          // Clean potential markdown formatting
          const cleanJson = responseText
            .replace(/```json\n?|\n?```/g, '')
            .trim()
          decision = JSON.parse(cleanJson)
        } catch {
          console.error(
            `[ComputerUse] Failed to parse agent response: ${responseText.substring(0, 200)}`
          )

          // Add error context and retry
          state.conversationHistory.push({
            role: 'user',
            content: userMessage.content,
          })
          state.conversationHistory.push({
            role: 'assistant',
            content: response.content,
          })
          state.conversationHistory.push({
            role: 'user',
            content:
              'Your previous response was not valid JSON. Please respond with ONLY a valid JSON object with the structure: {"action": "...", "reason": "...", ...}',
          })
          continue
        }

        // Update conversation history
        state.conversationHistory.push({
          role: 'user',
          content: userMessage.content,
        })
        state.conversationHistory.push({
          role: 'assistant',
          content: response.content,
        })
      } catch (apiError) {
        console.error('[ComputerUse] Claude API error:', apiError)
        await page.waitForTimeout(2000)
        continue
      }

      // Report progress
      if (params.onProgress) {
        params.onProgress(state.stepNumber, decision.action, decision.reason)
      }

      console.log(
        `[ComputerUse] Step ${state.stepNumber}: ${decision.action} - ${decision.reason}`
      )

      // ====== 3. ACT: Execute the decision ======
      try {
        const result = await executeAction(page, decision, params)

        if (result.done) {
          const finalResult = result.result!
          finalResult.steps = state.stepNumber
          finalResult.screenshots = screenshots.slice(-3)
          finalResult.durationMs = Date.now() - startTime
          return finalResult
        }

        if (result.checkpoint) {
          // Request human intervention
          const checkpointResponse = await params.onCheckpoint(
            decision.checkpointType!,
            {
              type: decision.checkpointType!,
              message: decision.message || decision.reason,
              screenshot: state.screenshot,
              url: state.currentUrl,
            }
          )

          if (!checkpointResponse.continue) {
            return {
              success: false,
              error: `User cancelled at ${decision.checkpointType} checkpoint`,
              errorCode: 'USER_CANCELLED',
              steps: state.stepNumber,
              screenshots: screenshots.slice(-3),
              durationMs: Date.now() - startTime,
            }
          }

          // Add checkpoint response to context for Claude
          state.conversationHistory.push({
            role: 'user',
            content: `Checkpoint "${decision.checkpointType}" completed by user. ${
              checkpointResponse.approved ? 'User approved.' : ''
            }${
              checkpointResponse.credentials
                ? ' Login credentials provided.'
                : ''
            }${
              checkpointResponse.captchaSolution ? ' CAPTCHA solved.' : ''
            } Continue with the application.`,
          })
        }

        // Small delay between actions for stability
        await page.waitForTimeout(500)
      } catch (actionError) {
        const errorMessage =
          actionError instanceof Error
            ? actionError.message
            : 'Unknown action error'
        console.error(`[ComputerUse] Action failed: ${errorMessage}`)

        // Let Claude know the action failed so it can adapt
        state.conversationHistory.push({
          role: 'user',
          content: `The previous action "${decision.action}" with selector "${decision.selector || 'N/A'}" failed with error: ${errorMessage}. Please analyze the current page state and try a different approach. Maybe try a different selector or action.`,
        })
      }
    }

    // Max steps exceeded
    return {
      success: false,
      error: 'Maximum steps exceeded without completing application',
      errorCode: 'TIMEOUT',
      steps: state.stepNumber,
      screenshots: screenshots.slice(-3),
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error(`[ComputerUse] Fatal error: ${errorMessage}`)

    return {
      success: false,
      error: errorMessage,
      errorCode: 'UNKNOWN_ERROR',
      steps: state.stepNumber,
      screenshots: screenshots.slice(-3),
      durationMs: Date.now() - startTime,
    }
  } finally {
    if (page) {
      try {
        await page.close()
      } catch {
        // Ignore close errors
      }
    }
  }
}

// ============================================================================
// Action Executor
// ============================================================================

/**
 * Execute a single action decided by Claude
 */
async function executeAction(
  page: Page,
  action: AgentAction,
  params: ApplyJobParams
): Promise<ActionResult> {
  switch (action.action) {
    case 'click': {
      if (!action.selector) throw new Error('click requires a selector')
      await page.locator(action.selector).click({ timeout: ACTION_TIMEOUT })
      await page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(() => {})
      return { done: false, checkpoint: false }
    }

    case 'fill': {
      if (!action.selector) throw new Error('fill requires a selector')
      const fillValue =
        typeof action.value === 'string' ? action.value : String(action.value)
      await page
        .locator(action.selector)
        .fill(fillValue, { timeout: ACTION_TIMEOUT })
      return { done: false, checkpoint: false }
    }

    case 'select': {
      if (!action.selector) throw new Error('select requires a selector')
      const selectValue =
        typeof action.value === 'string' ? action.value : String(action.value)
      await page
        .locator(action.selector)
        .selectOption(selectValue, { timeout: ACTION_TIMEOUT })
      return { done: false, checkpoint: false }
    }

    case 'check': {
      if (!action.selector) throw new Error('check requires a selector')
      const checkbox = page.locator(action.selector)
      const isChecked = await checkbox.isChecked()
      const shouldBeChecked =
        action.value === 'true' || action.value === true || action.value === '1'
      if (isChecked !== shouldBeChecked) {
        await checkbox.click({ timeout: ACTION_TIMEOUT })
      }
      return { done: false, checkpoint: false }
    }

    case 'upload': {
      if (!action.selector) throw new Error('upload requires a selector')
      const filePath =
        action.fileType === 'resume'
          ? params.resumeFilePath
          : params.coverLetterPath
      if (!filePath) {
        throw new Error(`No file path provided for ${action.fileType}`)
      }
      await page
        .locator(action.selector)
        .setInputFiles(filePath, { timeout: ACTION_TIMEOUT })
      return { done: false, checkpoint: false }
    }

    case 'scroll': {
      const scrollAmount = action.amount || 500
      const scrollDir = action.direction === 'up' ? -scrollAmount : scrollAmount
      await page.evaluate((amount) => window.scrollBy(0, amount), scrollDir)
      await page.waitForTimeout(300)
      return { done: false, checkpoint: false }
    }

    case 'wait': {
      if (action.selector) {
        await page.waitForSelector(action.selector, { timeout: 15000 })
      } else {
        await page.waitForTimeout(action.amount || 2000)
      }
      return { done: false, checkpoint: false }
    }

    case 'navigate': {
      if (!action.value) throw new Error('navigate requires a value (URL)')
      const navigateUrl =
        typeof action.value === 'string' ? action.value : String(action.value)
      await page.goto(navigateUrl, {
        waitUntil: 'networkidle',
        timeout: NAVIGATION_TIMEOUT,
      })
      return { done: false, checkpoint: false }
    }

    case 'checkpoint': {
      return { done: false, checkpoint: true }
    }

    case 'done': {
      return {
        done: true,
        checkpoint: false,
        result: {
          success: action.success ?? true,
          confirmationUrl: page.url(),
          message: action.message || action.reason,
          steps: 0, // Will be set by caller
          screenshots: [],
        },
      }
    }

    default:
      throw new Error(`Unknown action: ${action.action}`)
  }
}

// ============================================================================
// Exports for backward compatibility
// ============================================================================

export { ProfileData as ComputerUseProfileData }
export { ApplyJobParams as ComputerUseApplyParams }
export { ApplyJobResult as ComputerUseApplyResult }
