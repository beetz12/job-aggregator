# Python Scraper API Migration - Implementation Plan

**Date**: 2026-01-02
**Author**: Claude AI (Multi-Agent Analysis)
**Status**: Ready for Implementation
**Type**: Migration
**Confidence**: 95%

---

## Executive Summary

### Critical Discovery

**The job aggregator backend is ALREADY configured to call the external Python Scraper API.** The legacy scraper files in `src/services/scrapers/` are **orphaned code** that is not being executed in the current pipeline.

### Current State

| Component | Status | Evidence |
|-----------|--------|----------|
| `fetch-from-scraper.step.ts` | ✅ Calls Python API | Uses `scraperClient.scrapeJobs()` exclusively |
| `scraper-client.ts` | ✅ HTTP Client Ready | POST to `/api/jobs/scrape` endpoint |
| Legacy Scrapers | ⚠️ Orphaned | Not imported or called (except googlejobs utilities) |
| SCRAPER_API_URL | ⚠️ Wrong Port | Default is `:8000`, Python scraper runs on `:8002` |

### What Actually Needs to Change

1. **Update default port** from `8000` to `8002` (1 line change)
2. **Add deprecation notices** to legacy scraper files (documentation)
3. **Optionally** remove googlejobs utility imports from normalize-job.step.ts

---

## Architecture Analysis

### Current Data Flow (Already Using Python API)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER MECHANISMS                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Cron Job (Every 30 min)                                     │
│     └── refresh-all-sources.step.ts                             │
│         └── Emits 'fetch-jobs-trigger' for each source          │
│                                                                  │
│  2. Manual API (POST /sources/:name/refresh)                    │
│     └── refresh-source.step.ts                                  │
│         └── Emits 'fetch-jobs-trigger'                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              fetch-from-scraper.step.ts                         │
│  (Subscribes to: 'fetch-jobs-trigger')                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Get circuit breaker for source                              │
│  2. Call scraperClient.scrapeJobs(source, params, limit)        │
│     │                                                            │
│     └── HTTP POST to Python Scraper API ◄─── ALREADY HAPPENING  │
│         URL: http://localhost:8000/api/jobs/scrape              │
│                                                                  │
│  3. On success: batch emit 'normalize-job' events               │
│  4. On failure: update source status to 'error'                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              normalize-job.step.ts                              │
│  (Subscribes to: 'normalize-job')                               │
├─────────────────────────────────────────────────────────────────┤
│  IF rawJob.source_id exists (Python API format):                │
│     └── normalizeScraperApiJob() ◄─── Handles all new jobs      │
│                                                                  │
│  ELSE (legacy format fallback):                                 │
│     └── Source-specific handlers (arbeitnow, hackernews, etc.)  │
│                                                                  │
│  Emits: 'index-job' event                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    index-job.step.ts                            │
│  (Stores in DB + Motia State + Streams)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Legacy Scrapers - Usage Analysis

| File | Imports | Function Calls | Status |
|------|---------|----------------|--------|
| `googlejobs-scraper.ts` | 1 (normalize-job.step.ts) | 3 utility functions | Partially used |
| `wellfound-scraper.ts` | 0 | 0 | **Completely orphaned** |
| `jobicy-scraper.ts` | 0 | 0 | **Completely orphaned** |
| `weworkremotely-scraper.ts` | 0 | 0 | **Completely orphaned** |

**Note**: The utility functions from `googlejobs-scraper.ts` (`parsePostedAt`, `extractTags`, `isRemoteJob`) are only used for legacy Google Jobs format handling, which is inactive (`isActive: false` in sources.ts).

---

## Implementation Plan

### Phase 1: Environment Configuration (Required)

**Goal**: Point the backend to the correct Python Scraper API port

#### Step 1.1: Update Default Port in scraper-client.ts

**File**: `apps/backend/src/services/scraper-client.ts`
**Line**: 106

