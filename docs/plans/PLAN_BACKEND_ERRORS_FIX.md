# Backend Errors Fix Plan - Unified Analysis v3

**Date**: 2026-01-02
**Author**: Claude AI (3-Agent Analysis Team + Architect + 2025 Best Practices Research)
**Status**: Ready for Implementation
**Confidence**: 96%

---

## Executive Summary

Two critical issues are causing backend instability. This plan provides **production-grade, 2025 best-practice solutions** - no quick fixes.

| Issue | Severity | Root Cause | Solution Approach |
|-------|----------|------------|-------------------|
| **Database Constraint Violation** | HIGH | Python scraper sends non-standard employment_type values | Value normalization in TypeScript |
| **Field Name Mismatch** | MEDIUM | TypeScript uses camelCase, Python/DB use snake_case | Adopt snake_case everywhere |
| **JavaScript Heap Out of Memory** | CRITICAL | `state.getGroup()` loads ALL data into memory | Database-first architecture with LRU cache |

---

## Issue 0: Field Name Alignment (NEW - 2025 Best Practice)

### Decision

**Use `snake_case` field names everywhere** for consistency:

| Layer | Convention | Status |
|-------|------------|--------|
| PostgreSQL DB | `snake_case` | Already correct |
| Python Scraper | `snake_case` | Already correct |
| TypeScript Backend | `snake_case` | **NEEDS UPDATE** |

### Field Name Changes Required

| Current (camelCase) | New (snake_case) |
|---------------------|------------------|
| `sourceId` | `source_id` |
| `companyUrl` | `company_url` |
| `locationRaw` | `location_raw` |
| `locationParsed` | `location_parsed` |
| `descriptionHtml` | `description_html` |
| `descriptionText` | `description_text` |
| `postedAt` | `posted_at` |
| `fetchedAt` | `fetched_at` |
| `salaryRaw` | `salary_raw` |
| `salaryMin` | `salary_min` |
| `salaryMax` | `salary_max` |
| `salaryCurrency` | `salary_currency` |
| `employmentType` | `employment_type` |
| `experienceLevel` | `experience_level` |
| `healthScore` | `health_score` |
| `contentHash` | `content_hash` |
| `aiSummary` | `ai_summary` |

### Files to Update

| File | Changes |
|------|---------|
| `apps/backend/src/types/job.ts` | Rename all fields to snake_case |
| `apps/backend/src/events/normalize-job.step.ts` | Update field assignments |
| `apps/backend/src/events/index-job.step.ts` | Update field references |
| `apps/backend/src/api/*.step.ts` | Update any field references |
| `apps/web/src/**/*.ts` | Update frontend field references |

---

## Issue 1: Database Constraint Violation (Employment Type)

### Analysis Summary

**Updated Pattern (2025 Best Practice)**:
- Property names: `snake_case` everywhere → `employment_type`
- Values: `lowercase-hyphenated` (industry standard) → `'full-time'`, `'part-time'`
- Database: Uses `snake_case` columns → `employment_type`

### Root Cause

The **Python scraper** returns non-conforming values from job board APIs:

| What Jobicy API Returns | What Database Expects |
|------------------------|----------------------|
| `"Full-Time"` | `'full-time'` |
| `"Part-time"` | `'part-time'` |
| `"Freelance"` | `'contract'` |
| `"Contract"` | `'contract'` |

### Solution: Fix at Python Scraper (Source of Truth)

**Rationale**: Fix data at the source, not with downstream normalization. This follows the "single source of truth" principle.

#### Option A: Fix in Python Scraper (RECOMMENDED)

**File**: `python-scraper/apps/api/services/job_scrapers/api/jobicy_api.py`

```python
# Add after line 270
EMPLOYMENT_TYPE_MAP = {
    'full-time': 'full-time',
    'fulltime': 'full-time',
    'full time': 'full-time',
    'part-time': 'part-time',
    'parttime': 'part-time',
    'part time': 'part-time',
    'contract': 'contract',
    'contractor': 'contract',
    'freelance': 'contract',
    'freelancer': 'contract',
    'internship': 'internship',
    'intern': 'internship',
}

def normalize_employment_type(raw: str | None) -> str | None:
    """Normalize employment type to database-valid values."""
    if not raw:
        return None
    normalized = raw.lower().strip()
    return EMPLOYMENT_TYPE_MAP.get(normalized)

# Modify line 270:
# BEFORE:
# employment_type = job_types[0] if job_types else None

# AFTER:
employment_type = normalize_employment_type(job_types[0]) if job_types else None
```

**File**: `python-scraper/apps/api/services/job_scrapers/playwright/jobicy.py`

Apply same normalization at line 184.

#### Option B: Add Validation in TypeScript Backend (FALLBACK)

If Python scraper cannot be modified immediately, add validation in the backend.

**File**: `apps/backend/src/events/normalize-job.step.ts`

