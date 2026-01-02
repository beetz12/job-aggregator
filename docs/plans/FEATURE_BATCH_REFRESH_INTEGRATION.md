# Job Aggregator - Batch Refresh Integration

**Date**: 2026-01-02
**Author**: Claude AI (Multi-Agent Analysis)
**Status**: ✅ Implemented
**Type**: Feature
**Confidence**: 95%

---

## Overview

Integrate with the Python Scraper API's batch endpoint to refresh multiple sources in a single request.

## New API Endpoint

```
POST /sources/refresh
```

## Request Schema

```typescript
interface BatchRefreshRequest {
  sources: string[]        // Required: ["arbeitnow", "hackernews"]
  test_mode?: boolean      // Default: false
  limit?: number           // Default: 100
}
```

## Response Schema

```typescript
interface BatchRefreshResponse {
  message: string
  sources: string[]
  count: number
  total_jobs: number
}
```

## Example Usage

```bash
# Refresh specific sources
curl -X POST http://localhost:4000/sources/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["arbeitnow", "hackernews", "remoteok"],
    "test_mode": true
  }'

# Single source still works (backwards compatible)
curl -X POST http://localhost:4000/sources/arbeitnow/refresh
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/scraper-client.ts` | MODIFY | Add `scrapeBatch()` method |
| `src/api/batch-refresh-sources.step.ts` | CREATE | New batch refresh endpoint |

## ScraperClient Changes

```typescript
// Add to scraper-client.ts

export interface BatchScrapeRequest {
  sources: JobSource[]
  params?: Record<string, string>
  limit_per_source?: number
  test_mode?: boolean
}

export interface SourceResult {
  success: boolean
  source: string
  count: number
  jobs: RawJob[]
  scrape_duration_ms: number
  error?: string
  error_code?: string
}

export interface BatchScrapeResponse {
  success: boolean
  total_sources: number
  successful_sources: number
  failed_sources: number
  total_jobs: number
  results: Record<string, SourceResult>
  scraped_at: string
  total_duration_ms: number
  errors_summary?: string[]
}

// New method in ScraperClient class
async scrapeBatch(request: BatchScrapeRequest): Promise<BatchScrapeResponse> {
  const response = await fetch(`${this.baseUrl}/api/jobs/scrape-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: request.sources,
      params: request.params || {},
      limit_per_source: request.limit_per_source || 100,
      test_mode: request.test_mode ?? false
    })
  })
  return response.json()
}
```

## New API Step: batch-refresh-sources.step.ts

```typescript
import type { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { scraperClient } from '../services/scraper-client'
import { SCRAPER_SOURCES } from '../services/sources'
import { updateSourceStatus } from '../services/database'

const inputSchema = z.object({
  sources: z.array(z.string()).min(1),
  test_mode: z.boolean().optional().default(false),
  limit: z.number().optional().default(100)
})

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'BatchRefreshSources',
  path: '/sources/refresh',
  method: 'POST',
  description: 'Refresh multiple job sources in a single request',
  emits: ['normalize-job'],
  flows: ['job-aggregation'],
  bodySchema: inputSchema
}

export const handler: Handlers['BatchRefreshSources'] = async (req, { emit, logger }) => {
  const { sources, test_mode, limit } = req.body

  // Validate sources
  const invalidSources = sources.filter(s => !SCRAPER_SOURCES.includes(s))
  if (invalidSources.length > 0) {
    return { status: 400, body: { error: `Invalid sources: ${invalidSources.join(', ')}` } }
  }

  logger.info('Batch refresh initiated', { sources, test_mode, limit })

  // Call batch endpoint
  const response = await scraperClient.scrapeBatch({
    sources,
    limit_per_source: limit,
    test_mode
  })

  // Process each source's results
  for (const [source, result] of Object.entries(response.results)) {
    if (result.success) {
      for (const job of result.jobs) {
        await emit({ topic: 'normalize-job', data: { source, rawJob: job, fetchedAt: response.scraped_at } })
      }
      await updateSourceStatus(source, 'success', result.count)
    } else {
      await updateSourceStatus(source, 'error', 0, result.error)
    }
  }

  return {
    status: 202,
    body: {
      message: 'Batch refresh initiated',
      sources,
      count: sources.length,
      total_jobs: response.total_jobs,
      successful_sources: response.successful_sources,
      failed_sources: response.failed_sources
    }
  }
}
```

## Implementation Steps

1. Add batch interfaces to `scraper-client.ts`
2. Add `scrapeBatch()` method to `ScraperClient` class
3. Create `batch-refresh-sources.step.ts` API endpoint
4. Update source status handling for batch results
5. Keep existing `/sources/:name/refresh` for backwards compatibility

---

## Document Metadata

**Last Updated**: 2026-01-02
**Implementation Status**: ✅ Complete
**Related Documents**:
- Python Scraper: `docs/plans/FEATURE_BATCH_SCRAPE_ENDPOINT.md`

**Change Log**:
- 2026-01-02 - Implementation completed
- 2026-01-02 - Initial creation