```typescript
// BEFORE:
const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:8000'

// AFTER:
const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:8002'
```

#### Step 1.2: Update Environment Files

**File**: `apps/backend/.env`
```bash
# Add or update:
SCRAPER_API_URL=http://localhost:8002
```

**File**: `apps/backend/.env.example`
```bash
# Add or update:
SCRAPER_API_URL=http://localhost:8002
```

---

### Phase 2: Add Deprecation Notices (Documentation)

**Goal**: Mark legacy scraper files as deprecated while preserving them

#### Step 2.1: googlejobs-scraper.ts

Add at the top of the file:
```typescript
/**
 * @deprecated This scraper is deprecated in favor of the Python Scraper API.
 *
 * DEPRECATION NOTICE:
 * ===================
 * This file contains legacy Google Jobs scraping logic that used the SerpAPI.
 * As of 2026-01-02, all job scraping is handled by the external Python Scraper API
 * located at /Users/dave/Work/python-scraper
 *
 * The utility functions (parsePostedAt, extractTags, isRemoteJob) are still
 * imported by normalize-job.step.ts for backward compatibility with legacy
 * data formats, but new jobs use the Python API format exclusively.
 *
 * Migration Path:
 * - New jobs: Automatically handled by normalizeScraperApiJob()
 * - Legacy data: Continue using these utilities until data is migrated
 *
 * DO NOT add new functionality to this file.
 *
 * @see /Users/dave/Work/python-scraper for the new scraper implementation
 * @see docs/plans/MIGRATION_PYTHON_SCRAPER_INTEGRATION.md for migration details
 */
```

#### Step 2.2: wellfound-scraper.ts

Add at the top of the file:
```typescript
/**
 * @deprecated This scraper is deprecated and NOT IN USE.
 *
 * DEPRECATION NOTICE:
 * ===================
 * This file contains legacy Wellfound (AngelList) scraping logic.
 * As of 2026-01-02, this code is COMPLETELY ORPHANED and not called anywhere.
 *
 * All job scraping is now handled by the external Python Scraper API
 * located at /Users/dave/Work/python-scraper
 *
 * The Python scraper handles Wellfound via Firecrawl with better anti-detection.
 *
 * This file is preserved for reference only and can be safely deleted.
 *
 * @see /Users/dave/Work/python-scraper for the new scraper implementation
 * @see docs/plans/MIGRATION_PYTHON_SCRAPER_INTEGRATION.md for migration details
 */
```

#### Step 2.3: jobicy-scraper.ts

Add at the top of the file:
```typescript
/**
 * @deprecated This scraper is deprecated and NOT IN USE.
 *
 * DEPRECATION NOTICE:
 * ===================
 * This file contains legacy Jobicy API scraping logic.
 * As of 2026-01-02, this code is COMPLETELY ORPHANED and not called anywhere.
 *
 * All job scraping is now handled by the external Python Scraper API
 * located at /Users/dave/Work/python-scraper
 *
 * The Python scraper handles Jobicy via Playwright with stealth mode.
 *
 * This file is preserved for reference only and can be safely deleted.
 *
 * @see /Users/dave/Work/python-scraper for the new scraper implementation
 * @see docs/plans/MIGRATION_PYTHON_SCRAPER_INTEGRATION.md for migration details
 */
```

#### Step 2.4: weworkremotely-scraper.ts

Add at the top of the file:
```typescript
/**
 * @deprecated This scraper is deprecated and NOT IN USE.
 *
 * DEPRECATION NOTICE:
 * ===================
 * This file contains legacy We Work Remotely RSS feed parsing logic.
 * As of 2026-01-02, this code is COMPLETELY ORPHANED and not called anywhere.
 *
 * All job scraping is now handled by the external Python Scraper API
 * located at /Users/dave/Work/python-scraper
 *
 * The Python scraper handles WeWorkRemotely via Playwright with stealth mode.
 *
 * This file is preserved for reference only and can be safely deleted.
 *
 * @see /Users/dave/Work/python-scraper for the new scraper implementation
 * @see docs/plans/MIGRATION_PYTHON_SCRAPER_INTEGRATION.md for migration details
 */
```

