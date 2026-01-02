---
name: recruiter-response
description: |
  Screens recruiter messages against job requirements and drafts authentic responses.
  Helps express interest with thoughtful questions or politely decline.
---

# Recruiter Response Skill

## Overview

This skill helps respond to recruiter outreach with authentic, personalized messages. It:

1. **Screens positions** against user job requirements
2. **Drafts responses** in authentic communication style
3. **Maintains conversation history** per recruiter
4. **Outputs two types of responses**: interested (with questions) or polite decline

## When to Use

- When receiving recruiter outreach messages
- When evaluating whether to respond to a job opportunity
- When drafting replies to recruiters
- When tracking ongoing recruiter conversations

## CRITICAL: Negotiation Strategy

### The #1 Mistake to Avoid

**Never ask about salary in initial outreach when:**
- Job posting says "competitive", "top of market" comp
- It's an early-stage startup (seed to Series B)
- A founder is reaching out directly
- You haven't demonstrated value yet

**Why this is a mistake:**
1. Shows you're more interested in money than the mission
2. Signals transactional mindset
3. Reveals your hand before you have leverage
4. Puts you in weaker negotiating position

### The Correct Strategy

```
WRONG: Ask salary -> Get answer -> Decide to invest effort
RIGHT: Evaluate company -> Invest effort -> Crush assignment -> THEN negotiate
```

**Your leverage is HIGHEST after they want you, not before.**

| Stage | Your Leverage | What to Do |
|-------|---------------|------------|
| Initial outreach | LOW | Show enthusiasm, demonstrate fit |
| Assignment received | MEDIUM | Complete it exceptionally |
| Post-assignment | HIGH | Now discuss compensation |
| Offer stage | HIGHEST | Negotiate from strength |

See [NEGOTIATION_STRATEGY.md](NEGOTIATION_STRATEGY.md) for full details.

## Workflow

### Step 1: Screen the Position

Evaluate against requirements:

#### Quick Qualification Check

| Criterion | Requirement | Weight |
|-----------|-------------|--------|
| **Remote** | Fully remote required | MUST HAVE |
| **Salary** | $180K+ floor | MUST HAVE |
| **Location** | USA-based | MUST HAVE |
| **Role Level** | Senior/Staff/Lead | MUST HAVE |

#### Industry Screen

**Hard No (Immediate Decline)**:
- Major Banks (traditional banking)
- Government / Federal Contractors
- Defense / Military Contractors
- Traditional Insurance
- Gambling / Tobacco
- Speculative Crypto/Web3

**Proceed with Caution**:
- Healthcare (innovative healthtech OK)
- Fintech (modern fintech with good culture OK)
- Big Tech/FAANG (only if specific team is exceptional)

**High Interest**:
- AI/ML platforms and tools
- Developer tools and infrastructure
- B2B SaaS
- E-commerce / marketplace platforms

### Step 2: Determine Response Type

#### Path A: Express Interest
Use when:
- Passes all MUST HAVE criteria
- Industry is acceptable
- Role aligns with target positions
- No red flags

#### Path B: Polite Decline
Use when:
- Fails any MUST HAVE criterion
- Industry is excluded
- Role doesn't match
- Multiple red flags

### Step 3: Draft the Response

## Response Templates

### Template A: Interested Response

```markdown
## Recruiter Message - [Date]

[Paste recruiter's message here]

---

## My Response - [Date]

Hey [Recruiter First Name],

[Opening line acknowledging something specific from their message]

[1-2 sentences on what caught your attention about the role]

Before I jump on a call, a few things I'd want to understand:

1. [Specific question about team, culture, or technical work]
2. [Question about growth or impact]
3. [Question about company stage or direction]

[Optional: Brief context on what you're looking for if relevant]

Happy to chat if these align. What works for you?

[Your name]
```

### Template B: Polite Decline

```markdown
## Recruiter Message - [Date]

[Paste recruiter's message here]

---

## My Response - [Date]

Hey [Recruiter First Name],

Thanks for reaching out - I appreciate you thinking of me for this.

After looking at the role, I don't think it's the right fit for where I'm focused right now. [Optional: One honest sentence about why without being negative]

I'm keeping my search focused on [brief description: e.g., "fully remote senior/staff roles at growth-stage companies building AI-native products"].

If something like that comes across your desk, I'd love to hear about it. Thanks again, and good luck finding the right person for this one.

[Your name]
```

