# Job Aggregator - Scraper API Integration Plan

**Date**: 2025-12-31
**Author**: Claude AI
**Status**: Complete
**Type**: Feature Implementation Plan
**Confidence Level**: 90%

---

## Table of Contents
- [Executive Summary](#executive-summary)
- [Research Validation](#research-validation)
- [Current State Analysis](#current-state-analysis)
- [Integration Architecture](#integration-architecture)
- [Files to Create/Modify](#files-to-createmodify)
- [Implementation Phases](#implementation-phases)
- [Detailed Implementation](#detailed-implementation)
- [Testing Strategy](#testing-strategy)
- [Rollback Plan](#rollback-plan)

---

## Executive Summary

This plan integrates the Job Aggregator (Motia) with the external Python Scraper API to aggregate and deduplicate jobs from 9 sources. The architecture follows **event-driven best practices** validated by 2025 industry research.

### Why 90% Confidence?

| Validation Source | Finding | Confidence Impact |
|-------------------|---------|-------------------|
| Codebase Analysis | Existing 8-source architecture provides proven patterns | +25% |
| Perplexity Research | Event-driven + FSM state management is 2025 standard | +20% |
| Best Practices Agent | 3-layer deduplication matches existing implementation | +20% |
| API Contract Review | Clear RawJob → NormalizedJob mapping defined | +15% |
| Motia Patterns | All .cursor/rules/ guides available for reference | +10% |

**Remaining 10% Risk**: External API availability, rate limiting edge cases, Playwright scraper reliability.

---

## Research Validation

### Multi-Agent Research Summary

| Agent | Focus | Key Insights |
|-------|-------|--------------|
| **Codebase Explorer** | Current architecture | 8 fetchers, 3-layer dedup, streaming already working |
| **Best Practices** | 2025 patterns | SimHash + TTL + health scoring recommended |
| **API Contract** | Integration points | POST /api/jobs/scrape returns RawJob[] |
| **Perplexity Deep** | Industry validation | Event-driven + schema discipline is standard |

### Validated Architecture Decisions

1. **Keep existing event flow**: fetch → normalize → dedupe → index
2. **Replace direct fetching**: Use scraper-client to call external API
3. **Preserve 3-layer dedup**: DB + hash cache + fuzzy matching
4. **Add circuit breaker**: Handle scraper API failures gracefully
5. **Batch processing**: Emit normalize events in batches of 10

---

## Current State Analysis

### What Already Exists (Reusable)

```
apps/backend/src/
├── api/
│   ├── get-jobs.step.ts          ✅ Keep (reads from state)
│   ├── get-sources.step.ts       ✅ Keep (returns source status)
│   └── refresh-source.step.ts    ✅ Keep (triggers manual refresh)
├── events/
│   ├── normalize-job.step.ts     ⚠️ Modify (add scraper API mapping)
│   ├── index-job.step.ts         ✅ Keep (dedup + storage working)
│   └── fetch-*.step.ts (8 files) ❌ Replace with single unified fetcher
├── cron/
│   └── refresh-all-sources.step.ts ⚠️ Modify (add new sources)
├── services/
│   ├── database.ts               ✅ Keep (Supabase integration)
│   ├── health-scorer.ts          ✅ Keep (freshness scoring)
│   └── dedup/                    ✅ Keep (3-layer deduplication)
├── streams/
│   └── jobs.stream.ts            ✅ Keep (real-time updates)
└── types/
    └── job.ts                    ⚠️ Extend (add new source types)
```

### Existing Event Flow (Working)

```
CRON (*/30) → fetch-jobs-trigger
    ↓
FetchArbeitnow (direct API call) ← REPLACE THIS
    ↓
normalize-job (source-specific) ← MODIFY THIS
    ↓
index-job (dedup + store) ← KEEP AS-IS
    ↓
streams.jobs.set() ← KEEP AS-IS
```

### What Needs to Change

| Component | Current | New |
|-----------|---------|-----|
| Fetching | 8 separate fetch-*.step.ts files | 1 unified fetch-from-scraper.step.ts |
| Normalization | Switch on source, parse raw data | Map RawJob (from API) → NormalizedJob |
| Sources | 8 hardcoded sources | 9 sources via scraper API |
| Error Handling | Basic try/catch | Circuit breaker + retry with backoff |

---

## Integration Architecture

### New Event Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        JOB AGGREGATOR (MOTIA)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                                                    │
│  │ CRON: */30 min   │                                                    │
│  │ refresh-all.ts   │                                                    │
│  └────────┬─────────┘                                                    │
│           │ emit: fetch-jobs-trigger { source: 'arbeitnow' }            │
│           │ emit: fetch-jobs-trigger { source: 'hackernews' }           │
│           │ emit: fetch-jobs-trigger { source: 'weworkremotely' }       │
│           │ ... (9 sources, staggered 5s delays)                        │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ EVENT: fetch-from-scraper.step.ts                                 │   │
│  │ subscribes: ['fetch-jobs-trigger']                                │   │
│  │                                                                    │   │
│  │  1. Get source from event data                                    │   │
│  │  2. Call scraperClient.scrapeJobs({ source, limit: 100 })        │   │
│  │  3. Handle errors (circuit breaker, retry)                        │   │
│  │  4. Update source metadata in state                               │   │
│  │  5. Batch emit: normalize-job (10 jobs per batch, 500ms delay)   │   │
│  └────────┬─────────────────────────────────────────────────────────┘   │
│           │                                                              │
│           │ HTTP POST /api/jobs/scrape                                  │
│           ▼                                                              │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│           PYTHON SCRAPER API (External Service)                          │
│  │  POST /api/jobs/scrape { source, params, limit }                 │   │
│     Returns: { success, jobs: RawJob[], scraped_at, error? }            │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│           │                                                              │
│           │ RawJob[]                                                     │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ EVENT: normalize-job.step.ts (MODIFIED)                           │   │
│  │ subscribes: ['normalize-job']                                     │   │
│  │                                                                    │   │
│  │  1. Receive RawJob from scraper API                               │   │
│  │  2. Parse location (city/state/country/isRemote)                  │   │
│  │  3. Parse salary (min/max/currency/period → yearly USD)           │   │
│  │  4. Extract skills from description                               │   │
│  │  5. Calculate health score                                        │   │
│  │  6. Generate content hash for deduplication                       │   │
│  │  7. Emit: index-job { job: NormalizedJob }                       │   │
│  └────────┬─────────────────────────────────────────────────────────┘   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ EVENT: index-job.step.ts (KEEP AS-IS)                             │   │
│  │ subscribes: ['index-job']                                         │   │
│  │                                                                    │   │
│  │  1. Check DB for existing job (content hash)                      │   │
│  │  2. Check hash cache (O(1) lookup)                                │   │
│  │  3. Check fuzzy dedup if no exact match                           │   │
│  │  4. Upsert to Supabase (keep higher health score)                 │   │
│  │  5. Update state: state.set('jobs', jobId, job)                  │   │
│  │  6. Update hash cache: state.set('job-hashes', hash, jobId)      │   │
│  │  7. Stream to clients: streams.jobs.set('all', jobId, job)       │   │
│  │  8. Emit: job-indexed (for AI summarization)                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ API: GET /api/jobs                                                │   │
│  │                                                                    │   │
│  │  1. Read from state.getGroup('jobs')                              │   │
│  │  2. Hydrate from DB if state empty                                │   │
│  │  3. Apply filters (search, source, remote, tags)                  │   │
│  │  4. Sort by healthScore (descending)                              │   │
│  │  5. Paginate and return                                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

### New Files (6 files)

```
apps/backend/src/
├── services/
│   ├── scraper-client.ts         # NEW: HTTP client for scraper API
│   ├── location-parser.ts        # NEW: Parse raw location strings
│   ├── salary-parser.ts          # NEW: Parse salary strings → normalized
│   └── circuit-breaker.ts        # NEW: Resilience for external API
└── events/
    └── fetch-from-scraper.step.ts # NEW: Unified fetcher for all sources
```

### Modified Files (4 files)

```
apps/backend/src/
├── types/
│   └── job.ts                    # ADD: RawJob interface, new sources
├── events/
│   └── normalize-job.step.ts     # MODIFY: Handle RawJob from scraper API
├── cron/
│   └── refresh-all-sources.step.ts # MODIFY: Add new sources
└── services/
    └── health-scorer.ts          # MODIFY: Source reliability weights
```

### Files to Delete (8 files)

```
apps/backend/src/events/
├── fetch-arbeitnow.step.ts       # REPLACE with fetch-from-scraper
├── fetch-reddit.step.ts
├── fetch-remotive.step.ts
├── fetch-wellfound.step.ts
├── fetch-googlejobs.step.ts
├── fetch-jobicy.step.ts
├── fetch-weworkremotely.step.ts
└── fetch_hackernews_step.py      # Python fetcher also replaced
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (3 hours)

| Task | File | Description |
|------|------|-------------|
| 1.1 | `services/scraper-client.ts` | HTTP client with retry, timeout, error handling |
| 1.2 | `services/circuit-breaker.ts` | Circuit breaker pattern for API failures |
| 1.3 | `types/job.ts` | Add RawJob interface, extend JobSource union |

### Phase 2: Parsing Services (3 hours)

| Task | File | Description |
|------|------|-------------|
| 2.1 | `services/location-parser.ts` | Parse location_raw → Location object |
| 2.2 | `services/salary-parser.ts` | Parse salary_raw → Salary object |
| 2.3 | `services/health-scorer.ts` | Add source reliability weights |

### Phase 3: Event Steps (4 hours)

| Task | File | Description |
|------|------|-------------|
| 3.1 | `events/fetch-from-scraper.step.ts` | New unified fetcher |
| 3.2 | `events/normalize-job.step.ts` | Modify to handle RawJob |
| 3.3 | Delete old fetch-*.step.ts | Remove 8 legacy fetcher files |

### Phase 4: Cron & Integration (2 hours)

| Task | File | Description |
|------|------|-------------|
| 4.1 | `cron/refresh-all-sources.step.ts` | Add new sources to rotation |
| 4.2 | Integration testing | End-to-end flow validation |

### Total Effort: 12 hours

---

## Detailed Implementation

### 1. Scraper Client (`services/scraper-client.ts`)

```typescript
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export const RawJobSchema = z.object({
  source_id: z.string(),
  title: z.string(),
  company: z.string(),
  url: z.string().url(),
  company_url: z.string().url().optional(),
  location_raw: z.string().optional(),
  description_html: z.string().optional(),
  description_text: z.string().optional(),
  posted_at: z.string().datetime().optional(),
  salary_raw: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().optional(),
  employment_type: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
  remote: z.boolean().optional(),
  experience_level: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional(),
  tags: z.array(z.string()).default([]),
});

export type RawJob = z.infer<typeof RawJobSchema>;

export const ScrapeResponseSchema = z.object({
  success: z.boolean(),
  source: z.string(),
  count: z.number().optional(),
  jobs: z.array(RawJobSchema).optional(),
  scraped_at: z.string().datetime().optional(),
  scrape_duration_ms: z.number().optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
  retry_after_seconds: z.number().optional(),
});

export type ScrapeResponse = z.infer<typeof ScrapeResponseSchema>;

export type JobSource =
  | 'arbeitnow'
  | 'hackernews'
  | 'remoteok'
  | 'weworkremotely'
  | 'braintrust'
  | 'devitjobs'
  | 'jobicy'
  | 'github'
  | 'wellfound';

export interface ScrapeRequest {
  source: JobSource;
  params?: Record<string, string>;
  limit?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

// ============================================================================
// SCRAPER CLIENT
// ============================================================================

export class ScraperClient {
  private baseUrl: string;

  constructor(baseUrl: string = SCRAPER_API_URL) {
    this.baseUrl = baseUrl;
  }

  async scrapeJobs(request: ScrapeRequest): Promise<ScrapeResponse> {
    const url = `${this.baseUrl}/api/jobs/scrape`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'JobAggregator/1.0',
        },
        body: JSON.stringify({
          source: request.source,
          params: request.params || {},
          limit: request.limit || 100,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          source: request.source,
          error: `HTTP ${response.status}: ${errorBody}`,
          error_code: `HTTP_${response.status}`,
        };
      }

      const data = await response.json();
      return ScrapeResponseSchema.parse(data);

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            source: request.source,
            error: 'Request timed out',
            error_code: 'TIMEOUT',
          };
        }
        return {
          success: false,
          source: request.source,
          error: error.message,
          error_code: 'NETWORK_ERROR',
        };
      }

      return {
        success: false,
        source: request.source,
        error: 'Unknown error',
        error_code: 'UNKNOWN',
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/jobs/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const scraperClient = new ScraperClient();
```

### 2. Circuit Breaker (`services/circuit-breaker.ts`)

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenRequests: 3,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private halfOpenSuccesses = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = DEFAULT_CONFIG
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = 'CLOSED';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.halfOpenSuccesses = 0;
  }
}

// Per-source circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(source: string): CircuitBreaker {
  if (!circuitBreakers.has(source)) {
    circuitBreakers.set(source, new CircuitBreaker(source));
  }
  return circuitBreakers.get(source)!;
}
```

### 3. Location Parser (`services/location-parser.ts`)

```typescript
export interface ParsedLocation {
  raw: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  isRemote: boolean;
  remoteType?: 'full' | 'hybrid' | 'flexible';
}

const REMOTE_PATTERNS = [
  { pattern: /\b(fully remote|100% remote|remote first|remote only)\b/i, type: 'full' as const },
  { pattern: /\b(hybrid|on-site.*remote|remote.*on-site)\b/i, type: 'hybrid' as const },
  { pattern: /\b(flexible|remote available|remote option)\b/i, type: 'flexible' as const },
  { pattern: /\b(remote|wfh|work from home|distributed|anywhere)\b/i, type: 'full' as const },
];

const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
};

const COUNTRY_CODES: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'britain': 'GB',
  'germany': 'DE', 'deutschland': 'DE',
  'france': 'FR', 'canada': 'CA', 'australia': 'AU',
  'netherlands': 'NL', 'spain': 'ES', 'italy': 'IT',
  'sweden': 'SE', 'switzerland': 'CH', 'ireland': 'IE',
  'poland': 'PL', 'portugal': 'PT', 'austria': 'AT',
};

export function parseLocation(raw: string | undefined): ParsedLocation {
  if (!raw || raw.trim() === '') {
    return { raw: '', isRemote: false };
  }

  const normalized = raw.trim();

  // Detect remote work
  let isRemote = false;
  let remoteType: 'full' | 'hybrid' | 'flexible' | undefined;

  for (const { pattern, type } of REMOTE_PATTERNS) {
    if (pattern.test(normalized)) {
      isRemote = true;
      remoteType = type;
      break;
    }
  }

  // If purely remote with no physical location
  const cleanedForLocation = normalized
    .replace(/\b(remote|wfh|work from home|hybrid|flexible|anywhere|worldwide|global)\b/gi, '')
    .replace(/[()[\]]/g, '')
    .trim();

  if (!cleanedForLocation || cleanedForLocation.length < 2) {
    return {
      raw: normalized,
      country: 'Remote',
      countryCode: 'REMOTE',
      isRemote: true,
      remoteType,
    };
  }

  // Parse physical location
  const result = parsePhysicalLocation(cleanedForLocation);

  return {
    ...result,
    raw: normalized,
    isRemote,
    remoteType,
  };
}

function parsePhysicalLocation(text: string): Partial<ParsedLocation> {
  // Split by comma
  const parts = text.split(',').map(p => p.trim()).filter(Boolean);

  const result: Partial<ParsedLocation> = {};

  for (const part of parts) {
    const upper = part.toUpperCase();
    const lower = part.toLowerCase();

    // Check US state abbreviation
    if (US_STATES[upper]) {
      result.state = US_STATES[upper];
      result.country = 'United States';
      result.countryCode = 'US';
      continue;
    }

    // Check country
    if (COUNTRY_CODES[lower]) {
      result.countryCode = COUNTRY_CODES[lower];
      result.country = part;
      continue;
    }

    // Assume city if not matched
    if (!result.city && part.length > 1) {
      result.city = part;
    }
  }

  return result;
}
```

### 4. Salary Parser (`services/salary-parser.ts`)

```typescript
export interface ParsedSalary {
  min?: number;
  max?: number;
  currency: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  normalizedYearly?: { min?: number; max?: number };
  raw: string;
}

const PERIOD_MULTIPLIERS: Record<string, number> = {
  hourly: 40 * 52,    // 40 hrs/week * 52 weeks
  daily: 5 * 52,      // 5 days/week * 52 weeks
  weekly: 52,
  monthly: 12,
  yearly: 1,
};

const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1.0, EUR: 1.08, GBP: 1.27, CAD: 0.74, AUD: 0.65,
  CHF: 1.12, SEK: 0.095, NOK: 0.092, DKK: 0.145,
};

export function parseSalary(
  raw: string | undefined,
  min?: number,
  max?: number,
  currency?: string
): ParsedSalary | null {
  // If structured data provided, use it
  if (min !== undefined || max !== undefined) {
    const curr = currency || 'USD';
    const period = detectPeriod(raw || '', min || max || 0);

    return {
      min,
      max,
      currency: curr,
      period,
      normalizedYearly: normalizeToYearlyUSD(min, max, curr, period),
      raw: raw || `${min || '?'} - ${max || '?'} ${curr}`,
    };
  }

  // Parse from raw string
  if (!raw || raw.trim() === '') {
    return null;
  }

  const normalized = raw.replace(/\s+/g, ' ').trim();
  const detectedCurrency = detectCurrency(normalized);
  const period = detectPeriod(normalized, 0);
  const { extractedMin, extractedMax } = extractRange(normalized);

  if (extractedMin === undefined && extractedMax === undefined) {
    return null;
  }

  return {
    min: extractedMin,
    max: extractedMax,
    currency: detectedCurrency,
    period,
    normalizedYearly: normalizeToYearlyUSD(extractedMin, extractedMax, detectedCurrency, period),
    raw: normalized,
  };
}

function detectCurrency(text: string): string {
  if (text.includes('$') || /USD/i.test(text)) return 'USD';
  if (text.includes('€') || /EUR/i.test(text)) return 'EUR';
  if (text.includes('£') || /GBP/i.test(text)) return 'GBP';
  if (/CAD/i.test(text)) return 'CAD';
  if (/AUD/i.test(text)) return 'AUD';
  if (/CHF/i.test(text)) return 'CHF';
  return 'USD';
}

function detectPeriod(text: string, sampleValue: number): ParsedSalary['period'] {
  const lower = text.toLowerCase();

  if (/\b(per hour|\/hr|hourly|\/hour)\b/.test(lower)) return 'hourly';
  if (/\b(per day|daily|\/day)\b/.test(lower)) return 'daily';
  if (/\b(per week|weekly|\/week)\b/.test(lower)) return 'weekly';
  if (/\b(per month|monthly|\/month)\b/.test(lower)) return 'monthly';
  if (/\b(per year|yearly|annual|\/year|p\.a\.)\b/.test(lower)) return 'yearly';

  // Infer from value magnitude
  if (sampleValue > 0) {
    if (sampleValue < 200) return 'hourly';
    if (sampleValue < 2000) return 'daily';
    if (sampleValue < 10000) return 'monthly';
  }

  return 'yearly';
}

function extractRange(text: string): { extractedMin?: number; extractedMax?: number } {
  // Handle "k" suffix
  const withK = text.replace(/(\d+(?:\.\d+)?)\s*[kK]\b/g, (_, num) =>
    String(Number(num) * 1000)
  );

  // Remove currency symbols and commas
  const cleaned = withK.replace(/[$€£,]/g, '');

  // Range pattern: "50000 - 70000" or "50000 to 70000"
  const rangeMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return {
      extractedMin: parseFloat(rangeMatch[1]),
      extractedMax: parseFloat(rangeMatch[2]),
    };
  }

  // "Up to X" pattern
  const upToMatch = cleaned.match(/up to\s*(\d+(?:\.\d+)?)/i);
  if (upToMatch) {
    return { extractedMax: parseFloat(upToMatch[1]) };
  }

  // "From X" or "Starting at X" pattern
  const fromMatch = cleaned.match(/(?:from|starting at)\s*(\d+(?:\.\d+)?)/i);
  if (fromMatch) {
    return { extractedMin: parseFloat(fromMatch[1]) };
  }

  // Single number
  const singleMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    return { extractedMin: value, extractedMax: value };
  }

  return {};
}

function normalizeToYearlyUSD(
  min: number | undefined,
  max: number | undefined,
  currency: string,
  period: ParsedSalary['period']
): { min?: number; max?: number } {
  const multiplier = PERIOD_MULTIPLIERS[period];
  const currencyRate = CURRENCY_TO_USD[currency] || 1.0;

  return {
    min: min ? Math.round(min * multiplier * currencyRate) : undefined,
    max: max ? Math.round(max * multiplier * currencyRate) : undefined,
  };
}
```

### 5. Fetch From Scraper Step (`events/fetch-from-scraper.step.ts`)

```typescript
import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { scraperClient, type RawJob, type JobSource } from '../services/scraper-client';
import { getCircuitBreaker } from '../services/circuit-breaker';
import { updateSourceStatus } from '../services/database';

const inputSchema = z.object({
  source: z.enum([
    'arbeitnow', 'hackernews', 'remoteok', 'weworkremotely',
    'braintrust', 'devitjobs', 'jobicy', 'github', 'wellfound', 'all'
  ]),
  params: z.record(z.string()).optional(),
  limit: z.number().optional().default(100),
});

export const config: EventConfig = {
  type: 'event',
  name: 'FetchFromScraper',
  description: 'Fetches jobs from Python Scraper API for a specific source',
  subscribes: ['fetch-jobs-trigger'],
  emits: ['normalize-job'],
  input: inputSchema,
  flows: ['job-aggregation'],
};

const ALL_SOURCES: JobSource[] = [
  'arbeitnow', 'hackernews', 'remoteok', 'weworkremotely',
  'braintrust', 'devitjobs', 'jobicy', 'github', 'wellfound',
];

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

export const handler: Handlers['FetchFromScraper'] = async (input, { emit, logger, state }) => {
  const { source, params, limit } = input;

  // Handle "all" by emitting individual triggers with staggered delays
  if (source === 'all') {
    logger.info('Triggering fetch for all sources');
    for (let i = 0; i < ALL_SOURCES.length; i++) {
      await emit({
        topic: 'fetch-jobs-trigger',
        data: { source: ALL_SOURCES[i], params, limit },
      });
      // Stagger by 5 seconds to avoid overwhelming scraper API
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return;
  }

  const circuitBreaker = getCircuitBreaker(source);

  logger.info(`Fetching jobs from scraper API`, { source, limit });

  try {
    const response = await circuitBreaker.execute(() =>
      scraperClient.scrapeJobs({ source: source as JobSource, params, limit })
    );

    if (!response.success) {
      logger.error(`Scraper API error for ${source}`, {
        error: response.error,
        errorCode: response.error_code,
      });

      await updateSourceStatus(source, 'error', 0, response.error);
      await state.set('sources', source, {
        lastFetch: new Date().toISOString(),
        jobCount: 0,
        status: 'error',
        error: response.error,
      });

      return;
    }

    const jobs = response.jobs || [];
    logger.info(`Received ${jobs.length} jobs from ${source}`);

    // Update source metadata
    await state.set('sources', source, {
      lastFetch: response.scraped_at || new Date().toISOString(),
      jobCount: jobs.length,
      status: 'success',
      scrapeDurationMs: response.scrape_duration_ms,
    });

    await updateSourceStatus(source, 'success', jobs.length);

    // Batch emit normalize-job events
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(rawJob =>
          emit({
            topic: 'normalize-job',
            data: {
              source,
              rawJob,
              fetchedAt: response.scraped_at || new Date().toISOString(),
            },
          })
        )
      );

      // Delay between batches to prevent overwhelming the pipeline
      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    logger.info(`Emitted ${jobs.length} normalize-job events for ${source}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Failed to fetch from scraper API`, {
      source,
      error: errorMessage,
      circuitState: circuitBreaker.getState(),
    });

    await updateSourceStatus(source, 'error', 0, errorMessage);
    await state.set('sources', source, {
      lastFetch: new Date().toISOString(),
      jobCount: 0,
      status: 'error',
      error: errorMessage,
    });
  }
};
```

### 6. Modified Normalize Job Step (`events/normalize-job.step.ts`)

```typescript
import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { RawJobSchema, type RawJob } from '../services/scraper-client';
import { parseLocation } from '../services/location-parser';
import { parseSalary } from '../services/salary-parser';
import { calculateHealthScore } from '../services/health-scorer';
import { generateContentHash } from '../services/database';
import { type Job, type JobSource } from '../types/job';

const inputSchema = z.object({
  source: z.string(),
  rawJob: RawJobSchema,
  fetchedAt: z.string().datetime(),
});

export const config: EventConfig = {
  type: 'event',
  name: 'NormalizeJob',
  description: 'Normalizes raw job data from scraper API into standardized format',
  subscribes: ['normalize-job'],
  emits: ['index-job'],
  input: inputSchema,
  flows: ['job-aggregation'],
};

export const handler: Handlers['NormalizeJob'] = async (input, { emit, logger }) => {
  const { source, rawJob, fetchedAt } = input;

  try {
    // Parse location
    const location = parseLocation(rawJob.location_raw);

    // Determine remote status (from rawJob or parsed location)
    const isRemote = rawJob.remote ?? location.isRemote;

    // Parse salary
    const salary = parseSalary(
      rawJob.salary_raw,
      rawJob.salary_min,
      rawJob.salary_max,
      rawJob.salary_currency
    );

    // Extract description (prefer text, fallback to HTML stripped)
    const description = rawJob.description_text ||
      stripHtml(rawJob.description_html || '');

    // Calculate health score
    const postedAt = rawJob.posted_at || fetchedAt;
    const healthScore = calculateHealthScore(
      postedAt,
      source as JobSource,
      {
        hasDescription: !!description,
        hasLocation: !!rawJob.location_raw,
        hasSalary: !!salary,
        hasTags: rawJob.tags.length > 0,
      }
    );

    // Generate content hash for deduplication
    const contentHash = generateContentHash(
      rawJob.title,
      rawJob.company,
      location.city || location.country || location.raw
    );

    // Build normalized job
    const normalizedJob: Job = {
      id: uuidv4(),
      sourceId: rawJob.source_id,
      source: source as JobSource,

      title: rawJob.title,
      company: rawJob.company,
      companyUrl: rawJob.company_url,

      location: location.city
        ? `${location.city}${location.state ? ', ' + location.state : ''}${location.country ? ', ' + location.country : ''}`
        : location.raw,
      locationParsed: location,
      remote: isRemote,

      url: rawJob.url,
      description,

      salary: salary ? {
        min: salary.min,
        max: salary.max,
        currency: salary.currency,
        period: salary.period,
        normalizedYearly: salary.normalizedYearly,
      } : undefined,

      employmentType: rawJob.employment_type,
      experienceLevel: rawJob.experience_level,

      tags: rawJob.tags,
      skills: extractSkills(description, rawJob.tags),

      postedAt,
      fetchedAt,

      healthScore,
      contentHash,
    };

    await emit({
      topic: 'index-job',
      data: { job: normalizedJob },
    });

    logger.debug(`Normalized job from ${source}`, {
      jobId: normalizedJob.id,
      title: normalizedJob.title,
      company: normalizedJob.company,
      healthScore,
    });

  } catch (error) {
    logger.error(`Failed to normalize job`, {
      source,
      sourceId: rawJob.source_id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSkills(description: string, tags: string[]): string[] {
  const skills = new Set<string>(tags.map(t => t.toLowerCase()));

  // Common tech skills to detect
  const skillPatterns = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'ruby',
    'react', 'vue', 'angular', 'node', 'django', 'rails', 'spring',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'graphql', 'rest', 'grpc', 'kafka', 'rabbitmq',
  ];

  const lowerDesc = description.toLowerCase();
  for (const skill of skillPatterns) {
    if (lowerDesc.includes(skill)) {
      skills.add(skill);
    }
  }

  return Array.from(skills).slice(0, 20);
}
```

### 7. Modified Cron Step (`cron/refresh-all-sources.step.ts`)

```typescript
import type { CronConfig, Handlers } from 'motia';

export const config: CronConfig = {
  type: 'cron',
  name: 'RefreshAllSources',
  description: 'Triggers job fetching from all sources every 30 minutes',
  cron: '*/30 * * * *',
  emits: ['fetch-jobs-trigger'],
  flows: ['job-aggregation'],
};

// All sources from the Python Scraper API
const SOURCES = [
  'arbeitnow',
  'hackernews',
  'remoteok',
  'weworkremotely',
  'braintrust',
  'devitjobs',
  'jobicy',
  'github',
  'wellfound',
] as const;

const STAGGER_DELAY_MS = 5000; // 5 seconds between sources

export const handler: Handlers['RefreshAllSources'] = async ({ emit, logger }) => {
  logger.info('Starting scheduled refresh for all sources', {
    sourceCount: SOURCES.length,
    staggerDelayMs: STAGGER_DELAY_MS,
  });

  for (let i = 0; i < SOURCES.length; i++) {
    const source = SOURCES[i];

    await emit({
      topic: 'fetch-jobs-trigger',
      data: {
        source,
        limit: 100,
      },
    });

    logger.info(`Triggered fetch for ${source}`, { position: i + 1, total: SOURCES.length });

    // Stagger to avoid overwhelming the scraper API
    if (i < SOURCES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY_MS));
    }
  }

  logger.info('Completed triggering all sources');
};
```

### 8. Extended Health Scorer (`services/health-scorer.ts`)

```typescript
import { type JobSource } from '../types/job';

// Source reliability weights (out of 20 points)
const SOURCE_RELIABILITY: Record<JobSource, number> = {
  arbeitnow: 18,       // Direct API, high reliability
  hackernews: 15,      // Community-driven, good quality
  remoteok: 16,        // RSS feed, reliable
  weworkremotely: 17,  // Curated, high quality
  braintrust: 16,      // Curated, good quality
  devitjobs: 15,       // Regional focus, good quality
  jobicy: 14,          // Mixed quality
  github: 13,          // Variable, some outdated
  wellfound: 17,       // Startup-focused, high quality
};

interface CompletenessFactors {
  hasDescription: boolean;
  hasLocation: boolean;
  hasSalary: boolean;
  hasTags: boolean;
}

export function calculateHealthScore(
  postedAt: string,
  source: JobSource,
  completeness: CompletenessFactors
): number {
  // Freshness score (0-40 points)
  const freshnessScore = calculateFreshnessScore(postedAt);

  // Completeness score (0-30 points)
  const completenessScore = calculateCompletenessScore(completeness);

  // Source reliability (0-20 points)
  const reliabilityScore = SOURCE_RELIABILITY[source] || 10;

  // Base engagement score (0-10 points)
  const engagementScore = 5;

  const total = freshnessScore + completenessScore + reliabilityScore + engagementScore;

  return Math.min(100, Math.max(0, Math.round(total)));
}

function calculateFreshnessScore(postedAt: string): number {
  const postDate = new Date(postedAt);
  const now = new Date();
  const ageHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

  // Exponential decay with 1-week half-life
  // score = 40 * e^(-age/168)
  const tau = 168; // 1 week in hours
  const score = 40 * Math.exp(-ageHours / tau);

  return Math.max(0, Math.round(score));
}

function calculateCompletenessScore(factors: CompletenessFactors): number {
  let score = 0;

  if (factors.hasDescription) score += 12;
  if (factors.hasLocation) score += 8;
  if (factors.hasSalary) score += 6;
  if (factors.hasTags) score += 4;

  return score;
}

// Legacy function for backward compatibility
export function getHealthScore(postedAt: string): number {
  const postDate = new Date(postedAt);
  const now = new Date();
  const ageHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  if (ageDays <= 1) return 100;
  if (ageDays <= 7) return 75 + (25 * (7 - ageDays) / 6);
  if (ageDays <= 30) return 50 + (25 * (30 - ageDays) / 23);
  if (ageDays <= 90) return 25 + (25 * (90 - ageDays) / 60);
  return Math.max(0, 25 - Math.floor((ageDays - 90) / 30) * 5);
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/services/location-parser.test.ts
import { parseLocation } from '../services/location-parser';

describe('parseLocation', () => {
  it('parses remote-only locations', () => {
    expect(parseLocation('Remote')).toMatchObject({
      isRemote: true,
      remoteType: 'full',
      country: 'Remote',
    });
  });

  it('parses US city + state', () => {
    expect(parseLocation('San Francisco, CA')).toMatchObject({
      city: 'San Francisco',
      state: 'California',
      country: 'United States',
      isRemote: false,
    });
  });

  it('parses hybrid remote', () => {
    expect(parseLocation('New York, NY (Hybrid)')).toMatchObject({
      city: 'New York',
      isRemote: true,
      remoteType: 'hybrid',
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/fetch-flow.test.ts
import { scraperClient } from '../services/scraper-client';

describe('Scraper API Integration', () => {
  it('fetches jobs from arbeitnow', async () => {
    const response = await scraperClient.scrapeJobs({
      source: 'arbeitnow',
      limit: 10,
    });

    expect(response.success).toBe(true);
    expect(response.jobs?.length).toBeGreaterThan(0);
    expect(response.jobs?.[0]).toHaveProperty('source_id');
    expect(response.jobs?.[0]).toHaveProperty('title');
    expect(response.jobs?.[0]).toHaveProperty('company');
  });
});
```

### End-to-End Test

```bash
# 1. Start scraper API (in python-scraper)
cd /Users/dave/Work/python-scraper/apps/api
python -m uvicorn app.main:app --port 8000

# 2. Start job aggregator (in job-aggregator)
cd /Users/dave/Work/job-aggregator/apps/backend
npm run dev

# 3. Trigger manual refresh
curl -X POST http://localhost:4000/api/sources/arbeitnow/refresh

# 4. Check jobs
curl http://localhost:4000/api/jobs | jq '.jobs | length'
```

---

## Rollback Plan

If integration fails:

1. **Revert to legacy fetchers**: Keep old `fetch-*.step.ts` files as backup
2. **Feature flag**: Add `USE_SCRAPER_API=false` env var to toggle
3. **Gradual rollout**: Enable one source at a time via config

```typescript
// Feature flag pattern
const USE_SCRAPER_API = process.env.USE_SCRAPER_API !== 'false';

if (USE_SCRAPER_API) {
  await scraperClient.scrapeJobs({ source });
} else {
  await legacyFetch(source);
}
```

---

## Document Metadata

**Last Updated**: 2025-12-31
**Implementation Status**: Not Started
**Related Documents**:
- [FEATURE_JOB_SCRAPER_API.md](./FEATURE_JOB_SCRAPER_API.md) - Python Scraper API implementation
- [greedy-toasting-pelican.md](~/.claude/plans/greedy-toasting-pelican.md) - Architecture decision

**Change Log**:
- 2025-12-31 - Initial creation with 90% confidence based on multi-agent research
