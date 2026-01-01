# Job Scraper Gap Analysis

**Date:** 2025-12-31
**Confidence Level:** 90%
**Analysis Method:** Multi-agent parallel research (3 agents)

---

## Executive Summary

Your existing python-scraper project at `/Users/dave/Work/python-scraper/apps/api` is a **production-grade generic web scraping platform** with excellent infrastructure, but it has **zero job-specific scrapers implemented**. This gap analysis identifies exactly what needs to be added to scrape all 8 target job sites from your ranked platforms list.

---

## Target Job Sites (from ranked_platforms.md)

| # | Site | Method Required | Complexity | Status in Existing Scraper |
|---|------|-----------------|------------|---------------------------|
| 1 | **HackerNews** | Pure API | ⭐ Easiest | **NOT IMPLEMENTED** |
| 2 | **Arbeitnow** | Pure API | ⭐ Easiest | **NOT IMPLEMENTED** |
| 3 | **RemoteOK** | RSS Feed | ⭐⭐ Low | **NOT IMPLEMENTED** |
| 4 | **We Work Remotely** | Playwright | ⭐⭐ Low | **NOT IMPLEMENTED** |
| 5 | **Braintrust** | Playwright | ⭐⭐ Low-Med | **NOT IMPLEMENTED** |
| 6 | **DevITjobs** | Playwright | ⭐⭐ Low-Med | **NOT IMPLEMENTED** |
| 7 | **Jobicy** | Playwright + Proxy | ⭐⭐⭐ Medium | **NOT IMPLEMENTED** |
| 8 | **GitHub Jobs** | Playwright | ⭐⭐⭐ Medium | **NOT IMPLEMENTED** |
| 9 | **Wellfound** | Firecrawl | ⭐⭐⭐⭐ High | **NOT IMPLEMENTED** |
| 10 | **Google Jobs** | SerpAPI | ⭐⭐ Low | **NOT IMPLEMENTED** |

**SKIP:** LinkedIn, Indeed, Stack Overflow (per requirements)

---

## Existing Capabilities Analysis

### What Your Python Scraper ALREADY Has

| Capability | Status | Quality | Notes |
|------------|--------|---------|-------|
| **FastAPI Framework** | ✅ Exists | High | v0.115.0+, async/await |
| **Playwright Integration** | ✅ Exists | Medium | `js_renderer.py` - SPA detection |
| **Firecrawl SDK** | ✅ Exists | High | `firecrawl_provider.py` - batch scrape |
| **Bright Data Proxy** | ✅ Exists | High | `proxy_manager.py` - rotation, SSL |
| **aiohttp Async HTTP** | ✅ Exists | High | 15 concurrent, 2.7x faster than httpx |
| **Selectolax HTML Parser** | ✅ Exists | High | 5-30x faster than BeautifulSoup |
| **PostgreSQL Database** | ✅ Exists | High | SQLAlchemy async, Alembic migrations |
| **Job Queue (basic)** | ✅ Exists | Medium | BackgroundTasks (loses on restart) |
| **Stealth Mode** | ✅ Exists | High | Rotating UA, delays, headers |
| **HTML→Markdown** | ✅ Exists | High | Selectolax-based converter |
| **Error Handling** | ✅ Exists | High | Retry with exponential backoff |
| **Sitemap Parser** | ✅ Exists | High | XML parsing with lxml |

### What's MISSING (Gaps)

| Gap | Severity | Impact |
|-----|----------|--------|
| **Job-Specific Scrapers** | 🔴 CRITICAL | No scrapers for any of the 10 target sites |
| **Normalized Job Schema** | 🔴 CRITICAL | No unified Job model for aggregation |
| **Job Source Registry** | 🔴 CRITICAL | No way to configure/enable sources |
| **API Scrapers** | 🟡 HIGH | No Arbeitnow, HackerNews, SerpAPI integrations |
| **RSS Parser** | 🟡 HIGH | No feedparser for RemoteOK |
| **Caching Layer** | 🟡 HIGH | No Redis/caching for deduplication |
| **Job Deduplication** | 🟡 HIGH | No content hashing across sources |
| **Rate Limiting Middleware** | 🟠 MEDIUM | API exposed without protection |
| **Cron/Scheduled Jobs** | 🟠 MEDIUM | No periodic refresh capability |
| **Job Health Scoring** | 🟠 MEDIUM | No freshness calculation |
| **API Authentication** | 🟢 LOW | Open API (OK for internal use) |
| **Webhooks** | 🟢 LOW | Polling only (OK for hackathon) |