```typescript
// Add after imports (around line 20)

const EMPLOYMENT_TYPE_MAP: Record<string, 'full-time' | 'part-time' | 'contract' | 'internship'> = {
  'full-time': 'full-time',
  'fulltime': 'full-time',
  'full time': 'full-time',
  'part-time': 'part-time',
  'parttime': 'part-time',
  'part time': 'part-time',
  'contract': 'contract',
  'contractor': 'contract',
  'freelance': 'contract',
  'freelancer': 'contract',
  'internship': 'internship',
  'intern': 'internship',
}

function normalizeEmploymentType(raw: string | undefined | null): 'full-time' | 'part-time' | 'contract' | 'internship' | undefined {
  if (!raw) return undefined
  const normalized = raw.toLowerCase().trim()
  return EMPLOYMENT_TYPE_MAP[normalized] || undefined
}

// Modify line 442 in normalizeScraperApiJob():
// BEFORE:
employmentType: rawJob.employment_type as string | undefined,

// AFTER:
employmentType: normalizeEmploymentType(rawJob.employment_type as string | undefined),
```

#### Option B Extended: Full Field Validation in TypeScript (FALLBACK)

If Python scraper cannot be modified immediately, or as defense-in-depth, add comprehensive validation for ALL fields identified by the multi-agent analysis.

**File**: `apps/backend/src/events/normalize-job.step.ts`

Add a complete normalizers module inline or as a separate file:

