---
name: fit-scoring
description: |
  Synthesizes job analysis, profile matching, and company evaluation into a final recommendation.
  Use to generate the overall fit score and apply/skip decision.
---

# Fit Scoring Skill

## Overview

This skill synthesizes outputs from the Analysis Agent's other skills (job-analysis, profile-matching, company-evaluation) into a final, holistic fit score and recommendation. It acts as the decision engine that determines whether to pursue an opportunity.

## When to Use

- After job-analysis, profile-matching, and company-evaluation have run
- To generate a final apply/skip recommendation
- When ranking multiple opportunities
- To explain why an opportunity is or isn't a good fit

## Workflow

### Step 1: Collect Upstream Data

Gather outputs from:

1. **Job Analysis** - Requirements, signals, keywords
2. **Profile Matching** - Skill matches, gaps, experience fit
3. **Company Evaluation** - 6-category scores, flags

### Step 2: Apply Weights

Calculate weighted overall score:

```
Final Score = (
  profile_match_score * 0.40 +
  company_evaluation_score * 0.35 +
  signal_adjustment * 0.15 +
  preference_alignment * 0.10
)
```

### Step 3: Check Disqualifiers

Before calculating final score, check for automatic disqualifiers:

**Immediate PASS Triggers:**
- [ ] Industry on exclusion list
- [ ] Salary below minimum floor
- [ ] Not remote-friendly (if remote required)
- [ ] Critical skill gap with no mitigation
- [ ] Multiple critical red flags

If any disqualifier is true, return PASS regardless of score.

### Step 4: Calculate Signal Adjustment

Adjust score based on signals from job analysis:

| Signal Type | Adjustment |
|-------------|------------|
| Strong positive signals (3+) | +5 to +10 |
| Moderate positive signals (1-2) | +2 to +4 |
| Neutral | 0 |
| Warning signals (1-2) | -2 to -5 |
| Red flag signals (3+) | -10 to -20 |

### Step 5: Generate Recommendation

| Score Range | Recommendation | Action |
|-------------|----------------|--------|
| 85-100 | STRONG APPLY | High priority, apply immediately |
| 70-84 | APPLY | Good fit, worth pursuing |
| 55-69 | CONSIDER | Moderate fit, proceed with caution |
| 40-54 | WEAK | Significant concerns, low priority |
| 0-39 | SKIP | Does not meet requirements |

### Step 6: Generate Reasoning

Provide structured explanation:

```markdown
## Why This Score

### Strengths (+X points)
- Skill match: 85% of requirements met
- Company culture: 4.5 Glassdoor rating
- Remote-first policy aligns with preferences

### Concerns (-X points)
- Missing Kubernetes experience (preferred skill)
- Recent layoffs reported (minor red flag)

### Recommendation
[APPLY/SKIP/CONSIDER] because [1-2 sentence summary]
```

## Output Format

```json
{
  "fit_score_id": "string",
  "job_id": "string",
  "user_id": "string",
  "calculated_at": "ISO8601",
  "inputs": {
    "job_analysis_id": "string",
    "profile_match_id": "string",
    "company_evaluation_id": "string"
  },
  "component_scores": {
    "profile_match": {
      "raw_score": "number (0-100)",
      "weight": 0.40,
      "weighted_score": "number"
    },
    "company_evaluation": {
      "raw_score": "number (0-100)",
      "weight": 0.35,
      "weighted_score": "number"
    },
    "signal_adjustment": {
      "raw_adjustment": "number (-20 to +10)",
      "weight": 0.15,
      "weighted_adjustment": "number"
    },
    "preference_alignment": {
      "raw_score": "number (0-100)",
      "weight": 0.10,
      "weighted_score": "number"
    }
  },
  "disqualifiers_checked": {
    "industry_excluded": false,
    "salary_below_floor": false,
    "remote_mismatch": false,
    "critical_gap": false,
    "multiple_red_flags": false
  },
  "final_score": "number (0-100)",
  "recommendation": {
    "action": "strong_apply | apply | consider | weak | skip",
    "confidence": "number (0-1)",
    "priority": "high | medium | low | none"
  },
  "reasoning": {
    "strengths": [
      {
        "factor": "string",
        "impact": "+X points",
        "detail": "string"
      }
    ],
    "concerns": [
      {
        "factor": "string",
        "impact": "-X points",
        "detail": "string"
      }
    ],
    "summary": "string"
  },
  "next_steps": [
    {
      "action": "string",
      "priority": "high | medium | low"
    }
  ]
}
```

## Decision Matrix

### High Priority (STRONG APPLY)

```
Score >= 85 AND
No disqualifiers AND
Company evaluation >= 70 AND
Profile match >= 80
```

**Next Steps:**
1. Generate tailored resume immediately
2. Write cover letter
3. Apply within 24-48 hours

### Standard Priority (APPLY)

```
Score >= 70 AND < 85 AND
No disqualifiers AND
No more than 2 minor concerns
```

**Next Steps:**
1. Review concerns and prepare mitigations
2. Generate tailored resume
3. Apply within 1 week

### Low Priority (CONSIDER)

```
Score >= 55 AND < 70 AND
No hard disqualifiers AND
Concerns are addressable
```

**Next Steps:**
1. Research company further
2. Prepare interview questions about concerns
3. Apply if no better opportunities

### Skip (WEAK/SKIP)

```
Score < 55 OR
Any disqualifier present OR
Multiple unaddressable concerns
```

**Next Steps:**
- Log reason for skipping
- Do not invest application time

## Integration Points

- **Input**: job-analysis, profile-matching, company-evaluation outputs
- **Output**: Final fit score and recommendation
- **Downstream**: resume-writing, cover-letter (if APPLY recommendation)

## Quality Checklist

Before outputting fit score:

- [ ] All three upstream analyses available
- [ ] Disqualifiers explicitly checked
- [ ] Weights sum to 1.0
- [ ] Reasoning explains score drivers
- [ ] Recommendation matches score range
- [ ] Next steps are actionable
- [ ] Confidence score reflects data quality
