# Job Aggregator - Unified Issues Fix Plan

**Date**: 2026-01-02
**Author**: Claude AI (Multi-Agent Analysis)
**Status**: ✅ Implemented
**Type**: Bug Fixes & Feature Enhancements
**Confidence**: 95%

---

## Executive Summary

Four issues were analyzed by a 3-agent team. This document provides a unified implementation plan with root causes, specific file changes, and recommended solutions.

---

## Issue 1: No Way to View Jobs by Source or All Jobs

### Problem
Home page shows job counts per source but users cannot:
- Click a source to view only jobs from that source
- Prominently view all jobs at once

### Root Cause
The home page (`page.tsx`) doesn't expose the filtering that already exists on `/jobs` page. The `SourceStatus` component shows counts but source cards aren't clickable.

### Solution

**Files to Modify:**

| File | Changes |
|------|---------|
| `apps/web/src/components/SourceStatus.tsx` | Make source cards clickable, navigate to `/jobs?source={name}` |
| `apps/web/src/app/page.tsx` | Add prominent "View All Jobs" button |

**Implementation:**

```tsx
// SourceStatus.tsx - Make each source card clickable
import Link from 'next/link'

// Wrap each source card in a Link (lines ~60-90)
<Link
  href={`/jobs?source=${source.name}`}
  className="block hover:bg-gray-750 transition-colors cursor-pointer"
>
  <div className="flex justify-between items-start">
    {/* Existing source card content */}
  </div>
</Link>

// Keep refresh button outside the Link to prevent navigation on click
<button
  onClick={(e) => {
    e.preventDefault()
    e.stopPropagation()
    handleRefreshSource(source.name)
  }}
>
  Refresh
</button>
```

```tsx
// page.tsx - Add prominent "View All Jobs" button (after StatsCards)
<div className="flex justify-end mb-4">
  <Link
    href="/jobs"
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
  >
    View All Jobs →
  </Link>
</div>
```

---

## Issue 2: Refresh Bugs (All Sources Refresh + No Loading Animation)

### Problem
- Clicking refresh on ONE source appears to refresh ALL sources
- No loading animation during refresh
- Global loading state blocks all refresh buttons

### Root Cause
**NOT a backend bug** - the API endpoints work correctly. The issue is in the frontend React Query hook:

**File:** `apps/web/src/hooks/useJobs.ts` (lines 34-44)
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['jobs'] })     // ← Invalidates ALL jobs
  queryClient.invalidateQueries({ queryKey: ['sources'] })
}
```

This causes React Query to refetch ALL jobs regardless of which source was refreshed, making it appear all sources were refreshed.

### Solution

**Files to Modify:**

| File | Changes |
|------|---------|
| `apps/web/src/hooks/useJobs.ts` | Fix cache invalidation to be source-aware |
| `apps/web/src/components/SourceStatus.tsx` | Add per-source loading state and animation |

**Implementation:**

```typescript
// useJobs.ts - Fix cache invalidation
export function useRefreshSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refreshSource,
    onSuccess: (data, sourceName) => {
      if (sourceName === 'all') {
        // Batch refresh - invalidate everything
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
      } else {
        // Single source - only invalidate that source's cached data
        // But also invalidate the "all jobs" view since counts changed
        queryClient.invalidateQueries({
          queryKey: ['jobs'],
          predicate: (query) => {
            const filters = query.queryKey[1] as { source?: string } | undefined
            return !filters?.source || filters.source === sourceName
          }
        })
      }
      // Always refresh source status (job counts updated)
      queryClient.invalidateQueries({ queryKey: ['sources'] })
    },
  })
}
```

```tsx
// SourceStatus.tsx - Add per-source loading state
const [refreshingSource, setRefreshingSource] = useState<string | null>(null)

const handleRefreshSource = (sourceName: string) => {
  setRefreshingSource(sourceName)
  refreshMutation.mutate(sourceName, {
    onSettled: () => setRefreshingSource(null)
  })
}

// Per-source button with loading animation
<button
  onClick={(e) => {
    e.preventDefault()
    e.stopPropagation()
    handleRefreshSource(source.name)
  }}
  disabled={refreshingSource === source.name}
  className={`text-xs flex items-center gap-1 transition-colors ${
    refreshingSource === source.name
      ? 'text-gray-500 cursor-not-allowed'
      : 'text-blue-400 hover:text-blue-300'
  }`}