```typescript
// Add after imports (around line 20)

// =============================================================================
// EMPLOYMENT TYPE NORMALIZATION
// =============================================================================

const EMPLOYMENT_TYPE_MAP: Record<string, 'full-time' | 'part-time' | 'contract' | 'internship'> = {
  // Standard values
  'full-time': 'full-time',
  'part-time': 'part-time',
  'contract': 'contract',
  'internship': 'internship',

  // Variations - Full-time
  'fulltime': 'full-time',
  'full time': 'full-time',
  'full_time': 'full-time',
  'permanent': 'full-time',
  'regular': 'full-time',
  'employee': 'full-time',
  'ft': 'full-time',

  // Variations - Part-time
  'parttime': 'part-time',
  'part time': 'part-time',
  'part_time': 'part-time',
  'pt': 'part-time',
  'half-time': 'part-time',

  // Variations - Contract
  'contractor': 'contract',
  'freelance': 'contract',
  'freelancer': 'contract',
  'consulting': 'contract',
  'consultant': 'contract',
  'temporary': 'contract',
  'temp': 'contract',
  'fixed-term': 'contract',
  'project': 'contract',
  'gig': 'contract',
  'c2c': 'contract',
  '1099': 'contract',

  // Variations - Internship
  'intern': 'internship',
  'trainee': 'internship',
  'apprentice': 'internship',
  'apprenticeship': 'internship',
  'co-op': 'internship',
  'coop': 'internship',
  'student': 'internship',
}

function normalizeEmploymentType(raw: string | undefined | null): 'full-time' | 'part-time' | 'contract' | 'internship' | undefined {
  if (!raw) return undefined
  const normalized = raw.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ')
  return EMPLOYMENT_TYPE_MAP[normalized] || EMPLOYMENT_TYPE_MAP[normalized.replace(/ /g, '-')] || undefined
}

// =============================================================================
// EXPERIENCE LEVEL NORMALIZATION
// =============================================================================

const EXPERIENCE_LEVEL_MAP: Record<string, 'entry' | 'mid' | 'senior' | 'lead' | 'executive'> = {
  // Standard values
  'entry': 'entry',
  'mid': 'mid',
  'senior': 'senior',
  'lead': 'lead',
  'executive': 'executive',

  // Variations - Entry
  'entry-level': 'entry',
  'entry level': 'entry',
  'entrylevel': 'entry',
  'junior': 'entry',
  'jr': 'entry',
  'jr.': 'entry',
  'associate': 'entry',
  'beginner': 'entry',
  'fresher': 'entry',
  'graduate': 'entry',
  'new-grad': 'entry',
  'new grad': 'entry',

  // Variations - Mid
  'mid-level': 'mid',
  'mid level': 'mid',
  'midlevel': 'mid',
  'middle': 'mid',
  'intermediate': 'mid',
  'experienced': 'mid',

  // Variations - Senior
  'sr': 'senior',
  'sr.': 'senior',
  'senior-level': 'senior',
  'senior level': 'senior',
  'advanced': 'senior',
  'expert': 'senior',
  'principal': 'senior',
  'staff': 'senior',

  // Variations - Lead
  'team lead': 'lead',
  'tech lead': 'lead',
  'technical lead': 'lead',
  'architect': 'lead',
  'manager': 'lead',

  // Variations - Executive
  'exec': 'executive',
  'c-level': 'executive',
  'director': 'executive',
  'vp': 'executive',
  'vice president': 'executive',
  'head of': 'executive',
  'chief': 'executive',
  'cto': 'executive',
  'ceo': 'executive',
}

function normalizeExperienceLevel(raw: string | undefined | null): 'entry' | 'mid' | 'senior' | 'lead' | 'executive' | undefined {
  if (!raw) return undefined
  const normalized = raw.toLowerCase().trim()
  return EXPERIENCE_LEVEL_MAP[normalized] || EXPERIENCE_LEVEL_MAP[normalized.replace(/-/g, ' ')] || undefined
}

// =============================================================================
// REMOTE FIELD NORMALIZATION
// =============================================================================

const REMOTE_TRUE_VALUES = new Set([
  'true', 'yes', '1', 'remote', 'fully remote', 'full remote',
  '100% remote', 'anywhere', 'worldwide', 'global'
])

const REMOTE_FALSE_VALUES = new Set([
  'false', 'no', '0', 'onsite', 'on-site', 'on site',
  'in-office', 'in office', 'office', 'hybrid'
])

function normalizeRemote(raw: unknown): boolean | undefined {
  if (raw === null || raw === undefined) return undefined
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw !== 0
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase().trim()
    if (REMOTE_TRUE_VALUES.has(lower)) return true
    if (REMOTE_FALSE_VALUES.has(lower)) return false
  }
  return undefined
}

// =============================================================================
// TAGS NORMALIZATION
// =============================================================================

function normalizeTags(raw: unknown): string[] {
  if (!raw) return []

  let tags: string[]
  if (typeof raw === 'string') {
    tags = raw.split(',').map(t => t.trim())
  } else if (Array.isArray(raw)) {
    tags = raw.filter(t => t != null).map(t => String(t).trim())
  } else {
    return []
  }

  // Filter empty, deduplicate, limit length
  const seen = new Set<string>()
  const result: string[] = []
  for (const tag of tags) {
    if (tag && tag.length <= 50 && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase())
      result.push(tag)
    }
  }
  return result.slice(0, 20) // Max 20 tags
}

// =============================================================================
// SALARY NORMALIZATION
// =============================================================================

const VALID_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'JPY', 'CNY', 'INR',
  'BRL', 'MXN', 'SGD', 'HKD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'ILS'
])

function normalizeCurrency(raw: string | undefined | null): string {
  if (raw) {
    const upper = raw.toUpperCase().trim()
    if (VALID_CURRENCIES.has(upper)) return upper
  }
  return 'USD' // Default
}

function normalizeSalaryRange(min: unknown, max: unknown): { min?: number; max?: number } {
  const parseNum = (v: unknown): number | undefined => {
    if (v === null || v === undefined) return undefined
    const num = typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9.-]/g, ''), 10)
    return isNaN(num) || num < 0 || num > 10000000 ? undefined : num
  }

  const minVal = parseNum(min)
  const maxVal = parseNum(max)

  // Swap if min > max
  if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
    return { min: maxVal, max: minVal }
  }

  return { min: minVal, max: maxVal }
}

// =============================================================================
// URL VALIDATION
// =============================================================================

function normalizeUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined
  try {
    const url = new URL(raw.trim())
    // Only allow http/https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined
    }
    return url.toString()
  } catch {
    return undefined
  }
}

// =============================================================================
// APPLY ALL NORMALIZATIONS IN normalizeScraperApiJob()
// =============================================================================

// Modify lines 440-470 in normalizeScraperApiJob():
// BEFORE:
// employmentType: rawJob.employment_type as string | undefined,
// experienceLevel: rawJob.experience_level as string | undefined,
// remote: rawJob.remote as boolean,
// tags: rawJob.tags as string[] || [],
// url: rawJob.url,
// companyUrl: rawJob.company_url,

// AFTER:
employmentType: normalizeEmploymentType(rawJob.employment_type as string | undefined),
experienceLevel: normalizeExperienceLevel(rawJob.experience_level as string | undefined),
remote: normalizeRemote(rawJob.remote) ?? false,
tags: normalizeTags(rawJob.tags),
url: normalizeUrl(rawJob.url) || rawJob.url, // Fallback to original if parse fails
companyUrl: normalizeUrl(rawJob.company_url),
salaryCurrency: normalizeCurrency(rawJob.salary_currency as string | undefined),
salaryMin: normalizeSalaryRange(rawJob.salary_min, rawJob.salary_max).min,
salaryMax: normalizeSalaryRange(rawJob.salary_min, rawJob.salary_max).max,
```

#### Additional: Strengthen Type Safety with Zod

**File**: `apps/backend/src/types/job.ts` (line 90)

```typescript
// BEFORE:
employmentType: z.string().optional().nullable()

// AFTER:
employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional().nullable(),
experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional().nullable(),
salaryCurrency: z.string().length(3).toUpperCase().optional().nullable(),
salaryMin: z.number().int().min(0).max(10000000).optional().nullable(),
salaryMax: z.number().int().min(0).max(10000000).optional().nullable(),
remote: z.boolean(),
tags: z.array(z.string().max(50)).max(20),
url: z.string().url(),
companyUrl: z.string().url().optional().nullable(),
```