#### Step 2.5: proxy-rotator.ts (if exists)

Add at the top of the file:
```typescript
/**
 * @deprecated Proxy rotation is now handled by the Python Scraper API.
 *
 * DEPRECATION NOTICE:
 * ===================
 * This file contains legacy proxy rotation logic for datacenter proxies.
 * As of 2026-01-02, proxy management is handled by the Python Scraper API
 * which uses Bright Data residential proxies configured in its own .env.
 *
 * This file is preserved for reference only and can be safely deleted.
 *
 * @see /Users/dave/Work/python-scraper for proxy configuration
 */
```

---

### Phase 3: Operational Setup (Required)

**Goal**: Ensure Python Scraper API is running before backend starts

#### Step 3.1: Python Scraper Startup

Before starting the job aggregator backend, ensure the Python scraper is running:

```bash
# Terminal 1: Start Python Scraper API
cd /Users/dave/Work/python-scraper/apps/api
uvicorn app.main:app --reload --port 8002

# Verify it's running:
curl http://localhost:8002/api/jobs/health
```

#### Step 3.2: Backend Startup

```bash
# Terminal 2: Start Job Aggregator Backend
cd /Users/dave/Work/job-aggregator
npm run dev:backend
```

#### Step 3.3: Verify Integration

```bash
# Trigger a manual refresh
curl -X POST http://localhost:4001/sources/arbeitnow/refresh

# Check logs for:
# "[ScraperClient] Successfully scraped X jobs from arbeitnow"
```

---

## Files Summary

### Files to MODIFY

| File | Change | Lines |
|------|--------|-------|
| `src/services/scraper-client.ts` | Update default port 8000 → 8002 | 1 |
| `apps/backend/.env` | Add SCRAPER_API_URL | 1 |
| `apps/backend/.env.example` | Add SCRAPER_API_URL | 1 |
| `src/services/scrapers/googlejobs-scraper.ts` | Add deprecation notice | ~20 |
| `src/services/scrapers/wellfound-scraper.ts` | Add deprecation notice | ~15 |
| `src/services/scrapers/jobicy-scraper.ts` | Add deprecation notice | ~15 |
| `src/services/scrapers/weworkremotely-scraper.ts` | Add deprecation notice | ~15 |

### Files to KEEP UNCHANGED

| File | Reason |
|------|--------|
| `src/events/fetch-from-scraper.step.ts` | Already calls Python API correctly |
| `src/events/normalize-job.step.ts` | Already handles both formats |
| `src/events/index-job.step.ts` | No changes needed |
| `src/cron/refresh-all-sources.step.ts` | No changes needed |
| `src/services/sources.ts` | Source list is correct |

### Files NOT to DELETE (Per User Request)

| File | Status |
|------|--------|
| `src/services/scrapers/googlejobs-scraper.ts` | Keep with deprecation notice |
| `src/services/scrapers/wellfound-scraper.ts` | Keep with deprecation notice |
| `src/services/scrapers/jobicy-scraper.ts` | Keep with deprecation notice |
| `src/services/scrapers/weworkremotely-scraper.ts` | Keep with deprecation notice |

---

## Source Comparison: Job Aggregator vs Python Scraper

### Active Sources (Both Systems)

| Source | Job Aggregator | Python Scraper | Scraper Type |
|--------|---------------|----------------|--------------|
| arbeitnow | ✅ | ✅ | API |
| hackernews | ✅ | ✅ | API + Parser |
| remoteok | ✅ | ✅ | RSS |
| weworkremotely | ✅ | ✅ | Playwright |
| braintrust | ✅ | ✅ | Playwright |
| devitjobs | ✅ | ✅ | Playwright |
| jobicy | ✅ | ✅ | Playwright |
| dice | ✅ | ✅ | Firecrawl |
| builtin | ✅ | ✅ | Playwright |
| remotive | ✅ | ✅ | Playwright |
| wellfound | ✅ | ✅ | Firecrawl |