### Template C: Assignment Response (Confident)

```markdown
Thanks for sending this over - I'm excited to dig in.

[Optional: Personal context that humanizes and creates connection]

I'll have the completed assignment to you by [specific date].

Looking forward to showing you what I can build.
```

## Voice Guidelines

### Core Principles

**Peer-Level, Not Supplicant**
- You're evaluating them as much as they're evaluating you
- Confident without being arrogant
- Ask questions that show you're discerning

**Authentic and Direct**
- No corporate-speak or hollow enthusiasm
- Say what you actually think
- Express genuine interest or genuine hesitation honestly

**Warm but Efficient**
- Recruiters are busy, respect their time
- Get to the point after brief warmth
- Use contractions naturally

### Signature Phrases

**Opening warmth**:
- "Thanks for reaching out - this caught my attention."
- "Appreciate you thinking of me for this."
- "This is interesting, and I have a few questions."

**Expressing interest with hedging**:
- "I'm curious about..."
- "What I'd want to understand better is..."
- "The [specific work] sounds compelling, but I'd need to know more about..."

**Polite decline pivots**:
- "I appreciate you thinking of me, but this one isn't quite the right fit."
- "After looking at this, I don't think it's the right match for where I'm focused."
- "I'm going to pass on this one, but I'd love to stay connected."

**Closing**:
- "Happy to jump on a quick call if you can share more on [specific question]."
- "Let me know, and we can find a time to chat."
- "Thanks again - good luck finding the right person for this."

### What NOT to Do

- No excessive enthusiasm ("I'm SO excited!!!")
- No groveling or over-thanking
- No buzzword-stuffing
- No generic templates that could apply to any job
- No asking questions you could answer from the JD
- No profanity in recruiter communications

## Output Format

```json
{
  "response_id": "string",
  "recruiter_name": "string",
  "company": "string",
  "role": "string",
  "first_contact": "ISO8601",
  "status": "interested | declined | pending",
  "screening": {
    "remote": { "pass": true, "note": "string" },
    "salary": { "pass": true, "note": "string" },
    "industry": { "pass": true, "tier": "1 | 2 | 3 | excluded" },
    "role_fit": { "pass": true, "note": "string" }
  },
  "recommendation": "express_interest | decline | ask_clarification",
  "response_draft": "string (markdown)",
  "files": {
    "conversation": "path/to/recruiter_thread.md"
  }
}
```

## File Format

```markdown
# Conversation with [Recruiter Name] - [Company Name]

**Recruiter**: [Full Name]
**Company**: [Company Name]
**Role**: [Job Title]
**First Contact**: [Date]
**Status**: [Interested / Declined / Pending]

---

## Screening Summary

| Criterion | Status | Notes |
|-----------|--------|-------|
| Remote | [check] | [details] |
| Salary | [check] | [details] |
| Industry | [check] | [details] |
| Role Fit | [check] | [details] |

**Recommendation**: [Express Interest / Decline / Ask for Clarification]

---

## Message Thread

### Recruiter Message - [Date]

[Original message]

---

### My Response - [Date]

[Your drafted response]

---
```

## Questions to Ask When Interested

### Technical & Product
- "What's the current tech stack, and is there room to influence it?"
- "What does success look like in the first 6 months?"
- "Are there other engineers working on this, or would I be building from scratch?"

### Culture & Team
- "How does the company handle parental leave and flexibility?"
- "Can you tell me about the engineering culture?"
- "What's the leadership style like?"

### Company Health
- "How is the company funded, and what's the runway look like?"
- "What's the team's turnover been like in the last year?"
- "Why is this role open - is it new or a backfill?"

## Supporting Files

- [NEGOTIATION_STRATEGY.md](NEGOTIATION_STRATEGY.md) - Full negotiation guidance and timing

## Quality Checklist

### Screening
- [ ] Checked all MUST HAVE criteria
- [ ] Identified industry category correctly
- [ ] Assessed role fit
- [ ] Noted any red flags

### Response Quality
- [ ] Personalized to specific message
- [ ] Uses natural, authentic voice
- [ ] Questions are specific and thoughtful
- [ ] Appropriate length
- [ ] No excessive enthusiasm or groveling
- [ ] Closes with clear next step

### File Management
- [ ] Checked for existing conversation file
- [ ] File naming follows convention
- [ ] Status is accurate
