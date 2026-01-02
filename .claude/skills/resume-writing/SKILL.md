---
name: resume-writing
description: |
  Creates ATS-optimized, personalized resumes tailored to specific job postings.
  Outputs both Markdown and PDF formats using StoryBrand framework.
---

# Resume Writing Skill

## Overview

This skill creates highly personalized, ATS-optimized resumes tailored to specific job postings. It transforms user experience into targeted resumes that:

1. **Position the employer as the hero** (StoryBrand framework)
2. **Optimize for ATS systems** (2025 best practices)
3. **Extract and integrate keywords** from job descriptions
4. **Humanize the content** using authentic voice guidelines
5. **Output both Markdown and PDF formats** for immediate use

## When to Use

- When a fit-scoring skill returns APPLY or STRONG APPLY
- When a user requests a tailored resume for a specific job
- Before applying to any job posting
- When updating resume for a new target role

## Source Documents

Before creating a resume, load:

1. **User Profile**: Skills, experience, education, achievements
2. **Job Analysis**: From job-analysis skill output
3. **StoryBrand Guide**: [STORYBRAND.md](STORYBRAND.md)
4. **ATS Guidelines**: [ATS_OPTIMIZATION.md](ATS_OPTIMIZATION.md)
5. **Role Adaptations**: [ROLE_ADAPTATIONS.md](ROLE_ADAPTATIONS.md)

## Workflow

### Step 1: Analyze the Job Posting

