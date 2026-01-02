---
name: profile-matching
description: |
  Matches user profiles to job requirements with semantic understanding.
  Use when evaluating how well a candidate fits a specific job posting.
---

# Profile Matching Skill

## Overview

This skill performs intelligent matching between a user's profile (resume, skills, experience) and job requirements extracted by the job-analysis skill. It uses semantic understanding to identify both direct matches and transferable experience.

## When to Use

- After job-analysis has processed a job posting
- When a user wants to know if they qualify for a role
- To generate match scores for job recommendations
- Before resume customization to identify gaps

## Workflow

### Step 1: Load User Profile

Retrieve the user's profile data:

```json
{
  "user_id": "string",
  "skills": [
    {
      "name": "React",
      "years": 5,
      "proficiency": "expert",
      "last_used": "2024"
    }
  ],
  "experience": [
    {
      "company": "Acme Corp",
      "title": "Senior Engineer",
      "start_date": "2020-01",
      "end_date": "2024-01",
      "responsibilities": ["..."],
      "achievements": ["..."]
    }
  ],
  "education": [],
  "certifications": [],
  "preferences": {
    "remote_only": true,
    "min_salary": 180000,
    "excluded_industries": []
  }
}
```

### Step 2: Direct Skill Matching

Match user skills against job requirements:

| Match Type | Definition | Score Impact |
|------------|------------|--------------|
| Exact Match | Same skill name | +10 points |
| Version Match | Same tech, different version | +8 points |
| Related Match | Similar technology | +5 points |
| No Match | Skill gap | 0 points |

#### Skill Relationship Map

```
React → React Native (related)
Node.js → Express, Fastify (child)
TypeScript → JavaScript (superset)
AWS → GCP, Azure (alternative)
PostgreSQL → MySQL, SQL Server (related)
Python → FastAPI, Django, Flask (child)
```

### Step 3: Experience Level Matching

Compare user experience to job requirements:

```
User: 5 years experience
Job requires: 3-7 years
Match: WITHIN_RANGE (+10)

User: 5 years experience
Job requires: 7+ years
Match: UNDERQUALIFIED (-5)

User: 10 years experience
Job requires: 3-5 years
Match: OVERQUALIFIED (0, flag for review)
```

### Step 4: Semantic Experience Matching

Analyze past responsibilities against job requirements:

**Job Requirement**: "Experience leading cross-functional teams"

**User Experience Check**:
- Title contains "Lead" or "Manager"? +5
- Responsibilities mention "coordinated with" or "worked across"? +3
- Team size mentioned (e.g., "team of 5")? +2

### Step 5: Gap Analysis

Identify missing qualifications:

```json
{
  "critical_gaps": [
    {
      "requirement": "Kubernetes experience",
      "importance": "must_have",
      "mitigation": "Docker experience is transferable"
    }
  ],
  "minor_gaps": [
    {
      "requirement": "GraphQL",
      "importance": "preferred",
      "mitigation": "REST API experience, quick learner"
    }
  ]
}
```

### Step 6: Calculate Match Score

Weighted scoring algorithm:

```
Total Score = (
  skill_match_score * 0.4 +
  experience_match_score * 0.3 +
  semantic_match_score * 0.2 +
  preference_alignment * 0.1
) / max_possible_score * 100
```

## Output Format

```json
{
  "match_id": "string",
  "user_id": "string",
  "job_id": "string",
  "calculated_at": "ISO8601",
  "overall_score": {
    "value": "number (0-100)",
    "confidence": "number (0-1)",
    "grade": "A | B | C | D | F"
  },
  "skill_matches": {
    "exact": [
      {
        "skill": "React",
        "user_level": "expert",
        "required_level": "proficient"
      }
    ],
    "related": [],
    "gaps": []
  },
  "experience_match": {
    "years_required": 5,
    "years_actual": 7,
    "status": "qualified | underqualified | overqualified"
  },
  "semantic_matches": [
    {
      "requirement": "Lead cross-functional teams",
      "evidence": "Led team of 4 engineers at Capital One",
      "confidence": 0.85
    }
  ],
  "gaps": {
    "critical": [],
    "minor": [],
    "mitigations": []
  },
  "preference_alignment": {
    "remote": { "match": true },
    "salary": { "match": true, "note": "In range" },
    "industry": { "match": true }
  },
  "recommendation": {
    "action": "apply | consider | skip",
    "reasoning": "string"
  }
}
```

## Score Interpretation

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 85-100 | Excellent fit, strong candidate |
| B | 70-84 | Good fit, minor gaps |
| C | 55-69 | Moderate fit, some preparation needed |
| D | 40-54 | Weak fit, significant gaps |
| F | 0-39 | Poor fit, not recommended |

## Integration Points

- **Input**: User profile + Job analysis JSON
- **Output**: Match score and gap analysis
- **Upstream**: job-analysis
- **Downstream**: fit-scoring, resume-writing

## Quality Checklist

Before outputting match:

- [ ] All must-have requirements evaluated
- [ ] Skill matches include relationship reasoning
- [ ] Experience level properly categorized
- [ ] Gap analysis includes mitigations
- [ ] Preference alignment checked
- [ ] Recommendation is actionable
