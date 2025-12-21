# Job Aggregator

> **Real-time AI-powered job aggregation platform built on Motia**
>
> *Backend Reloaded Hackathon 2024*

[![Motia](https://img.shields.io/badge/Powered%20by-Motia-6366f1?style=for-the-badge)](https://motia.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776ab?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Claude AI](https://img.shields.io/badge/Claude-3.5%20Sonnet-cc785c?style=for-the-badge)](https://anthropic.com)

---

## Live Demo

**Backend API**: `https://your-app.railway.app`

```bash
# Quick test - get all jobs
curl https://your-app.railway.app/jobs | jq

# Health check
curl https://your-app.railway.app/health
```

---

## What It Does

Job Aggregator solves a real developer problem: **too many job boards, not enough time**. It unifies jobs from 4 free APIs into one intelligent feed with AI-powered features.

### Core Features

| Feature | Description |
|---------|-------------|
| **Multi-Source Aggregation** | Arbeitnow, Reddit, Remotive, HackerNews |
| **Smart Deduplication** | Content-hash based - same job from multiple sources appears once |
| **AI Summaries** | Claude extracts key requirements, red flags, salary hints |
| **Profile Matching** | Create a profile, get jobs ranked by compatibility (0-100) |
| **Cover Letter Generator** | AI-powered personalized cover letters |
| **Application Tracking** | Track status, notes, follow-up reminders |
| **Polyglot Runtime** | TypeScript + Python in one Motia project |

---

## API Reference

All endpoints return JSON. Base URL: `https://your-app.railway.app`

### Health Check

```bash
curl https://your-app.railway.app/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-20T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### Jobs API

#### List Jobs

```bash
# Get all jobs (default: 50)
curl https://your-app.railway.app/jobs

# With filters
curl "https://your-app.railway.app/jobs?source=arbeitnow&remote=true&limit=10"

# Search
curl "https://your-app.railway.app/jobs?search=react"
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search in title, company, description |
| `source` | string | Filter by source: `arbeitnow`, `hackernews`, `reddit`, `remotive` |
| `remote` | boolean | `true` for remote jobs only |
| `limit` | number | Results per page (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**
```json
{
  "jobs": [
    {
      "id": "arbeitnow_12345",
      "title": "Senior React Developer",
      "company": "TechCorp",
      "location": "Berlin, Germany",
      "remote": true,
      "url": "https://arbeitnow.com/jobs/12345",
      "description": "We're looking for a senior React developer...",
      "source": "arbeitnow",
      "postedAt": "2024-12-19T08:00:00.000Z",
      "fetchedAt": "2024-12-20T10:00:00.000Z",
      "tags": ["react", "typescript", "remote"],
      "healthScore": 95
    }
  ],
  "total": 150,
  "sources": ["arbeitnow", "remotive", "reddit"],
  "lastUpdated": "2024-12-20T10:30:00.000Z"
}
```

#### Get Single Job

```bash
curl https://your-app.railway.app/jobs/arbeitnow_12345
```

---

### Sources API

#### List Source Status

```bash
curl https://your-app.railway.app/sources
```

**Response:**
```json
{
  "sources": [
    {
      "name": "arbeitnow",
      "status": "success",
      "lastFetch": "2024-12-20T10:00:00.000Z",
      "jobCount": 85,
      "error": null
    },
    {
      "name": "remotive",
      "status": "success",
      "lastFetch": "2024-12-20T10:00:00.000Z",
      "jobCount": 42,
      "error": null
    }
  ]
}
```

#### Trigger Manual Refresh

```bash
# Refresh specific source
curl -X POST https://your-app.railway.app/sources/arbeitnow/refresh

# Refresh ALL sources
curl -X POST https://your-app.railway.app/sources/all/refresh
```

**Response:**
```json
{
  "message": "Refresh initiated",
  "source": "arbeitnow"
}
```

---

### Profile API

#### Create Profile

```bash
curl -X POST https://your-app.railway.app/profile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Developer",
    "title": "Full Stack Engineer",
    "skills": ["typescript", "react", "node.js", "python"],
    "experienceYears": 5,
    "seniorityLevel": "senior",
    "remotePreference": "remote-only",
    "preferredLocations": ["Berlin", "Remote"]
  }'
```

**Response:**
```json
{
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Jane Developer",
    "skills": ["typescript", "react", "node.js", "python"],
    "seniorityLevel": "senior",
    "createdAt": "2024-12-20T10:30:00.000Z"
  },
  "created": true
}
```

#### Get Matched Jobs

```bash
curl "https://your-app.railway.app/profile/550e8400-e29b-41d4/matches?limit=10"
```

**Response:**
```json
{
  "matches": [
    {
      "job": { "id": "arbeitnow_12345", "title": "Senior React Developer", ... },
      "score": 92,
      "matchedSkills": ["react", "typescript"],
      "reasons": ["5+ years experience matches senior role", "Remote position matches preference"]
    }
  ],
  "profileId": "550e8400-e29b-41d4",
  "total": 45
}
```

---

### Cover Letter API

#### Generate AI Cover Letter

```bash
curl -X POST https://your-app.railway.app/jobs/arbeitnow_12345/cover-letter \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "550e8400-e29b-41d4",
    "tone": "professional",
    "emphasis": ["typescript expertise", "remote work experience"]
  }'
```

**Response:**
```json
{
  "coverLetter": "Dear Hiring Manager,\n\nI am excited to apply for the Senior React Developer position...",
  "jobId": "arbeitnow_12345",
  "profileId": "550e8400-e29b-41d4",
  "generatedAt": "2024-12-20T10:35:00.000Z"
}
```

---

### Applications API

#### Create Application

```bash
curl -X POST https://your-app.railway.app/applications \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "arbeitnow_12345",
    "profileId": "550e8400-e29b-41d4",
    "status": "applied",
    "notes": "Applied via company website"
  }'
```

#### List Applications

```bash
# All applications
curl https://your-app.railway.app/applications

# Filter by status
curl "https://your-app.railway.app/applications?status=interviewing"
```

#### Update Application

```bash
curl -X PUT https://your-app.railway.app/applications/app_123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "interviewing",
    "notes": "Phone screen scheduled for Monday",
    "followUpDate": "2024-12-23"
  }'
```

---

## Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    MOTIA BACKEND                         │
                    │                    (Port 4000)                           │
                    ├─────────────────────────────────────────────────────────┤
                    │                                                          │
   HTTP Request ───►│  ┌─────────────────────────────────────────────────┐    │
                    │  │               API STEPS (14)                     │    │
                    │  │  GET  /jobs              POST /profile           │    │
                    │  │  GET  /jobs/:id          GET  /profile/:id       │    │
                    │  │  GET  /sources           POST /cover-letter      │    │
                    │  │  POST /sources/refresh   CRUD /applications      │    │
                    │  └──────────────────────┬──────────────────────────┘    │
                    │                         │                                │
                    │                    emit()                                │
                    │                         ▼                                │
                    │  ┌─────────────────────────────────────────────────┐    │
                    │  │             EVENT STEPS (9)                      │    │
                    │  │  TypeScript:                Python:              │    │
                    │  │  • fetch-arbeitnow         • fetch_hackernews    │    │
                    │  │  • fetch-reddit                                  │    │
                    │  │  • fetch-remotive                                │    │
                    │  │  • normalize-job                                 │    │
                    │  │  • index-job                                     │    │
                    │  │  • calculate-match-scores                        │    │
                    │  │  • summarize-job (AI)                            │    │
                    │  └──────────────────────┬──────────────────────────┘    │
                    │                         │                                │
                    │                         ▼                                │
                    │  ┌─────────────────────────────────────────────────┐    │
                    │  │             CRON STEPS (2)                       │    │
                    │  │  • refresh-all-sources    (every 30 min)        │    │
                    │  │  • followup-reminders     (daily at 9am)        │    │
                    │  └──────────────────────┬──────────────────────────┘    │
                    │                         │                                │
                    │                         ▼                                │
                    │  ┌─────────────────────────────────────────────────┐    │
                    │  │           MOTIA STATE + SUPABASE                 │    │
                    │  │  In-memory cache ◄──► PostgreSQL persistence    │    │
                    │  └─────────────────────────────────────────────────┘    │
                    │                                                          │
                    └─────────────────────────────────────────────────────────┘
                                              ▲
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
              │                               │                               │
      ┌───────┴───────┐               ┌───────┴───────┐               ┌───────┴───────┐
      │   Arbeitnow   │               │    Reddit     │               │   Remotive    │
      │  (Free API)   │               │  (Free API)   │               │  (Free API)   │
      └───────────────┘               └───────────────┘               └───────────────┘
```

### Event Flow: Job Aggregation

```
Cron (*/30 min) OR POST /sources/all/refresh
                    │
                    ▼
        ┌─── fetch-jobs-trigger ───┐
        │           │              │
        ▼           ▼              ▼
  fetch-arbeitnow  fetch-reddit  fetch-remotive
        │           │              │
        └───────────┼──────────────┘
                    ▼
             normalize-job  ──► Content hash deduplication
                    │
                    ▼
               index-job    ──► Motia State + Supabase
                    │
                    ▼
            summarize-job   ──► Claude AI (optional)
```

---

## Deploy to Railway (Backend Only)

### Prerequisites

1. [Railway account](https://railway.app) (free tier: $5/month credit)
2. GitHub repository with this code
3. Supabase project for database (free tier works)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"**
3. Select your repository
4. Railway auto-detects the Dockerfile

### Step 3: Configure Environment Variables

In Railway dashboard → your service → **Variables** tab:

| Variable | Required | Value |
|----------|----------|-------|
| `DATABASE_URL` | Yes | `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres` |
| `ANTHROPIC_API_KEY` | No | `sk-ant-...` (for AI features) |

> Get `DATABASE_URL` from Supabase: Project Settings → Database → Connection String (URI)

### Step 4: Generate Public URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Your API is now live at: `https://your-project.railway.app`

### Step 5: Initialize Database

Run the schema in Supabase SQL Editor:

```sql
-- Copy contents of supabase-schema.sql
-- Run in: https://supabase.com/dashboard/project/_/sql
```

### Step 6: Verify Deployment

```bash
# Health check
curl https://your-project.railway.app/health

# Trigger initial job fetch
curl -X POST https://your-project.railway.app/sources/all/refresh

# Wait 30 seconds, then get jobs
curl https://your-project.railway.app/jobs | jq '.total'
```

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your DATABASE_URL

# Start Motia backend
npm run dev

# Backend runs at http://localhost:4000
# Motia Workbench (observability UI) at http://localhost:4000
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Runtime** | [Motia](https://motia.dev) | Unified APIs, Events, Cron, State in one framework |
| **Languages** | TypeScript + Python | Polyglot support - best tool for each job |
| **AI** | Claude 3.5 Sonnet | Summaries, cover letters, analysis |
| **Database** | Supabase PostgreSQL | Free tier, real-time, great DX |
| **Validation** | Zod | Runtime type safety across event chains |

---

## Project Structure

```
src/
├── api/                    # 14 API Steps
│   ├── get-jobs.step.ts
│   ├── get-job-by-id.step.ts
│   ├── get-sources.step.ts
│   ├── refresh-source.step.ts
│   ├── health.step.ts
│   ├── profile.step.ts
│   ├── create-profile.step.ts
│   ├── get-matched-jobs.step.ts
│   ├── generate-cover-letter.step.ts
│   ├── list-applications.step.ts
│   ├── get-application.step.ts
│   ├── create-application.step.ts
│   ├── update-application.step.ts
│   └── delete-application.step.ts
│
├── events/                 # 9 Event Steps
│   ├── fetch-arbeitnow.step.ts
│   ├── fetch-reddit.step.ts
│   ├── fetch-remotive.step.ts
│   ├── fetch_hackernews_step.py   # Python!
│   ├── normalize-job.step.ts
│   ├── index-job.step.ts
│   ├── calculate-match-scores.step.ts
│   ├── summarize-job.step.ts
│   └── handle-followup-due.step.ts
│
├── cron/                   # 2 Cron Steps
│   ├── refresh-all-sources.step.ts
│   └── followup-reminders.step.ts
│
├── services/               # Business Logic
│   ├── database.ts
│   └── supabase.ts
│
└── types/                  # Shared Types
    ├── job.ts
    ├── profile.ts
    └── application.ts
```

---

## What I Learned

### Motia's Unified Runtime
Having APIs, background jobs, cron, and state in one framework eliminated the integration complexity. Adding a new data source is just one new event step.

### Polyglot Power
Python for parsing HackerNews HTML, TypeScript for type-safe APIs. Motia handles the inter-process communication transparently.

### Built-in Observability
Motia Workbench shows event flows in real-time. Debugging distributed events became visual instead of log-diving.

### AI Integration Patterns
Designed with graceful degradation - the app works without AI keys, just skips summarization.

---

## License

MIT

---

**Built for the Backend Reloaded Hackathon 2024**

[Motia](https://motia.dev) | [Anthropic](https://anthropic.com) | [Supabase](https://supabase.com)
