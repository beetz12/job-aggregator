# Job Aggregator - Hackathon Demo Video Script (3:00)

## Video Overview
**Total Duration**: 3:00 (180 seconds)
**Platform**: Backend Reloaded Hackathon (Motia)
**Project**: Job Aggregator - Real-time AI-powered job aggregation platform

---

## SCENE 1: Problem & Solution (0:00 - 0:30)

### 0:00-0:05 - Opening Shot: Dashboard
**Visual**: Dashboard landing page with stats cards showing total jobs, sources, last updated
**Narration**: "Job hunting is broken. Developers waste hours checking dozens of job boards."

### 0:05-0:15 - Show Multiple Sources
**Visual**: Scroll to show source status widget (Arbeitnow, Reddit, Remotive, HackerNews)
**Narration**: "Job Aggregator unifies 4 free APIs into one real-time feed, built entirely on Motia."

### 0:15-0:25 - Show Real-Time Indicator
**Visual**: Navigate to /jobs, highlight the green "Live" indicator
**Narration**: "Jobs stream in real-time via WebSocket. No refresh needed - new opportunities appear instantly."

### 0:25-0:30 - Transition
**Visual**: Show job cards loading/displayed
**Narration**: "Let me show you how it works."

---

## SCENE 2: Live Demo - Job Discovery (0:30 - 1:00)

### 0:30-0:40 - Browse Jobs
**Visual**: Scroll through job listings on /jobs page
**Narration**: "Here's our unified job feed. Each job is normalized from different sources into a consistent format."

### 0:40-0:50 - Use Filters
**Visual**:
1. Type "react" in search box
2. Select "Remote only" toggle
3. Filter by source (e.g., "arbeitnow")
**Narration**: "Filter by skills, remote preference, or specific sources. Full-text search across all fields."

### 0:50-1:00 - Manual Refresh
**Visual**: Navigate to /sources, click refresh button on a source
**Narration**: "Trigger manual refreshes or let our cron job update every 30 minutes automatically."

---

## SCENE 3: Live Demo - Profile & Matching (1:00 - 1:45)

### 1:00-1:15 - Create Profile
**Visual**: Navigate to /profile, fill in form:
- Name: "Alex Chen"
- Email: "alex.chen@example.com"
- Skills: react, typescript, node, python, aws
- Experience: 5 years
- Seniority: Senior
- Remote Preference: Remote Only
- Preferred Locations: San Francisco, Remote
**Narration**: "Create your profile with skills, experience, and preferences. This powers our matching algorithm."

### 1:15-1:30 - View Matched Jobs
**Visual**: Navigate to /matches after profile creation
- Show match scores (85%, 72%, 65%, etc.)
- Highlight the score breakdown tooltip
**Narration**: "Our 4-part scoring algorithm ranks jobs by skill match, seniority alignment, location fit, and salary expectations. No black boxes - see exactly why each job matches."

### 1:30-1:45 - AI Cover Letter Generation
**Visual**: Click on a high-match job, click "Generate Cover Letter" button
- Show the generated cover letter appearing
- Highlight "Matched Requirements" section
**Narration**: "Claude AI generates personalized cover letters in seconds. It maps your skills to job requirements automatically."

---

## SCENE 4: Live Demo - Application Tracking (1:45 - 2:15)

### 1:45-1:55 - Save Application
**Visual**: From the matched job, click "Save to Applications"
- Navigate to /applications
- Show the job appears with "Saved" status
**Narration**: "Track your job search journey. Save jobs, mark as applied, track interviews."

### 1:55-2:05 - Update Status
**Visual**: Click on the application, change status to "Applied"
- Show status badge change
- Add a note: "Applied via company website"
**Narration**: "Update status as you progress. Add notes, set follow-up dates."

### 2:05-2:15 - Follow-up Reminders
**Visual**: Show the follow-up date picker
- Brief shot of cron job info
**Narration**: "Our daily cron job sends follow-up reminders for applications 7+ days old. Never forget to follow up."

---

## SCENE 5: Tech Stack & Architecture (2:15 - 2:45)

### 2:15-2:25 - Motia Workbench (Optional)
**Visual**: Show terminal with Motia running, or a quick architecture diagram
**Narration**: "Built entirely on Motia - one runtime, one primitive. 13 API endpoints, 9 event steps, 2 cron jobs."

### 2:25-2:35 - Polyglot Highlight
**Visual**: Show code snippet of Python HackerNews parser alongside TypeScript
**Narration**: "TypeScript and Python in the same project. Motia's polyglot runtime lets you use the right tool for each job."

### 2:35-2:45 - Architecture Overview
**Visual**: Show the event flow diagram from README
```
CRON → fetch-jobs-trigger → Fetch Steps → normalize-job → index-job → Real-time Stream
```
**Narration**: "Event-driven architecture with built-in observability. APIs, background jobs, cron, streaming - unified."

---

## SCENE 6: Learnings & Closing (2:45 - 3:00)

### 2:45-2:52 - Key Learnings
**Visual**: Return to dashboard, show everything working together
**Narration**: "Motia simplified everything. No separate queue system, no external state store, no complex deployment."

### 2:52-2:58 - Impact Statement
**Visual**: Show the real-time job count updating (if possible)
**Narration**: "Real-world impact: One unified platform for job seekers, powered by AI, built in days not months."

### 2:58-3:00 - Closing
**Visual**: Dashboard with project name visible
**Narration**: "Job Aggregator. Built for Backend Reloaded with Motia."

---

## Sample Candidate Profile for Demo

```json
{
  "name": "Alex Chen",
  "email": "alex.chen@example.com",
  "skills": ["react", "typescript", "node.js", "python", "aws", "docker", "postgresql"],
  "experienceYears": 5,
  "seniorityLevel": "senior",
  "preferredLocations": ["San Francisco", "Remote", "New York"],
  "remotePreference": "remote-only",
  "salaryExpectation": {
    "min": 150000,
    "max": 200000,
    "currency": "USD"
  }
}
```

---

## Recording Tips

1. **Resolution**: 1920x1080 or 1280x720
2. **Browser**: Chrome/Edge in incognito (clean UI)
3. **Zoom**: 110% browser zoom for visibility
4. **Cursor**: Use a cursor highlighter tool
5. **Pace**: Deliberate movements, pause on key features
6. **Audio**: Record narration separately or use text overlays

---

## Key Moments for Screenshots

| Timestamp | Scene | Screenshot Name |
|-----------|-------|-----------------|
| 0:05 | Dashboard overview | `01-dashboard.png` |
| 0:15 | Source status | `02-sources.png` |
| 0:20 | Jobs page with Live indicator | `03-jobs-live.png` |
| 0:45 | Filtered results | `04-jobs-filtered.png` |
| 1:10 | Profile form | `05-profile-form.png` |
| 1:25 | Match scores | `06-matches.png` |
| 1:40 | Cover letter | `07-cover-letter.png` |
| 2:00 | Application tracking | `08-applications.png` |
| 2:30 | Architecture diagram | `09-architecture.png` |
| 3:00 | Final dashboard | `10-closing.png` |
