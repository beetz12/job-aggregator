# Job Aggregator - Claude AI Guide

This is a **Motia** project for the Backend Reloaded Hackathon - a real-time job aggregation platform.

## Project Overview

**Goal**: Aggregate jobs from free APIs (Arbeitnow, HackerNews, Reddit) into a unified, searchable feed with real-time updates.

**Tech Stack**:
- **Backend**: Motia (TypeScript + Python polyglot)
- **Frontend**: Next.js with Tailwind (in `/frontend`)
- **State**: Motia built-in state management
- **Streaming**: Real-time job updates

## Quick Commands

```bash
npm run dev              # Start Motia dev server (port 3000)
npm run start            # Start production server
npx motia generate-types # Regenerate TypeScript types
```

## Development Guides

**Read these before writing Motia code:**

### Step Patterns (`.cursor/rules/motia/`)
| Guide | Purpose |
|-------|---------|
| `api-steps.mdc` | HTTP endpoints with validation |
| `event-steps.mdc` | Background processing |
| `cron-steps.mdc` | Scheduled tasks |
| `state-management.mdc` | Caching and cross-step data |
| `middlewares.mdc` | Request/response middleware |
| `realtime-streaming.mdc` | WebSocket/SSE patterns |

### Architecture (`.cursor/architecture/`)
| Guide | Purpose |
|-------|---------|
| `architecture.mdc` | Project structure, naming conventions |
| `error-handling.mdc` | Error handling patterns |

## For Claude Code Users

**Use the pre-configured `motia-developer` subagent** for all Motia development:

```
/agents → select motia-developer
```

The subagent references all 11 cursor rules automatically.

## For Claude AI (Chat)

Reference guides explicitly in prompts:

```
Read .cursor/rules/motia/api-steps.mdc and create a GET /jobs
endpoint following the patterns shown.
```

## Implementation Plan

**Full plan**: `docs/plans/FEATURE_JOB_AGGREGATOR_HACKATHON.md`

### Backend Steps to Implement

**API Steps** (`src/api/`):
- `get-jobs.step.ts` - GET /jobs (list with filters)
- `get-sources.step.ts` - GET /sources (source status)
- `refresh-source.step.ts` - POST /sources/:name/refresh

**Event Steps** (`src/events/`):
- `fetch-arbeitnow.step.ts` - Fetch from Arbeitnow API
- `fetch_hackernews_step.py` - Parse HN "Who's Hiring" (Python)
- `normalize-job.step.ts` - Normalize to common schema
- `index-job.step.ts` - Store in state

**Cron Steps** (`src/cron/`):
- `refresh-all-sources.step.ts` - Every 30 minutes

### Frontend (to create in `/frontend`)
- Next.js app with dashboard, job list, source status
- TanStack Query for data fetching
- Tailwind for styling

## Project Structure

```
src/
├── hello/                    # Starter example (working)
│   ├── hello-api.step.ts     # TypeScript API
│   ├── process_greeting_step.py  # Python processor
│   └── log-greeting.step.js  # JavaScript logger
├── api/                      # API endpoints (to implement)
├── events/                   # Event handlers (to implement)
├── cron/                     # Scheduled tasks (to implement)
├── services/                 # Business logic
└── types/                    # Shared types (job schema)

frontend/                     # Next.js app (to create)
```

## Naming Conventions

- **TypeScript/JS steps**: `kebab-case.step.ts`
- **Python steps**: `snake_case_step.py`
- **Event topics**: `kebab-case` (e.g., `fetch-jobs-trigger`)
- **State keys**: `groupId:key` pattern

## Key Patterns

### API Step → Event Flow
```typescript
// API Step emits event for background processing
await emit({ topic: 'fetch-jobs-trigger', data: { source: 'all' } })
```

### Event Chain
```
API Request → emit → Event Step → emit → Event Step → State Update
```

### State Management
```typescript
// Store
await state.set('jobs', jobId, jobData)

// Retrieve
const job = await state.get<Job>('jobs', jobId)
```

## Critical Rules

- **ALWAYS** run `npx motia generate-types` after config changes
- **ALWAYS** list emits in config before using in handler
- **NEVER** use API steps for long-running tasks (use Event steps)
- **ALWAYS** follow naming conventions for step files
- **ALWAYS** read the relevant `.cursor/rules/` guide first

## Data Sources (Free APIs)

| Source | Endpoint | Auth |
|--------|----------|------|
| Arbeitnow | `api.arbeitnow.com/api/v2/jobs` | None |
| HackerNews | `hacker-news.firebaseio.com/v0/` | None |
| Reddit | PRAW library | Free app |

## Normalized Job Schema

```typescript
interface Job {
  id: string
  title: string
  company: string
  location?: string
  remote: boolean
  url: string
  description: string
  source: 'arbeitnow' | 'hackernews' | 'reddit'
  postedAt: string
  fetchedAt: string
  tags: string[]
  healthScore: number  // 0-100 freshness score
}
```

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/plan` | Create detailed implementation plan |
| `/save` | Save documentation to appropriate folder |
| `/deep-work` | Start focused implementation session |

---

**Reference**: Full hackathon plan at `docs/plans/FEATURE_JOB_AGGREGATOR_HACKATHON.md`
