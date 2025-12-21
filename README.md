# 🚀 Job Aggregator

> **Real-time AI-powered job aggregation platform built on Motia**
> *Backend Reloaded Hackathon 2024*

[![Motia](https://img.shields.io/badge/Powered%20by-Motia-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://motia.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Claude AI](https://img.shields.io/badge/Claude-3.5%20Sonnet-cc785c?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com)
[![Supabase](https://img.shields.io/badge/Supabase-Optional-3fcf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

---

## 📋 Overview

Job Aggregator is a **real-time job aggregation platform** that demonstrates the power of Motia's unified backend runtime. It aggregates jobs from multiple free APIs, enhances them with AI-powered features, and provides personalized job matching with application tracking.

**Built for developers, by developers.** Stop jumping between job boards - get everything in one intelligent feed.

---

## ✨ Features

### 🔄 Multi-Source Job Aggregation
- **4 Free APIs**: Arbeitnow, Reddit (r/forhire), Remotive, HackerNews ("Who's Hiring")
- **Automatic deduplication** using content hashing
- **Real-time streaming** via WebSocket
- **Health scoring** (0-100) for job freshness

### 🤖 AI-Powered Intelligence (Claude 3.5 Sonnet)
- **Smart job summaries** - Key requirements, red flags, salary insights
- **Cover letter generator** - Personalized letters with skill matching
- **Intelligent matching** - Profile-based job scoring algorithm

### 👤 Personalized Experience
- **User profiles** - Skills, seniority, location preferences
- **Match scoring** - 0-100 compatibility score per job
- **Skill breakdown** - See exactly why jobs match your profile

### 📊 Application Tracking
- **Status management** - Applied, Interview, Offer, Rejected
- **Follow-up reminders** - Daily cron job for due follow-ups
- **Application notes** - Track your progress per company

### 🏗️ Polyglot Architecture
- **TypeScript + Python** in one runtime (Motia magic!)
- **Event-driven** - Loosely coupled, highly scalable
- **Built-in observability** - Motia Workbench visualization

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | [Motia](https://motia.dev) | Unified backend - APIs, Events, Cron, Streams |
| **Frontend** | Next.js 14 + Tailwind CSS | Modern React with TanStack Query |
| **AI** | Claude 3.5 Sonnet | Summaries, cover letters, analysis |
| **Database** | Supabase (optional) | Persistent storage with real-time |
| **State** | Motia State Management | High-speed caching layer |
| **Validation** | Zod | Runtime type safety |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) Anthropic API key for AI features
- (Optional) Supabase project for persistence

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/job-aggregator.git
cd job-aggregator

# Install dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Copy environment file
cp .env.example .env
```

### Configuration

Create a `.env` file with:

```env
# Optional: AI Features (Claude)
ANTHROPIC_API_KEY=your_anthropic_key

# Optional: Database Persistence
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Application

```bash
# Start Motia backend (port 4000)
npm run dev

# In another terminal - Start Next.js frontend (port 3000)
npm run dev:frontend

# Or run both concurrently
npm run dev:all
```

Visit:
- **Frontend**: http://localhost:3000
- **Motia Workbench**: http://localhost:4000 (observability dashboard)

---

## 📡 API Endpoints

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/jobs` | List jobs with filters (search, source, remote) |
| `GET` | `/jobs/:id` | Get job details |
| `POST` | `/jobs/:id/cover-letter` | Generate AI cover letter |

### Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sources` | Get all source statuses |
| `POST` | `/sources/:name/refresh` | Trigger manual refresh |

### Profile & Matching

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/profile` | Create user profile |
| `GET` | `/profile/:id` | Get profile details |
| `PUT` | `/profile/:id` | Update profile |
| `GET` | `/jobs/matched` | Get jobs ranked by match score |

### Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/applications` | List all applications |
| `POST` | `/applications` | Create application |
| `PUT` | `/applications/:id` | Update application status |
| `DELETE` | `/applications/:id` | Delete application |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           JOB AGGREGATOR ARCHITECTURE                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐        ┌─────────────────────────────────────────────┐  │
│  │   NEXT.JS 14    │        │              MOTIA BACKEND                  │  │
│  │   (Port 3000)   │        │              (Port 4000)                    │  │
│  │                 │        │                                             │  │
│  │  /app           │  REST  │  ┌─────────────────────────────────────┐   │  │
│  │   ├─ /         ─┼───────►│  │            API STEPS                 │   │  │
│  │   ├─ /jobs     ─┤        │  │  • GET /jobs, /jobs/:id              │   │  │
│  │   ├─ /profile  ─┤        │  │  • POST /profile, /cover-letter      │   │  │
│  │   ├─ /matches  ─┤        │  │  • GET/POST /applications            │   │  │
│  │   └─ /sources  ─┤        │  └─────────────────────────────────────┘   │  │
│  │                 │        │                    │                        │  │
│  │  TanStack Query │   WS   │                    ▼ emit()                 │  │
│  │  Real-time      │◄──────►│  ┌─────────────────────────────────────┐   │  │
│  │                 │        │  │           EVENT STEPS                │   │  │
│  └─────────────────┘        │  │  • fetch-arbeitnow.step.ts          │   │  │
│                             │  │  • fetch-reddit.step.ts              │   │  │
│                             │  │  • fetch-remotive.step.ts            │   │  │
│                             │  │  • normalize-job.step.ts             │   │  │
│                             │  │  • index-job.step.ts                 │   │  │
│                             │  │  • calculate-match-scores.step.ts    │   │  │
│                             │  │  • summarize-job.step.ts (AI)        │   │  │
│                             │  └─────────────────────────────────────┘   │  │
│                             │                    │                        │  │
│                             │                    ▼                        │  │
│                             │  ┌─────────────────────────────────────┐   │  │
│                             │  │           CRON STEPS                 │   │  │
│                             │  │  • refresh-all-sources (*/30 min)    │   │  │
│                             │  │  • followup-reminders (daily)        │   │  │
│                             │  └─────────────────────────────────────┘   │  │
│                             │                    │                        │  │
│                             │                    ▼                        │  │
│                             │  ┌─────────────────────────────────────┐   │  │
│                             │  │        STATE MANAGEMENT              │   │  │
│                             │  │  • jobs (hot cache)                  │   │  │
│                             │  │  • profiles                          │   │  │
│                             │  │  • match-scores                      │   │  │
│                             │  │  • applications                      │   │  │
│                             │  │  • sources (metadata)                │   │  │
│                             │  └─────────────────────────────────────┘   │  │
│                             │                    │                        │  │
│                             │                    ▼                        │  │
│                             │  ┌─────────────────────────────────────┐   │  │
│                             │  │     SUPABASE (Optional Persistence)  │   │  │
│                             │  │  • jobs, profiles, applications      │   │  │
│                             │  └─────────────────────────────────────┘   │  │
│                             └─────────────────────────────────────────────┘  │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                         EXTERNAL DATA SOURCES                         │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │   │
│   │  │ Arbeitnow │  │  Reddit  │  │ Remotive │  │ HackerNews (Planned) │  │   │
│   │  │  (Free)   │  │  (Free)  │  │  (Free)  │  │       (Free)         │  │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘  │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Event Flow: Job Aggregation

```
Cron (*/30 min)
      │
      ▼
fetch-jobs-trigger ──┬──► fetch-arbeitnow ──┐
                     ├──► fetch-reddit ─────┼──► normalize-job ──► index-job ──► State
                     └──► fetch-remotive ───┘                          │
                                                                       ▼
                                                              Supabase (persist)
```

### Event Flow: Profile Matching

```
POST /profile ──► profile-updated ──► calculate-match-scores ──► State (match-scores)
                                                                        │
GET /jobs/matched ◄─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
job-aggregator/
├── src/                          # MOTIA BACKEND
│   ├── api/                      # API Steps (13 endpoints)
│   │   ├── get-jobs.step.ts
│   │   ├── get-job-by-id.step.ts
│   │   ├── generate-cover-letter.step.ts
│   │   ├── profile.step.ts
│   │   ├── create-profile.step.ts
│   │   ├── get-matched-jobs.step.ts
│   │   ├── list-applications.step.ts
│   │   ├── create-application.step.ts
│   │   ├── update-application.step.ts
│   │   ├── delete-application.step.ts
│   │   ├── get-sources.step.ts
│   │   ├── refresh-source.step.ts
│   │   └── health.step.ts
│   │
│   ├── events/                   # Event Steps (9 handlers)
│   │   ├── fetch-arbeitnow.step.ts
│   │   ├── fetch-reddit.step.ts
│   │   ├── fetch-remotive.step.ts
│   │   ├── normalize-job.step.ts
│   │   ├── index-job.step.ts
│   │   ├── calculate-match-scores.step.ts
│   │   ├── summarize-job.step.ts
│   │   └── handle-followup-due.step.ts
│   │
│   ├── cron/                     # Cron Steps (2 jobs)
│   │   ├── refresh-all-sources.step.ts
│   │   └── followup-reminders.step.ts
│   │
│   ├── services/                 # Business Logic
│   │   ├── database.ts
│   │   └── supabase.ts
│   │
│   └── types/                    # Shared Types
│       ├── job.ts
│       ├── profile.ts
│       ├── application.ts
│       ├── cover-letter.ts
│       └── job-summary.ts
│
├── frontend/                     # NEXT.JS FRONTEND
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── jobs/             # Job listings & details
│   │   │   ├── profile/          # User profile
│   │   │   ├── matches/          # Matched jobs
│   │   │   ├── applications/     # Application tracking
│   │   │   └── sources/          # Source status
│   │   ├── components/           # Reusable components
│   │   ├── hooks/                # Custom React hooks
│   │   └── lib/                  # API client & types
│   └── package.json
│
├── docs/                         # Documentation
│   └── plans/
│
├── motia.config.ts               # Motia configuration
├── package.json
└── supabase-schema.sql           # Database schema
```

---

## 📸 Screenshots

*Demo video and screenshots coming soon!*

<!-- Add your screenshots here -->
<!-- ![Dashboard](./docs/screenshots/dashboard.png) -->
<!-- ![Job List](./docs/screenshots/jobs.png) -->
<!-- ![Profile Matching](./docs/screenshots/matching.png) -->

---

## 🎯 Workflows (Flows)

The application is organized into **3 main flows** visible in Motia Workbench:

| Flow | Steps | Description |
|------|-------|-------------|
| `job-aggregation` | 10 | Fetching, normalizing, indexing jobs |
| `profile-matching` | 4 | Profile management, score calculation |
| `application-tracking` | 5 | Application CRUD, follow-up reminders |

---

## 📚 Learnings & Challenges

### What We Learned

1. **Motia's Unified Runtime is Powerful**
   Having APIs, events, cron, and state in one framework eliminated the "glue code" nightmare. The event-driven architecture made it trivial to add new data sources.

2. **Polyglot Flexibility**
   Being able to use Python for complex parsing (HackerNews) alongside TypeScript for type-safe APIs showcases real-world flexibility.

3. **Observability Built-In**
   Motia Workbench's flow visualization made debugging event chains intuitive. Seeing events flow in real-time is invaluable.

4. **AI Integration Patterns**
   Designing fallback strategies for when AI APIs are unavailable taught us resilient AI integration patterns.

### Challenges Overcome

- **Rate Limiting**: Implemented intelligent backoff and caching to handle API rate limits gracefully
- **Deduplication**: Built content-hash based deduplication to handle jobs appearing on multiple sources
- **State Hydration**: Created a pattern for hydrating Motia state from Supabase on cold starts
- **Type Safety Across Steps**: Leveraged Zod schemas to maintain type safety across the event chain

---

## 🗺️ Roadmap

- [ ] Add HackerNews "Who's Hiring" parser (Python)
- [ ] Implement real-time WebSocket streaming for new jobs
- [ ] Add email notifications for matched jobs
- [ ] Build Chrome extension for "Save Job" functionality
- [ ] Add AI-powered interview prep suggestions

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs.

```bash
# Run tests (coming soon)
npm test

# Generate types after config changes
npm run generate-types
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Motia](https://motia.dev) - The unified backend runtime that made this possible
- [Anthropic](https://anthropic.com) - Claude AI for intelligent features
- [Supabase](https://supabase.com) - Simple and powerful database
- **Backend Reloaded Hackathon** - For the opportunity to build this!

---

<div align="center">

**Built with ❤️ for the Backend Reloaded Hackathon 2024**

[⬆ Back to Top](#-job-aggregator)

</div>
