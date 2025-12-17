# Job Aggregator Hackathon - Comprehensive Implementation Plan

**Date**: 2024-12-16
**Author**: Claude AI
**Status**: Complete
**Type**: Feature Implementation Plan

---

## Table of Contents
- [Executive Summary](#executive-summary)
- [Hackathon Context](#hackathon-context)
- [Architecture Overview](#architecture-overview)
- [Free API Strategy](#free-api-strategy)
- [Backend Implementation (Motia)](#backend-implementation-motia)
- [Frontend Implementation (Next.js)](#frontend-implementation-nextjs)
- [Project Structure](#project-structure)
- [Implementation Phases](#implementation-phases)
- [Demo Strategy](#demo-strategy)
- [Success Metrics](#success-metrics)

---

## Executive Summary

Build a **real-time job aggregation platform** that demonstrates Motia's unified backend runtime by combining APIs, background jobs, cron scheduling, state management, and real-time streaming - with a **Next.js frontend** for professional demo presentation.

**Confidence Level**: 90% using free/cheap APIs

**Key Differentiators**:
- Polyglot architecture (TypeScript + Python)
- Real-time job streaming
- Full observability via Motia Workbench
- Production-ready patterns

---

## Hackathon Context

### Judging Criteria (Backend Reloaded Hackathon)

| Criteria | Weight | Our Strategy |
|----------|--------|--------------|
| **Real-World Impact** | High | Solves job search fragmentation across platforms |
| **Creativity & Innovation** | High | Real-time streaming + polyglot workers |
| **Learning Journey** | Medium | Progressive complexity demonstration |
| **Technical Excellence** | High | Type safety, DDD, error handling, state management |
| **Developer Experience** | Medium | Clean REST API + Workbench visualization |

### Prizes
- 1st Place: $1,500
- 2nd Place: $1,000
- 3rd Place: $500
- Plus: Swag boxes, Google Summer of Code mentorship

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JOB AGGREGATOR ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────┐              ┌────────────────────────────┐    │
│   │   NEXT.JS FRONTEND    │              │      MOTIA BACKEND         │    │
│   │   (Port 5173)         │              │      (Port 3000)           │    │
│   │                       │              │                            │    │
│   │  /app                 │   REST API   │  API Steps                 │    │
│   │    /page.tsx          │◄────────────►│    GET /jobs               │    │
│   │    /jobs/page.tsx     │              │    GET /jobs/:id           │    │
│   │    /sources/page.tsx  │              │    POST /jobs/search       │    │
│   │                       │              │    GET /sources            │    │
│   │  /components          │   WebSocket  │    POST /sources/refresh   │    │
│   │    JobCard.tsx        │◄────────────►│                            │    │
│   │    SearchBar.tsx      │   (Streams)  │  Event Steps               │    │
│   │    SourceStatus.tsx   │              │    fetch-arbeitnow         │    │
│   │                       │              │    fetch-hackernews (Py)   │    │
│   └───────────────────────┘              │    normalize-job           │    │
│                                          │    index-job               │    │
│                                          │                            │    │
│                                          │  Cron Steps                │    │
│                                          │    refresh-all-sources     │    │
│                                          │    cleanup-stale-jobs      │    │
│                                          │                            │    │
│                                          │  Streams                   │    │
│                                          │    job-feed (real-time)    │    │
│                                          │                            │    │
│                                          │  State                     │    │
│                                          │    jobs (cache)            │    │
│                                          │    sources (metadata)      │    │
│                                          └────────────────────────────┘    │
│                                                       │                     │
│                                                       ▼                     │
│                                          ┌────────────────────────────┐    │
│                                          │      MOTIA WORKBENCH       │    │
│                                          │      (Observability)       │    │
│                                          │      Port 3000             │    │
│                                          └────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Free API Strategy

### Data Sources (100% Free)

| Source | API Endpoint | Auth | Rate Limit | Coverage |
|--------|--------------|------|------------|----------|
| **Arbeitnow** | `api.arbeitnow.com/api/v2/jobs` | None | Unlimited | 10K+ European tech jobs |
| **HackerNews** | `hacker-news.firebaseio.com/v0/` | None | Unlimited | Monthly "Who's Hiring" |
| **Reddit** | PRAW library | Free app | 60 req/min | r/forhire, r/jobbit |
| **Piloterr** | piloterr.com | 50 credits | Per credit | Indeed + Google Jobs |

### API Response Examples

**Arbeitnow** (`GET https://api.arbeitnow.com/api/v2/jobs`):
```json
{
  "data": [
    {
      "slug": "senior-developer-xyz",
      "company_name": "TechCorp",
      "title": "Senior Developer",
      "description": "...",
      "remote": true,
      "url": "https://...",
      "tags": ["javascript", "react"],
      "job_types": ["full_time"],
      "location": "Berlin",
      "created_at": 1702684800
    }
  ],
  "links": { "next": "..." },
  "meta": { "total": 1234 }
}
```

**HackerNews** ("Who's Hiring" thread):
- Fetch story IDs: `GET /v0/item/{storyId}.json`
- Parse comments for job postings
- Extract: company, title, location, contact, remote status

---

## Backend Implementation (Motia)

### Normalized Job Schema

```typescript
// src/types/job.ts
import { z } from 'zod'

export const jobSchema = z.object({
  id: z.string(),                    // Unique identifier (source_slug)
  title: z.string(),                 // Job title
  company: z.string(),               // Company name
  location: z.string().optional(),   // Location or "Remote"
  remote: z.boolean(),               // Is remote available?
  url: z.string().url(),             // Application URL
  description: z.string(),           // Job description (truncated)
  source: z.enum(['arbeitnow', 'hackernews', 'reddit', 'piloterr']),
  postedAt: z.string(),              // ISO date when posted
  fetchedAt: z.string(),             // ISO date when we fetched
  salary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().optional()
  }).optional(),
  tags: z.array(z.string()),         // Skills/keywords
  healthScore: z.number().min(0).max(100) // Freshness score
})

export type Job = z.infer<typeof jobSchema>
```

### API Steps

#### GET /jobs - List Jobs
```typescript
// src/api/get-jobs.step.ts
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

const responseSchema = z.object({
  jobs: z.array(jobSchema),
  total: z.number(),
  sources: z.array(z.string()),
  lastUpdated: z.string()
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetJobs',
  path: '/jobs',
  method: 'GET',
  description: 'List all aggregated jobs with optional filters',
  emits: [],
  flows: ['job-aggregation'],
  queryParams: [
    { name: 'source', description: 'Filter by source (arbeitnow, hackernews, etc.)' },
    { name: 'remote', description: 'Filter remote jobs only (true/false)' },
    { name: 'limit', description: 'Number of results (default: 50)' },
    { name: 'offset', description: 'Pagination offset (default: 0)' }
  ],
  responseSchema: {
    200: responseSchema
  }
}

export const handler: Handlers['GetJobs'] = async (req, { state, logger }) => {
  const { source, remote, limit = '50', offset = '0' } = req.queryParams as Record<string, string>

  logger.info('Fetching jobs', { source, remote, limit, offset })

  let jobs = await state.getGroup<Job>('jobs')

  // Apply filters
  if (source) {
    jobs = jobs.filter(j => j.source === source)
  }
  if (remote === 'true') {
    jobs = jobs.filter(j => j.remote === true)
  }

  // Sort by freshness
  jobs.sort((a, b) => b.healthScore - a.healthScore)

  // Paginate
  const start = parseInt(offset)
  const end = start + parseInt(limit)
  const paginatedJobs = jobs.slice(start, end)

  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60'
    },
    body: {
      jobs: paginatedJobs,
      total: jobs.length,
      sources: [...new Set(jobs.map(j => j.source))],
      lastUpdated: new Date().toISOString()
    }
  }
}
```

#### POST /sources/:name/refresh - Trigger Refresh
```typescript
// src/api/refresh-source.step.ts
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'RefreshSource',
  path: '/sources/:name/refresh',
  method: 'POST',
  description: 'Manually trigger a source refresh',
  emits: ['fetch-jobs-trigger'],
  flows: ['job-aggregation'],
  responseSchema: {
    202: z.object({ message: z.string(), source: z.string() })
  }
}

export const handler: Handlers['RefreshSource'] = async (req, { emit, logger }) => {
  const { name } = req.pathParams

  logger.info('Manual refresh triggered', { source: name })

  await emit({
    topic: 'fetch-jobs-trigger',
    data: { source: name, manual: true }
  })

  return {
    status: 202,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: { message: 'Refresh initiated', source: name }
  }
}
```

### Event Steps

#### Fetch Arbeitnow (TypeScript)
```typescript
// src/events/fetch-arbeitnow.step.ts
import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  source: z.string(),
  manual: z.boolean().optional()
})

export const config: EventConfig = {
  type: 'event',
  name: 'FetchArbeitnow',
  description: 'Fetches jobs from Arbeitnow API',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation']
}

export const handler: Handlers['FetchArbeitnow'] = async (input, { emit, logger, state }) => {
  if (input.source !== 'arbeitnow' && input.source !== 'all') {
    return // Skip if not for this source
  }

  logger.info('Fetching from Arbeitnow API')

  try {
    const response = await fetch('https://api.arbeitnow.com/api/v2/jobs?per_page=100')
    const data = await response.json()

    logger.info('Fetched jobs from Arbeitnow', { count: data.data.length })

    // Update source metadata
    await state.set('sources', 'arbeitnow', {
      lastFetch: new Date().toISOString(),
      jobCount: data.data.length,
      status: 'success'
    })

    // Emit each job for normalization
    for (const job of data.data) {
      await emit({
        topic: 'normalize-job',
        data: {
          source: 'arbeitnow',
          rawJob: job
        }
      })
    }
  } catch (error) {
    logger.error('Failed to fetch from Arbeitnow', { error: error.message })
    await state.set('sources', 'arbeitnow', {
      lastFetch: new Date().toISOString(),
      status: 'error',
      error: error.message
    })
  }
}
```

#### Fetch HackerNews (Python - Polyglot Demo)
```python
# src/events/fetch_hackernews_step.py
import httpx
import re
from datetime import datetime

config = {
    "type": "event",
    "name": "FetchHackerNews",
    "description": "Fetches jobs from HackerNews Who's Hiring thread",
    "subscribes": ["fetch-jobs-trigger"],
    "emits": ["normalize-job"],
    "input": {
        "type": "object",
        "properties": {
            "source": {"type": "string"},
            "manual": {"type": "boolean"}
        }
    },
    "flows": ["job-aggregation"]
}

# Known "Who's Hiring" thread IDs (update monthly)
WHO_IS_HIRING_THREADS = [
    38842977,  # December 2024
    38532882,  # November 2024
]

async def handler(input_data, context):
    source = input_data.get("source", "")

    if source != "hackernews" and source != "all":
        return

    context.logger.info("Fetching from HackerNews Who's Hiring")

    async with httpx.AsyncClient() as client:
        for thread_id in WHO_IS_HIRING_THREADS[:1]:  # Just latest
            try:
                # Fetch thread
                resp = await client.get(
                    f"https://hacker-news.firebaseio.com/v0/item/{thread_id}.json"
                )
                thread = resp.json()

                if not thread or "kids" not in thread:
                    continue

                # Fetch top 50 comments (job postings)
                comment_ids = thread["kids"][:50]

                for comment_id in comment_ids:
                    try:
                        comment_resp = await client.get(
                            f"https://hacker-news.firebaseio.com/v0/item/{comment_id}.json"
                        )
                        comment = comment_resp.json()

                        if comment and comment.get("text"):
                            # Parse job from comment
                            job_data = parse_hn_comment(comment)

                            if job_data:
                                await context.emit({
                                    "topic": "normalize-job",
                                    "data": {
                                        "source": "hackernews",
                                        "rawJob": job_data
                                    }
                                })
                    except Exception as e:
                        context.logger.warn(f"Failed to fetch comment {comment_id}", {"error": str(e)})

                context.logger.info("Processed HackerNews thread", {"thread_id": thread_id})

            except Exception as e:
                context.logger.error("Failed to fetch HN thread", {"error": str(e)})

    # Update source metadata
    await context.state.set("sources", "hackernews", {
        "lastFetch": datetime.now().isoformat(),
        "status": "success"
    })


def parse_hn_comment(comment):
    """Extract job info from HN comment text."""
    text = comment.get("text", "")

    # Simple extraction - first line is usually "Company | Role | Location"
    lines = text.split("<p>")
    if not lines:
        return None

    first_line = re.sub(r"<[^>]+>", "", lines[0]).strip()
    parts = first_line.split("|")

    if len(parts) >= 2:
        return {
            "id": str(comment.get("id")),
            "company": parts[0].strip(),
            "title": parts[1].strip() if len(parts) > 1 else "Software Engineer",
            "location": parts[2].strip() if len(parts) > 2 else "Remote",
            "description": text[:500],
            "url": f"https://news.ycombinator.com/item?id={comment.get('id')}",
            "posted_at": comment.get("time", 0)
        }

    return None
```

### Cron Steps

```typescript
// src/cron/refresh-all-sources.step.ts
import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'RefreshAllSources',
  description: 'Refresh all job sources every 30 minutes',
  cron: '*/30 * * * *',  // Every 30 minutes
  emits: ['fetch-jobs-trigger'],
  flows: ['job-aggregation']
}

export const handler: Handlers['RefreshAllSources'] = async ({ emit, logger }) => {
  logger.info('Scheduled refresh started')

  await emit({
    topic: 'fetch-jobs-trigger',
    data: { source: 'all', manual: false }
  })

  logger.info('Scheduled refresh triggered for all sources')
}
```

### Real-time Streaming

```typescript
// src/streams/job-feed.stream.ts
import { StreamConfig } from 'motia'
import { z } from 'zod'
import { jobSchema } from '../types/job'

export const config: StreamConfig = {
  name: 'jobFeed',
  schema: jobSchema,
  baseConfig: { storageType: 'default' }
}
```

---

## Frontend Implementation (Next.js)

### Frontend Setup

**Location**: `/frontend` (separate from Motia backend, same repo)

```bash
# From project root
cd /Users/dave/Work/job-aggregator
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Dashboard (home)
│   │   ├── jobs/
│   │   │   └── page.tsx         # Job listings
│   │   └── sources/
│   │       └── page.tsx         # Source management
│   ├── components/
│   │   ├── JobCard.tsx          # Individual job display
│   │   ├── JobList.tsx          # Job list with filters
│   │   ├── SearchBar.tsx        # Search/filter controls
│   │   ├── SourceStatus.tsx     # Source health indicators
│   │   ├── StatsCards.tsx       # Dashboard statistics
│   │   └── Header.tsx           # Navigation header
│   ├── lib/
│   │   ├── api.ts               # API client functions
│   │   └── types.ts             # TypeScript types
│   └── hooks/
│       └── useJobs.ts           # React Query hooks
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

### Key Frontend Components

#### API Client
```typescript
// frontend/src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface Job {
  id: string
  title: string
  company: string
  location?: string
  remote: boolean
  url: string
  description: string
  source: 'arbeitnow' | 'hackernews' | 'reddit' | 'piloterr'
  postedAt: string
  fetchedAt: string
  tags: string[]
  healthScore: number
}

export interface JobsResponse {
  jobs: Job[]
  total: number
  sources: string[]
  lastUpdated: string
}

export async function getJobs(params?: {
  source?: string
  remote?: boolean
  limit?: number
  offset?: number
}): Promise<JobsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.source) searchParams.set('source', params.source)
  if (params?.remote) searchParams.set('remote', 'true')
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const res = await fetch(`${API_BASE}/jobs?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch jobs')
  return res.json()
}

export async function refreshSource(source: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sources/${source}/refresh`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to refresh source')
}

export async function getSources(): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/sources`)
  if (!res.ok) throw new Error('Failed to fetch sources')
  return res.json()
}
```

#### Dashboard Page
```typescript
// frontend/src/app/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { getJobs, getSources } from '@/lib/api'
import StatsCards from '@/components/StatsCards'
import JobList from '@/components/JobList'
import SourceStatus from '@/components/SourceStatus'

export default function Dashboard() {
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => getJobs({ limit: 20 }),
    refetchInterval: 30000 // Refresh every 30s
  })

  const { data: sources } = useQuery({
    queryKey: ['sources'],
    queryFn: getSources
  })

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Job Aggregator
          </h1>
          <p className="text-gray-400">
            Powered by Motia - Unified Backend Runtime
          </p>
        </header>

        {/* Stats */}
        <StatsCards
          totalJobs={jobsData?.total || 0}
          sources={jobsData?.sources || []}
          lastUpdated={jobsData?.lastUpdated}
        />

        {/* Source Status */}
        <SourceStatus sources={sources} />

        {/* Recent Jobs */}
        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Jobs</h2>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <JobList jobs={jobsData?.jobs || []} />
          )}
        </section>
      </div>
    </main>
  )
}
```

#### Job Card Component
```typescript
// frontend/src/components/JobCard.tsx
import { Job } from '@/lib/api'

interface JobCardProps {
  job: Job
}

const sourceColors: Record<string, string> = {
  arbeitnow: 'bg-blue-600',
  hackernews: 'bg-orange-600',
  reddit: 'bg-red-600',
  piloterr: 'bg-green-600'
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {job.title}
          </h3>
          <p className="text-gray-400">{job.company}</p>
        </div>
        <span className={`${sourceColors[job.source]} text-xs px-2 py-1 rounded`}>
          {job.source}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
        {job.location && <span>{job.location}</span>}
        {job.remote && (
          <span className="bg-green-900 text-green-300 px-2 py-0.5 rounded">
            Remote
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {job.tags.slice(0, 5).map(tag => (
          <span
            key={tag}
            className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Score: {job.healthScore}%
        </span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Apply →
        </a>
      </div>
    </div>
  )
}
```

### Frontend package.json
```json
{
  "name": "job-aggregator-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 5173",
    "build": "next build",
    "start": "next start -p 5173",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3",
    "typescript": "^5"
  }
}
```

---

## Project Structure

### Complete Directory Structure

```
job-aggregator/
├── src/                              # MOTIA BACKEND
│   ├── api/                          # API Steps (TypeScript)
│   │   ├── get-jobs.step.ts          # GET /jobs
│   │   ├── get-job-by-id.step.ts     # GET /jobs/:id
│   │   ├── search-jobs.step.ts       # POST /jobs/search
│   │   ├── get-sources.step.ts       # GET /sources
│   │   ├── refresh-source.step.ts    # POST /sources/:name/refresh
│   │   └── health.step.ts            # GET /health
│   │
│   ├── events/                       # Event Steps (Mixed Languages)
│   │   ├── fetch-arbeitnow.step.ts   # TypeScript: Arbeitnow API
│   │   ├── fetch_hackernews_step.py  # Python: HN parsing (polyglot!)
│   │   ├── normalize-job.step.ts     # TypeScript: Data normalization
│   │   ├── deduplicate-job.step.ts   # TypeScript: Hash-based dedup
│   │   └── index-job.step.ts         # TypeScript: Store in state
│   │
│   ├── cron/                         # Cron Steps
│   │   ├── refresh-all-sources.step.ts  # Every 30 min
│   │   └── cleanup-stale-jobs.step.ts   # Daily at midnight
│   │
│   ├── streams/                      # Real-time Streams
│   │   └── job-feed.stream.ts        # Live job updates
│   │
│   ├── services/                     # Business Logic
│   │   ├── job-normalizer.ts
│   │   ├── health-scorer.ts
│   │   └── api-clients/
│   │       ├── arbeitnow.ts
│   │       └── hackernews.ts
│   │
│   └── types/                        # Shared Types
│       └── job.ts
│
├── frontend/                         # NEXT.JS FRONTEND
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── jobs/
│   │   │   │   └── page.tsx          # Job listings
│   │   │   └── sources/
│   │   │       └── page.tsx          # Source management
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobList.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SourceStatus.tsx
│   │   │   └── StatsCards.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   └── hooks/
│   │       └── useJobs.ts
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── middlewares/                      # Motia Middlewares
│   └── cors.middleware.ts
│
├── docs/                             # Documentation
│   ├── plans/
│   ├── api/
│   └── architecture/
│
├── motia.config.ts                   # Motia configuration
├── package.json                      # Root package.json
├── requirements.txt                  # Python dependencies
└── README.md
```

### Root package.json Scripts

```json
{
  "name": "job-aggregator",
  "scripts": {
    "dev": "motia dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:frontend\"",
    "build": "motia build",
    "build:frontend": "cd frontend && npm run build",
    "start": "motia start",
    "generate-types": "motia generate-types"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

---

## Implementation Phases

### Phase 1: Backend Foundation (Day 1)
- [ ] Set up API Steps (get-jobs, get-sources, refresh-source)
- [ ] Implement Arbeitnow fetch event
- [ ] Create normalize-job and index-job events
- [ ] Set up state management for jobs cache
- [ ] Add CORS middleware
- [ ] Test with curl/Postman

### Phase 2: Data Sources (Day 2)
- [ ] Implement HackerNews Python scraper (polyglot demo!)
- [ ] Add deduplication logic
- [ ] Set up cron job for scheduled refresh
- [ ] Implement health scoring algorithm
- [ ] Test all sources working together

### Phase 3: Frontend (Day 3)
- [ ] Create Next.js app in /frontend
- [ ] Build dashboard with stats
- [ ] Implement job list with filters
- [ ] Add source status indicators
- [ ] Connect to backend API
- [ ] Style with Tailwind

### Phase 4: Polish & Demo Prep (Day 4)
- [ ] Set up real-time streaming
- [ ] Add search functionality
- [ ] Pre-seed demo data
- [ ] Record backup demo video
- [ ] Practice 60-90 second demo
- [ ] Prepare Workbench screenshots

---

## Demo Strategy

### Demo Script (60-90 Seconds)

| Time | Action | What to Show |
|------|--------|--------------|
| 0-15s | Open dashboard | Clean UI, job stats, source status |
| 15-30s | Show job list | Real data from multiple sources |
| 30-45s | Click refresh | Trigger manual refresh, show toast |
| 45-60s | Open Workbench | Show event flow diagram |
| 60-75s | Highlight events | Point out polyglot (TS + Python) |
| 75-90s | Show real-time | New job appears via stream |

### Fallback Strategies
1. **Video backup**: Pre-record working demo
2. **Pre-seeded data**: Jobs already in state
3. **Curl commands**: API-only demo if frontend fails
4. **Screenshots**: Workbench flow diagrams

### Key Talking Points
- "One runtime, multiple languages"
- "APIs, events, cron, streaming - all unified"
- "Built-in observability with Workbench"
- "Production-ready patterns from day one"

---

## Success Metrics

### Backend Checklist
- [ ] 3+ data sources working (Arbeitnow, HackerNews, Reddit)
- [ ] Event flow visible in Workbench
- [ ] Cron job executing every 30 minutes
- [ ] State caching functional
- [ ] Real-time streaming operational
- [ ] Polyglot (TypeScript + Python) demonstrated
- [ ] CORS enabled for frontend

### Frontend Checklist
- [ ] Dashboard loads with stats
- [ ] Job list renders from API
- [ ] Source status indicators work
- [ ] Search/filter functional
- [ ] Mobile-responsive
- [ ] < 3 second load time

### Demo Readiness
- [ ] 60-90 second script practiced
- [ ] Fallback video recorded
- [ ] Pre-seeded data ready
- [ ] Workbench screenshots saved

---

## Document Metadata

**Last Updated**: 2024-12-16
**Implementation Status**: Not Started
**Related Documents**:
- `.cursor/rules/motia/api-steps.mdc`
- `.cursor/rules/motia/event-steps.mdc`
- `.cursor/rules/motia/cron-steps.mdc`
- `.cursor/rules/motia/state-management.mdc`
- `.cursor/rules/motia/realtime-streaming.mdc`

**Change Log**:
- 2024-12-16 - Initial creation with full backend + Next.js frontend plan