Extract from job analysis:
- **Required skills** (hard skills, technologies, frameworks)
- **Preferred skills** (nice-to-haves)
- **Experience level** (years, seniority)
- **Company context** (startup, enterprise, industry)
- **Role type** (IC, lead, management)
- **Key responsibilities** (what they need done)
- **Pain points** (problems they're trying to solve)

Create a keyword priority list ordered by frequency and importance.

### Step 2: Select Resume Adaptation

Based on job analysis, choose primary adaptation:

| Job Type | Primary Focus | Lead With |
|----------|---------------|-----------|
| Full-Stack Developer | Rapid delivery, production apps | Shipping speed, end-to-end ownership |
| AI Engineer | Production AI, LLMs, RAG | AI products, LLM experience |
| Frontend Engineer | React/Next.js, UX, performance | UI/UX, performance metrics |
| Technical Lead | Team leadership, mentoring | Team management, delivery |
| Senior Software Engineer | Breadth of experience | Range and depth |
| Founding Engineer | 0-to-1 building, autonomy | Startup experience, ownership |

### Step 3: Apply StoryBrand Framework

See [STORYBRAND.md](STORYBRAND.md) for full details.

**The Employer is the Hero**
- Frame everything around what THEY need
- Show you understand THEIR problems
- Position yourself as the guide who helps them succeed

**Three Levels of Problems**
- External: "We need a developer to build features"
- Internal: "We're frustrated by slow delivery"
- Philosophical: "Quality software shouldn't take this long"

**Empathy + Authority**
- Empathy: "I understand your challenge because..."
- Authority: "I've solved this before by..."

### Step 4: Optimize for ATS

See [ATS_OPTIMIZATION.md](ATS_OPTIMIZATION.md) for full details.

**Keyword Integration**
- Use exact phrasing from job description
- Include both full terms and acronyms: "Large Language Models (LLMs)"
- Place high-priority keywords in: Summary > Skills > Experience
- Match the exact job title in headline/summary

**Formatting Rules**
- Single-column, chronological layout
- Standard fonts: Arial, Calibri, Times New Roman (10-12pt)
- Standard headers: "Professional Summary", "Experience", "Skills", "Education"
- NO tables, columns, images, icons, or text boxes
- Include full month/year and location for every role
- Keep to 2 pages maximum

### Step 5: Apply Human Voice Guidelines

**DO Use:**
- Active voice: "Built", "Led", "Delivered"
- Specific numbers: "8 weeks", "98% reduction", "$1,000/month"
- Transformation stories: Problem -> Solution -> Result
- First person implied (no "I" spam)

**DON'T Use (AI Buzzwords):**
- Spearheaded, Pioneered, Leveraged, Utilized
- Synergy, Innovative, Cutting-edge, Revolutionary
- Guru, Ninja, Rockstar, Wizard
- Passionate about, Fostered a culture of
- Game-changing, Disruptive, Best-in-class

### Step 6: Structure the Resume

```markdown
# [NAME]

**[Target Job Title]** | [Key Differentiator]

[Location] | [email] | [LinkedIn] | [GitHub]

---

## Professional Summary

[4-6 sentences using StoryBrand positioning]
- Opening: Who you help and what problems you solve
- Empathy: Show you understand their pain
- Authority: Demonstrate track record
- Unique value: What makes you different
- What you're seeking: Aligned with this role

---

## Core Competencies

| Category 1 | Category 2 | Category 3 |
|------------|------------|------------|
| Skill matching JD | Skill matching JD | Skill matching JD |
| Skill matching JD | Skill matching JD | Skill matching JD |

---

## Professional Experience

### [Job Title]
**[Company Name]** | [Location] | [Date Range]

[Context paragraph: Problem you solved]

- [Transformation: Problem -> Solution -> Result with metrics]
- [Transformation: Problem -> Solution -> Result with metrics]
- [Transformation: Problem -> Solution -> Result with metrics]

**Technologies:** [Matching job description keywords]

---

## Technical Skills

**Languages:** [List]
**Frontend:** [List]
**Backend:** [List]
**AI/ML:** [List]
**Cloud/DevOps:** [List]

---

## Certifications & Education

- **[Certification]**, [Issuer], [Year]
- **[Degree]**, [University], [Year]
```

### Step 7: Generate Output Files

**Markdown File:**
- Save as `resume.md` in output directory
- Clean markdown formatting
- Ready for conversion

**PDF Generation:**
```bash
pandoc "resume.md" \
  -o "resume.pdf" \
  --pdf-engine=pdflatex \
  -V geometry:margin=0.75in \
  -V fontsize=11pt \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue
```

**PDF Requirements:**
- Maximum 2 pages
- 0.75 inch margins
- 11pt font size
- Clickable links

## Output Format

```json
{
  "resume_id": "string",
  "job_id": "string",
  "user_id": "string",
  "created_at": "ISO8601",
  "adaptation_type": "full_stack | ai_engineer | frontend | tech_lead | senior | founding",
  "keywords_integrated": ["string"],
  "files": {
    "markdown": "path/to/resume.md",
    "pdf": "path/to/resume.pdf"
  },
  "optimization_notes": {
    "keywords_placed": [
      { "keyword": "string", "location": "summary | skills | experience" }
    ],
    "ats_compliance": {
      "single_column": true,
      "standard_headers": true,
      "no_graphics": true,
      "dates_present": true
    }
  },
  "quality_checks": {
    "page_count": 2,
    "no_ai_buzzwords": true,
    "metrics_present": true,
    "storybrand_applied": true
  }
}
```

## Supporting Files

- [STORYBRAND.md](STORYBRAND.md) - Full StoryBrand implementation guide
- [ATS_OPTIMIZATION.md](ATS_OPTIMIZATION.md) - 2025 ATS best practices
- [ROLE_ADAPTATIONS.md](ROLE_ADAPTATIONS.md) - Role-specific customization examples

## Quality Checklist

Before delivering:

### Content Quality
- [ ] Job title matches or closely aligns with posting
- [ ] Top 10 keywords from JD appear naturally
- [ ] Professional summary addresses employer's problems
- [ ] Most relevant experience appears first
- [ ] All metrics are specific (numbers, percentages, timeframes)
- [ ] No AI buzzwords remain
- [ ] Technologies match job requirements

### Formatting Quality
- [ ] Single column, ATS-compatible format
- [ ] Length is 2 pages maximum
- [ ] Contact information complete with working links
- [ ] Markdown renders correctly
- [ ] Horizontal rules separate major sections

### File Output
- [ ] Markdown file saved
- [ ] PDF generated successfully
- [ ] PDF is exactly 2 pages
- [ ] Both file paths confirmed
