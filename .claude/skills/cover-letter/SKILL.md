---
name: cover-letter
description: |
  Creates personalized, authentic cover letters using Andrew Askins' communication style.
  Peer-level, honest, no corporate speak. Outputs Markdown and PDF.
---

# Cover Letter Skill

## Overview

This skill creates highly personalized cover letters that:

1. **Use authentic voice** - peer-level, honest, no corporate speak
2. **Connect specific experience** to job requirements
3. **Open with a hook** - either vulnerability or direct relevance
4. **Position user as a peer**, not a supplicant
5. **Output both Markdown and PDF formats** for immediate use

## When to Use

- After resume-writing has created a tailored resume
- When applying to jobs with cover letter option
- When personalization will differentiate the application
- For roles where culture fit matters

## Source Documents

Before creating a cover letter, load:

1. **Voice Guide**: [ANDREW_ASKINS_VOICE.md](ANDREW_ASKINS_VOICE.md)
2. **User Profile**: Experience, achievements, motivations
3. **Job Analysis**: From job-analysis skill output
4. **Tailored Resume**: If available, for consistency

## Workflow

### Step 1: Analyze the Job Posting

Extract from job description:
- **Company name** and what they do
- **Role title** and key responsibilities
- **Required skills** (must-haves)
- **Company culture signals** (startup, enterprise, AI-native, etc.)
- **Pain points** they're trying to solve
- **Unique aspects** that differentiate this role

Identify 2-3 things that make the user an exceptional fit.

### Step 2: Find the Hook

Every cover letter needs a compelling opening. Choose one approach:

**Hook Type A: Direct Relevance**
Use when user has built something directly related to what they're building.

```
I built an AI interview prep tool as a side project. Users talk to an AI avatar in
real-time, practice tough questions, get feedback.

Then I saw your posting for [Role].
```

**Hook Type B: Vulnerability + Insight**
Use when sharing a personal realization that connects to the role.

```
I used to think the best code was the cleverest code. Took me 10 years to learn
that the best code is the code your team can actually maintain at 2am when
production is down.
```

**Hook Type C: Contrarian Observation**
Use when you have a unique perspective on their industry/problem.

```
Most "AI implementations" I see are just API calls with a chatbot skin.
No real intelligence, no actual value. I've spent the last two years
figuring out what separates AI that works from AI that demos well.
```

**Hook Type D: Specific Achievement**
Use when you have a metric or accomplishment that directly maps to their needs.

```
8 weeks. That's how long it took me to build [Product] from scratch -
a production AI SaaS that's now processing real customer orders.
When I saw you're looking for someone who can ship fast without
breaking things, I thought we should talk.
```

### Step 3: Apply Voice Style

See [ANDREW_ASKINS_VOICE.md](ANDREW_ASKINS_VOICE.md) for full details.

**Core Voice Principles:**

| Do This | Not This |
|---------|----------|
| "I built an AI interview tool" | "I spearheaded the development of an innovative AI-powered solution" |
| "Here's the honest version" | "I am excited to apply for this opportunity" |
| "I don't have X, but I've done Y" | "While I may lack X, I am confident my transferable skills..." |
| "If what I've described sounds useful" | "I would welcome the opportunity to discuss how I can contribute" |
| "I'd love to talk" | "I eagerly await the opportunity to speak with you" |

**Tone Markers:**
- Use contractions (I'm, I've, that's, it's)
- Use dashes for asides - like this
- Keep paragraphs short (2-4 sentences max)
- One-sentence paragraphs for emphasis
- No exclamation points in body text

### Step 4: Structure the Cover Letter

```markdown
# Cover Letter - [Role Title], [Company Name]

[HOOK - 1-3 sentences that grab attention]

[Optional: One line that connects hook to the job posting]

---

[CONTEXT paragraph: Honest summary of background, 3-4 sentences]

[WHAT I BRING section: 3-4 bullet points or short paragraphs with bold headers]

**[Point 1 header].** [1-2 sentences]

**[Point 2 header].** [1-2 sentences]

**[Point 3 header].** [1-2 sentences]

**[Point 4 header - optional gap acknowledgment].** [1-2 sentences]

---

[CLOSE: 2-3 sentences, peer-level, invitation to talk]

[Name]
[Email]
```

**Length Guidelines:**
- **Target**: 300-500 words
- **Minimum**: 250 words
- **Maximum**: 600 words

### Step 5: Generate Output Files

**Markdown File:**
- Save as `cover_letter.md` in output directory

**PDF Generation:**
```bash
pandoc "cover_letter.md" \
  -o "cover_letter.pdf" \
  --pdf-engine=pdflatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  -V colorlinks=true
```

**PDF Requirements:**
- Target 1 page
- 1 inch margins
- 11pt font

## Output Format

```json
{
  "cover_letter_id": "string",
  "job_id": "string",
  "user_id": "string",
  "created_at": "ISO8601",
  "hook_type": "direct_relevance | vulnerability | contrarian | achievement",
  "word_count": "number",
  "key_points_highlighted": ["string"],
  "gaps_acknowledged": ["string"],
  "files": {
    "markdown": "path/to/cover_letter.md",
    "pdf": "path/to/cover_letter.pdf"
  }
}
```

## Signature Phrases to Use

**Opening pivots:**
- "Here's the honest version of my background:"
- "I'm not going to pretend that's a coincidence."
- "That caught my attention."

**Value statements:**
- "What I'd bring to [Company]:"
- "I've already solved adjacent problems."
- "I lead by building alongside teams, not from an ivory tower."

**Gap acknowledgments:**
- "I'm honest about what I don't know."
- "I haven't worked with X specifically - but I've done plenty of Y."
- "I'd rather tell you that upfront than pretend I'm an expert in everything."

**Closes:**
- "If what I've described sounds useful, I'd love to talk."
- "I'm looking for a role where I can [specific value]. This sounds like exactly that."
- "Happy to dig deeper on any of this."

## Anti-Patterns (Never Do These)

| Never Write | Why It Fails |
|-------------|--------------|
| "I am excited to apply for..." | Generic, supplicant positioning |
| "I believe I would be a great fit..." | Vague, unsubstantiated |
| "Leveraging my skills..." | Corporate buzzword |
| "I am passionate about..." | Overused, performative |
| "I would welcome the opportunity..." | Formal, distant |
| "Please find attached my resume..." | Administrative, not human |
| "I look forward to hearing from you" | Passive, generic close |
| "Thank you for your consideration" | Supplicant, not peer |

## Supporting Files

- [ANDREW_ASKINS_VOICE.md](ANDREW_ASKINS_VOICE.md) - Full voice and style guide

## Quality Checklist

Before delivering:

### Voice & Style
- [ ] Opens with a hook (not "I am excited to apply")
- [ ] Uses contractions naturally (I'm, I've, that's)
- [ ] No corporate buzzwords (leveraged, synergy, passionate)
- [ ] Paragraphs are short (2-4 sentences)
- [ ] Peer positioning, not supplicant
- [ ] Ends with invitation to talk, not "thank you for your consideration"

### Content
- [ ] Connects specific experience to job requirements
- [ ] Includes 3-4 concrete value points
- [ ] Acknowledges gaps honestly (if relevant)
- [ ] Personalized to this specific role (not generic)
- [ ] Length is 300-500 words

### Files
- [ ] Markdown saved
- [ ] PDF generated successfully
- [ ] PDF is 1 page
