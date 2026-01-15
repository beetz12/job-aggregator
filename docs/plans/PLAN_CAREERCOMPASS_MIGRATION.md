# CareerCompass Migration Plan

**Date**: 2026-01-03
**Status**: Ready for Review
**Confidence Level**: 90%
**Risk Level**: CRITICAL (Security Issues)

---

## Executive Summary

The `apps/careercompass` app has **CRITICAL SECURITY VULNERABILITIES** - it exposes the Gemini API key in the frontend bundle. This migration plan:

1. Moves all LLM API calls to the Motia backend (security fix)
2. Merges unique UI features into existing `apps/web` career-advisor
3. Consolidates types into `packages/types`
4. Enables safe deletion of `apps/careercompass`

**Key Finding**: The careercompass app is ~70% duplicate of the existing career-advisor feature. The unique value is:
- Enhanced DocumentRenderer with inline editing
- Direct Gemini integration for resume analysis

---

## Security Analysis

### CRITICAL: API Key Exposure

| File | Issue | Severity |
|------|-------|----------|
| `vite.config.ts:14-15` | API key injected into JS bundle via `define` | **CRITICAL** |
| `geminiService.ts:7,60` | Direct `process.env.API_KEY` usage in frontend | **CRITICAL** |

**Attack Vector**: Anyone can extract the Gemini API key from browser DevTools by inspecting the minified JavaScript bundle.

### Direct Frontend API Calls

| Function | What It Does | Data Exposed |
|----------|--------------|--------------|
| `analyzeResume()` | Sends full resume to Gemini | Complete professional history |
| `generateRequirementsDoc()` | Sends resume + preferences | Salary expectations, career goals |

---

## File Migration Mapping

### Files to CREATE (Backend Services)

| Target Location | Purpose |
|----------------|---------|
| `apps/backend/src/api/analyze-resume.step.ts` | POST /analyze-resume endpoint |
| `apps/backend/src/api/generate-requirements-doc.step.ts` | POST /generate-requirements-doc endpoint |
| `apps/backend/src/services/gemini-client.ts` | Gemini API client wrapper |

### Files to MERGE (Frontend Enhancements)

| Source | Target | Action |
|--------|--------|--------|
| `careercompass/components/DocumentRenderer.tsx` | `apps/web/src/components/JobCriteriaDocument.tsx` | Merge inline editing features |
| `careercompass/App.tsx` | `apps/web/src/app/career-advisor/page.tsx` | Merge resume parsing step |
| `careercompass/types.ts` | `packages/types/src/index.ts` | Add JobRequirementsDoc type |

### Files to SKIP (Already Exist/Not Needed)

| File | Reason |
|------|--------|
| `index.tsx` | Next.js handles entry differently |
| `index.html` | Vite-specific, Next.js has own |
| `vite.config.ts` | Build config not needed |
| `tsconfig.json` | Use web's config |
| `package.json` | Merge deps, delete file |
| `Layout.tsx` | Web app has own layout |

### Environment Variables to MOVE

```bash
# FROM: apps/careercompass/.env.local
GEMINI_API_KEY=xxx

# TO: apps/backend/.env.local (add to existing)
GEMINI_API_KEY=xxx
```

---

## Architecture: Backend Proxy Pattern

### Recommended: Motia Backend (Not Next.js API Routes)

**Reasons**:
1. Better security isolation from frontend
2. Handles long-running LLM calls (30-300s) without timeout issues
3. Leverages existing Motia patterns in your codebase
4. Supports streaming via Motia Streams

### Request Flow

```
┌─────────────────────────────┐
│   Next.js Frontend (web)    │
│   - No API keys             │
│   - Calls backend endpoints │
└──────────────┬──────────────┘
               │ HTTP POST
               ▼
┌─────────────────────────────┐
│   Motia Backend (4000)      │
│   - API key secured         │
│   - Rate limiting           │
│   - Request validation      │
└──────────────┬──────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────┐
│      Gemini API             │
└─────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Backend - Gemini Service (Priority: CRITICAL)

**Create**: `apps/backend/src/services/gemini-client.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

let client: GoogleGenerativeAI | null = null

export function getGeminiClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }
    client = new GoogleGenerativeAI(apiKey)
  }
  return client
}

export function getGeminiModel(modelName = 'gemini-1.5-flash') {
  return getGeminiClient().getGenerativeModel({ model: modelName })
}
```

**Dependencies**: Add to `apps/backend/package.json`:
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0"
  }
}
```

---

### Phase 2: Backend - API Endpoints

**Create**: `apps/backend/src/api/analyze-resume.step.ts`

