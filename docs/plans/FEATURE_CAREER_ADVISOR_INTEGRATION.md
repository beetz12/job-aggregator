# Career Advisor Integration Plan

**Date**: 2026-01-03
**Author**: AI Agent (Multi-Agent Analysis)
**Status**: Draft - Awaiting Approval
**Version**: 1.0
**Confidence Level**: 90%

---

## Executive Summary

This plan integrates the CareerCompass wizard into the Job Aggregator app, renames the application to "Career Compass", and creates a new "Career Advisor" feature that guides users through resume analysis, preference gathering, and job fit evaluation using the enhanced check-fit system.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Integration Architecture](#integration-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Component Mapping](#component-mapping)
5. [Data Flow Design](#data-flow-design)
6. [Technical Specifications](#technical-specifications)
7. [Risk Assessment](#risk-assessment)

---

## Current State Analysis

### CareerCompass Project (Source)
| Aspect | Current State |
|--------|---------------|
| **Framework** | React 19 + Vite |
| **AI Integration** | Google Gemini (`gemini-3-flash-preview`) |
| **Flow** | Landing → Resume Upload → AI Parse → Interview (5 questions) → Generate Doc → Display/Edit |
| **Persistence** | None (in-memory only) |
| **Key Files** | `App.tsx`, `DocumentRenderer.tsx`, `geminiService.ts`, `types.ts` |

### Job Aggregator (Target)
| Aspect | Current State |
|--------|---------------|
| **Framework** | Next.js 15 + React 19 |
| **AI Integration** | Backend steps (Motia) - currently stub implementation |
| **Profile System** | Already has `resume_url`, `resume_text`, `resume_markdown` fields |
| **Check-Fit** | Keyword matching + hard-coded company insights |
| **Persistence** | Backend state + localStorage for profile ID |

### Check-Fit Current Limitations
1. **Stub company insights** - always returns score of 75
2. **Simple keyword matching** - only ~30 tech keywords
3. **No salary comparison** - field exists but unused
4. **No culture/values matching** - not implemented
5. **No AI-powered analysis** - ready for LLM integration

---

## Integration Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAREER ADVISOR FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │ Resume   │───▶│ AI Parse │───▶│ Interview│───▶│ Job Criteria     │  │
│  │ Upload   │    │ & Extract│    │ Questions│    │ Document         │  │
│  └──────────┘    └──────────┘    └──────────┘    └────────┬─────────┘  │
│                                                            │            │
│                                                            ▼            │
│                                              ┌──────────────────────┐   │
│                                              │ Paste Job Description│   │
│                                              │ or Select from Jobs  │   │
│                                              └──────────┬───────────┘   │
│                                                         │               │
│                                                         ▼               │
│                                              ┌──────────────────────┐   │
│                                              │ Enhanced Check-Fit   │   │
│                                              │ (Uses Full Criteria) │   │
│                                              └──────────┬───────────┘   │
│                                                         │               │
│                                                         ▼               │
│                                              ┌──────────────────────┐   │
│                                              │ Should You Apply?    │   │
│                                              │ Detailed Analysis    │   │
│                                              └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Navigation Structure

```
Header Navigation (Updated):
┌──────────────────────────────────────────────────────────────────┐
│ 🧭 Career Compass    Dashboard | Jobs | Matches | Applications  │
│                      Sources | Profile | [NEW] Career Advisor   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: App Rebranding (30 min)
**Files to Modify:**
- `apps/web/src/components/Header.tsx` - Update logo/title
- `apps/web/src/app/layout.tsx` - Update metadata
- `apps/web/package.json` - Update name

**Changes:**
```typescript
// Header.tsx
- "Job Aggregator"
+ "Career Compass"

// layout.tsx metadata
- title: "Job Aggregator - Powered by Motia"
+ title: "Career Compass - AI Job Search Consultant"
```

### Phase 2: Career Advisor Route & Navigation (1 hour)
**New Files:**
```
apps/web/src/app/career-advisor/
├── page.tsx              # Main advisor page with step wizard
└── layout.tsx            # Optional advisor-specific layout
```

**Header Update:**
```typescript
const navItems = [
  // ... existing items
  { href: '/career-advisor', label: 'Career Advisor' },
]
```

### Phase 3: Resume Upload Component (2 hours)
**New Files:**
```
apps/web/src/components/
├── ResumeUploader.tsx    # Multi-format file upload + text paste
└── ResumeParser.tsx      # Display parsed resume data
```

**Features:**
1. **Text paste** - Direct textarea input (like CareerCompass)
2. **File upload** - Support PDF, DOCX, MD, TXT
3. **Previous resume detection** - Check localStorage, offer to reuse
4. **Replace option** - Allow users to upload new resume

**localStorage Structure:**
```typescript
interface StoredResume {
  text: string
  fileName?: string
  uploadedAt: string
  parsedData?: ResumeData
}
// Key: 'career-compass-resume'
```

### Phase 4: AI Interview Flow (3 hours)
**New Files:**
```
apps/web/src/components/
├── InterviewWizard.tsx    # Step-by-step question flow
├── QuestionCard.tsx       # Individual question display
└── CategoryBadge.tsx      # Question category indicator

apps/web/src/hooks/
└── useAdvisorFlow.ts      # State management for wizard
```

**Question Categories (from CareerCompass):**
1. **COMPENSATION** - Salary expectations, equity, benefits
2. **LOCATION** - Remote preference, geo restrictions
3. **CULTURE** - Leadership style, values, red flags
4. **COMPANY STAGE** - Startup vs enterprise preference
5. **TECHNICAL** - Must-have vs nice-to-have stack

### Phase 5: Job Criteria Document Generator (2 hours)
**New Files:**
```
apps/web/src/components/
├── JobCriteriaDocument.tsx   # Display generated criteria
└── CriteriaEditor.tsx        # Edit individual sections
```

**Document Sections (from CareerCompass types):**
```typescript
interface JobRequirementsDoc {
  name: string
  lastUpdated: string
  executiveSummary: string
  targetPositions: TargetPosition[]
  compensation: CompensationRequirements
  location: LocationPreference
  cultureValues: CultureRequirements
  technicalStack: TechnicalRequirements
}
```

**localStorage Persistence:**
```typescript
// Key: 'career-compass-job-criteria'
```

### Phase 6: Enhanced Check-Fit Integration (3 hours)
**Files to Modify:**
```
apps/backend/src/api/check-fit.step.ts
apps/backend/src/types/job-matching.ts
apps/web/src/components/FitAnalysisModal.tsx
apps/web/src/hooks/useIntelligentApplication.ts
```

**New Check-Fit Request Structure:**
```typescript
interface EnhancedCheckFitRequest {
  job_id?: string              // From job listing
  job_description?: string     // Pasted job description
  profile_id: string
  job_criteria?: JobRequirementsDoc  // From Career Advisor
}
```

**Enhanced Analysis:**
1. **Salary Match** - Compare job salary to user's floor/target
2. **Location Match** - Check remote/geo alignment
3. **Culture Fit** - Match values, detect red flags
4. **Tech Stack Fit** - Must-have vs nice-to-have alignment
5. **Company Stage** - Startup/enterprise preference check

**New Response Fields:**
```typescript
interface EnhancedFitAnalysisResult extends FitAnalysisResult {
  criteriaMatch: {
    salaryAlignment: 'above' | 'within' | 'below' | 'unknown'
    locationMatch: boolean
    cultureFlags: { green: string[], red: string[] }
    techStackCoverage: number  // 0-100%
    companyStageMatch: boolean
  }
  shouldApply: 'DEFINITELY' | 'LIKELY' | 'MAYBE' | 'PROBABLY_NOT' | 'NO'
  detailedReasoning: string[]
}
```

### Phase 7: Job Description Input (1 hour)
**New Component:**
```
apps/web/src/components/
└── JobDescriptionInput.tsx   # Paste job description for analysis
```

**Features:**
1. Large textarea for pasting job descriptions
2. "Analyze This Job" button
3. Option to select from existing jobs in system
4. Loading state with AI animation

---

## Component Mapping

### CareerCompass → Next.js Conversion

| CareerCompass File | Next.js Location | Changes Required |
|-------------------|------------------|------------------|
| `App.tsx` | `app/career-advisor/page.tsx` | Convert to Next.js page, use client directive |
| `Layout.tsx` | Integrate into existing `Header.tsx` | Reuse existing layout |
| `DocumentRenderer.tsx` | `components/JobCriteriaDocument.tsx` | Adapt styling to dark mode |
| `types.ts` | `lib/types.ts` (append) | Add new interfaces |
| `geminiService.ts` | `lib/advisorService.ts` OR backend step | Decision point below |

### AI Service Decision

**Option A: Frontend Gemini (Like CareerCompass)**
- Pros: Simpler, faster to implement
- Cons: API key exposed in client, no caching

**Option B: Backend Motia Steps (Recommended)**
- Pros: Secure API keys, caching, logging, consistent with app
- Cons: More implementation work

**Recommendation**: Start with Option A for rapid prototype, migrate to Option B for production.

---

## Data Flow Design

### localStorage Keys

```typescript
const STORAGE_KEYS = {
  PROFILE_ID: 'job-aggregator-profile-id',  // Existing
  RESUME: 'career-compass-resume',           // New
  JOB_CRITERIA: 'career-compass-job-criteria', // New
  INTERVIEW_ANSWERS: 'career-compass-interview-answers', // New
  WIZARD_STEP: 'career-compass-wizard-step',  // New (for resume)
}
```

### State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Career Advisor State                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  localStorage                    React State                     │
│  ───────────                    ───────────                     │
│  resume (persisted)  ───▶  resumeData (parsed)                  │
│  jobCriteria         ───▶  currentCriteria                      │
│  interviewAnswers    ───▶  answers                              │
│  wizardStep          ───▶  step                                 │
│                                                                  │
│                      TanStack Query                              │
│                      ─────────────                              │
│                      useCheckFit() ─── POST /jobs/check-fit     │
│                      useProfile()  ─── GET /profile/:id         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Specifications

### Resume File Parsing

**PDF Parsing:**
```typescript
// Using pdf-parse library (already common in Node.js)
import pdfParse from 'pdf-parse';

async function parsePDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));
  return data.text;
}
```

**Alternative: Client-side with pdfjs-dist**
```typescript
import * as pdfjsLib from 'pdfjs-dist';

async function extractPDFText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ');
  }
  return text;
}
```

### New API Endpoints

**1. Resume Analysis (Optional Backend)**
```
POST /career-advisor/analyze-resume
Body: { resume_text: string }
Response: {
  data: ResumeData,
  questions: InterviewQuestion[]
}
```

**2. Generate Job Criteria**
```
POST /career-advisor/generate-criteria
Body: {
  resume_data: ResumeData,
  answers: Record<string, string>
}
Response: JobRequirementsDoc
```

**3. Enhanced Check-Fit**
```
POST /jobs/:id/check-fit  (existing, enhanced)
Body: {
  profile_id: string,
  job_criteria?: JobRequirementsDoc,
  job_description?: string  // For paste-in jobs
}
Response: EnhancedFitAnalysisResult
```

### Styling Guidelines

Follow existing dark mode patterns:
```typescript
// Backgrounds
className="bg-gray-900"      // Page background
className="bg-gray-800"      // Card background
className="bg-gray-700"      // Input background

