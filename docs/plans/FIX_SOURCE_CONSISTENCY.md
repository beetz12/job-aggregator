# Fix Source Consistency Issues

**Date**: 2026-01-01
**Author**: Claude AI
**Status**: In Progress
**Type**: Fix

## Overview

Multi-agent code review identified critical source consistency issues between backend schema, TypeScript types, and frontend components. This plan addresses all issues to ensure the 11 active scraper sources are properly configured across the entire codebase.

## Active Sources (11)

| Source | Display Name | Type | Reliability |
|--------|--------------|------|-------------|
| arbeitnow | Arbeitnow | API | 95 |
| hackernews | Hacker News | Scraper | 90 |
| remoteok | RemoteOK | Scraper | 85 |
| weworkremotely | We Work Remotely | Scraper | 90 |
| braintrust | Braintrust | Scraper | 88 |
| devitjobs | DevITJobs | Scraper | 80 |
| jobicy | Jobicy | Scraper | 82 |
| dice | Dice | Scraper | 90 |
| builtin | Built In | Scraper | 88 |
| remotive | Remotive | Scraper | 85 |
| wellfound | Wellfound | Scraper | 88 |

## Legacy Sources (2)

| Source | Status |
|--------|--------|
| reddit | Inactive |
| googlejobs | Inactive |

## Issues Identified

### CRITICAL: schema.sql Source Constraints

**Problem**: `schema.sql` contains `github` (removed) but missing `dice` and `builtin` (new sources)

**Impact**: Any job from `dice` or `builtin` will fail the CHECK constraint and not be inserted

**Fix**: Update CHECK constraints in both `jobs` and `sources` tables

### MAJOR: Hardcoded sourceColors in jobs/[id]/page.tsx

**Problem**: `jobs/[id]/page.tsx` has hardcoded incomplete `sourceColors` object with only 4 sources

**Impact**: Most sources display with default gray color instead of brand colors

**Fix**: Import `SOURCE_COLORS` from `@/lib/types` instead of hardcoding

### MAJOR: locationParsed Schema Mismatch

**Problem**: Frontend `LocationParsed` type differs from backend:
- Frontend has: `isRemote`, `remoteType`
- Backend has: `region`

**Impact**: Potential runtime type mismatches when displaying location data

**Fix**: Align schemas - backend should include all fields, frontend should handle optional fields

## Source Consistency Matrix

| Source | sources.ts | job.ts | schema.sql | types.ts | page.tsx |
|--------|------------|--------|------------|----------|----------|
| arbeitnow | ✓ | ✓ | ✓ | ✓ | ✓ (hardcoded) |
| hackernews | ✓ | ✓ | ✓ | ✓ | ✓ (hardcoded) |
| remoteok | ✓ | ✓ | ✓ | ✓ | ❌ |
| weworkremotely | ✓ | ✓ | ✓ | ✓ | ❌ |
| braintrust | ✓ | ✓ | ✓ | ✓ | ❌ |
| devitjobs | ✓ | ✓ | ✓ | ✓ | ❌ |
| jobicy | ✓ | ✓ | ✓ | ✓ | ❌ |
| **dice** | ✓ | ✓ | **❌** | ✓ | ❌ |
| **builtin** | ✓ | ✓ | **❌** | ✓ | ❌ |
| remotive | ✓ | ✓ | ✓ | ✓ | ✓ (hardcoded) |
| wellfound | ✓ | ✓ | ✓ | ✓ | ❌ |
| reddit | ✓ | ✓ | ✓ | ✓ | ✓ (hardcoded) |
| googlejobs | ✓ | ✓ | ✓ | ✓ | ❌ |
| **github** | ❌ | ❌ | **⚠️ PRESENT** | ❌ | ❌ |

## Implementation Plan

### Phase 1: Fix schema.sql (CRITICAL)

1. Update `jobs` table CHECK constraint
2. Update `sources` table CHECK constraint
3. Update `sources` table INSERT statements

### Phase 2: Fix Frontend (MAJOR)

1. Update `jobs/[id]/page.tsx` to import `SOURCE_COLORS`
2. Remove hardcoded `sourceColors` object

### Phase 3: Align locationParsed Schema (MAJOR)

1. Update backend `location-parser.ts` to include `isRemote`, `remoteType`
2. Update backend `job.ts` schema
3. Ensure frontend handles optional `region` field

### Phase 4: Verify & Commit

1. Run `npm run build` from root
2. Verify no TypeScript errors
3. Commit all changes

## Files to Modify

| File | Change |
|------|--------|
| `apps/backend/schema.sql` | Update source CHECK constraints |
| `apps/web/src/app/jobs/[id]/page.tsx` | Import SOURCE_COLORS |
| `apps/backend/src/services/location-parser.ts` | Add isRemote, remoteType fields |
| `apps/backend/src/types/job.ts` | Update LocationParsed schema |

## Confidence Level

**90%** - All issues are well-defined with clear fixes. No architectural changes required.

---

## Document Metadata

**Last Updated**: 2026-01-01
**Implementation Status**: In Progress
**Related Documents**:
- [FEATURE_JOB_AGGREGATOR_INTEGRATION.md](./FEATURE_JOB_AGGREGATOR_INTEGRATION.md)
- [FEATURE_JOB_SCRAPER_API.md](./FEATURE_JOB_SCRAPER_API.md)

**Change Log**:
- 2026-01-01 - Initial creation from multi-agent code review