```typescript
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { getGeminiModel } from '../services/gemini-client'

const bodySchema = z.object({
  resumeText: z.string().min(50).max(100000)
})

const responseSchema = z.object({
  data: z.object({
    name: z.string(),
    title: z.string(),
    skills: z.array(z.string()),
    experience: z.array(z.object({
      company: z.string(),
      role: z.string(),
      duration: z.string(),
      highlights: z.array(z.string())
    })),
    education: z.array(z.object({
      institution: z.string(),
      degree: z.string(),
      year: z.string()
    }))
  }),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    category: z.string(),
    context: z.string().optional()
  }))
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'AnalyzeResume',
  path: '/analyze-resume',
  method: 'POST',
  bodySchema,
  responseSchema: { 200: responseSchema }
}

export const handler: Handlers['AnalyzeResume'] = async (req, { logger }) => {
  const { resumeText } = bodySchema.parse(req.body)

  logger.info('Analyzing resume', { textLength: resumeText.length })

  const model = getGeminiModel()

  const prompt = `Analyze this resume and extract structured data...
  [Full prompt from geminiService.ts analyzeResume function]

  Resume:
  ${resumeText}`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  })

  const parsed = JSON.parse(result.response.text())

  return {
    status: 200,
    body: parsed
  }
}
```

**Create**: `apps/backend/src/api/generate-requirements-doc.step.ts`
(Similar pattern for requirements document generation)

---

### Phase 3: Frontend - API Client Update

**Update**: `apps/web/src/lib/api.ts`

```typescript
// Add new functions for Gemini-powered features

export async function analyzeResume(resumeText: string) {
  const response = await fetch(`${API_BASE}/analyze-resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText })
  })

  if (!response.ok) {
    throw new Error('Failed to analyze resume')
  }

  return response.json()
}

export async function generateRequirementsDoc(
  resumeData: ResumeData,
  answers: Record<string, string>
) {
  const response = await fetch(`${API_BASE}/generate-requirements-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeData, answers })
  })

  if (!response.ok) {
    throw new Error('Failed to generate requirements document')
  }

  return response.json()
}
```

---

### Phase 4: Frontend - Merge DocumentRenderer Features

**Enhance**: `apps/web/src/components/JobCriteriaDocument.tsx`

Features to merge from `DocumentRenderer.tsx`:
1. Inline text editing with click-to-edit
2. Add/remove buttons for array fields
3. Print/export to PDF functionality
4. Edit mode toggle
5. Section collapse/expand

---

### Phase 5: Types Consolidation

**Add to**: `packages/types/src/index.ts`

```typescript
// From careercompass/types.ts

export interface ResumeData {
  name: string
  title: string
  skills: string[]
  experience: Array<{
    company: string
    role: string
    duration: string
    highlights: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    year: string
  }>
}

export interface JobRequirementsDoc {
  name: string
  lastUpdated: string
  executiveSummary: string
  targetPositions: Array<{
    title: string
    seniority: string
    focus: string
    reason: string
  }>
  compensation: {
    baseFloor: string
    baseTarget: string
    equityExpectation: string
    benefits: string[]
  }
  location: {
    preference: string
    exclusions: string[]
  }
  cultureValues: {
    philosophy: string
    mustHaves: string[]
    redFlags: string[]
  }
  technicalStack: {
    mustHave: string[]
    niceToHave: string[]
  }
}
```

---

### Phase 6: Cleanup - Delete careercompass

After all phases complete and verified:

```bash
# Remove the careercompass app
rm -rf apps/careercompass

# Update turbo.json if needed (remove any references)
# Update root package.json workspaces if needed
```

---

## Testing Checklist

### Phase 1 Verification
- [ ] `GEMINI_API_KEY` works in backend `.env.local`
- [ ] `getGeminiClient()` initializes successfully
- [ ] Backend starts without errors

### Phase 2 Verification
- [ ] `POST /analyze-resume` returns valid response
- [ ] `POST /generate-requirements-doc` returns valid response
- [ ] Error handling works (invalid input, API failures)
- [ ] Rate limiting prevents abuse

### Phase 3 Verification
- [ ] Frontend `analyzeResume()` calls backend
- [ ] Frontend receives and parses response
- [ ] Loading states work correctly
- [ ] Error states display properly

### Phase 4 Verification
- [ ] Inline editing works in JobCriteriaDocument
- [ ] Add/remove array items works
- [ ] Print/export produces valid output
- [ ] All existing functionality preserved

### Phase 5 Verification
- [ ] Types compile without errors
- [ ] Both frontend and backend use shared types
- [ ] No type conflicts

### Phase 6 Verification
- [ ] App builds successfully without careercompass
- [ ] All career-advisor features work
- [ ] No broken imports or references

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Gemini API changes | Pin version, add retry logic |
| Rate limiting by Google | Implement request queuing |
| Long response times | Add timeout handling, loading states |
| Data loss during migration | Git branch, test thoroughly |

---

## Timeline Estimate

| Phase | Complexity | Dependencies |
|-------|------------|--------------|
| Phase 1: Backend Service | Low | None |
| Phase 2: API Endpoints | Medium | Phase 1 |
| Phase 3: Frontend API Client | Low | Phase 2 |
| Phase 4: UI Merge | High | Phase 3 |
| Phase 5: Types | Low | None (parallel) |
| Phase 6: Cleanup | Low | All phases |

---

## Document Metadata

**Last Updated**: 2026-01-03
**Review Status**: Pending User Approval
**Related Documents**:
- `docs/plans/FEATURE_CAREER_ADVISOR_INTEGRATION.md`
- `.cursor/rules/motia/api-steps.mdc`

**Change Log**:
- 2026-01-03 - Initial creation from multi-agent analysis
