# Unified UI Issues Fix Plan

**Date**: 2026-01-02
**Author**: Claude AI
**Status**: In Progress
**Type**: Fix
**Version**: 1.0

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Issues Overview](#issues-overview)
3. [Implementation Plan](#implementation-plan)
4. [Phase 1 - Quick Wins](#phase-1---quick-wins)
5. [Phase 2 - Core UX](#phase-2---core-ux)
6. [Phase 3 - Feature Enhancement](#phase-3---feature-enhancement)
7. [Testing Strategy](#testing-strategy)

---

## Executive Summary

This plan addresses 6 UI/UX issues identified during testing and from the issues_to_fix.md document. The fixes are prioritized by effort and impact, with a focus on quick wins first.

**Total Estimated Effort**: 4-5 hours
**Confidence Level**: 90-98%

---

## Issues Overview

| Issue | Description | File(s) | Confidence | Effort |
|-------|-------------|---------|------------|--------|
| **A** | Matches page null reference error | `apps/web/src/app/matches/page.tsx:60` | 98% | 5 min |
| **B** | Profile creation button missing | `apps/web/src/components/BatchActionsBar.tsx:176-180` | 95% | 5 min |
| **1** | Reddit/Google Jobs showing as legacy | `apps/backend/src/services/sources.ts:37-40,133-164` | 95% | 10 min |
| **2** | Pagination not working | `apps/web/src/app/jobs/page.tsx:59,306-312` | 95% | 30 min |
| **4** | Need advanced filtering | Multiple files | 90% | 2-3 hrs |
| **5** | Job description formatting | New utility + integration | 92% | 45 min |

---

## Implementation Plan

### Phase 1 - Quick Wins (20 min)

#### Issue A: Matches Page Null Check
**File**: `apps/web/src/app/matches/page.tsx`
**Line**: 60
**Problem**: `const score = match_score.total_score` throws when `match_score` is undefined
**Solution**: Add defensive null check before accessing properties

```typescript
// Before (line 60):
const score = match_score.total_score  // UNSAFE

// After:
if (!match_score || !match_score.breakdown) {
  return null // or render fallback UI
}
const score = match_score.total_score  // NOW SAFE
```

#### Issue B: Profile Creation Button
**File**: `apps/web/src/components/BatchActionsBar.tsx`
**Lines**: 176-180
**Problem**: Shows warning message but no action button
**Solution**: Add Link component to navigate to profile page

```typescript
// Before:
{!hasProfile && (
  <p className="text-yellow-400 text-sm mt-2">
    Create a profile to use Check Fit and Apply features
  </p>
)}

// After:
{!hasProfile && (
  <div className="flex items-center gap-3 mt-2">
    <p className="text-yellow-400 text-sm">
      Create a profile to use Check Fit and Apply features
    </p>
    <Link
      href="/profile"
      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
    >
      Create Profile
    </Link>
  </div>
)}
```

#### Issue 1: Reddit/Google Sources Fix
**File**: `apps/backend/src/services/sources.ts`
**Problem**: Reddit and Google Jobs marked as legacy/inactive
**Solution**:
1. Remove from `LEGACY_SOURCES` array (lines 37-40)
2. Set `isActive: true` for reddit (lines 133-140)
3. Set `isActive: true` for googlejobs (lines 157-164)
4. Change `type` from `'legacy'` to appropriate type

---

### Phase 2 - Core UX (1.5 hrs)

#### Issue 2: Pagination Controls
**File**: `apps/web/src/app/jobs/page.tsx`
**Problem**: Hardcoded `limit: 50` with no offset state, no pagination UI
**Solution**: Add pagination state, calculate offset, add Previous/Next buttons

```typescript
// Add state
const [currentPage, setCurrentPage] = useState(0)
const pageSize = 50

// Update query
const { data } = useJobs({
  ...filters,
  limit: pageSize,
  offset: currentPage * pageSize,
})

// Add pagination UI
<div className="flex justify-center gap-4 mt-6">
  <button
    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
    disabled={currentPage === 0}
  >
    Previous
  </button>
  <span>Page {currentPage + 1} of {Math.ceil(data.total / pageSize)}</span>
  <button
    onClick={() => setCurrentPage(p => p + 1)}
    disabled={(currentPage + 1) * pageSize >= data.total}
  >
    Next
  </button>
</div>
```

#### Issue 5: Description Formatting
**New File**: `apps/web/src/lib/descriptionFormatter.ts`
**Problem**: Job descriptions are plain text rendered as monolithic paragraphs
**Solution**: Create utility to convert plain text to formatted markdown

```typescript
export function formatJobDescription(text: string): string {
  // Convert double newlines to paragraph breaks
  // Convert bullet markers (-, *, •) to markdown lists
  // Convert numbered lists
  // Detect section headers (all caps, ending with :)
  // Preserve intentional line breaks
  // Add spacing between sections
}
```

**Integration**: Update `apps/web/src/app/jobs/[id]/page.tsx:317`

---

### Phase 3 - Feature Enhancement (2-3 hrs)

#### Issue 4: Advanced Filtering
**Files to modify**:
1. `apps/web/src/lib/types.ts` - Add new filter types
2. `apps/backend/src/api/get-jobs.step.ts` - Add query parameters
3. New `apps/web/src/components/FilterPanel.tsx` - Advanced filter UI

**New Filter Options**:
- `tags[]` - Multiple keyword tags
- `skills[]` - Required skills filter
- `salaryMin` / `salaryMax` - Salary range
- `location[]` - Multiple locations
- `employment_type[]` - Full-time, Part-time, Contract
- `experience_level[]` - Entry, Mid, Senior, Lead

---

## Testing Strategy

### Phase 1 Testing
- [ ] Navigate to /matches - verify no null errors
- [ ] Navigate to /jobs, select jobs without profile - verify button appears
- [ ] Navigate to /sources - verify Reddit and Google show as active

### Phase 2 Testing
- [ ] Navigate to /jobs - verify pagination buttons appear
- [ ] Click Next/Previous - verify page changes
- [ ] Navigate to job detail - verify description is formatted

### Phase 3 Testing
- [ ] Test each filter individually
- [ ] Test filter combinations
- [ ] Test filter persistence on navigation

---

## Document Metadata

**Last Updated**: 2026-01-02
**Review Status**: Approved
**Implementation Status**: In Progress

**Related Documents**:
- `/Users/dave/Work/job-aggregator/docs/issues_to_fix.md`

**Change Log**:
- 2026-01-02 - Initial creation from multi-agent analysis
