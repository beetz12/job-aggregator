---
name: coding-conventions
description: Field naming conventions for the Job Aggregator project. Use this skill when encountering type errors related to field names (camelCase vs snake_case), database constraint violations, or data mapping issues between Python/TypeScript/PostgreSQL.
---

# Job Aggregator Coding Conventions

## Overview

This project uses **snake_case field names EVERYWHERE** for consistency across:
- Python scraper (source of job data)
- TypeScript backend (Motia)
- PostgreSQL database
- TypeScript frontend (Next.js)

This is the 2025 PostgreSQL best practice for field naming and ensures no translation layer is needed between systems.

## Quick Diagnosis

### Symptoms of Convention Violations

1. **TypeScript Type Errors**:
   ```
   Property 'postedAt' does not exist on type 'Job'. Did you mean 'posted_at'?
   ```

2. **Database Constraint Violations**:
   ```
   Error: new row violates check constraint "jobs_employment_type_check"
   ```

3. **Undefined Data in Frontend**:
   - Job cards showing `undefined` for dates or scores
   - Match percentages not displaying

### Root Cause

Mixed field naming conventions:
- Python uses `snake_case` (e.g., `posted_at`)
- TypeScript historically used `camelCase` (e.g., `postedAt`)
- Database expects `snake_case` with specific enum values

## The Convention: snake_case Everywhere

### Field Name Mapping

| Incorrect (camelCase) | Correct (snake_case) |
|-----------------------|----------------------|
| `postedAt` | `posted_at` |
| `fetchedAt` | `fetched_at` |
| `healthScore` | `health_score` |
| `lastUpdated` | `last_updated` |
| `matchScore` | `match_score` |
| `fitScore` | `fit_score` |
| `companyInsights` | `company_insights` |
| `matchAnalysis` | `match_analysis` |
| `talkingPoints` | `talking_points` |
| `interviewQuestions` | `interview_questions` |
| `experienceYears` | `experience_years` |
| `seniorityLevel` | `seniority_level` |
| `remotePreference` | `remote_preference` |
| `preferredLocations` | `preferred_locations` |
| `displayName` | `display_name` |
| `isActive` | `is_active` |
| `jobCount` | `job_count` |
| `lastFetch` | `last_fetch` |
| `jobId` | `job_id` |
| `jobTitle` | `job_title` |
| `profileId` | `profile_id` |
| `createdAt` | `created_at` |
| `appliedAt` | `applied_at` |
| `followUpDate` | `follow_up_date` |
| `coverLetter` | `cover_letter` |
| `questionAnswers` | `question_answers` |
| `atsScore` | `ats_score` |
| `highlightedSkills` | `highlighted_skills` |
| `hookType` | `hook_type` |
| `keyPoints` | `key_points` |
| `greenFlags` | `green_flags` |
| `redFlags` | `red_flags` |
| `overallMatch` | `overall_match` |
| `strongMatches` | `strong_matches` |
| `technicalFit` | `technical_fit` |
| `familyFriendliness` | `family_friendliness` |
| `longTermPotential` | `long_term_potential` |
| `employmentType` | `employment_type` |
| `experienceLevel` | `experience_level` |
| `salaryMin` | `salary_min` |
| `salaryMax` | `salary_max` |
| `salaryCurrency` | `salary_currency` |

### Enum Value Normalization

The database has CHECK constraints that require specific enum values:

#### `employment_type`
| Raw Input | Normalized Value |
|-----------|------------------|
| `Full-Time`, `fulltime`, `FULL_TIME` | `full-time` |
| `Part-Time`, `parttime` | `part-time` |
| `Contract`, `contractor`, `freelance` | `contract` |
| `Internship`, `intern` | `internship` |

#### `experience_level`
| Raw Input | Normalized Value |
|-----------|------------------|
| `Entry Level`, `entry`, `junior` | `entry` |
| `Mid Level`, `mid`, `intermediate` | `mid` |
| `Senior Level`, `senior`, `sr` | `senior` |
| `Lead`, `principal`, `staff` | `lead` |
| `Executive`, `director`, `vp`, `c-level` | `executive` |

## Files to Check/Update

When fixing snake_case issues, check these files in order:

### 1. Shared Types (Source of Truth)
```
packages/types/src/index.ts
```

