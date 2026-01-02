---
name: question-answering
description: |
  Answers custom application questions using authentic voice.
  Draws from user experience, ensures different companies are used for different questions.
---

# Question Answering Skill

## Overview

This skill answers custom job application questions with:

1. **Authentic voice** - honest, peer-level, no corporate speak
2. **Specific examples** - concrete stories, not abstract claims
3. **Company diversity** - different questions use different companies
4. **Consistent formatting** - structured responses that are easy to read
5. **Integrated output** - saves to the application folder

## When to Use

- When job applications have custom questions beyond resume/cover letter
- When answering "Tell me about a time when..." questions
- When providing written responses to screening questions
- Before interviews to prepare answers

## CRITICAL: Company Diversity Rule

**Never use the same company to answer multiple questions in the same application.**

### Why This Matters

Using the same company for every answer:
- Suggests limited experience
- Makes responses feel repetitive
- Misses opportunity to show breadth
- Can trigger "this sounds made up" skepticism

### Implementation

**Before answering any question:**

1. Check if `application_responses.md` already exists
2. If yes, read it and note which companies have been used
3. Select a DIFFERENT company for the new answer

See [COMPANY_POOL.md](COMPANY_POOL.md) for the full list of companies and what stories each is best for.

## Question Categories & Story Mapping

### Category 1: Leadership & Team Management

**Common Questions:**
- "Tell us about a time you led a team through a complex project"
- "Describe your leadership style"
- "How do you handle conflict on your team?"

**Key Themes:**
- "I lead by building alongside teams, not from an ivory tower"
- "My job is to filter noise so engineers can focus"
- "I create clarity, not bureaucracy"

### Category 2: Technical Complexity & Problem Solving

**Common Questions:**
- "Describe a technically complex project you worked on"
- "Tell us about a difficult bug you solved"
- "How do you approach system design?"

**Key Themes:**
- "The hardest problems aren't always the most technically sophisticated"
- "I break complex problems into phases to reduce risk"
- "I've learned to question assumptions that everyone else accepts"

### Category 3: Quality & Process Improvement

**Common Questions:**
- "How have you improved engineering quality?"
- "Tell us about a process you introduced"
- "How do you handle technical debt?"

**Key Themes:**
- "I don't come in with a grand plan. I start by paying attention."
- "Working examples teach better than style guides"
- "Catching issues early is faster than fixing them later"

### Category 4: Speed & Delivery

**Common Questions:**
- "How do you balance speed with quality?"
- "Tell us about a time you shipped something quickly"
- "How do you prioritize under pressure?"

**Key Themes:**
- "Speed comes from knowing patterns, not cutting corners"
- "I've built the same things enough times to know what works"
- "AI tools make me 3-4x more productive without sacrificing quality"

### Category 5: Failure & Learning

**Common Questions:**
- "Tell us about a time you failed"
- "What's the biggest mistake you've made?"
- "How do you handle setbacks?"

**Key Themes:**
- "I used to think [wrong thing]. Then I learned [lesson]."
- "The mistake wasn't [obvious thing]. It was [deeper insight]."
- "What I'd do differently: [specific, actionable change]"

### Category 6: Communication & Stakeholder Management

**Common Questions:**
- "How do you communicate with non-technical stakeholders?"
- "Tell us about managing competing priorities"
- "How do you handle disagreements?"

**Key Themes:**
- "I create shared decision logs so everyone knows what was decided and why"
- "I focus on outcomes people care about, not technical details"
- "When teams disagree, I escalate quickly rather than letting it fester"

## Response Structure

### Standard Format

