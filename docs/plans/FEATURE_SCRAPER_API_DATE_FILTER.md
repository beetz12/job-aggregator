# Scraper API Date Filter - Implementation Plan

**Date**: 2026-01-01
**Author**: Claude AI
**Status**: Draft
**Type**: Feature
**Project**: Python Job Scraper API (External)

---

## Overview

This plan documents the required changes to the **Python Job Scraper API** to support date filtering, allowing the Job Aggregator to request only jobs posted after a specific date.

**Purpose**: Avoid re-fetching jobs that have already been saved to the database, reducing API calls and improving performance.

---

## Current State

### Current Scraper API Request Schema

```json
{
  "source": "arbeitnow",
  "params": {},
  "limit": 100
}
```

### Current Scraper API Response Schema

```json
{
  "success": true,
  "source": "arbeitnow",
  "count": 50,
  "jobs": [
    {
      "source_id": "abc123",
      "title": "Software Engineer",
      "company": "Acme Corp",
      "url": "https://...",
      "posted_at": "2026-01-01T10:00:00Z",
      ...
    }
  ],
  "scraped_at": "2026-01-01T12:00:00Z",
  "scrape_duration_ms": 1500
}
```

---

## Required Changes

### 1. Add `posted_after` Parameter to Request Schema

**File to Modify**: Python Scraper API request validation

**New Request Schema**:
```json
{
  "source": "arbeitnow",
  "params": {
    "posted_after": "2026-01-01T00:00:00Z"
  },
  "limit": 100
}
```

**Parameter Details**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `posted_after` | ISO 8601 datetime string | No | Only return jobs posted after this timestamp |

### 2. Update Each Scraper to Support Date Filtering

Each scraper implementation needs to filter jobs by `posted_at` date:

#### API-based Sources (Easy)

| Source | API Support | Implementation |
|--------|-------------|----------------|
| Arbeitnow | Has date filter param | Pass to API query |
| RemoteOK | RSS feed has pubDate | Filter in response |

#### Scraper-based Sources (Medium)

| Source | Implementation |
|--------|----------------|
| HackerNews | Filter by item timestamp |
| We Work Remotely | Filter by parsed date |
| Braintrust | Filter by parsed date |
| DevITJobs | Filter by parsed date |
| Jobicy | Filter by parsed date |
| Dice | Filter by parsed date |
| Built In | Filter by parsed date |
| Remotive | Filter by parsed date |
| Wellfound | Filter by parsed date |

#### Implementation Pattern

```python
# scraper_base.py
from datetime import datetime
from typing import Optional, List
from models import RawJob

class BaseScraper:
    def scrape(
        self,
        limit: int = 100,
        posted_after: Optional[datetime] = None
    ) -> List[RawJob]:
        jobs = self._fetch_jobs(limit)

        if posted_after:
            jobs = [
                job for job in jobs
                if job.posted_at and job.posted_at > posted_after
            ]

        return jobs[:limit]
```

### 3. Update API Endpoint

**File to Modify**: Main API route handler

```python
# routes/jobs.py
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Dict, Any

class ScrapeRequest(BaseModel):
    source: str
    params: Optional[Dict[str, Any]] = {}
    limit: int = 100

@router.post("/api/jobs/scrape")
async def scrape_jobs(request: ScrapeRequest):
    # Extract posted_after from params
    posted_after = None
    if request.params and "posted_after" in request.params:
        posted_after = datetime.fromisoformat(
            request.params["posted_after"].replace("Z", "+00:00")
        )

    scraper = get_scraper(request.source)
    jobs = scraper.scrape(
        limit=request.limit,
        posted_after=posted_after
    )

    return {
        "success": True,
        "source": request.source,
        "count": len(jobs),
        "jobs": [job.dict() for job in jobs],
        "scraped_at": datetime.utcnow().isoformat() + "Z",
        "filters_applied": {
            "posted_after": request.params.get("posted_after")
        }
    }
```

### 4. Add Batch Endpoint (Optional Enhancement)

**New Endpoint**: `POST /api/jobs/scrape-batch`

```python
class BatchScrapeRequest(BaseModel):
    sources: List[str]
    params: Optional[Dict[str, Any]] = {}
    limit_per_source: int = 100

@router.post("/api/jobs/scrape-batch")
async def scrape_batch(request: BatchScrapeRequest):
    results = {}

    for source in request.sources:
        try:
            scraper = get_scraper(source)
            jobs = scraper.scrape(
                limit=request.limit_per_source,
                posted_after=parse_posted_after(request.params)
            )
            results[source] = {
                "success": True,
                "count": len(jobs),
                "jobs": [job.dict() for job in jobs]
            }
        except Exception as e:
            results[source] = {
                "success": False,
                "error": str(e)
            }

    return {
        "success": True,
        "results": results,
        "scraped_at": datetime.utcnow().isoformat() + "Z"
    }
```