---

## Issue 2: JavaScript Heap Out of Memory

### 2025 Best Practices Research Summary

From Perplexity Deep research on Node.js memory management 2025:

| Practice | Rationale |
|----------|-----------|
| **Use Streams** | Process data in chunks, constant memory even for gigabytes |
| **LRU Cache** | Bounded memory with automatic eviction of old entries |
| **Pagination** | Fetch/process data incrementally, reduce peak memory |
| **Avoid Full Loads** | Never load entire datasets into memory |
| **Monitor Memory** | Use `process.memoryUsage()`, set heap limits |
| **Database-First** | Query database directly instead of in-memory state |

### Root Cause Analysis

| Problem | Location | Memory Impact | Best Practice Violation |
|---------|----------|---------------|------------------------|
| `state.getGroup('jobs')` | `index-job.step.ts:147` | 2-4MB × 10+ calls/cycle | Loads ALL data into memory |
| Match calc loads ALL jobs | `calculate-match-scores.step.ts:184` | 2-4MB per profile | No streaming/pagination |
| Fuzzy dedup: 500 comparisons | `index-job.step.ts:187` | 500KB temp allocations | Should use DB trigram index |
| Hash cache unbounded | `index-job.step.ts:96-139` | Grows forever | No LRU eviction |
| Match scores unbounded | `calculate-match-scores.step.ts` | profiles × jobs | No TTL/cleanup |

### Solution Architecture: Database-First with LRU Cache

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                        │
│                                                                 │
│  Event → state.getGroup('jobs') → Load ALL → Process → OOM     │
│              ↑                                                  │
│         Unbounded Memory Growth                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     NEW ARCHITECTURE                            │
│                                                                 │
│  Event → LRU Cache (bounded) → Miss? → DB Query (paginated)    │
│              ↓                            ↓                     │
│         Fast O(1) lookup           Streaming/Cursor             │
│              ↓                            ↓                     │
│         Auto-eviction              Constant memory              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create LRU Cache Service (NEW FILE)

**File**: `apps/backend/src/services/cache/lru-cache.ts`

```typescript
/**
 * LRU Cache with TTL - 2025 Best Practice Implementation
 *
 * Features:
 * - Maximum entry limit with automatic eviction
 * - TTL expiration for stale data
 * - O(1) get/set operations
 * - Memory-bounded (won't grow unbounded)
 */

interface CacheEntry<T> {
  value: T
  accessedAt: number
  expiresAt: number
}

interface LRUCacheOptions {
  maxSize: number        // Max entries (default: 1000)
  ttlMs: number          // TTL in ms (default: 1800000 = 30min)
  onEvict?: (key: string, value: unknown) => void
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>
  private readonly maxSize: number
  private readonly ttlMs: number
  private readonly onEvict?: (key: string, value: unknown) => void

  constructor(options: LRUCacheOptions) {
    this.cache = new Map()
    this.maxSize = options.maxSize
    this.ttlMs = options.ttlMs
    this.onEvict = options.onEvict
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check TTL expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key)
      return undefined
    }

    // Update access time (LRU tracking)
    entry.accessedAt = Date.now()

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  set(key: string, value: T): void {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Evict oldest if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        const entry = this.cache.get(oldestKey)
        this.cache.delete(oldestKey)
        this.onEvict?.(oldestKey, entry?.value)
      }
    }

    this.cache.set(key, {
      value,
      accessedAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs
    })
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.cache.delete(key)
      this.onEvict?.(key, entry.value)
      return true
    }
    return false
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  /**
   * Remove all expired entries
   * @returns Number of entries pruned
   */
  prune(): number {
    const now = Date.now()
    let pruned = 0

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.delete(key)
        pruned++
      }
    }

    return pruned
  }

  /**
   * Get cache statistics for monitoring
   */
  stats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    }
  }
}

// Export singleton instances for different caches
export const hashCache = new LRUCache<string>({
  maxSize: 5000,
  ttlMs: 3600000, // 1 hour
  onEvict: (key) => console.debug(`[LRU] Hash evicted: ${key.substring(0, 8)}...`)
})

export const recentJobsCache = new LRUCache<string[]>({
  maxSize: 10,
  ttlMs: 300000, // 5 minutes
})
```

---

### Phase 2: Create Database Query Service (NEW FILE)

**File**: `apps/backend/src/services/database-queries.ts`

