---
name: job-analysis
description: |
  Parses job postings to extract requirements, signals, and red flags.
  Use when processing new job listings to understand what the role actually requires.
---

# Job Analysis Skill

## Overview

This skill parses job postings to extract structured data about requirements, signals, and red flags. It transforms unstructured job descriptions into actionable intelligence for downstream skills (profile-matching, fit-scoring).

## When to Use

- When a new job posting enters the system
- When a user wants to understand what a job actually requires
- Before running profile-matching or fit-scoring
- When comparing multiple job postings

## Workflow

### Step 1: Extract Basic Information

Parse the job posting for:

| Field | Example | Notes |
|-------|---------|-------|
| Title | Senior Software Engineer | Exact as posted |
| Company | Acme Corp | Company name |
| Location | Remote, USA | Location requirements |
| Salary Range | $180K-$220K | If disclosed |
| Employment Type | Full-time | FT/PT/Contract |
| Experience Level | Senior (5-7 years) | Inferred or stated |

### Step 2: Extract Requirements

Categorize requirements into three tiers:

#### Must-Have Requirements
Skills/experience explicitly marked as "required":
- Years of experience
- Specific technologies
- Degree requirements
- Certifications

#### Preferred Requirements
Skills/experience marked as "preferred", "nice-to-have", or "bonus":
- Additional technologies
- Industry experience
- Soft skills

#### Implied Requirements
Requirements inferred from context:
- Team size from "lead a team of X"
- Seniority from responsibilities
- Culture fit from language used

### Step 3: Identify Signals

#### Positive Signals
- Remote-first or distributed team mentions
- Equity/stock options mentioned
- Growth opportunities
- Modern tech stack
- Work-life balance mentions
- Parental leave highlighted
- Engineering culture emphasis

#### Negative Signals (Red Flags)
- "Fast-paced environment" (may indicate burnout culture)
- "Wear many hats" at large company (role confusion)
- Unclear responsibilities
- No salary range disclosed
- Excessive requirements (kitchen sink job posting)
- "Unlimited PTO" (may mean no PTO)
- "We're like a family" (boundary issues)

### Step 4: Keyword Analysis

Extract and prioritize keywords by frequency:

```
Primary Keywords (3+ mentions):
- React, TypeScript, Node.js

Secondary Keywords (2 mentions):
- AWS, PostgreSQL, GraphQL

Tertiary Keywords (1 mention):
- Docker, Redis, CI/CD
```

### Step 5: Role Classification

Classify the role type:

| Role Type | Indicators |
|-----------|------------|
| IC (Individual Contributor) | "Write code", "implement features" |
| Tech Lead | "Lead a team", "technical direction" |
| Manager | "Manage engineers", "1:1s", "hiring" |
| Founding Engineer | "First hire", "build from scratch" |
| Staff/Principal | "Cross-team impact", "technical vision" |

## Output Format

```json
{
  "job_id": "string",
  "parsed_at": "ISO8601",
  "basic_info": {
    "title": "string",
    "company": "string",
    "location": "string",
    "remote_policy": "fully_remote | hybrid | onsite",
    "salary_range": {
      "min": "number | null",
      "max": "number | null",
      "currency": "string"
    },
    "employment_type": "full_time | part_time | contract",
    "experience_level": "junior | mid | senior | staff | principal"
  },
  "requirements": {
    "must_have": [
      {
        "skill": "string",
        "years": "number | null",
        "category": "technical | domain | soft"
      }
    ],
    "preferred": [],
    "implied": []
  },
  "keywords": {
    "primary": ["string"],
    "secondary": ["string"],
    "tertiary": ["string"]
  },
  "signals": {
    "positive": [
      {
        "signal": "string",
        "evidence": "string"
      }
    ],
    "negative": [
      {
        "signal": "string",
        "severity": "warning | red_flag",
        "evidence": "string"
      }
    ]
  },
  "role_classification": {
    "type": "ic | tech_lead | manager | founding | staff",
    "confidence": "number (0-1)"
  },
  "analysis_notes": "string"
}
```

## Integration Points

- **Input**: Raw job posting text from aggregator
- **Output**: Structured job analysis JSON
- **Downstream**: profile-matching, fit-scoring, company-evaluation

## Quality Checklist

Before outputting analysis:

- [ ] All basic info fields extracted or marked null
- [ ] Requirements categorized into 3 tiers
- [ ] At least 3 keywords identified
- [ ] Both positive and negative signals evaluated
- [ ] Role type classified with confidence score
- [ ] Analysis notes explain any ambiguities
