---
name: company-evaluation
description: |
  Evaluates companies using a 6-category scoring rubric.
  Use when researching a company to determine if it meets user requirements.
---

# Company Evaluation Skill

## Overview

This skill systematically researches and evaluates companies against user requirements across 6 categories: Compensation, Culture & Leadership, Family-Friendliness, Technical Fit, Industry & Mission, and Long-Term Potential.

## When to Use

- When a user wants to evaluate a company before applying
- Before investing time in an application process
- When comparing multiple companies or offers
- To identify companies on the exclusion list

## Workflow

### Pre-Flight Check

Before starting research:

1. Check if industry is on exclusion list (see [INDUSTRY_EXCLUSIONS.md](INDUSTRY_EXCLUSIONS.md))
2. If excluded, immediately return PASS recommendation
3. Otherwise, proceed with full evaluation

### Step 1: Gather Basic Information

Research and extract:

| Field | Source | Required |
|-------|--------|----------|
| Company Name | Provided | Yes |
| Industry | Website, LinkedIn | Yes |
| Company Size | LinkedIn, Crunchbase | Yes |
| Funding Stage | Crunchbase, news | Yes |
| Location/Remote | Job posting, website | Yes |
| Founded Year | Website, LinkedIn | Yes |

### Step 2: Research Each Category

Use web search to gather data for each scoring category. See [SCORING_RUBRIC.md](SCORING_RUBRIC.md) for detailed criteria.

**Search Queries to Use:**
```
"[Company Name]" Glassdoor reviews 2024 2025
"[Company Name]" parental leave policy
"[Company Name]" remote work culture
"[Company Name]" best places to work
"[Company Name]" CEO leadership style
"[Company Name]" layoffs OR restructuring
"[Company Name]" engineering culture blog
"[Company Name]" salary levels.fyi
```

### Step 3: Score Each Category

Apply the scoring rubric from [SCORING_RUBRIC.md](SCORING_RUBRIC.md):

| Category | Max Points | Weight |
|----------|------------|--------|
| Compensation | 20 | Critical |
| Culture & Leadership | 25 | Critical |
| Family-Friendliness | 20 | High |
| Technical Fit | 15 | Medium |
| Industry & Mission | 10 | Medium |
| Long-Term Potential | 10 | Low |

**Total: 100 points**

### Step 4: Identify Red Flags and Green Flags

**Red Flags** (may override positive score):
- Recent mass layoffs with poor handling
- Glassdoor rating below 3.0
- CEO approval below 50%
- Multiple harassment/discrimination lawsuits
- No parental leave policy
- Industry on exclusion list

**Green Flags**:
- "Best Places to Work" awards
- High Glassdoor rating (4.5+)
- Known for engineering excellence
- Parent-friendly policies highlighted
- Remote-first culture

### Step 5: Generate Recommendation

| Score Range | Recommendation | Action |
|-------------|----------------|--------|
| 80-100 | STRONG YES | Apply immediately |
| 65-79 | YES | Worth pursuing |
| 50-64 | MAYBE | Proceed with caution |
| Below 50 | PASS | Does not meet requirements |

## Output Format

```json
{
  "evaluation_id": "string",
  "company": "string",
  "evaluated_at": "ISO8601",
  "basic_info": {
    "industry": "string",
    "size": "string",
    "stage": "seed | series_a | series_b | series_c | public",
    "founded": "number",
    "location": "string",
    "remote_policy": "fully_remote | hybrid | onsite"
  },
  "scores": {
    "compensation": {
      "score": "number (0-20)",
      "details": {
        "salary_range": "string",
        "equity": "string",
        "benefits": "string"
      },
      "justification": "string"
    },
    "culture_leadership": {
      "score": "number (0-25)",
      "details": {
        "glassdoor_rating": "number",
        "ceo_approval": "number",
        "awards": ["string"]
      },
      "justification": "string"
    },
    "family_friendliness": {
      "score": "number (0-20)",
      "details": {
        "parental_leave_weeks": "number",
        "flexible_schedule": "boolean",
        "remote_work": "boolean"
      },
      "justification": "string"
    },
    "technical_fit": {
      "score": "number (0-15)",
      "details": {
        "tech_stack": ["string"],
        "engineering_blog": "boolean",
        "oss_contributions": "boolean"
      },
      "justification": "string"
    },
    "industry_mission": {
      "score": "number (0-10)",
      "details": {
        "industry_tier": "1 | 2 | 3 | excluded",
        "mission_alignment": "string"
      },
      "justification": "string"
    },
    "long_term_potential": {
      "score": "number (0-10)",
      "details": {
        "career_ladder": "string",
        "company_trajectory": "growing | stable | declining"
      },
      "justification": "string"
    }
  },
  "total_score": "number (0-100)",
  "flags": {
    "red": [{ "flag": "string", "severity": "warning | critical" }],
    "green": ["string"]
  },
  "recommendation": {
    "action": "strong_yes | yes | maybe | pass",
    "reasoning": "string"
  },
  "interview_questions": [
    "string - questions to ask based on research gaps"
  ],
  "sources": [
    { "name": "string", "url": "string" }
  ]
}
```

## Supporting Files

- [SCORING_RUBRIC.md](SCORING_RUBRIC.md) - Detailed scoring criteria for each category
- [INDUSTRY_EXCLUSIONS.md](INDUSTRY_EXCLUSIONS.md) - Industries that are automatically excluded

## Integration Points

- **Input**: Company name, optional job posting
- **Output**: Company evaluation JSON
- **Downstream**: fit-scoring

## Quality Checklist

Before outputting evaluation:

- [ ] Checked industry against exclusion list first
- [ ] All 6 categories scored with justification
- [ ] Red flags and green flags identified
- [ ] Sources cited for all claims
- [ ] Recommendation matches score range
- [ ] Interview questions address research gaps