### New Sources (Python Scraper Only)

| Source | Python Scraper | Type | Action Needed |
|--------|---------------|------|---------------|
| yc_jobs | ✅ | API | Add to SCRAPER_SOURCES |
| themuse | ✅ | API | Add to SCRAPER_SOURCES |

### Legacy Sources (Job Aggregator Only)

| Source | Job Aggregator | Status | Action |
|--------|---------------|--------|--------|
| reddit | ⚠️ Inactive | `isActive: false` | Can remove from sources |
| googlejobs | ⚠️ Inactive | `isActive: false` | Can remove from sources |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Python scraper not running | Medium | High | Add startup check / health endpoint |
| Port mismatch | Low | High | Update default in code + .env |
| Schema differences | Very Low | Medium | Already aligned, tested |
| Legacy format jobs | Very Low | Low | Handlers preserved for backward compat |

---

## Testing Checklist

- [ ] Python Scraper API running on port 8002
- [ ] `curl http://localhost:8002/api/jobs/health` returns healthy
- [ ] Backend starts without errors
- [ ] Manual refresh: `POST /sources/arbeitnow/refresh` succeeds
- [ ] Cron job triggers (check logs every 30 min)
- [ ] Jobs appear in database
- [ ] Jobs appear in API: `GET /jobs`

---

## Rollback Plan

If issues occur:

1. **Immediate**: Set `SCRAPER_API_URL=http://localhost:8000` in .env
2. **If Python API unavailable**: The circuit breaker will prevent cascading failures
3. **Data integrity**: Existing jobs in database are unaffected

---

## Future Cleanup (Optional, After Stabilization)

After the migration is stable (2+ weeks):

1. Remove legacy source handlers from `normalize-job.step.ts`
2. Delete orphaned scraper files (with deprecation notices)
3. Remove `reddit` and `googlejobs` from `LEGACY_SOURCES`
4. Add `yc_jobs` and `themuse` to `SCRAPER_SOURCES`

---

## Appendix A: Python Scraper API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/jobs/scrape` | Scrape jobs from a source |
| GET | `/api/jobs/sources` | List available sources |
| GET | `/api/jobs/health` | Health check |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |

### Request Format
```json
{
  "source": "arbeitnow",
  "params": {
    "posted_after": "2026-01-01T00:00:00Z"
  },
  "limit": 50
}
```

### Response Format
```json
{
  "success": true,
  "source": "arbeitnow",
  "count": 50,
  "jobs": [
    {
      "source_id": "arbeitnow_abc123",
      "title": "Senior Developer",
      "company": "TechCorp",
      "url": "https://...",
      "location_raw": "Remote, USA",
      "description_text": "...",
      "posted_at": "2026-01-01T10:30:00Z",
      "salary_raw": "$150,000 - $200,000",
      "salary_min": 150000,
      "salary_max": 200000,
      "remote": true,
      "tags": ["python", "django"]
    }
  ],
  "scraped_at": "2026-01-01T12:00:00Z",
  "scrape_duration_ms": 1234
}
```

---

## Appendix B: Deprecation Notice Template

```typescript
/**
 * @deprecated [Brief reason]
 *
 * DEPRECATION NOTICE:
 * ===================
 * [Detailed explanation of what this file did]
 * As of [DATE], [what replaced it]
 *
 * [Current status - orphaned/partially used/etc.]
 *
 * [Migration instructions if applicable]
 *
 * This file is preserved for [reason] and can be [safely deleted/kept for reference].
 *
 * @see [Link to new implementation]
 * @see [Link to migration docs]
 */
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-02
**Confidence Level**: 95%
