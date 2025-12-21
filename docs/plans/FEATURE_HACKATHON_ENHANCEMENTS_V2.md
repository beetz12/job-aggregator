# Hackathon Enhancement Plan V2 - AI-Powered Features

**Date**: 2025-12-17
**Author**: Claude AI
**Status**: Complete
**Type**: Feature

## Table of Contents
- [Overview](#overview)
- [Feature 1: AI Job Summarizer](#feature-1-ai-job-summarizer--skills-extractor)
- [Feature 2: Job-Skill Matching](#feature-2-user-profile--job-skill-matching)
- [Feature 3: Application Tracker](#feature-3-application-tracker-with-follow-up-reminders)
- [Feature 4: Cover Letter Generator](#feature-4-ai-cover-letter-generator)
- [Feature 5: Additional Sources](#feature-5-additional-job-sources)
- [Implementation Order](#implementation-order)

## Overview

This plan outlines 5 high-impact features to enhance the Job Aggregator for the Backend Reloaded Hackathon. Each feature leverages Motia's unique capabilities: polyglot execution, event-driven architecture, real-time streaming, cron scheduling, and state management.

**Confidence Level**: 90%
**Total Estimated Time**: 22-29 hours

## Feature 1: AI Job Summarizer & Skills Extractor

**Impact**: HIGH | **Complexity**: LOW | **Time**: 3-4 hours

### Description
Generates concise summaries and extracts required skills from job descriptions using Claude API.

### Architecture
```
Job Fetched → emit('job-indexed') → summarize-job.step.ts (Claude API) → state update
```

### Files to Create/Modify
- `src/events/summarize-job.step.ts` - Event step for Claude API calls
- `src/types/job-summary.ts` - Summary schema
- `frontend/src/components/JobSummary.tsx` - Display component

### Output Schema
```typescript
interface JobSummary {
  id: string
  oneLiner: string           // "Senior React dev at fintech startup, $150-180k"
  keyRequirements: string[]  // ["5+ years React", "TypeScript", "AWS"]
  niceToHaves: string[]      // ["GraphQL", "Kubernetes"]
  redFlags: string[]         // ["On-site only", "Requires clearance"]
  salaryRange?: string
  remotePolicy: 'remote' | 'hybrid' | 'onsite' | 'unknown'
  seniorityLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'unknown'
}
```

### Motia Showcase
- Claude API integration
- Event-driven processing
- State management for caching summaries

---

## Feature 2: User Profile + Job-Skill Matching

**Impact**: VERY HIGH | **Complexity**: MEDIUM | **Time**: 8-10 hours

### Description
Users create a profile with skills/experience. System scores compatibility (0-100) for each job using embedding-based similarity.

### Architecture
```
User Profile Created → emit('profile-updated')
    → match_jobs_step.py (Python ML)
    → emit('matches-calculated')
    → Update job scores in state
```

### Files to Create
**Backend:**
- `src/api/profile.step.ts` - GET/POST /profile endpoints
- `src/events/match_jobs_step.py` - Python step for ML matching
- `src/types/profile.ts` - User profile schema

**Frontend:**
- `frontend/src/app/profile/page.tsx` - Profile creation page
- `frontend/src/components/ProfileForm.tsx` - Form component
- `frontend/src/components/MatchScore.tsx` - Score display badge

### Profile Schema
```typescript
interface UserProfile {
  id: string
  name: string
  email: string
  skills: string[]              // ["React", "TypeScript", "Node.js"]
  experienceYears: number
  seniorityLevel: 'junior' | 'mid' | 'senior' | 'lead'
  preferredLocations: string[]  // ["Remote", "San Francisco"]
  remotePreference: 'remote-only' | 'hybrid' | 'onsite' | 'flexible'
  salaryExpectation?: {
    min: number
    max: number
    currency: string
  }
  createdAt: string
  updatedAt: string
}
```

### Motia Showcase
- **Polyglot execution**: Python step for ML (sentence-transformers)
- Event-driven matching pipeline
- State management for profiles and scores

---

## Feature 3: Application Tracker with Follow-up Reminders

**Impact**: MEDIUM-HIGH | **Complexity**: LOW | **Time**: 4-5 hours

### Description
Track job applications with status updates and automated follow-up reminders.

### Architecture
```
POST /applications → state.set('applications', id, data)
Cron step (daily) → check 7-day-old apps → emit('followup-reminder')
```

### Files to Create
**Backend:**
- `src/api/applications.step.ts` - CRUD endpoints
- `src/cron/followup-reminders.step.ts` - Daily reminder cron
- `src/types/application.ts` - Application schema

**Frontend:**
- `frontend/src/app/applications/page.tsx` - Applications dashboard
- `frontend/src/components/ApplicationCard.tsx` - Application card
- `frontend/src/components/ApplicationForm.tsx` - Quick add form

### Application Schema
```typescript
interface Application {
  id: string
  jobId: string
  jobTitle: string
  company: string
  status: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'
  appliedAt?: string
  notes: string
  followUpDate?: string
  resumeVersion?: string
  createdAt: string
  updatedAt: string
}
```

### Motia Showcase
- **Cron scheduling**: Automated follow-up reminders
- State management for application tracking
- Event-driven status updates

---

## Feature 4: AI Cover Letter Generator

**Impact**: HIGH | **Complexity**: MEDIUM | **Time**: 4-6 hours

### Description
Generate tailored cover letters based on user profile and specific job description using Claude API.

### Architecture
```
POST /jobs/:id/cover-letter → emit('generate-cover-letter')
    → generate-cover-letter.step.ts (Claude API)
    → Return generated text
```

### Files to Create
**Backend:**
- `src/api/generate-cover-letter.step.ts` - API endpoint
- `src/events/generate-cover-letter.step.ts` - Claude API processing

**Frontend:**
- `frontend/src/components/CoverLetterModal.tsx` - Generation modal
- `frontend/src/components/CoverLetterPreview.tsx` - Preview/edit component

### API Contract
```typescript
// POST /jobs/:id/cover-letter
interface CoverLetterRequest {
  jobId: string
  profileId: string
  tone?: 'professional' | 'friendly' | 'enthusiastic'
  emphasis?: string[]  // Specific skills to highlight
}

interface CoverLetterResponse {
  coverLetter: string
  highlightedSkills: string[]
  matchedRequirements: string[]
  generatedAt: string
}
```

### Motia Showcase
- Claude API integration for text generation
- Event-driven processing
- Real-time streaming potential for generation progress

---

## Feature 5: Additional Job Sources

**Impact**: MEDIUM | **Complexity**: LOW | **Time**: 3-4 hours

### Description
Add HackerNews "Who's Hiring" and Remotive RSS as additional data sources.

### Architecture
```
Cron trigger → fetch_hackernews_step.py (Python) → normalize → index
Cron trigger → fetch-remotive.step.ts → normalize → index
```

### Files to Create
- `src/events/fetch_hackernews_step.py` - Python step for HN parsing
- `src/events/fetch-remotive.step.ts` - Remotive RSS fetcher

### HackerNews Implementation
```python
# Parse monthly "Who's Hiring" threads
# Extract: title, company, location, remote status, URL
# Handle: comment parsing, job post detection
```

### Remotive Implementation
```typescript
// RSS feed: https://remotive.com/remote-jobs/feed
// Parse XML → normalize to Job schema
// Categories: software-dev, devops, design, etc.
```

### Motia Showcase
- **Polyglot execution**: Python for complex text parsing
- Multi-source aggregation
- Unified normalization pipeline

---

## Implementation Order

### Phase 1: Quick Wins (Day 1 Morning)
1. **AI Job Summarizer** - Immediate visual impact on job cards

### Phase 2: Data Sources (Day 1 Afternoon)
2. **Additional Sources** - HackerNews + Remotive (shows polyglot)

### Phase 3: Core Differentiator (Day 2 Morning)
3. **User Profile + Job Matching** - Main demo feature

### Phase 4: User Value (Day 2 Afternoon)
4. **Application Tracker** - Practical utility

### Phase 5: Polish (Day 3)
5. **Cover Letter Generator** - Wow factor for judges

---

## Risk Assessment

| Feature | Technical Risk | Legal Risk | Status |
|---------|---------------|------------|--------|
| AI Summarizer | Low | None | Ready |
| Job Matching | Medium | None | Ready |
| Application Tracker | Low | None | Ready |
| Cover Letter Gen | Low | None | Ready |
| Additional Sources | Low | Low | Ready |

---

## Document Metadata

**Last Updated**: 2025-12-17
**Implementation Status**: Complete
**Related Documents**:
- `docs/plans/FEATURE_JOB_AGGREGATOR_HACKATHON.md` - Original implementation
- `docs/plans/FEATURE_HACKATHON_ENHANCEMENTS.md` - Previous enhancements
- `.cursor/rules/motia/` - Motia development guides

**Change Log**:
- 2025-12-17 - Initial creation from multi-agent analysis