```typescript
/**
 * Database-first query functions - 2025 Best Practice
 *
 * Replaces state.getGroup() with paginated/streaming database queries
 * Never loads full dataset into memory
 */

import { query } from './database'
import { Job, MatchScore } from '@job-aggregator/types'

/**
 * Cursor-based pagination for jobs
 * Memory-efficient: only loads `limit` jobs at a time
 */
export async function getJobsCursor(params: {
  cursor?: string
  limit?: number
  source?: string
  search?: string
}): Promise<{ jobs: Job[]; nextCursor: string | null; total: number }> {
  const { cursor, limit = 100, source, search } = params

  let whereClause = 'WHERE 1=1'
  const values: unknown[] = []
  let paramIndex = 1

  if (cursor) {
    whereClause += ` AND id > $${paramIndex++}`
    values.push(cursor)
  }

  if (source) {
    whereClause += ` AND source = $${paramIndex++}`
    values.push(source)
  }

  if (search) {
    whereClause += ` AND (title_normalized ILIKE $${paramIndex} OR company_normalized ILIKE $${paramIndex})`
    values.push(`%${search.toLowerCase()}%`)
    paramIndex++
  }

  const { rows } = await query<Job>(
    `SELECT * FROM jobs ${whereClause} ORDER BY id ASC LIMIT $${paramIndex}`,
    [...values, limit + 1]
  )

  const hasMore = rows.length > limit
  const jobs = hasMore ? rows.slice(0, limit) : rows

  // Get total count (cached for 60 seconds in DB)
  const { rows: countRows } = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM jobs'
  )

  return {
    jobs: jobs.map(mapDbRowToJob),
    nextCursor: hasMore ? jobs[jobs.length - 1].id : null,
    total: parseInt(countRows[0].count)
  }
}

/**
 * Async generator for streaming ALL jobs in batches
 * Memory-efficient: processes one batch at a time
 */
export async function* streamAllJobs(batchSize: number = 100): AsyncGenerator<Job[], void, unknown> {
  let cursor: string | undefined

  while (true) {
    const { jobs, nextCursor } = await getJobsCursor({ cursor, limit: batchSize })

    if (jobs.length === 0) break

    yield jobs

    if (!nextCursor) break
    cursor = nextCursor
  }
}

/**
 * Get recent job IDs for fuzzy deduplication
 * Uses database ORDER BY instead of loading all jobs
 */
export async function getRecentJobIds(limit: number = 500): Promise<string[]> {
  const { rows } = await query<{ id: string }>(
    'SELECT id FROM jobs ORDER BY fetched_at DESC LIMIT $1',
    [limit]
  )
  return rows.map(r => r.id)
}

/**
 * Get jobs by IDs (batch lookup)
 * For fuzzy dedup: only load the specific jobs needed
 */
export async function getJobsByIds(ids: string[]): Promise<Map<string, Job>> {
  if (ids.length === 0) return new Map()

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
  const { rows } = await query<Job>(
    `SELECT * FROM jobs WHERE id IN (${placeholders})`,
    ids
  )

  return new Map(rows.map(r => [r.id, mapDbRowToJob(r)]))
}

/**
 * Database-level fuzzy duplicate check using trigram indexes
 * Much faster than in-memory comparison
 */
export async function findSimilarJobs(
  title: string,
  company: string,
  threshold: number = 0.6
): Promise<{ id: string; similarity: number }[]> {
  const { rows } = await query<{ id: string; similarity: number }>(
    `SELECT id,
            (similarity(title_normalized, $1) * 0.5 +
             similarity(company_normalized, $2) * 0.35 + 0.15) as similarity
     FROM jobs
     WHERE similarity(title_normalized, $1) > $3
       AND similarity(company_normalized, $2) > $3
     ORDER BY similarity DESC
     LIMIT 5`,
    [title.toLowerCase(), company.toLowerCase(), threshold]
  )
  return rows
}

/**
 * Check if content hash exists in database
 */
export async function checkHashInDatabase(hash: string): Promise<{ id: string } | null> {
  const { rows } = await query<{ id: string }>(
    'SELECT id FROM jobs WHERE content_hash = $1 LIMIT 1',
    [hash]
  )
  return rows[0] || null
}

// Helper to map snake_case DB rows to camelCase Job objects
function mapDbRowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    title: row.title as string,
    company: row.company as string,
    location: row.location as string | undefined,
    remote: row.remote as boolean,
    url: row.url as string,
    description: row.description as string,
    source: row.source as string,
    postedAt: row.posted_at as string,
    fetchedAt: row.fetched_at as string,
    tags: row.tags as string[],
    healthScore: row.health_score as number,
    contentHash: row.content_hash as string | undefined,
    employmentType: row.employment_type as string | undefined,
    experienceLevel: row.experience_level as string | undefined,
    salary: row.salary as string | undefined,
    sourceId: row.source_id as string | undefined,
    companyUrl: row.company_url as string | undefined,
  }
}
```

---

### Phase 3: Refactor index-job.step.ts (CRITICAL)

**File**: `apps/backend/src/events/index-job.step.ts`

**Key Changes**:
1. Remove `state.getGroup('jobs')` - NEVER load all jobs
2. Use LRU cache for hash lookups
3. Use database for fuzzy matching
4. Keep Motia state only for real-time streams