---

## Gap Analysis by Scraper Type

### 1. API-Based Scrapers (Easiest - 3 sites)

**Required for:** HackerNews, Arbeitnow, Google Jobs (SerpAPI)

| Component | Exists? | Gap | Effort |
|-----------|---------|-----|--------|
| httpx/aiohttp client | ✅ Yes | None | 0 |
| API response parsing | ❌ No | Need per-source parsers | 2-4 hrs each |
| Rate limiting | ❌ No | Need per-API limits | 2 hrs |
| Response caching | ❌ No | Need TTL cache | 4 hrs |

**Files to Create:**
```
services/job_scrapers/
├── api/
│   ├── hackernews_scraper.py      # Firebase API
│   ├── arbeitnow_scraper.py       # REST API
│   └── serpapi_scraper.py         # Google Jobs via SerpAPI
```

### 2. RSS-Based Scrapers (Easy - 1 site)

**Required for:** RemoteOK

| Component | Exists? | Gap | Effort |
|-----------|---------|-----|--------|
| feedparser library | ❌ No | Need to add to requirements | 0.5 hrs |
| RSS response parsing | ❌ No | Need RemoteOK parser | 2 hrs |

**Files to Create:**
```
services/job_scrapers/
├── rss/
│   └── remoteok_scraper.py        # RSS feed parsing
```

### 3. Playwright-Based Scrapers (Medium - 5 sites)

**Required for:** We Work Remotely, Braintrust, DevITjobs, Jobicy, GitHub Jobs

| Component | Exists? | Gap | Effort |
|-----------|---------|-----|--------|
| Playwright browser | ✅ Yes | Already in js_renderer.py | 0 |
| Page scraping logic | ❌ No | Need per-site selectors | 3-5 hrs each |
| Proxy integration | ✅ Yes | Already in proxy_manager.py | 0 |
| Stealth mode | ✅ Yes | Already implemented | 0 |

**Files to Create:**
```
services/job_scrapers/
├── playwright/
│   ├── weworkremotely_scraper.py  # Static HTML
│   ├── braintrust_scraper.py      # HubSpot-based
│   ├── devitjobs_scraper.py       # React server-rendered
│   ├── jobicy_scraper.py          # React SPA
│   └── github_jobs_scraper.py     # React SPA
```

### 4. Firecrawl-Based Scrapers (Complex - 1 site)

**Required for:** Wellfound

| Component | Exists? | Gap | Effort |
|-----------|---------|-----|--------|
| Firecrawl SDK | ✅ Yes | Already in firecrawl_provider.py | 0 |
| Job extraction schema | ❌ No | Need Wellfound-specific schema | 4 hrs |
| GraphQL data parsing | ❌ No | Need Apollo state extraction | 4 hrs |

**Files to Create:**
```
services/job_scrapers/
├── firecrawl/
│   └── wellfound_scraper.py       # Firecrawl with schema extraction
```

---

## Core Infrastructure Gaps

### 1. Normalized Job Schema (CRITICAL)

**Current State:** No unified job model exists.

**Required Schema:**
```python
# models/job.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Location(BaseModel):
    raw: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_remote: bool = False

class Salary(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    currency: str = "USD"
    period: str = "yearly"  # hourly, monthly, yearly

class NormalizedJob(BaseModel):
    id: str                          # UUID
    source_id: str                   # Original ID from source
    source: str                      # arbeitnow, hackernews, wellfound, etc.

    title: str
    company: str
    company_url: Optional[str] = None

    location: Location
    description: str
    url: str

    salary: Optional[Salary] = None
    employment_type: Optional[str] = None  # full-time, part-time, contract
    experience_level: Optional[str] = None # entry, mid, senior

    tags: List[str] = []
    skills: List[str] = []

    posted_at: datetime
    fetched_at: datetime
    expires_at: Optional[datetime] = None

    health_score: int = 100          # 0-100, decreases with age

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "source": "arbeitnow",
                "title": "Senior Python Developer",
                "company": "TechCorp",
                "location": {"raw": "Remote", "is_remote": True},
                "health_score": 95
            }
        }
```

### 2. Job Source Registry (CRITICAL)