```markdown
## Question: [Full question text]

[Opening hook - 1-2 sentences that grab attention or establish context]

[Context paragraph - situation, company, role, stakes]

**[Section header - what you noticed/the problem]**

[2-4 sentences describing the problem with specifics]

**[Section header - what you did]**

**1. [First action with bold header]**

[1-2 sentences explaining this action]

**2. [Second action with bold header]**

[1-2 sentences explaining this action]

**3. [Third action with bold header]**

[1-2 sentences explaining this action]

**[Section header - the impact]**

[2-3 sentences with specific metrics where possible]

[Optional: More qualitative/human impact]

**What I'd do differently:**

[1-2 sentences showing self-awareness and growth]
```

### Length Guidelines

- **Target**: 400-600 words per question
- **Minimum**: 300 words
- **Maximum**: 800 words

## Voice Guidelines

### Opening Hooks

**Vulnerability/Honesty:**
```
"When I joined [Company], the dashboard was barely holding together as an MVP."
"I didn't come in with a grand plan. I started by paying attention."
```

**Contrarian/Insight:**
```
"The hardest project I've led wasn't the most technically sophisticated one."
"The biggest challenges weren't technical - they were organizational."
```

**Specific Achievement:**
```
"8 weeks. That's how long it took to go from concept to production."
"Within three months, development velocity improved 30%."
```

### Signature Phrases

**Problem identification:**
- "What I noticed:"
- "The real issue wasn't [obvious thing] - it was [deeper thing]"
- "I started by paying attention"

**Action description:**
- "Here's how I approached it:"
- "The changes I introduced:"
- "First, I stopped trying to [common mistake]. Instead, I [better approach]."

**Impact framing:**
- "The impact:"
- "More personally satisfying:"
- "I won't claim perfect measurement here, but..."

**Self-awareness:**
- "What I'd do differently:"
- "Honestly, the thing I cared about most was..."
- "I should have [learned lesson] earlier"

### Anti-Patterns

| Never Write | Why It Fails |
|-------------|--------------|
| "I spearheaded..." | Corporate buzzword |
| "I leveraged my skills..." | Vague, generic |
| "This experience taught me..." | Passive, lecture-y |
| "I believe in..." | Abstract, not demonstrated |
| "I'm passionate about..." | Overused, performative |
| "Successfully delivered..." | Generic, no story |

## Output Format

```json
{
  "response_id": "string",
  "job_id": "string",
  "user_id": "string",
  "created_at": "ISO8601",
  "questions": [
    {
      "question_text": "string",
      "category": "leadership | technical | quality | speed | failure | communication",
      "company_used": "string",
      "word_count": "number",
      "response": "string (markdown)"
    }
  ],
  "company_tracking": {
    "used": ["Company A - leadership", "Company B - technical"],
    "available": ["Company C", "Company D"]
  },
  "files": {
    "markdown": "path/to/application_responses.md"
  }
}
```

## File Format

```markdown
# [Company Name] Application Responses

<!-- COMPANY TRACKING (do not delete)
Q1: [Company] - [brief topic]
Q2: [Company] - [brief topic]
Q3: [Company] - [brief topic]
-->

---

## Question 1: [Full question text]

[Response]

---

## Question 2: [Full question text]

[Response]

---

*These are the kinds of problems I enjoy solving: not just technical puzzles, but the messy intersection of technology, people, and process. Happy to dig deeper on any of this.*
```

## Supporting Files

- [COMPANY_POOL.md](COMPANY_POOL.md) - Available companies and their best use cases

## Quality Checklist

Before delivering:

### Content
- [ ] Story is specific to one company (not blended)
- [ ] Includes concrete details (metrics, names, outcomes)
- [ ] Answers the actual question asked
- [ ] Shows both action AND reflection

### Voice
- [ ] Opens with a hook (not "In my experience...")
- [ ] Uses contractions naturally
- [ ] No corporate buzzwords
- [ ] Includes "What I'd do differently" section

### Company Diversity
- [ ] Different company from other questions in same application
- [ ] Company tracking section is updated
- [ ] Best company selected for question type

### Formatting
- [ ] Follows standard response structure
- [ ] Bold headers for actions
- [ ] 400-600 word count
- [ ] Consistent with other responses in file
