# Supabase Database Persistence & Deduplication Plan

**Date**: 2025-12-18
**Author**: AI Agent (Claude)
**Status**: Approved
**Version**: 1.0
**Project**: Job Aggregator - Backend Reloaded Hackathon

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Deduplication Strategy](#deduplication-strategy)
6. [Implementation Plan](#implementation-plan)
7. [Code Changes](#code-changes)
8. [Environment Configuration](#environment-configuration)
9. [Testing Strategy](#testing-strategy)
10. [Future Considerations](#future-considerations)

---

## Executive Summary

This plan implements persistent job storage using Supabase (hosted PostgreSQL) with database-level deduplication. The solution ensures:

- **Data Persistence**: Jobs survive backend restarts
- **No Duplicates**: Database constraints prevent duplicate entries
- **Cross-Source Deduplication**: Same job from different sources detected
- **Fast Reads**: Motia state serves as cache, database as source of truth
- **Future-Ready**: Supabase Storage available for resume generation feature

---

## Problem Statement

### Current Issues

1. **No Persistence**: Motia uses in-memory Redis (redis-memory-server) by default
   - All data lost on backend restart
   - Every restart re-fetches and re-inserts all jobs

2. **In-Memory Deduplication Only**: Current `index-job.step.ts` checks only Motia state
   - Works within single session
   - Fails across restarts

3. **No Historical Data**: Cannot query job history or track changes

### Impact
- Running the aggregator twice creates duplicate jobs
- No long-term job data for search/analytics
- Poor user experience (missing jobs after restart)

---

## Architecture Overview

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         JOB AGGREGATOR STACK                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────────────┐ │
│  │   Motia      │    │   Motia      │    │     Supabase PostgreSQL    │ │
│  │   State      │    │   Streams    │    │     (Source of Truth)      │ │
│  │   (Cache)    │    │  (Real-time) │    │                            │ │
│  └──────────────┘    └──────────────┘    │  ┌──────────────────────┐  │ │
│         │                   │            │  │ UNIQUE(content_hash) │  │ │
│         │                   │            │  │ = NO DUPLICATES      │  │ │
│         │                   │            │  └──────────────────────┘  │ │
│         └───────────────────┴────────────┤                            │ │
│                                          │  + Supabase Storage        │ │
│  Purpose:                                │    (future: resumes)       │ │
│  • Fast reads (hot cache)                │                            │ │
│  • WebSocket push                        │  + Full-text search        │ │
│  • Session cache                         │  + Complex queries         │ │
│                                          │  + History tracking        │ │
│                                          └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌───────────────────────────────────────────────────────────────────┐
│  FETCH: Arbeitnow returns 100 jobs                                │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│  NORMALIZE: content_hash = MD5(title|company|location)            │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│  DATABASE UPSERT                                                  │
│                                                                   │
│  INSERT INTO jobs (...) VALUES (...)                              │
│  ON CONFLICT (content_hash) DO UPDATE SET                         │
│    fetched_at = NOW(),                                            │
│    health_score = GREATEST(old, new)                              │
│                                                                   │
│  Result:                                                          │
│  • 5 NEW jobs → insert + stream + emit event                     │
│  • 95 EXISTING jobs → update freshness only                      │
└───────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Jobs Table

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Main jobs table
CREATE TABLE jobs (
  -- Primary key (existing ID format)
  id TEXT PRIMARY KEY,  -- e.g., 'arbeitnow_senior-react-dev-123'

  -- Core fields
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  remote BOOLEAN DEFAULT FALSE,
  url TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('arbeitnow', 'hackernews', 'reddit', 'remotive')),
  posted_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),

  -- AI-enhanced fields (from existing features)
  ai_summary TEXT,
  skills TEXT[],

  -- DEDUPLICATION FIELDS
  content_hash TEXT NOT NULL,
  source_external_id TEXT,

  -- Normalized fields for fuzzy matching
  title_normalized TEXT,
  company_normalized TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- UNIQUE CONSTRAINTS (deduplication magic)
  CONSTRAINT unique_content UNIQUE (content_hash)
);

-- Indexes for performance
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_health_score ON jobs(health_score DESC);
CREATE INDEX idx_jobs_content_hash ON jobs(content_hash);
CREATE INDEX idx_jobs_remote ON jobs(remote) WHERE remote = true;

-- Full-text search index
CREATE INDEX idx_jobs_search ON jobs USING GIN (
  to_tsvector('english', title || ' ' || company || ' ' || COALESCE(description, ''))
);

-- Trigram indexes for fuzzy matching
CREATE INDEX idx_jobs_title_trgm ON jobs USING GIN (title_normalized gin_trgm_ops);
CREATE INDEX idx_jobs_company_trgm ON jobs USING GIN (company_normalized gin_trgm_ops);
```

### Sources Table

```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('arbeitnow', 'hackernews', 'reddit', 'remotive')),
  status TEXT DEFAULT 'unknown' CHECK (status IN ('success', 'error', 'pending', 'unknown')),
  last_fetch TIMESTAMPTZ,
  job_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default sources
INSERT INTO sources (name, status) VALUES
  ('arbeitnow', 'unknown'),
  ('hackernews', 'unknown'),
  ('reddit', 'unknown'),
  ('remotive', 'unknown')
ON CONFLICT (name) DO NOTHING;
```

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER,
  seniority_level TEXT CHECK (seniority_level IN ('junior', 'mid', 'senior', 'lead')),
  preferred_locations TEXT[] DEFAULT '{}',
  remote_preference TEXT CHECK (remote_preference IN ('remote-only', 'hybrid', 'onsite', 'flexible')),
  salary_min INTEGER,
  salary_max INTEGER,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_skills ON profiles USING GIN(skills);
```

### Applications Table

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn')),
  applied_at TIMESTAMPTZ,
  notes TEXT,
  follow_up_date DATE,
  resume_version TEXT,
  cover_letter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, profile_id)
);

CREATE INDEX idx_applications_profile ON applications(profile_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_follow_up ON applications(follow_up_date) WHERE follow_up_date IS NOT NULL;
```

---

## Deduplication Strategy

### Two-Level Deduplication

#### Level 1: Content Hash (Primary)
- **Hash Formula**: `MD5(lowercase(title) | lowercase(company) | lowercase(location))`
- **Catches**: Same job posted on different sources
- **Database Constraint**: `UNIQUE(content_hash)`

#### Level 2: Source + External ID (Secondary)
- **For**: Re-fetches from same source
- **Example**: Same Arbeitnow job fetched at 10:00 and 10:30
- **Handled by**: Primary key `id` (e.g., `arbeitnow_slug`)

### UPSERT Logic

```sql
INSERT INTO jobs (id, title, company, ..., content_hash)
VALUES ($1, $2, $3, ..., $n)
ON CONFLICT (content_hash) DO UPDATE SET
  fetched_at = NOW(),
  health_score = GREATEST(jobs.health_score, EXCLUDED.health_score),
  updated_at = NOW()
WHERE jobs.updated_at < NOW() - INTERVAL '5 minutes';
-- Only update if not recently updated (prevent race conditions)
```

### Resolution Strategy

When duplicate found:
1. **Keep higher health score** (fresher job)
2. **Merge best data** (longer description, more tags)
3. **Track all sources** (for analytics)

---

## Implementation Plan

### Phase 1: Database Setup (Files to Create)

| File | Purpose |
|------|---------|
| `src/services/supabase.ts` | Supabase client initialization |
| `src/services/database.ts` | Job CRUD operations with dedup |
| `.env.example` | Add SUPABASE_URL and SUPABASE_SERVICE_KEY |

### Phase 2: Schema Updates (Files to Modify)

| File | Changes |
|------|---------|
| `src/types/job.ts` | Add `contentHash`, `createdAt`, `updatedAt` fields |

### Phase 3: Integration (Files to Modify)

| File | Changes |
|------|---------|
| `src/events/index-job.step.ts` | Use database upsert instead of state-only |
| `src/api/get-jobs.step.ts` | Hydrate from DB on cold start |
| `src/api/get-sources.step.ts` | Read source status from DB |
| `src/events/fetch-*.step.ts` | Update source status in DB |

---

## Code Changes

### New File: `src/services/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY - database features disabled')
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export const isSupabaseConfigured = (): boolean => {
  return supabase !== null
}
```

### New File: `src/services/database.ts`

```typescript
import { supabase, isSupabaseConfigured } from './supabase'
import crypto from 'crypto'
import type { Job } from '../types/job'

// Normalize text for consistent hashing
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
}

// Generate content hash for deduplication
export function generateContentHash(title: string, company: string, location?: string): string {
  const content = [
    normalizeText(title),
    normalizeText(company),
    normalizeText(location || '')
  ].join('|')
  return crypto.createHash('md5').update(content).digest('hex')
}

// Upsert job - INSERT if new, UPDATE if exists
export async function upsertJob(job: Job): Promise<{ inserted: boolean; job: Job } | null> {
  if (!isSupabaseConfigured() || !supabase) return null

  const contentHash = generateContentHash(job.title, job.company, job.location)

  const { data, error } = await supabase
    .from('jobs')
    .upsert({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote,
      url: job.url,
      description: job.description,
      source: job.source,
      posted_at: job.postedAt,
      fetched_at: new Date().toISOString(),
      tags: job.tags,
      health_score: job.healthScore,
      content_hash: contentHash,
      title_normalized: normalizeText(job.title),
      company_normalized: normalizeText(job.company),
      ai_summary: job.aiSummary,
      skills: job.skills,
    }, {
      onConflict: 'content_hash',
      ignoreDuplicates: false
    })
    .select()
    .single()

  if (error) {
    // Check if it's a duplicate (conflict on primary key)
    if (error.code === '23505') {
      return { inserted: false, job }
    }
    throw error
  }

  return { inserted: true, job: data as Job }
}

// Get all jobs with filters
export async function getJobsFromDB(params: {
  search?: string
  source?: string
  remote?: boolean
  limit?: number
  offset?: number
}): Promise<Job[]> {
  if (!isSupabaseConfigured() || !supabase) return []

  let query = supabase.from('jobs').select('*')

  if (params.source) {
    query = query.eq('source', params.source)
  }
  if (params.remote) {
    query = query.eq('remote', true)
  }
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,company.ilike.%${params.search}%,description.ilike.%${params.search}%`)
  }

  query = query
    .order('health_score', { ascending: false })
    .order('posted_at', { ascending: false })
    .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1)

  const { data, error } = await query
  if (error) throw error

  return (data || []).map(mapDbJobToJob)
}

// Check if job exists by content hash
export async function jobExistsByHash(contentHash: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false

  const { data } = await supabase
    .from('jobs')
    .select('id')
    .eq('content_hash', contentHash)
    .limit(1)
    .single()

  return !!data
}

// Get job count and stats
export async function getJobStats(): Promise<{
  total: number
  bySource: Record<string, number>
} | null> {
  if (!isSupabaseConfigured() || !supabase) return null

  const { data: jobs } = await supabase
    .from('jobs')
    .select('source')

  if (!jobs) return { total: 0, bySource: {} }

  const bySource: Record<string, number> = {}
  for (const job of jobs) {
    bySource[job.source] = (bySource[job.source] || 0) + 1
  }

  return {
    total: jobs.length,
    bySource
  }
}

// Map database row to Job type
function mapDbJobToJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    remote: row.remote,
    url: row.url,
    description: row.description,
    source: row.source,
    postedAt: row.posted_at,
    fetchedAt: row.fetched_at,
    tags: row.tags || [],
    healthScore: row.health_score,
    aiSummary: row.ai_summary,
    skills: row.skills || [],
  }
}

// Update source status
export async function updateSourceStatus(
  sourceName: string,
  status: 'success' | 'error' | 'pending',
  jobCount?: number,
  error?: string
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return

  await supabase
    .from('sources')
    .upsert({
      name: sourceName,
      status,
      last_fetch: new Date().toISOString(),
      job_count: jobCount,
      error: error || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'name'
    })
}

// Get all sources
export async function getSourcesFromDB(): Promise<Array<{
  name: string
  status: string
  lastFetch: string | null
  jobCount: number
  error: string | null
}>> {
  if (!isSupabaseConfigured() || !supabase) return []

  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('name')

  if (error) throw error

  return (data || []).map(s => ({
    name: s.name,
    status: s.status,
    lastFetch: s.last_fetch,
    jobCount: s.job_count || 0,
    error: s.error
  }))
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Add to .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Update .env.example

```bash
# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/_/settings/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

---

## Testing Strategy

### Unit Tests
- [ ] `generateContentHash()` produces consistent hashes
- [ ] `normalizeText()` handles edge cases
- [ ] `upsertJob()` returns correct inserted flag

### Integration Tests
- [ ] New job inserts successfully
- [ ] Duplicate job (same hash) updates instead of inserts
- [ ] Cold start hydrates from database
- [ ] Filters work correctly (source, remote, search)

### Manual Testing
1. Start backend, fetch jobs, verify count
2. Restart backend, verify jobs persist
3. Re-fetch same source, verify no duplicates
4. Check Supabase dashboard for data

---

## Future Considerations

### Supabase Storage (Resumes)
- Bucket: `resumes`
- Path: `{profile_id}/{timestamp}_{filename}`
- Access: Authenticated users only

### Vector Search (Semantic Dedup)
- Add `embedding` column with pgvector
- Cosine similarity for near-duplicate detection
- Threshold: 0.95 = likely duplicate

### Job History Tracking
- Add `job_history` table
- Track changes over time
- Enable "job freshness" analytics

---

## Document Metadata

**Last Updated**: 2025-12-18
**Review Status**: Approved
**Implementation Status**: In Progress

**Related Documents**:
- `FEATURE_JOB_AGGREGATOR_HACKATHON.md` - Original hackathon plan
- `CLAUDE.md` - Project development guide

**Change Log**:
- 2025-12-18 - Initial creation
- 2025-12-18 - Updated to use Supabase instead of Neon
