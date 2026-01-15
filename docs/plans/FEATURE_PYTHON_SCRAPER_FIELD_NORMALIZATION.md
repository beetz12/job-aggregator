# Python Scraper Field Alignment Plan

**Date**: 2026-01-02
**Author**: Claude AI
**Status**: NO CHANGES NEEDED
**Type**: Analysis
**Confidence**: 98%

---

## Overview

After analysis, the Python Scraper API already uses the correct field naming convention.

**Decision**: Use `snake_case` field names everywhere (Python, TypeScript, Database) for consistency and to follow 2025 best practices.

---

## Analysis Summary

### Current State

The Python scraper already outputs `snake_case` field names:

```python
# RawJob model in models.py (lines 503-547)
class RawJob(BaseModel):
    source_id: str
    title: str
    company: str
    url: str
    company_url: Optional[str]
    location_raw: Optional[str]
    description_html: Optional[str]
    description_text: Optional[str]
    posted_at: Optional[datetime]
    salary_raw: Optional[str]
    salary_min: Optional[float]
    salary_max: Optional[float]
    salary_currency: Optional[str]
    employment_type: Optional[str]
    remote: Optional[bool]
    experience_level: Optional[str]
    tags: List[str]
```

### 2025 Best Practice Research

| Layer | Convention | Status |
|-------|------------|--------|
| **PostgreSQL DB** | `snake_case` | Best practice |
| **Python API** | `snake_case` | PEP 8 standard |
| **TypeScript** | `snake_case` | Consistent (updating) |

**Decision**: Rather than having a conversion layer, we use `snake_case` everywhere for simplicity and consistency.

---

## Required Changes

### Python Scraper: NO CHANGES NEEDED

The Python scraper already:
- Uses `snake_case` field names in RawJob model
- All 22+ scrapers use consistent field names
- Output matches database column naming convention

### TypeScript Backend: CHANGES REQUIRED

See `PLAN_BACKEND_ERRORS_FIX.md` for TypeScript changes:
- Convert field names from `camelCase` to `snake_case`
- Add value normalization for `employment_type`, `experience_level`, etc.

---

## Value Normalization

**NOT done in Python** - The Python scraper passes through raw values from job board APIs.

**Done in TypeScript** - The backend normalizes values before database insertion:
- `"Full-Time"` → `"full-time"`
- `"Freelance"` → `"contract"`
- `"Entry Level"` → `"entry"`

This is handled by Option B in `PLAN_BACKEND_ERRORS_FIX.md`.

---

## Files Summary

| Project | File | Action |
|---------|------|--------|
| Python Scraper | All files | **NO CHANGES** |
| TypeScript Backend | See PLAN_BACKEND_ERRORS_FIX.md | **CHANGES REQUIRED** |

---

## Document Metadata

**Last Updated**: 2026-01-02
**Implementation Status**: Complete (no changes needed)
**Related Documents**:
- `PLAN_BACKEND_ERRORS_FIX.md` - TypeScript backend changes

**Change Log**:
- 2026-01-02 - Revised: No Python changes needed, TypeScript will adopt snake_case
- 2026-01-02 - Initial creation (value normalization approach - superseded)