**Current State:** No way to configure which sources to scrape.

**Required:**
```python
# config/sources.py
from enum import Enum
from pydantic import BaseModel

class ScraperType(str, Enum):
    API = "api"
    RSS = "rss"
    PLAYWRIGHT = "playwright"
    FIRECRAWL = "firecrawl"

class JobSource(BaseModel):
    name: str
    enabled: bool
    scraper_type: ScraperType
    base_url: str
    rate_limit: int  # requests per minute
    requires_proxy: bool
    cost_per_request: float  # for budgeting

JOB_SOURCES = {
    "hackernews": JobSource(
        name="HackerNews",
        enabled=True,
        scraper_type=ScraperType.API,
        base_url="https://hacker-news.firebaseio.com/v0",
        rate_limit=60,
        requires_proxy=False,
        cost_per_request=0.0
    ),
    "arbeitnow": JobSource(
        name="Arbeitnow",
        enabled=True,
        scraper_type=ScraperType.API,
        base_url="https://arbeitnow.com/api/job-board-api",
        rate_limit=30,
        requires_proxy=False,
        cost_per_request=0.0
    ),
    # ... more sources
}
```

### 3. Job Deduplication (HIGH)

**Current State:** `duplicate_detector.py` exists but for generic content, not jobs.

**Required:**
```python
# services/job_deduplicator.py
import hashlib

def get_job_hash(title: str, company: str, location: str) -> str:
    """Generate unique hash for deduplication across sources."""
    normalized = f"{title.lower().strip()}|{company.lower().strip()}|{location.lower().strip()}"
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]

async def is_duplicate(job: NormalizedJob, db: AsyncSession) -> bool:
    """Check if job already exists in database."""
    job_hash = get_job_hash(job.title, job.company, job.location.raw)
    existing = await db.execute(
        select(JobDB).where(JobDB.content_hash == job_hash)
    )
    return existing.scalar_one_or_none() is not None
```

### 4. Health Scoring (MEDIUM)

**Current State:** No freshness scoring.

**Required:**
```python
# services/health_scorer.py
from datetime import datetime, timedelta

def calculate_health_score(posted_at: datetime, source: str) -> int:
    """
    Calculate job freshness score (0-100).
    Newer jobs = higher score.
    """
    age = datetime.utcnow() - posted_at

    # Source-specific decay rates
    decay_rates = {
        "hackernews": 7,    # HN threads monthly, slow decay
        "arbeitnow": 14,    # Jobs stay up ~2 weeks
        "wellfound": 30,    # Startup jobs longer lifecycle
        "default": 14
    }

    half_life_days = decay_rates.get(source, decay_rates["default"])

    # Exponential decay formula
    score = 100 * (0.5 ** (age.days / half_life_days))
    return max(0, min(100, int(score)))
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (4-6 hours)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create `NormalizedJob` Pydantic model | 🔴 Critical | 1 hr | None |
| Create `JobDB` SQLAlchemy model | 🔴 Critical | 1 hr | NormalizedJob |
| Add Alembic migration for jobs table | 🔴 Critical | 0.5 hr | JobDB |
| Create `JobSourceRegistry` config | 🔴 Critical | 1 hr | None |
| Create base `JobScraper` abstract class | 🔴 Critical | 1 hr | NormalizedJob |
| Add `feedparser` to requirements | 🟡 High | 0.1 hr | None |

### Phase 2: API Scrapers (6-8 hours)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Implement `ArbeitnowScraper` | 🔴 Critical | 2 hr | Phase 1 |
| Implement `HackerNewsScraper` | 🔴 Critical | 3 hr | Phase 1 |
| Implement `RemoteOKScraper` (RSS) | 🟡 High | 2 hr | Phase 1 |
| Implement `SerpAPIScraper` (optional) | 🟢 Low | 2 hr | Phase 1 |

### Phase 3: Playwright Scrapers (15-20 hours)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Implement `WeWorkRemotelyScraper` | 🔴 Critical | 3 hr | Phase 1 |
| Implement `BraintrustScraper` | 🟡 High | 4 hr | Phase 1 |
| Implement `DevITjobsScraper` | 🟡 High | 4 hr | Phase 1 |
| Implement `JobicyScraper` | 🟠 Medium | 4 hr | Phase 1 |
| Implement `GitHubJobsScraper` | 🟠 Medium | 4 hr | Phase 1 |

### Phase 4: Firecrawl Scraper (4-6 hours)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Implement `WellfoundScraper` | 🔴 Critical | 5 hr | Phase 1 |
| Create Firecrawl extraction schema | 🔴 Critical | 1 hr | WellfoundScraper |

### Phase 5: Integration (6-8 hours)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create `/api/jobs` endpoint (list jobs) | 🔴 Critical | 2 hr | All scrapers |
| Create `/api/jobs/refresh` endpoint | 🔴 Critical | 2 hr | All scrapers |
| Implement job deduplication | 🟡 High | 2 hr | JobDB |
| Implement health scoring | 🟠 Medium | 1 hr | JobDB |
| Add cron job for periodic refresh | 🟠 Medium | 2 hr | Refresh endpoint |

---

## Recommended File Structure

```
apps/api/
├── app/
│   ├── models/
│   │   ├── job.py                    # NormalizedJob, Location, Salary
│   │   └── source.py                 # JobSource config
│   ├── db_models.py                  # Add JobDB model
│   └── routers/
│       ├── jobs.py                   # NEW: /api/jobs endpoints
│       └── sources.py                # NEW: /api/sources endpoints
├── services/
│   ├── job_scrapers/
│   │   ├── __init__.py               # Scraper registry
│   │   ├── base.py                   # Abstract JobScraper class
│   │   ├── api/
│   │   │   ├── arbeitnow.py
│   │   │   ├── hackernews.py
│   │   │   └── serpapi.py
│   │   ├── rss/
│   │   │   └── remoteok.py
│   │   ├── playwright/
│   │   │   ├── weworkremotely.py
│   │   │   ├── braintrust.py
│   │   │   ├── devitjobs.py
│   │   │   ├── jobicy.py
│   │   │   └── github_jobs.py
│   │   └── firecrawl/
│   │       └── wellfound.py
│   ├── job_normalizer.py             # Normalize raw data to NormalizedJob
│   ├── job_deduplicator.py           # Content hash deduplication
│   └── health_scorer.py              # Calculate freshness score
└── config/
    └── sources.py                    # Job source registry