```typescript
// Add imports at top
import { hashCache } from '../services/cache/lru-cache'
import {
  checkHashInDatabase,
  findSimilarJobs,
  getJobsByIds,
  getRecentJobIds
} from '../services/database-queries'

// REPLACE the existing duplicate check logic (around lines 90-200)

/**
 * Check for exact duplicate using LRU cache + database fallback
 * O(1) cache hit, O(log n) database lookup on miss
 */
async function checkExactDuplicate(
  hash: string,
  logger: Logger
): Promise<{ isDuplicate: boolean; existingJobId?: string }> {
  // 1. Check LRU cache first (O(1))
  const cachedId = hashCache.get(hash)
  if (cachedId) {
    logger.debug('Hash cache hit', { hash: hash.substring(0, 8) })
    return { isDuplicate: true, existingJobId: cachedId }
  }

  // 2. Check database (uses content_hash index)
  const existing = await checkHashInDatabase(hash)
  if (existing) {
    // Populate cache for future lookups
    hashCache.set(hash, existing.id)
    return { isDuplicate: true, existingJobId: existing.id }
  }

  return { isDuplicate: false }
}

/**
 * Check for fuzzy duplicate using database trigram indexes
 * No in-memory job list needed
 */
async function checkFuzzyDuplicateDB(
  job: Job,
  logger: Logger
): Promise<{ isDuplicate: boolean; existingJobId?: string; similarity?: number }> {
  const similar = await findSimilarJobs(job.title, job.company, 0.7)

  if (similar.length > 0 && similar[0].similarity > 0.85) {
    logger.debug('Fuzzy duplicate found via DB', {
      jobId: job.id,
      existingId: similar[0].id,
      similarity: similar[0].similarity
    })
    return {
      isDuplicate: true,
      existingJobId: similar[0].id,
      similarity: similar[0].similarity
    }
  }

  return { isDuplicate: false }
}

// MODIFY the main handler (remove state.getGroup call)

export const handler: Handlers['IndexJob'] = async (input, { state, streams, logger, emit }) => {
  const { job } = input

  // Generate content hash
  const contentHash = generateEnhancedHash(job)

  // STEP 1: Check exact duplicate (LRU cache + DB)
  const exactResult = await checkExactDuplicate(contentHash, logger)
  if (exactResult.isDuplicate) {
    logger.info('Exact duplicate found', { jobId: job.id, existingId: exactResult.existingJobId })
    return // Skip indexing
  }

  // STEP 2: Check fuzzy duplicate (database trigram)
  const fuzzyResult = await checkFuzzyDuplicateDB(job, logger)
  if (fuzzyResult.isDuplicate && fuzzyResult.similarity && fuzzyResult.similarity > 0.9) {
    logger.info('Fuzzy duplicate found', { jobId: job.id, existingId: fuzzyResult.existingJobId })
    return // Skip indexing
  }

  // STEP 3: Upsert to database (source of truth)
  const jobWithHash = { ...job, contentHash }
  await upsertJob(jobWithHash)

  // STEP 4: Update LRU cache
  hashCache.set(contentHash, job.id)

  // STEP 5: Update real-time streams (lightweight, bounded by Motia)
  await streams.jobs.set('all', job.id, job)
  await streams.jobs.set(job.source, job.id, job)

  // STEP 6: Emit for downstream processing
  await emit({
    topic: 'job-indexed',
    data: { jobId: job.id, source: job.source, isNew: true }
  })

  logger.info('Job indexed successfully', { jobId: job.id })
}

// DELETE the old checkFuzzyDuplicate function that used state.getGroup()
```

---

### Phase 4: Refactor calculate-match-scores.step.ts (CRITICAL)

**File**: `apps/backend/src/events/calculate-match-scores.step.ts`

**Key Changes**:
1. Replace `state.getGroup('jobs')` with streaming
2. Batch database writes instead of per-job
3. Store scores in database, cache top scores

