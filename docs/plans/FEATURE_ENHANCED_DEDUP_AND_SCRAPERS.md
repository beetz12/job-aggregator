# Enhanced Job Deduplication & Custom Scraper Integration

**Date**: 2024-12-23
**Author**: Claude AI
**Status**: In Progress
**Type**: Feature Implementation Plan

## Table of Contents
- [Executive Summary](#executive-summary)
- [Current State Analysis](#current-state-analysis)
- [Architecture Overview](#architecture-overview)
- [Implementation Phases](#implementation-phases)
- [File Specifications](#file-specifications)
- [Event Flow](#event-flow)
- [Dependencies](#dependencies)
- [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

Based on analysis from 3 specialized agents examining:
- **Current Architecture** (26 step files, two-tier dedup system)
- **Motia Patterns** (event-driven architecture guidelines)
- **Industry Best Practices** (dedup strategies from Indeed, Textkernel, Lightcast)
- **New Scraper Requirements** (from `new_scraper.md`)

**Confidence Level: 90%** - All integration points identified, patterns validated against existing code.

---

## Current State Analysis

| Component | Current Implementation | Gap |
|-----------|----------------------|-----|
| **Sources** | 4 (arbeitnow, hackernews, reddit, remotive) | Missing Wellfound, Google Jobs |
| **Dedup Level 1** | MD5 hash (title+company+location) | ✅ Solid foundation |
| **Dedup Level 2** | In-memory state check | No fuzzy matching |
| **Dedup Level 3** | DB unique constraint on `content_hash` | ✅ Complete |
| **Near-duplicate** | None | Need fuzzy/semantic matching |
| **Proxy rotation** | None | Needed for Wellfound |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW COMPONENTS (Blue)                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Wellfound   │  │ Google Jobs  │  │   Enhanced   │
│   Scraper    │  │   Scraper    │  │   Dedup      │
│  (Playwright)│  │  (SerpAPI)   │  │  Service     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXISTING EVENT CHAIN (Green)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   fetch-jobs-trigger → normalize-job → index-job → job-indexed  │
│         ↑                                   │                    │
│         │                                   ▼                    │
│    [CRON: 30min]                    ┌──────────────┐            │
│                                     │   Enhanced   │            │
│                                     │   Dedup      │            │
│                                     │   Check      │            │
│                                     └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### PHASE 1: Enhanced Deduplication Service

**Files to create/modify:**

| File | Type | Description |
|------|------|-------------|
| `src/services/dedup/enhanced-dedup.ts` | NEW | Three-tier dedup service |
| `src/services/dedup/fuzzy-matcher.ts` | NEW | Fuzzy string matching |
| `src/services/dedup/normalizer.ts` | NEW | Enhanced text normalization |
| `src/events/index-job.step.ts` | MODIFY | Integrate enhanced dedup |

**Dedup Strategy (Three-Tier):**

```typescript
// Tier 1: Exact Hash (O(1) - instant)
// MD5(normalize(title) + normalize(company) + normalize(location))

// Tier 2: Fuzzy Matching (NEW - for near-duplicates)
// - Title similarity ≥ 80% (token_set_ratio)
// - Company similarity ≥ 70%

// Tier 3: Database Constraint (O(1) - catch-all)
// UNIQUE(content_hash)
```

### PHASE 2: Job Schema Extension

**Files to modify:**

| File | Change |
|------|--------|
| `src/types/job.ts` | Add `'wellfound'` and `'googlejobs'` to source enum |

### PHASE 3: Wellfound Scraper (Playwright + Proxies)

**Files to create:**

| File | Type | Description |
|------|------|-------------|
| `src/services/scrapers/wellfound-scraper.ts` | NEW | Playwright-based scraper |
| `src/services/proxy/proxy-rotator.ts` | NEW | Datacenter proxy rotation |
| `src/events/fetch-wellfound.step.ts` | NEW | Event step for Wellfound |

### PHASE 4: Google Jobs Scraper (SerpAPI)

**Files to create:**

| File | Type | Description |
|------|------|-------------|
| `src/services/scrapers/googlejobs-scraper.ts` | NEW | SerpAPI integration |
| `src/events/fetch-googlejobs.step.ts` | NEW | Event step for Google Jobs |

### PHASE 5: Normalize Job Extension

**Files to modify:**

| File | Change |
|------|--------|
| `src/events/normalize-job.step.ts` | Add Wellfound and Google Jobs normalization |

### PHASE 6: Integration & Testing

**Files to modify:**

| File | Change |
|------|--------|
| `src/cron/refresh-all-sources.step.ts` | Add new sources to refresh list |
| `src/api/refresh-source.step.ts` | Handle new sources in manual refresh |

---

## File Specifications

### 1. Enhanced Dedup Service (`src/services/dedup/enhanced-dedup.ts`)

```typescript
export interface DedupResult {
  isDuplicate: boolean
  matchType: 'exact' | 'fuzzy' | 'none'
  existingJobId?: string
  similarityScore?: number
}

export async function checkDuplicate(job: Job, ctx: Context): Promise<DedupResult>
export function generateEnhancedHash(job: Job): string
```

### 2. Fuzzy Matcher (`src/services/dedup/fuzzy-matcher.ts`)

```typescript
export function fuzzyMatchJobs(job1: Job, job2: Job): { match: boolean, score: number }
export function tokenSetRatio(str1: string, str2: string): number
export function normalizeForFuzzy(text: string): string
```

### 3. Proxy Rotator (`src/services/proxy/proxy-rotator.ts`)

```typescript
export class ProxyRotator {
  constructor(proxies: string[])
  getNextProxy(): string
  getRandomProxy(): string
  markProxyFailed(proxy: string): void
}
```

### 4. Wellfound Scraper (`src/services/scrapers/wellfound-scraper.ts`)

```typescript
export interface WellfoundJob {
  title: string
  company: string
  location: string
  url: string
  description: string
  posted_at?: string
  tags?: string[]
}

export async function scrapeWellfound(
  keyword: string,
  location: string,
  maxJobs?: number
): Promise<WellfoundJob[]>
```

### 5. Google Jobs Scraper (`src/services/scrapers/googlejobs-scraper.ts`)

```typescript
export interface GoogleJob {
  title: string
  company_name: string
  location: string
  via: string
  description: string
  job_id: string
  detected_extensions?: {
    posted_at?: string
    schedule_type?: string
  }
}

export async function scrapeGoogleJobs(
  query: string,
  location: string,
  maxJobs?: number
): Promise<GoogleJob[]>
```

---

## Event Flow (Updated)

```
refresh-all-sources (CRON: */30 * * * *)
    │
    ├─── emit('fetch-jobs-trigger', {source: 'arbeitnow'})
    ├─── emit('fetch-jobs-trigger', {source: 'hackernews'})
    ├─── emit('fetch-jobs-trigger', {source: 'reddit'})
    ├─── emit('fetch-jobs-trigger', {source: 'remotive'})
    ├─── emit('fetch-jobs-trigger', {source: 'wellfound'})   ← NEW
    └─── emit('fetch-jobs-trigger', {source: 'googlejobs'})  ← NEW
          │
          ▼
    [fetch-*.step.ts handlers]
          │
          ▼
    emit('normalize-job', {source, rawJob})
          │
          ▼
    normalize-job.step.ts (EXTENDED for new sources)
          │
          ▼
    emit('index-job', {job})
          │
          ▼
    index-job.step.ts (ENHANCED with fuzzy dedup)
          │
          ├─── Tier 1: Exact hash check (DB)
          ├─── Tier 2: Fuzzy match check (NEW)
          └─── Tier 3: DB unique constraint
          │
          ▼
    emit('job-indexed', {jobId, ...})
```

---

## Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "fuzzball": "^2.1.2",
    "playwright": "^1.40.0"
  }
}
```

### Environment Variables

```bash
# Proxy configuration (for Wellfound)
PROXY_1=http://user:pass@proxy1.provider.com:8080
PROXY_2=http://user:pass@proxy2.provider.com:8080
PROXY_3=http://user:pass@proxy3.provider.com:8080

# SerpAPI (for Google Jobs)
SERPAPI_KEY=your_serpapi_key
```

### Monthly Cost Estimate

| Item | Cost |
|------|------|
| Datacenter Proxies (3-5) | $5-20 |
| SerpAPI (1,000 requests) | $10 |
| **Total Additional** | **$15-30** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Wellfound blocks datacenter IPs | Start with residential proxy fallback option |
| SerpAPI rate limits | Implement request queuing + backoff |
| Fuzzy matching false positives | Conservative thresholds (80%/70%) |
| Performance impact of fuzzy check | Only check recent jobs, use DB index |

---

## Implementation Checklist

- [ ] Phase 1: Enhanced Deduplication Service
  - [ ] Create `src/services/dedup/enhanced-dedup.ts`
  - [ ] Create `src/services/dedup/fuzzy-matcher.ts`
  - [ ] Create `src/services/dedup/normalizer.ts`
  - [ ] Modify `src/events/index-job.step.ts`
- [ ] Phase 2: Schema Extension
  - [ ] Update `src/types/job.ts`
- [ ] Phase 3: Wellfound Scraper
  - [ ] Create `src/services/proxy/proxy-rotator.ts`
  - [ ] Create `src/services/scrapers/wellfound-scraper.ts`
  - [ ] Create `src/events/fetch-wellfound.step.ts`
- [ ] Phase 4: Google Jobs Scraper
  - [ ] Create `src/services/scrapers/googlejobs-scraper.ts`
  - [ ] Create `src/events/fetch-googlejobs.step.ts`
- [ ] Phase 5: Normalize Job Extension
  - [ ] Modify `src/events/normalize-job.step.ts`
- [ ] Phase 6: Integration
  - [ ] Modify `src/cron/refresh-all-sources.step.ts`
  - [ ] Modify `src/api/refresh-source.step.ts`
  - [ ] Install new dependencies
  - [ ] Run type generation

---

## Document Metadata

**Last Updated**: 2024-12-23
**Implementation Status**: In Progress
**Related Documents**:
- [new_scraper.md](../new_scraper.md)
- [FEATURE_JOB_AGGREGATOR_HACKATHON.md](./FEATURE_JOB_AGGREGATOR_HACKATHON.md)

**Change Log**:
- 2024-12-23 - Initial creation from multi-agent analysis
