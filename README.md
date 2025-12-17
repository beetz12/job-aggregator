# Job Aggregator

A real-time job aggregation platform built with **Motia** - demonstrating unified backend runtime with APIs, background jobs, cron scheduling, state management, and real-time streaming.

**Built for the Backend Reloaded Hackathon**

## What It Does

Aggregates job listings from multiple free sources into a unified, searchable feed:

- **Arbeitnow** - 10K+ European tech jobs
- **HackerNews** - Monthly "Who's Hiring" threads
- **Reddit** - r/forhire, r/jobbit communities
- **Piloterr** - Indeed + Google Jobs aggregation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     JOB AGGREGATOR                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐            ┌────────────────────────────┐  │
│  │  NEXT.JS        │  REST API  │      MOTIA BACKEND         │  │
│  │  FRONTEND       │◄──────────►│      (Port 3000)           │  │
│  │  (Port 5173)    │            │                            │  │
│  │                 │  WebSocket │  API Steps                 │  │
│  │  /app           │◄──────────►│    GET /jobs               │  │
│  │    /page.tsx    │  (Streams) │    POST /sources/refresh   │  │
│  │    /jobs        │            │                            │  │
│  │    /sources     │            │  Event Steps               │  │
│  └─────────────────┘            │    fetch-arbeitnow (TS)    │  │
│                                 │    fetch-hackernews (Py)   │  │
│                                 │    normalize-job           │  │
│                                 │                            │  │
│                                 │  Cron Steps                │  │
│                                 │    refresh-all-sources     │  │
│                                 │                            │  │
│                                 │  State (job cache)         │  │
│                                 └────────────────────────────┘  │
│                                              │                   │
│                                              ▼                   │
│                                 ┌────────────────────────────┐  │
│                                 │      MOTIA WORKBENCH       │  │
│                                 │      (Observability)       │  │
│                                 └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Polyglot Architecture**: TypeScript + Python steps working together
- **Real-time Streaming**: Live job updates via WebSocket
- **Built-in Observability**: Visual workflow debugging in Motia Workbench
- **Production Patterns**: Type safety, validation, error handling

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (opens Workbench at http://localhost:3000)
npm run dev

# Test the hello endpoint
curl http://localhost:3000/hello
```

## Development Commands

```bash
npm run dev              # Start Motia dev server with hot reload
npm run start            # Start production server
npm run generate-types   # Regenerate TypeScript types from step configs
npm run build            # Build for deployment
npm run clean            # Remove build artifacts
```

## Project Structure

```
job-aggregator/
├── src/                          # Motia Backend
│   ├── hello/                    # Example workflow (starter)
│   │   ├── hello-api.step.ts     # TypeScript API endpoint
│   │   ├── process_greeting_step.py  # Python event processor
│   │   └── log-greeting.step.js  # JavaScript logger
│   ├── api/                      # API Steps (to implement)
│   ├── events/                   # Event Steps (to implement)
│   ├── cron/                     # Cron Steps (to implement)
│   ├── services/                 # Business logic
│   └── types/                    # Shared types
│
├── frontend/                     # Next.js Frontend (to create)
│
├── .cursor/rules/                # Motia development guides
│   └── motia/                    # Step patterns & examples
│
├── .claude/                      # Claude AI configuration
│   ├── agents/                   # Subagent definitions
│   └── commands/                 # Slash commands
│
├── docs/plans/                   # Implementation plans
├── motia.config.ts               # Motia configuration
├── types.d.ts                    # Auto-generated types
└── requirements.txt              # Python dependencies
```

## Step Types

| Type | Trigger | Use Case |
|------|---------|----------|
| `api` | HTTP request | REST APIs, webhooks |
| `event` | Event emitted | Background jobs, workflows |
| `cron` | Schedule | Scheduled tasks, cleanup |

## Current Workflow (Hello World Demo)

1. **TypeScript API Step** receives HTTP request at `/hello`
2. Emits `process-greeting` event
3. **Python Event Step** processes and stores in state
4. Emits `greeting-processed` event
5. **JavaScript Event Step** logs completion

## Implementation Plan

See `docs/plans/FEATURE_JOB_AGGREGATOR_HACKATHON.md` for the full implementation plan including:

- Backend API endpoints (GET /jobs, POST /sources/refresh)
- Event steps for each data source
- Cron jobs for scheduled refresh
- Next.js frontend components
- Demo strategy

## Free API Sources

| Source | Auth | Rate Limit | Coverage |
|--------|------|------------|----------|
| Arbeitnow | None | Unlimited | 10K+ European tech jobs |
| HackerNews | None | Unlimited | Monthly "Who's Hiring" |
| Reddit | Free app | 60 req/min | r/forhire, r/jobbit |
| Piloterr | 50 credits | Per credit | Indeed + Google Jobs |

## Learn More

- [Motia Documentation](https://motia.dev/docs)
- [Quick Start Guide](https://motia.dev/docs/getting-started/quick-start)
- [Core Concepts](https://motia.dev/docs/concepts/overview)
- [Discord Community](https://discord.gg/motia)

---

**Backend Reloaded Hackathon Entry** - Demonstrating Motia's unified backend runtime