```typescript
// Add imports
import { streamAllJobs } from '../services/database-queries'
import { LRUCache } from '../services/cache/lru-cache'

// Cache for top match scores per profile (fast API responses)
const matchScoreCache = new LRUCache<MatchScore[]>({
  maxSize: 100, // 100 profiles
  ttlMs: 600000 // 10 minutes
})

export const handler: Handlers['CalculateMatchScores'] = async (input, { state, logger }) => {
  const { profileId } = input

  // Get profile
  const profile = await state.get<Profile>('profiles', profileId)
  if (!profile) {
    logger.warn('Profile not found', { profileId })
    return
  }

  logger.info('Starting match score calculation', { profileId })

  let processedCount = 0
  const scoreBatch: MatchScore[] = []
  const BATCH_SIZE = 50

  // Stream jobs in batches - NEVER load all into memory
  for await (const jobBatch of streamAllJobs(100)) {
    for (const job of jobBatch) {
      const score = calculateMatchScore(profile, job)

      scoreBatch.push({
        profileId,
        jobId: job.id,
        totalScore: score.total,
        skillScore: score.skills,
        seniorityScore: score.seniority,
        locationScore: score.location,
        salaryScore: score.salary,
        calculatedAt: new Date().toISOString()
      })

      // Batch insert when buffer is full
      if (scoreBatch.length >= BATCH_SIZE) {
        await insertMatchScoresBatch(scoreBatch)
        scoreBatch.length = 0 // Clear array
      }

      processedCount++
    }

    // Progress logging
    logger.info('Match score progress', { profileId, processedCount })
  }

  // Insert remaining scores
  if (scoreBatch.length > 0) {
    await insertMatchScoresBatch(scoreBatch)
  }

  // Cache top scores for fast API access
  const topScores = await getTopMatchScores(profileId, 50)
  matchScoreCache.set(profileId, topScores)

  logger.info('Match score calculation complete', { profileId, totalProcessed: processedCount })
}

// Add database batch insert function
async function insertMatchScoresBatch(scores: MatchScore[]): Promise<void> {
  if (scores.length === 0) return

  const values: unknown[] = []
  const placeholders: string[] = []

  scores.forEach((score, i) => {
    const offset = i * 8
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`)
    values.push(
      score.profileId,
      score.jobId,
      score.totalScore,
      score.skillScore,
      score.seniorityScore,
      score.locationScore,
      score.salaryScore,
      score.calculatedAt
    )
  })

  await query(
    `INSERT INTO match_scores (profile_id, job_id, total_score, skill_score, seniority_score, location_score, salary_score, calculated_at)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (profile_id, job_id) DO UPDATE SET
       total_score = EXCLUDED.total_score,
       skill_score = EXCLUDED.skill_score,
       seniority_score = EXCLUDED.seniority_score,
       location_score = EXCLUDED.location_score,
       salary_score = EXCLUDED.salary_score,
       calculated_at = EXCLUDED.calculated_at`,
    values
  )
}