```

---

## Total Effort Estimate

| Phase | Effort | Cumulative |
|-------|--------|------------|
| Phase 1: Core Infrastructure | 4-6 hrs | 4-6 hrs |
| Phase 2: API Scrapers | 6-8 hrs | 10-14 hrs |
| Phase 3: Playwright Scrapers | 15-20 hrs | 25-34 hrs |
| Phase 4: Firecrawl Scraper | 4-6 hrs | 29-40 hrs |
| Phase 5: Integration | 6-8 hrs | **35-48 hrs** |

**Total: 35-48 hours of development**

---

## Quick Wins (Start Here)

If you want to get scraping FAST, implement in this order:

1. **Arbeitnow API** (2 hrs) - Free, no auth, high-quality jobs
2. **HackerNews API** (3 hrs) - Free, tech-focused, simple API
3. **RemoteOK RSS** (2 hrs) - Free, remote-focused, RSS parsing
4. **We Work Remotely** (3 hrs) - Simple static HTML, Playwright
5. **Wellfound** (5 hrs) - Firecrawl already integrated, highest quality

These 5 sources get you **15,000+ jobs/month** for ~15 hours of work.

---

## Cost Summary (Monthly)

| Source | Method | Cost |
|--------|--------|------|
| HackerNews | API | $0 |
| Arbeitnow | API | $0 |
| RemoteOK | RSS | $0 |
| We Work Remotely | Playwright | $0 |
| Braintrust | Playwright | $0-5 |
| DevITjobs | Playwright | $0 |
| Jobicy | Playwright + Proxy | $5-10 |
| GitHub Jobs | Playwright | $0 |
| Wellfound | Firecrawl | $15 |
| Google Jobs | SerpAPI | $10 (optional) |
| **TOTAL** | | **$30-40/month** |

---

## Conclusion

Your python-scraper project provides an **excellent foundation** with:
- Production-ready async infrastructure
- Playwright and Firecrawl already integrated
- Bright Data proxy management built-in
- PostgreSQL persistence ready

The main gap is **job-specific scraper implementations** and a **unified job schema**.

**Recommendation:** Start with Phase 1 (core infrastructure) and Phase 2 (API scrapers) to quickly get 3 sources working, then progressively add Playwright scrapers in Phase 3.