>
  {refreshingSource === source.name ? (
    <>
      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
      Refreshing...
    </>
  ) : (
    'Refresh'
  )}
</button>
```

---

## Issue 3: Dice, Wellfound, and Google Jobs Showing 0 Jobs

### Status: **DEFERRED** (Not a code issue)

- **Dice & Wellfound**: Firecrawl credits exhausted - need to recharge account at https://firecrawl.dev/pricing
- **Google Jobs**: Deliberately disabled - requires SERPAPI_KEY

**No code changes required** - this is a billing/configuration issue outside the codebase.

---

## Issue 4: Missing 3 Sources (15 vs 13)

### Problem
Python Scraper supports 15 sources but Job Aggregator only shows 13.

### Missing Sources

| Source | Type | Description | Jobs/Scrape |
|--------|------|-------------|-------------|
| `yc_jobs` | API | Y Combinator Jobs | ~20 |
| `themuse` | API | The Muse (no auth needed) | ~100 |
| `jobicy_api` | API | Jobicy JSON API (faster than Playwright) | ~50 |

### Solution

**File:** `apps/backend/src/services/sources.ts`

Add the 3 missing sources to `SCRAPER_SOURCES` array:

```typescript
// Line ~15 - Add to SCRAPER_SOURCES tuple
export const SCRAPER_SOURCES = [
  'arbeitnow',
  'hackernews',
  'remoteok',
  'weworkremotely',
  'braintrust',
  'devitjobs',
  'jobicy',
  'dice',
  'builtin',
  'remotive',
  'wellfound',
  'yc_jobs',      // ADD
  'themuse',      // ADD
  'jobicy_api',   // ADD
] as const

// Add metadata for each new source in SOURCE_METADATA object:
yc_jobs: {
  displayName: 'Y Combinator Jobs',
  type: 'api',
  isActive: true,
  requiresProxy: false,
  rateLimit: 30,
  estimatedJobs: 20,
  description: 'Featured startup jobs from YC companies',
},
themuse: {
  displayName: 'The Muse',
  type: 'api',
  isActive: true,
  requiresProxy: false,
  rateLimit: 30,
  estimatedJobs: 100,
  description: 'Career platform with company culture insights',
},
jobicy_api: {
  displayName: 'Jobicy API',
  type: 'api',
  isActive: true,
  requiresProxy: false,
  rateLimit: 60,
  estimatedJobs: 50,
  description: 'Remote jobs via Jobicy free JSON API',
},
```

---

## Implementation Order

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| **1** | Issue 2 (Refresh bugs) | Medium | High - Core functionality broken |
| **2** | Issue 1 (View jobs by source) | Low | High - Key UX improvement |
| **3** | Issue 4 (Missing sources) | Low | Medium - More job coverage |
| ~~4~~ | ~~Issue 3 (API key sources)~~ | ~~N/A~~ | **DEFERRED** - Billing issue |

---

## Files Summary

| File | Issues | Changes |
|------|--------|---------|
| `apps/web/src/hooks/useJobs.ts` | #2 | Fix cache invalidation logic |
| `apps/web/src/components/SourceStatus.tsx` | #1, #2 | Clickable sources + loading animation |
| `apps/web/src/app/page.tsx` | #1 | Add "View All Jobs" button |
| `apps/backend/src/services/sources.ts` | #4 | Add 3 missing sources |

---

## Testing Checklist

- [x] Click refresh on one source → only that source refreshes
- [x] Loading spinner appears on refresh button during refresh
- [x] Click source card → navigates to `/jobs?source={name}`
- [x] "View All Jobs" button navigates to `/jobs`
- [x] New sources (yc_jobs, themuse, jobicy_api) appear in source list
- [ ] New sources can be refreshed and return jobs (requires Python scraper support)

---

## Document Metadata

**Last Updated**: 2026-01-02
**Implementation Status**: ✅ Complete
**Analysis Agents Used**: 3 (Frontend, Backend/Config, API Analysis)
**Confidence Level**: 95%

**Change Log**:
- 2026-01-02 - Implementation complete (Issues #1, #2, #4)
- 2026-01-02 - Issue #3 deferred (Firecrawl billing issue)
- 2026-01-02 - Initial creation from multi-agent analysis