---

## Job Aggregator Integration

### Update Scraper Client

**File**: `apps/backend/src/services/scraper-client.ts`

```typescript
export interface ScrapeRequest {
  source: JobSource
  params?: {
    posted_after?: string  // ISO 8601 datetime
    [key: string]: unknown
  }
  limit?: number
}

export async function scrapeJobs(request: ScrapeRequest): Promise<ScrapeResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/api/jobs/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return response.json()
}
```

### Update Fetch Step to Pass Last Fetch Date

**File**: `apps/backend/src/events/fetch-from-scraper.step.ts`

```typescript
export const handler: Handlers['FetchFromScraper'] = async (input, { state, emit, logger }) => {
  const { source, limit = 100 } = input

  // Get last successful fetch time for this source
  const sourceStatus = await getSourceStatus(source)
  const lastFetchTime = sourceStatus?.last_fetch

  // Build request with date filter
  const request: ScrapeRequest = {
    source,
    limit,
    params: lastFetchTime ? {
      posted_after: lastFetchTime
    } : {}
  }

  logger.info('Fetching jobs with date filter', {
    source,
    posted_after: request.params?.posted_after
  })

  const response = await scraperClient.scrapeJobs(request)

  // ... rest of handler
}
```

### Update Source Status After Fetch

**File**: `apps/backend/src/services/database.ts`

```typescript
export async function updateSourceStatus(
  source: string,
  status: 'success' | 'error',
  jobCount: number,
  error?: string
): Promise<void> {
  await supabase
    .from('sources')
    .upsert({
      name: source,
      status,
      last_fetch: new Date().toISOString(),
      job_count: jobCount,
      error: error || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'name'
    })
}
```

---

## Testing Plan

### Unit Tests

1. **Date parsing**: Verify ISO 8601 strings are correctly parsed
2. **Filtering**: Verify jobs before `posted_after` are excluded
3. **Edge cases**: Handle null `posted_at` values gracefully

### Integration Tests

1. **Full flow**: Scraper API → Job Aggregator with date filter
2. **First fetch**: No date filter (get all jobs)
3. **Subsequent fetch**: With date filter (only new jobs)

### Manual Testing

```bash
# First fetch (no filter)
curl -X POST http://localhost:8000/api/jobs/scrape \
  -H "Content-Type: application/json" \
  -d '{"source": "arbeitnow", "limit": 10}'

# Subsequent fetch (with filter)
curl -X POST http://localhost:8000/api/jobs/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "source": "arbeitnow",
    "limit": 10,
    "params": {"posted_after": "2026-01-01T00:00:00Z"}
  }'
```

---

## Performance Impact

### Before (Current)
- Every fetch retrieves ALL jobs up to limit
- Many duplicates sent over network
- Deduplication happens in Job Aggregator

### After (With Date Filter)
- Only new jobs since last fetch
- Reduced network payload by ~80% (estimated)
- Fewer deduplication checks needed

### Estimated Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Jobs per fetch | 100 | ~20 | 80% reduction |
| Network payload | 500KB | 100KB | 80% reduction |
| Dedup checks | 100 | 20 | 80% reduction |

---

## Rollout Plan

### Phase 1: Scraper API Changes
1. Add `posted_after` parameter support
2. Update each scraper implementation
3. Deploy Scraper API update

### Phase 2: Job Aggregator Integration
1. Update `scraper-client.ts` with new param
2. Update `fetch-from-scraper.step.ts` to pass date
3. Test end-to-end flow
4. Deploy Job Aggregator update

### Phase 3: Monitoring
1. Monitor job counts per fetch
2. Verify deduplication is reduced
3. Check for any missed jobs

---

## Document Metadata

**Last Updated**: 2026-01-01
**Implementation Status**: Completed (Phase 1 - Scraper API)
**Related Documents**:
- [FEATURE_INTELLIGENT_JOB_APPLICATION_SYSTEM.md](./FEATURE_INTELLIGENT_JOB_APPLICATION_SYSTEM.md)
- [FEATURE_JOB_SCRAPER_API.md](./FEATURE_JOB_SCRAPER_API.md)

**Change Log**:
- 2026-01-01 - Initial creation for Scraper API date filter feature