### 2. Backend Types & Logic
```
apps/backend/src/types/job.ts
apps/backend/src/events/normalize-job.step.ts
apps/backend/src/services/database.ts
apps/backend/src/events/index-job.step.ts
apps/backend/src/services/job-normalizer.ts
```

### 3. Frontend Types
```
apps/web/src/lib/types.ts
```

### 4. Frontend Hooks
```
apps/web/src/hooks/useProfile.ts
apps/web/src/hooks/useIntelligentApplication.ts
apps/web/src/hooks/useApplications.ts
```

### 5. Frontend Components
```
apps/web/src/components/JobCard.tsx
apps/web/src/components/SourceStatus.tsx
apps/web/src/components/FitAnalysisModal.tsx
apps/web/src/components/BatchActionsBar.tsx
```

### 6. Frontend Pages
```
apps/web/src/app/page.tsx
apps/web/src/app/jobs/page.tsx
apps/web/src/app/jobs/[id]/page.tsx
apps/web/src/app/matches/page.tsx
apps/web/src/app/applications/page.tsx
apps/web/src/app/profile/page.tsx
apps/web/src/app/sources/page.tsx
```

### 7. API Client
```
apps/web/src/lib/api.ts
```

## Fix Process

### Step 1: Identify the Error Pattern

Run the build to find all type errors:
```bash
npm run build 2>&1 | grep "Property.*does not exist"
```

### Step 2: Search for camelCase Usage

Find all camelCase field names in the codebase:
```bash
# In frontend
grep -rn "postedAt\|fetchedAt\|healthScore\|lastUpdated" apps/web/src/

# In backend
grep -rn "postedAt\|fetchedAt\|healthScore" apps/backend/src/
```

### Step 3: Update Types First

Always start with the type definitions:

1. `packages/types/src/index.ts` - shared types
2. `apps/web/src/lib/types.ts` - frontend types
3. `apps/backend/src/types/job.ts` - backend types

### Step 4: Update Usage

After updating types, fix all usages. Common patterns:

```typescript
// Before
const timeAgo = getTimeAgo(job.postedAt)
const { job, matchScore } = match

// After
const timeAgo = getTimeAgo(job.posted_at)
const { job, match_score } = match
```

### Step 5: Update Form Fields

Form field names must match object property names:

```tsx
// Before
<input name="experienceYears" value={formData.experienceYears} />

// After
<input name="experience_years" value={formData.experience_years} />
```

### Step 6: Update Hook Signatures

Check mutation function signatures:

```typescript
// Before
mutationFn: ({ jobId, profileId }: { jobId: string; profileId: string }) =>

// After
mutationFn: ({ job_id, profile_id }: { job_id: string; profile_id: string }) =>
```

### Step 7: Verify Build

```bash
npm run build
```

## Value Normalization (Backend Only)

The backend normalizes field VALUES (not just names) before database insertion:

```typescript
// apps/backend/src/events/normalize-job.step.ts

const EMPLOYMENT_TYPE_MAP: Record<string, EmploymentType> = {
  'full-time': 'full-time',
  'fulltime': 'full-time',
  'full time': 'full-time',
  'contractor': 'contract',
  'freelance': 'contract',
  // ... more mappings
}

function normalizeEmploymentType(raw: string | undefined | null): EmploymentType | undefined {
  if (!raw) return undefined
  const normalized = raw.toLowerCase().trim().replace(/[-_]/g, ' ')
  return EMPLOYMENT_TYPE_MAP[normalized] || undefined
}
```

## Checklist

When encountering field name issues:

- [ ] Identify the specific error (type error, runtime error, or constraint violation)
- [ ] Check if it's a NAME issue (camelCase vs snake_case) or VALUE issue (enum values)
- [ ] Update shared types in `packages/types/src/index.ts`
- [ ] Update frontend types in `apps/web/src/lib/types.ts`
- [ ] Update backend types if needed
- [ ] Search for all usages of the old field name
- [ ] Update components, pages, and hooks
- [ ] Update form field `name` attributes if applicable
- [ ] Run `npm run build` to verify all fixes
- [ ] Test the application end-to-end

## Prevention

To prevent these issues in the future:

1. **Always use snake_case** for new fields in TypeScript
2. **Copy field names** from the Python scraper response, don't translate
3. **Add normalization** for any new enum fields in `normalize-job.step.ts`
4. **Run the build** before committing changes
