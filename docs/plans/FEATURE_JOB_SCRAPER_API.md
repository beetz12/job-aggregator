# Job Scraper API - Implementation Plan

**Date**: 2025-12-31
**Author**: Claude AI
**Status**: Ready for Implementation
**Type**: Feature
**Confidence**: 90%
**Research Method**: Multi-agent parallel analysis (3 agents + 2 Perplexity Deep searches)

---

## Table of Contents
- [Executive Summary](#executive-summary)
- [System Architecture](#system-architecture)
- [Python Scraper API Specification](#python-scraper-api-specification)
- [Job Sources to Implement](#job-sources-to-implement)
- [Implementation Guide](#implementation-guide)
- [API Contract](#api-contract)
- [Detailed Scraper Specifications](#detailed-scraper-specifications)
- [Testing Strategy](#testing-strategy)
- [Deployment](#deployment)

---

## Executive Summary

### What We're Building

A **Job Aggregator Platform** that collects job listings from 10 different sources into a unified, searchable feed. The system uses a **microservices architecture** with two main components:

1. **Python Scraper API** (this document) - External service that handles raw job extraction
2. **Job Aggregator (Motia)** - Main application that normalizes, stores, and serves jobs

### Why This Architecture?

Based on 2025 industry research:
- **Fault Isolation**: Scraping is volatile (sites change, anti-bot evolves). Isolating it protects the main app.
- **Scalability**: Scraping is CPU/network intensive; aggregation is I/O intensive. Different scaling profiles.
- **Reusability**: Scraper API can serve multiple projects.

### Your Role (Python Scraper API)

You are building the **data extraction layer**. Your API:
- Scrapes 10 job board websites
- Handles proxy rotation and anti-bot evasion
- Returns **raw JSON** (NOT normalized)
- Does NOT store jobs (that's Motia's job)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        JOB AGGREGATOR (Motia Backend)                        │
│                        Location: /Users/dave/Work/job-aggregator             │
│  ┌──────────────────┐   ┌───────────────────┐   ┌────────────────────────┐  │
│  │ Cron Step        │──▶│ Event Steps       │──▶│ Motia State            │  │
│  │ (every 30 min)   │   │ - normalize       │   │ - jobs storage         │  │
│  │ Triggers refresh │   │ - deduplicate     │   │ - dedup hashes         │  │
│  │                  │   │ - calculate health│   │ - source status        │  │
│  └──────────────────┘   └───────────────────┘   └────────────────────────┘  │
│           │                                               ▲                  │
│           │ HTTP POST /api/jobs/scrape                    │                  │
│           │ { source: "arbeitnow", limit: 50 }            │ Store normalized │
└───────────┼───────────────────────────────────────────────┼──────────────────┘
            │                                               │
            ▼                                               │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PYTHON SCRAPER API (This Service)                     │
│                        Location: /Users/dave/Work/python-scraper/apps/api    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         FastAPI Application                           │   │
│  │  POST /api/jobs/scrape     - Scrape jobs from a source               │   │
│  │  GET  /api/jobs/sources    - List available sources                  │   │
│  │  GET  /api/jobs/health     - Health check                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Scraper Registry                              │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │ Arbeitnow   │ │ HackerNews  │ │ RemoteOK    │ │ Wellfound   │    │   │
│  │  │ (API)       │ │ (API)       │ │ (RSS)       │ │ (Firecrawl) │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │ WeWork      │ │ Braintrust  │ │ DevITjobs   │ │ Jobicy      │    │   │
│  │  │ Remotely    │ │ (Playwright)│ │ (Playwright)│ │ (Playwright)│    │   │
│  │  │ (Playwright)│ │             │ │             │ │             │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  │  ┌─────────────┐                                                     │   │
│  │  │ GitHub Jobs │                                                     │   │
│  │  │ (Playwright)│                                                     │   │
│  │  └─────────────┘                                                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Infrastructure                                │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │ Playwright  │ │ Firecrawl   │ │ Bright Data │ │ Stealth     │    │   │
│  │  │ (existing)  │ │ SDK         │ │ Proxy       │ │ Mode        │    │   │
│  │  │             │ │ (existing)  │ │ (existing)  │ │ (existing)  │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Returns: Raw JSON (NOT normalized) ────────────────────────────────────────▶│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Python Scraper API Specification

### Base URL
```
Production: https://scraper-api.yourdomain.com
Development: http://localhost:8000
```

### Existing Infrastructure (Already Built)

| Component | File | Description |
|-----------|------|-------------|
| FastAPI Framework | `app/main.py` | Entry point, CORS, middleware |
| Playwright | `services/js_renderer.py` | Browser automation for SPAs |
| Firecrawl SDK | `services/firecrawl_provider.py` | AI-powered scraping |
| Bright Data Proxy | `services/proxy_manager.py` | Residential proxy rotation |
| aiohttp | `services/custom_scraper/scraper.py` | Async HTTP client |
| Stealth Mode | `services/custom_scraper/stealth.py` | Anti-bot headers/delays |
| Selectolax | `services/custom_scraper/markdown_converter.py` | Fast HTML parsing |

### New Components to Build

```
apps/api/
├── app/
│   └── routers/
│       └── jobs.py                   # NEW: Job scraping endpoints
└── services/
    └── job_scrapers/
        ├── __init__.py               # Scraper registry
        ├── base.py                   # Abstract base class
        ├── models.py                 # RawJob Pydantic model
        ├── api/
        │   ├── __init__.py
        │   ├── arbeitnow.py          # REST API scraper
        │   ├── hackernews.py         # Firebase API scraper
        │   └── serpapi.py            # Google Jobs (optional)
        ├── rss/
        │   ├── __init__.py
        │   └── remoteok.py           # RSS feed scraper
        ├── playwright/
        │   ├── __init__.py
        │   ├── weworkremotely.py     # Static HTML
        │   ├── braintrust.py         # HubSpot pages
        │   ├── devitjobs.py          # Server-rendered React
        │   ├── jobicy.py             # React SPA
        │   └── github_jobs.py        # React SPA
        └── firecrawl/
            ├── __init__.py
            └── wellfound.py          # Firecrawl extraction
```

---

## API Contract

### POST /api/jobs/scrape

Scrape jobs from a specified source.

**Request:**
```json
{
    "source": "arbeitnow",
    "params": {
        "keyword": "python",
        "location": "remote",
        "category": "engineering"
    },
    "limit": 50
}
```

**Response (Success):**
```json
{
    "success": true,
    "source": "arbeitnow",
    "count": 47,
    "jobs": [
        {
            "source_id": "arbeitnow_abc123",
            "title": "Senior Python Developer",
            "company": "TechCorp Inc.",
            "company_url": "https://techcorp.com",
            "location_raw": "Remote, USA",
            "description_html": "<p>We are looking for an experienced Python developer...</p>",
            "description_text": "We are looking for an experienced Python developer...",
            "url": "https://arbeitnow.com/jobs/abc123",
            "posted_at": "2025-12-30T10:00:00Z",
            "salary_raw": "$150,000 - $200,000/year",
            "salary_min": 150000,
            "salary_max": 200000,
            "salary_currency": "USD",
            "employment_type": "full-time",
            "remote": true,
            "tags": ["python", "django", "postgresql", "aws"]
        }
    ],
    "scraped_at": "2025-12-31T12:00:00Z",
    "scrape_duration_ms": 2340
}
```

**Response (Error):**
```json
{
    "success": false,
    "source": "arbeitnow",
    "error": "Rate limited by source",
    "error_code": "RATE_LIMITED",
    "retry_after_seconds": 60
}
```

### GET /api/jobs/sources

List all available job sources.

**Response:**
```json
{
    "sources": [
        {
            "name": "arbeitnow",
            "display_name": "Arbeitnow",
            "type": "api",
            "enabled": true,
            "rate_limit_per_minute": 30,
            "requires_proxy": false,
            "supported_params": ["keyword", "location"],
            "estimated_jobs_per_scrape": 100
        },
        {
            "name": "wellfound",
            "display_name": "Wellfound (AngelList)",
            "type": "firecrawl",
            "enabled": true,
            "rate_limit_per_minute": 10,
            "requires_proxy": true,
            "supported_params": ["keyword", "location", "remote"],
            "estimated_jobs_per_scrape": 50
        }
    ]
}
```

### GET /api/jobs/health

Health check endpoint.

**Response:**
```json
{
    "status": "healthy",
    "version": "1.0.0",
    "scrapers": {
        "arbeitnow": "operational",
        "hackernews": "operational",
        "wellfound": "degraded",
        "weworkremotely": "operational"
    },
    "dependencies": {
        "playwright": "installed",
        "firecrawl": "connected",
        "bright_data_proxy": "connected"
    }
}
```

---

## RawJob Model (Pydantic)

```python
# services/job_scrapers/models.py

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum

class JobSource(str, Enum):
    ARBEITNOW = "arbeitnow"
    HACKERNEWS = "hackernews"
    REMOTEOK = "remoteok"
    WEWORKREMOTELY = "weworkremotely"
    BRAINTRUST = "braintrust"
    DEVITJOBS = "devitjobs"
    WELLFOUND = "wellfound"
    JOBICY = "jobicy"
    GITHUB = "github"

class RawJob(BaseModel):
    """
    Raw job data extracted from a source.
    This is NOT normalized - the Job Aggregator handles normalization.
    """
    # Required fields
    source_id: str = Field(..., description="Unique ID from the source (e.g., 'arbeitnow_abc123')")
    title: str = Field(..., description="Job title as displayed on source")
    company: str = Field(..., description="Company name")
    url: str = Field(..., description="Direct link to job posting")

    # Optional fields - extract if available
    company_url: Optional[str] = None
    location_raw: Optional[str] = Field(None, description="Location as displayed (e.g., 'Remote, USA')")
    description_html: Optional[str] = Field(None, description="Full description in HTML")
    description_text: Optional[str] = Field(None, description="Full description as plain text")
    posted_at: Optional[datetime] = Field(None, description="When job was posted (ISO 8601)")

    # Salary (extract if shown)
    salary_raw: Optional[str] = Field(None, description="Salary as displayed (e.g., '$150k - $200k')")
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = Field(default="USD")

    # Metadata
    employment_type: Optional[str] = Field(None, description="full-time, part-time, contract, etc.")
    remote: Optional[bool] = Field(None, description="Is this a remote position?")
    experience_level: Optional[str] = Field(None, description="entry, mid, senior, etc.")

    # Tags/Skills
    tags: List[str] = Field(default_factory=list, description="Tags from the source")

    class Config:
        json_schema_extra = {
            "example": {
                "source_id": "arbeitnow_abc123",
                "title": "Senior Python Developer",
                "company": "TechCorp",
                "url": "https://arbeitnow.com/jobs/abc123",
                "location_raw": "Remote, USA",
                "salary_raw": "$150,000 - $200,000/year",
                "remote": True,
                "tags": ["python", "django", "postgresql"]
            }
        }

class ScrapeRequest(BaseModel):
    """Request to scrape jobs from a source."""
    source: JobSource
    params: dict = Field(default_factory=dict, description="Source-specific parameters")
    limit: int = Field(default=50, ge=1, le=200)

class ScrapeResponse(BaseModel):
    """Response from a scrape operation."""
    success: bool
    source: str
    count: int = 0
    jobs: List[RawJob] = Field(default_factory=list)
    scraped_at: datetime
    scrape_duration_ms: int = 0
    error: Optional[str] = None
    error_code: Optional[str] = None
    retry_after_seconds: Optional[int] = None
```

---

## Job Sources to Implement

### Priority Order (User Confirmed: Playwright First)

| Phase | Source | Type | Complexity | Effort |
|-------|--------|------|------------|--------|
| 1 | Core Infrastructure | - | - | 4 hrs |
| 2.1 | We Work Remotely | Playwright | ⭐⭐ Low | 3 hrs |
| 2.2 | Braintrust | Playwright | ⭐⭐ Low-Med | 4 hrs |
| 2.3 | DevITjobs | Playwright | ⭐⭐ Low-Med | 4 hrs |
| 2.4 | Jobicy | Playwright | ⭐⭐⭐ Medium | 4 hrs |
| 2.5 | GitHub Jobs | Playwright | ⭐⭐⭐ Medium | 4 hrs |
| 3 | Wellfound | Firecrawl | ⭐⭐⭐⭐ High | 5 hrs |
| 4.1 | Arbeitnow | API | ⭐ Easy | 2 hrs |
| 4.2 | HackerNews | API | ⭐⭐ Low | 3 hrs |
| 4.3 | RemoteOK | RSS | ⭐ Easy | 2 hrs |

**Total: 35 hours for Python Scraper API**

---

## Detailed Scraper Specifications

### 1. Arbeitnow (API)

**Type:** REST API (no auth required)
**Endpoint:** `https://arbeitnow.com/api/job-board-api`
**Complexity:** ⭐ Easiest

```python
# services/job_scrapers/api/arbeitnow.py

class ArbeitnowScraper(BaseJobScraper):
    """
    Arbeitnow REST API scraper.
    Free API, no authentication required.
    """

    SOURCE = JobSource.ARBEITNOW
    BASE_URL = "https://arbeitnow.com/api/job-board-api"
    RATE_LIMIT = 30  # requests per minute
    REQUIRES_PROXY = False

    async def scrape(self, params: dict, limit: int = 50) -> List[RawJob]:
        async with aiohttp.ClientSession() as session:
            async with session.get(self.BASE_URL) as response:
                data = await response.json()

                jobs = []
                for item in data.get("data", [])[:limit]:
                    jobs.append(RawJob(
                        source_id=f"arbeitnow_{item['slug']}",
                        title=item["title"],
                        company=item["company_name"],
                        company_url=item.get("company_url"),
                        url=item["url"],
                        location_raw=item.get("location", ""),
                        description_html=item.get("description", ""),
                        posted_at=parse_date(item.get("created_at")),
                        remote=item.get("remote", False),
                        tags=item.get("tags", [])
                    ))

                return jobs
```

### 2. HackerNews (API)

**Type:** Firebase REST API
**Endpoint:** `https://hacker-news.firebaseio.com/v0/`
**Complexity:** ⭐⭐ Low (but requires comment parsing)

```python
# services/job_scrapers/api/hackernews.py

class HackerNewsScraper(BaseJobScraper):
    """
    HackerNews "Who is Hiring" thread scraper.
    Uses Firebase API to fetch thread and comments.
    Requires NLP/regex parsing to extract job details from comments.
    """

    SOURCE = JobSource.HACKERNEWS
    BASE_URL = "https://hacker-news.firebaseio.com/v0"
    RATE_LIMIT = 60  # requests per minute
    REQUIRES_PROXY = False

    # Monthly "Who is Hiring" threads
    WHO_IS_HIRING_USER = "whoishiring"

    async def find_latest_thread(self, session) -> int:
        """Find the latest 'Who is Hiring' thread ID."""
        # Search for recent threads by whoishiring user
        # Pattern: "Ask HN: Who is hiring? (Month Year)"
        pass

    async def parse_job_comment(self, comment_text: str) -> Optional[RawJob]:
        """
        Parse a job posting from a HN comment.

        Typical format:
        Company Name | Location | Remote | Tech Stack

        Description...

        Apply: email/link
        """
        # Use regex patterns to extract:
        # - Company name (first line, before |)
        # - Location (after first |)
        # - Remote status (contains "remote")
        # - URL (links in text)
        # - Tags (tech keywords)
        pass
```

### 3. We Work Remotely (Playwright)

**Type:** Static HTML
**URL:** `https://weworkremotely.com/`
**Complexity:** ⭐⭐ Low

```python
# services/job_scrapers/playwright/weworkremotely.py

class WeWorkRemotelyScraper(BaseJobScraper):
    """
    We Work Remotely scraper using Playwright.
    Static HTML - simple CSS selectors.
    """

    SOURCE = JobSource.WEWORKREMOTELY
    BASE_URL = "https://weworkremotely.com"
    RATE_LIMIT = 20
    REQUIRES_PROXY = False  # Low anti-bot

    SELECTORS = {
        "job_list": "section.jobs article li",
        "title": ".title",
        "company": ".company",
        "location": ".region",
        "link": "a[href*='/remote-jobs/']"
    }

    async def scrape(self, params: dict, limit: int = 50) -> List[RawJob]:
        keyword = params.get("keyword", "")
        url = f"{self.BASE_URL}/?search={keyword}" if keyword else self.BASE_URL

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="load")

            jobs = []
            job_elements = await page.query_selector_all(self.SELECTORS["job_list"])

            for el in job_elements[:limit]:
                title = await el.query_selector(self.SELECTORS["title"])
                company = await el.query_selector(self.SELECTORS["company"])
                link = await el.query_selector(self.SELECTORS["link"])

                if title and link:
                    href = await link.get_attribute("href")
                    jobs.append(RawJob(
                        source_id=f"wwr_{href.split('/')[-1]}",
                        title=await title.text_content(),
                        company=await company.text_content() if company else "Unknown",
                        url=f"{self.BASE_URL}{href}",
                        remote=True,
                        tags=["remote"]
                    ))

            await browser.close()
            return jobs
```

### 4. Braintrust (Playwright)

**Type:** HubSpot-based, clean HTML
**URL:** `https://www.usebraintrust.com/job-boards/{category}`
**Complexity:** ⭐⭐ Low-Medium

```python
# services/job_scrapers/playwright/braintrust.py

class BraintrustScraper(BaseJobScraper):
    """
    Braintrust job board scraper.
    HubSpot-based platform with clean, predictable HTML.
    150+ job board categories by tech stack, location, and role.
    """

    SOURCE = JobSource.BRAINTRUST
    BASE_URL = "https://www.usebraintrust.com/job-boards"
    RATE_LIMIT = 20
    REQUIRES_PROXY = False

    # Available categories
    CATEGORIES = [
        "frontend", "backend", "api", "javascript", "python",
        "react", "remote", "ai-ml", "usa", "engineering"
    ]

    async def scrape(self, params: dict, limit: int = 50) -> List[RawJob]:
        category = params.get("category", "remote")
        url = f"{self.BASE_URL}/{category}"

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle")

            # HubSpot generates clean HTML
            jobs = await page.query_selector_all('a[href*="/job/"], div.job-listing')

            results = []
            for job in jobs[:limit]:
                # Extract job details using flexible selectors
                title_el = await job.query_selector('.job-title, h3, h4')
                company_el = await job.query_selector('.company-name, .company')

                if title_el:
                    results.append(RawJob(
                        source_id=f"braintrust_{hash(await title_el.text_content())}",
                        title=await title_el.text_content(),
                        company=await company_el.text_content() if company_el else "Unknown",
                        url=await job.get_attribute("href") or url,
                        tags=[category]
                    ))

            await browser.close()
            return results
```

### 5. DevITjobs (Playwright)

**Type:** React (server-rendered)
**URL:** `https://devitjobs.com/jobs/{technology}/all/all`
**Complexity:** ⭐⭐ Low-Medium
**Bonus:** Transparent salary data, US + UK markets

```python
# services/job_scrapers/playwright/devitjobs.py

class DevITjobsScraper(BaseJobScraper):
    """
    DevITjobs scraper for US (.com) and UK (.uk) markets.
    Features transparent salary information.
    """

    SOURCE = JobSource.DEVITJOBS
    RATE_LIMIT = 20
    REQUIRES_PROXY = False

    # Technology categories
    TECHNOLOGIES = [
        "JavaScript", "Python", "Golang", "Java", "DevOps",
        "Machine-Learning", "Data", "Rust", "dotNET"
    ]

    async def scrape(self, params: dict, limit: int = 50) -> List[RawJob]:
        technology = params.get("technology", "JavaScript")
        region = params.get("region", "com")  # "com" for US, "uk" for UK

        url = f"https://devitjobs.{region}/jobs/{technology}/all/all"

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle")

            html = await page.content()
            soup = BeautifulSoup(html, 'html.parser')

            jobs = []
            for row in soup.select('table tr, a[href*="/jobs/"]'):
                title_el = row.select_one('td:first-child a, .job-title')
                company_el = row.select_one('td:nth-child(2), .company')
                salary_el = row.select_one('.salary, td:nth-child(3)')

                if title_el:
                    jobs.append(RawJob(
                        source_id=f"devitjobs_{region}_{hash(title_el.text)}",
                        title=title_el.get_text(strip=True),
                        company=company_el.get_text(strip=True) if company_el else "Unknown",
                        url=f"https://devitjobs.{region}{title_el.get('href', '')}",
                        salary_raw=salary_el.get_text(strip=True) if salary_el else None,
                        tags=[technology.lower()]
                    ))

            await browser.close()
            return jobs[:limit]
```

### 6. Wellfound (Firecrawl)

**Type:** Apollo GraphQL + React SPA
**URL:** `https://wellfound.com/jobs`
**Complexity:** ⭐⭐⭐⭐ High (requires Firecrawl)

```python
# services/job_scrapers/firecrawl/wellfound.py

from firecrawl import FirecrawlApp

class WellfoundScraper(BaseJobScraper):
    """
    Wellfound (formerly AngelList) scraper using Firecrawl.

    Why Firecrawl:
    - Apollo GraphQL-powered (data in JavaScript variables)
    - React-heavy SPA with dynamic content loading
    - Aggressive anti-scraping measures
    - Plain Playwright returns empty divs
    """

    SOURCE = JobSource.WELLFOUND
    BASE_URL = "https://wellfound.com"
    RATE_LIMIT = 10  # Firecrawl rate limits
    REQUIRES_PROXY = True
    COST_PER_SCRAPE = 0.75  # Firecrawl pricing

    def __init__(self):
        self.firecrawl = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)

    async def scrape(self, params: dict, limit: int = 50) -> List[RawJob]:
        keyword = params.get("keyword", "software engineer")
        location = params.get("location", "")
        remote = params.get("remote", False)

        url = f"{self.BASE_URL}/jobs?search={keyword}"
        if location:
            url += f"&location={location}"
        if remote:
            url += "&remote=true"

        # Use Firecrawl's LLM extraction
        result = self.firecrawl.scrape_url(url, {
            'formats': ['json'],
            'extract': {
                'schema': {
                    'type': 'object',
                    'properties': {
                        'jobs': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'title': {'type': 'string'},
                                    'company': {'type': 'string'},
                                    'company_url': {'type': 'string'},
                                    'location': {'type': 'string'},
                                    'salary': {'type': 'string'},
                                    'equity': {'type': 'string'},
                                    'job_url': {'type': 'string'},
                                    'remote': {'type': 'boolean'},
                                    'description': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            }
        })

        jobs = []
        for item in result.get('data', {}).get('jobs', [])[:limit]:
            jobs.append(RawJob(
                source_id=f"wellfound_{hash(item['title'] + item['company'])}",
                title=item['title'],
                company=item['company'],
                company_url=item.get('company_url'),
                url=item.get('job_url', url),
                location_raw=item.get('location'),
                salary_raw=item.get('salary'),
                remote=item.get('remote', False),
                description_text=item.get('description'),
                tags=['startup', 'equity'] if item.get('equity') else ['startup']
            ))

        return jobs
```

---

## Base Scraper Class

```python
# services/job_scrapers/base.py

from abc import ABC, abstractmethod
from typing import List, Optional
from .models import RawJob, JobSource
import logging

logger = logging.getLogger(__name__)

class BaseJobScraper(ABC):
    """
    Abstract base class for all job scrapers.

    Each scraper must implement:
    - SOURCE: JobSource enum value
    - BASE_URL: str
    - RATE_LIMIT: int (requests per minute)
    - REQUIRES_PROXY: bool
    - scrape(): async method that returns List[RawJob]
    """

    SOURCE: JobSource
    BASE_URL: str
    RATE_LIMIT: int = 30
    REQUIRES_PROXY: bool = False

    @abstractmethod
    async def scrape(self, params: dict, limit: int = 50) -> List[RawJob]:
        """
        Scrape jobs from the source.

        Args:
            params: Source-specific parameters (keyword, location, etc.)
            limit: Maximum number of jobs to return

        Returns:
            List of RawJob objects
        """
        pass

    async def scrape_safe(self, params: dict, limit: int = 50) -> List[RawJob]:
        """Wrapper with error handling and logging."""
        try:
            logger.info(f"Scraping {self.SOURCE.value} with params={params}, limit={limit}")
            jobs = await self.scrape(params, limit)
            logger.info(f"Scraped {len(jobs)} jobs from {self.SOURCE.value}")
            return jobs
        except Exception as e:
            logger.error(f"Error scraping {self.SOURCE.value}: {e}")
            raise

    @classmethod
    def get_info(cls) -> dict:
        """Get scraper metadata."""
        return {
            "name": cls.SOURCE.value,
            "base_url": cls.BASE_URL,
            "rate_limit_per_minute": cls.RATE_LIMIT,
            "requires_proxy": cls.REQUIRES_PROXY
        }
```

---

## Scraper Registry

```python
# services/job_scrapers/__init__.py

from typing import Dict, Type, Optional
from .base import BaseJobScraper
from .models import JobSource

# Import all scrapers
from .api.arbeitnow import ArbeitnowScraper
from .api.hackernews import HackerNewsScraper
from .rss.remoteok import RemoteOKScraper
from .playwright.weworkremotely import WeWorkRemotelyScraper
from .playwright.braintrust import BraintrustScraper
from .playwright.devitjobs import DevITjobsScraper
from .playwright.jobicy import JobicyScraper
from .playwright.github_jobs import GitHubJobsScraper
from .firecrawl.wellfound import WellfoundScraper

# Registry of all available scrapers
SCRAPER_REGISTRY: Dict[JobSource, Type[BaseJobScraper]] = {
    JobSource.ARBEITNOW: ArbeitnowScraper,
    JobSource.HACKERNEWS: HackerNewsScraper,
    JobSource.REMOTEOK: RemoteOKScraper,
    JobSource.WEWORKREMOTELY: WeWorkRemotelyScraper,
    JobSource.BRAINTRUST: BraintrustScraper,
    JobSource.DEVITJOBS: DevITjobsScraper,
    JobSource.JOBICY: JobicyScraper,
    JobSource.GITHUB: GitHubJobsScraper,
    JobSource.WELLFOUND: WellfoundScraper,
}

def get_scraper(source: JobSource) -> Optional[BaseJobScraper]:
    """Get a scraper instance by source."""
    scraper_class = SCRAPER_REGISTRY.get(source)
    if scraper_class:
        return scraper_class()
    return None

def list_sources() -> list:
    """List all available sources with metadata."""
    return [
        scraper_class.get_info()
        for scraper_class in SCRAPER_REGISTRY.values()
    ]
```

---

## FastAPI Router

```python
# app/routers/jobs.py

from fastapi import APIRouter, HTTPException
from datetime import datetime
import time
from services.job_scrapers import get_scraper, list_sources
from services.job_scrapers.models import ScrapeRequest, ScrapeResponse, JobSource

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_jobs(request: ScrapeRequest) -> ScrapeResponse:
    """
    Scrape jobs from a specified source.

    This endpoint is called by the Job Aggregator (Motia) to fetch raw job data.
    The response contains raw, un-normalized job data.
    """
    start_time = time.time()

    scraper = get_scraper(request.source)
    if not scraper:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source: {request.source}"
        )

    try:
        jobs = await scraper.scrape_safe(request.params, request.limit)

        duration_ms = int((time.time() - start_time) * 1000)

        return ScrapeResponse(
            success=True,
            source=request.source.value,
            count=len(jobs),
            jobs=jobs,
            scraped_at=datetime.utcnow(),
            scrape_duration_ms=duration_ms
        )

    except Exception as e:
        return ScrapeResponse(
            success=False,
            source=request.source.value,
            scraped_at=datetime.utcnow(),
            error=str(e),
            error_code="SCRAPE_FAILED"
        )

@router.get("/sources")
async def get_sources():
    """List all available job sources."""
    return {"sources": list_sources()}

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "scrapers": {
            source.value: "operational"
            for source in JobSource
        }
    }
```

---

## How the Job Aggregator Will Call This API

The Job Aggregator (Motia backend at `/Users/dave/Work/job-aggregator`) will call the Python Scraper API like this:

```typescript
// apps/backend/src/services/scraper-client.ts

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:8000';

interface ScrapeRequest {
  source: string;
  params: Record<string, any>;
  limit: number;
}

interface RawJob {
  source_id: string;
  title: string;
  company: string;
  url: string;
  location_raw?: string;
  description_html?: string;
  posted_at?: string;
  salary_raw?: string;
  remote?: boolean;
  tags: string[];
}

interface ScrapeResponse {
  success: boolean;
  source: string;
  count: number;
  jobs: RawJob[];
  scraped_at: string;
  error?: string;
}

export async function scrapeJobs(request: ScrapeRequest): Promise<ScrapeResponse> {
  const response = await fetch(`${SCRAPER_API_URL}/api/jobs/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Scraper API error: ${response.status}`);
  }

  return response.json();
}

// Example usage in a Motia event step:
// const result = await scrapeJobs({
//   source: 'arbeitnow',
//   params: { keyword: 'python' },
//   limit: 50
// });
```

---

## Testing Strategy

### Unit Tests

```python
# tests/test_scrapers/test_arbeitnow.py

import pytest
from services.job_scrapers.api.arbeitnow import ArbeitnowScraper

@pytest.mark.asyncio
async def test_arbeitnow_scraper():
    scraper = ArbeitnowScraper()
    jobs = await scraper.scrape({}, limit=10)

    assert len(jobs) > 0
    assert len(jobs) <= 10

    for job in jobs:
        assert job.source_id.startswith("arbeitnow_")
        assert job.title
        assert job.company
        assert job.url.startswith("https://")
```

### Integration Tests

```bash
# Test the API endpoint
curl -X POST http://localhost:8000/api/jobs/scrape \
  -H "Content-Type: application/json" \
  -d '{"source": "arbeitnow", "params": {}, "limit": 5}'
```

---

## Deployment

### Environment Variables

```bash
# .env for python-scraper
SCRAPING_PROVIDER=custom
ENABLE_JS_RENDERING=true
BROWSER_HEADLESS=true

# Bright Data Proxy
BRIGHT_DATA_CUSTOMER_ID=your_customer_id
BRIGHT_DATA_ZONE=residential
BRIGHT_DATA_PASSWORD=your_password

# Firecrawl
FIRECRAWL_API_KEY=your_firecrawl_key

# Server
HOST=0.0.0.0
PORT=8000
```

### Docker

```dockerfile
# Already exists in python-scraper
# Just ensure Playwright browsers are installed
RUN playwright install chromium
```

### Railway/Render Deployment

The Python Scraper API should be deployed as a separate service:
- **Railway:** Deploy from `/Users/dave/Work/python-scraper`
- **Port:** 8000
- **Health Check:** `GET /api/jobs/health`

---

## Document Metadata

**Last Updated**: 2025-12-31
**Implementation Status**: Ready to Start
**Related Documents**:
- [Ranked Platforms](/docs/plans/ranked_platforms.md)
- [Gap Analysis](/docs/plans/GAP_ANALYSIS_JOB_SCRAPER.md)
- [Hackathon Feature Plan](/docs/plans/FEATURE_JOB_AGGREGATOR_HACKATHON.md)

**Change Log**:
- 2025-12-31 - Initial creation with full API specification
- 2025-12-31 - Added detailed scraper implementations
- 2025-12-31 - Added Job Aggregator integration examples