// Text
className="text-white"       // Primary text
className="text-gray-400"    // Secondary text
className="text-gray-300"    // Tertiary text

// Accents (matching CareerCompass indigo theme)
className="bg-indigo-600"    // Primary buttons
className="text-indigo-400"  // Links, highlights
className="border-indigo-500" // Active borders

// Status badges
className="bg-green-600"     // Good fit
className="bg-yellow-500"    // Maybe
className="bg-red-600"       // Not recommended
```

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PDF parsing fails for complex formats | Medium | Medium | Fall back to text paste |
| Gemini API rate limits | Low | High | Queue requests, show clear errors |
| localStorage quota exceeded | Low | Low | Compress data, offer clear cache option |
| SSR hydration mismatches | Medium | Low | Use 'use client' directive consistently |

### UX Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users abandon long wizard | Medium | High | Allow save/resume, show progress |
| AI responses too slow | Medium | Medium | Show engaging loading states |
| Criteria document overwhelming | Low | Medium | Collapsible sections, summary view |

---

## Implementation Checklist

### Phase 1: Rebranding
- [ ] Update Header.tsx with "Career Compass" branding
- [ ] Update layout.tsx metadata
- [ ] Update package.json name
- [ ] Test all pages render correctly

### Phase 2: Navigation
- [ ] Add Career Advisor to navItems
- [ ] Create /career-advisor/page.tsx
- [ ] Verify route works

### Phase 3: Resume Upload
- [ ] Create ResumeUploader.tsx component
- [ ] Implement text paste functionality
- [ ] Implement file upload (PDF, MD, TXT)
- [ ] Add localStorage persistence
- [ ] Add "use previous resume" option

### Phase 4: Interview Flow
- [ ] Create InterviewWizard.tsx
- [ ] Create QuestionCard.tsx
- [ ] Implement useAdvisorFlow.ts hook
- [ ] Connect to AI service (Gemini or backend)

### Phase 5: Job Criteria Document
- [ ] Convert DocumentRenderer.tsx to Next.js
- [ ] Create JobCriteriaDocument.tsx
- [ ] Implement edit mode
- [ ] Add localStorage persistence

### Phase 6: Enhanced Check-Fit
- [ ] Update check-fit.step.ts to accept job_criteria
- [ ] Add job_description paste option
- [ ] Implement criteria-based matching
- [ ] Update FitAnalysisModal.tsx with new fields
- [ ] Add "Should You Apply?" recommendation

### Phase 7: Job Description Input
- [ ] Create JobDescriptionInput.tsx
- [ ] Add to Career Advisor flow
- [ ] Connect to enhanced check-fit

---

## Success Criteria

1. **User can upload resume** in multiple formats (text, PDF, MD)
2. **AI generates relevant questions** based on resume gaps
3. **Job criteria document** is generated and editable
4. **User can paste job descriptions** for fit analysis
5. **Enhanced check-fit** uses full criteria for recommendations
6. **Data persists** across browser sessions via localStorage
7. **Previous resume loads** automatically on return visits
8. **Clear "Should You Apply?" recommendation** with reasoning

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Rebranding | 30 min | None |
| Phase 2: Navigation | 1 hour | Phase 1 |
| Phase 3: Resume Upload | 2 hours | Phase 2 |
| Phase 4: Interview Flow | 3 hours | Phase 3 |
| Phase 5: Criteria Document | 2 hours | Phase 4 |
| Phase 6: Enhanced Check-Fit | 3 hours | Phase 5 |
| Phase 7: Job Description Input | 1 hour | Phase 6 |
| **Total** | **~12.5 hours** | |

---

## Document Metadata

**Last Updated**: 2026-01-03
**Review Status**: Pending User Approval
**Implementation Status**: Not Started

**Related Documents**:
- `/apps/careercompass/README.md` - Original CareerCompass setup
- `/apps/careercompass/types.ts` - Type definitions to migrate
- `/docs/plans/FIX_UI_ISSUES_UNIFIED_PLAN.md` - Previous UI fixes

**Change Log**:
- 2026-01-03 - Initial creation from multi-agent analysis