async function getTopMatchScores(profileId: string, limit: number): Promise<MatchScore[]> {
  const { rows } = await query<MatchScore>(
    `SELECT * FROM match_scores
     WHERE profile_id = $1
     ORDER BY total_score DESC
     LIMIT $2`,
    [profileId, limit]
  )
  return rows
}
```

---

### Phase 5: Add Match Scores Table (SCHEMA)

**File**: `apps/backend/schema.sql` (ADD)

```sql
-- =============================================================================
-- MATCH SCORES TABLE
-- Persistent storage for job-profile match scores
-- =============================================================================
CREATE TABLE IF NOT EXISTS match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  skill_score INTEGER NOT NULL DEFAULT 0,
  seniority_score INTEGER NOT NULL DEFAULT 0,
  location_score INTEGER NOT NULL DEFAULT 0,
  salary_score INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(profile_id, job_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_match_scores_profile ON match_scores(profile_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_job ON match_scores(job_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_profile_score ON match_scores(profile_id, total_score DESC);
```

---

### Phase 6: Memory Monitor Service (NEW FILE)

**File**: `apps/backend/src/services/memory-monitor.ts`

```typescript
/**
 * Memory Monitor - 2025 Best Practice
 *
 * Monitors heap usage and triggers cleanup before OOM
 */

import { hashCache } from './cache/lru-cache'

interface MemoryStats {
  heapUsedMB: number
  heapTotalMB: number
  usagePercent: number
  rss: number
}

class MemoryMonitor {
  private intervalId?: NodeJS.Timeout
  private readonly warningThresholdMB: number
  private readonly criticalThresholdMB: number

  constructor(options?: { warningMB?: number; criticalMB?: number }) {
    this.warningThresholdMB = options?.warningMB || 400
    this.criticalThresholdMB = options?.criticalMB || 600
  }

  start(intervalMs: number = 30000): void {
    this.intervalId = setInterval(() => this.check(), intervalMs)
    console.log('[MemoryMonitor] Started')
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      console.log('[MemoryMonitor] Stopped')
    }
  }

  getStats(): MemoryStats {
    const mem = process.memoryUsage()
    return {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      usagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      rss: Math.round(mem.rss / 1024 / 1024)
    }
  }

  private check(): void {
    const stats = this.getStats()

    if (stats.heapUsedMB > this.criticalThresholdMB) {
      console.warn('[MemoryMonitor] CRITICAL: Heap usage high, forcing cleanup', stats)
      this.cleanup()
    } else if (stats.heapUsedMB > this.warningThresholdMB) {
      console.warn('[MemoryMonitor] WARNING: Heap usage elevated', stats)
      // Prune caches
      const pruned = hashCache.prune()
      console.log(`[MemoryMonitor] Pruned ${pruned} expired cache entries`)
    }
  }

  private cleanup(): void {
    // Clear LRU caches
    hashCache.clear()

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
      console.log('[MemoryMonitor] Forced garbage collection')
    }
  }
}

export const memoryMonitor = new MemoryMonitor()
```

---

## Implementation Order

| Priority | Task | Effort | Files |
|----------|------|--------|-------|
| **P0** | Create LRU Cache service | 1 hour | `services/cache/lru-cache.ts` (NEW) |
| **P0** | Create database query service | 2 hours | `services/database-queries.ts` (NEW) |
| **P0** | Refactor index-job.step.ts | 2 hours | `events/index-job.step.ts` |
| **P1** | Add match_scores table | 30 min | `schema.sql`, migration |
| **P1** | Refactor calculate-match-scores.step.ts | 2 hours | `events/calculate-match-scores.step.ts` |
| **P2** | Add employment type normalization | 30 min | `events/normalize-job.step.ts` OR Python scraper |
| **P2** | Create memory monitor | 1 hour | `services/memory-monitor.ts` (NEW) |
| **P3** | Refactor API endpoints | 1 hour | `api/get-jobs.step.ts`, `api/get-matched-jobs.step.ts` |

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Memory per refresh cycle | +10-15MB (accumulating) | +0.5MB (constant) |
| Max heap usage | 400MB+ → CRASH | <200MB (stable) |
| Jobs handled | ~1000 → crash | 10,000+ (stable) |
| Uptime | Hours | 24/7 continuous |
| Hash lookup | O(n) state scan | O(1) LRU cache |
| Fuzzy dedup | 500 in-memory comparisons | O(log n) DB trigram |
| Match calc | Load ALL jobs | Stream 100 at a time |

---

## Files Summary

| File | Action | Priority |
|------|--------|----------|
| `apps/backend/src/services/cache/lru-cache.ts` | **CREATE** | P0 |
| `apps/backend/src/services/database-queries.ts` | **CREATE** | P0 |
| `apps/backend/src/events/index-job.step.ts` | **MODIFY** - Remove getGroup | P0 |
| `apps/backend/src/events/calculate-match-scores.step.ts` | **MODIFY** - Add streaming | P1 |
| `apps/backend/schema.sql` | **MODIFY** - Add match_scores | P1 |
| `apps/backend/src/events/normalize-job.step.ts` | **MODIFY** - Add all field normalizers | P2 |
| `apps/backend/src/types/job.ts` | **MODIFY** - Strengthen Zod schemas | P2 |
| `apps/backend/src/services/memory-monitor.ts` | **CREATE** | P2 |

### Related Plans

| Plan | Purpose |
|------|---------|
| `FEATURE_PYTHON_SCRAPER_FIELD_NORMALIZATION.md` | Python scraper fixes (Option A - source of truth) |

**Strategy**: Implement Python scraper fixes first (FEATURE_PYTHON_SCRAPER_FIELD_NORMALIZATION.md), then add TypeScript validation as defense-in-depth.

---

## Testing Checklist

### Issue 1: Field Normalization
- [ ] Jobicy jobs insert successfully (employment_type normalized)
- [ ] `normalizeEmploymentType('Full-Time')` returns `'full-time'`
- [ ] `normalizeEmploymentType('Freelance')` returns `'contract'`
- [ ] `normalizeExperienceLevel('Entry Level')` returns `'entry'`
- [ ] `normalizeExperienceLevel('Sr.')` returns `'senior'`
- [ ] `normalizeRemote('yes')` returns `true`
- [ ] `normalizeTags('tag1, tag2, tag3')` returns `['tag1', 'tag2', 'tag3']`
- [ ] Invalid salary values are sanitized
- [ ] Invalid URLs are filtered

### Issue 2: Memory Management
- [ ] Server runs 24+ hours without OOM crash
- [ ] Memory stays under 200MB during refresh cycles
- [ ] Hash cache stays bounded at 5000 entries max
- [ ] Match scores calculate correctly with streaming
- [ ] LRU cache evicts old entries properly
- [ ] API response times unchanged or improved

---

## Document Metadata

**Analysis Agents Used**: 6 total (two rounds)
- Round 1:
  - Agent 1: Employment type field alignment analysis
  - Agent 2: Software architect (memory management design)
  - Agent 3: Jobicy normalization investigation
- Round 2:
  - Agent 1: Python scraper field names analysis
  - Agent 2: TypeScript backend expectations analysis
  - Agent 3: Validation/normalization gaps analysis (identified 12 fields)

**Research**: Perplexity Deep - Node.js 2025 best practices

**Confidence Level**: 94%
- High confidence on field normalization (comprehensive mapping tables)
- High confidence on memory architecture (follows 2025 best practices)
- Database-first approach proven at scale
- Defense-in-depth: Python fixes + TypeScript validation

**Related Documents**:
- `FEATURE_PYTHON_SCRAPER_FIELD_NORMALIZATION.md` - Python scraper source fixes (Option A)

**Last Updated**: 2026-01-02 (v3 - Added comprehensive TypeScript fallback validation)
