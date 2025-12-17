# Deep Work Command - Motia Job Aggregator

## Purpose
This command initiates a deep work session for complex, multi-step tasks in the Motia Job Aggregator application. It implements checkpoint-based progress tracking, comprehensive context management, and multi-agent orchestration to ensure task completion without scope drift.

## When to Use
Use `/deep-work` for:
- Building new Motia steps (API, Event, Cron steps)
- Implementing job scraping and aggregation pipelines
- Multi-step workflow implementations
- State management and caching strategies
- Real-time streaming features
- Python/TypeScript/JavaScript polyglot integrations
- Middleware development
- Performance optimization across steps
- Error handling and logging improvements
- Test coverage expansion
- Documentation updates across multiple files

Do NOT use for:
- Single file edits
- Simple bug fixes
- Quick configuration changes
- Ad-hoc queries

## Core Principles

### 1. Anti-Stopping Protocol
**NEVER stop mid-task due to:**
- Output length concerns -> Use session checkpoints
- Complexity -> Break into phases with checkpoints
- Uncertainty -> Document assumptions and proceed
- Multiple file changes -> Track in progress log

**Session Management:**
- Save progress to `.claude/sessions/deep-work-[timestamp].md`
- Each checkpoint includes: completed steps, current state, next steps
- Resume from last checkpoint if interrupted
- Session files remain until task fully complete

### 2. Checkpoint Architecture
```
Phase 1: Analysis & Planning
├─ Checkpoint A1: Codebase analyzed
├─ Checkpoint A2: Architecture documented
└─ Checkpoint A3: Implementation plan created

Phase 2: Implementation
├─ Checkpoint I1: Core step logic implemented
├─ Checkpoint I2: Error handling added
├─ Checkpoint I3: Logging integrated
└─ Checkpoint I4: Data validation complete

Phase 3: Quality & Integration
├─ Checkpoint Q1: Tests written
├─ Checkpoint Q2: Type safety verified
├─ Checkpoint Q3: Documentation updated
└─ Checkpoint Q4: Quality gates passed

Phase 4: Deployment & Handoff
├─ Checkpoint D1: Integration verified
├─ Checkpoint D2: Session log finalized
└─ Checkpoint D3: Handoff complete
```

### 3. Context Management
**Project Structure Awareness:**
```
/Users/dave/Work/job-aggregator/
├── .claude/
│   ├── agents/                # Claude subagents
│   │   └── motia-developer.md # Pre-configured Motia developer agent
│   └── sessions/              # Deep work checkpoints
├── .cursor/
│   ├── rules/motia/           # Motia step patterns & guides
│   │   ├── api-steps.mdc      # HTTP endpoint patterns
│   │   ├── event-steps.mdc    # Background processing patterns
│   │   ├── cron-steps.mdc     # Scheduled task patterns
│   │   ├── state-management.mdc # State/cache patterns
│   │   ├── middlewares.mdc    # Middleware patterns
│   │   └── realtime-streaming.mdc # WebSocket/SSE patterns
│   └── architecture/          # Architecture guides
│       ├── architecture.mdc   # Project structure, DDD patterns
│       └── error-handling.mdc # Error handling best practices
├── src/                       # Step definitions (auto-discovered)
│   ├── hello/                 # Example workflow
│   │   ├── hello-api.step.ts  # TypeScript API endpoint
│   │   └── log-greeting.step.js # JavaScript event handler
│   ├── api/                   # API endpoints (recommended)
│   ├── events/                # Event handlers (recommended)
│   ├── cron/                  # Scheduled tasks (recommended)
│   ├── services/              # Business logic
│   ├── repositories/          # Data access
│   └── utils/                 # Utilities
├── middlewares/               # Reusable middleware
├── python_modules/            # Python step dependencies
├── motia.config.ts            # Motia configuration
├── types.d.ts                 # Auto-generated types
├── requirements.txt           # Python dependencies
├── CLAUDE.md                  # Claude AI guide
├── AGENTS.md                  # AI development guide
└── README.md                  # Quick start guide
```

**Motia Data Flow Patterns:**
1. API Step -> Emit Event -> Event Step processes -> State updated
2. Cron Step -> Emit Event -> Event Step chain -> Workflow complete
3. API Step -> Direct Response (no emit for simple queries)
4. Event Step -> Emit another Event -> Multi-step workflow
5. State Management: ctx.state.get/set for cross-step data sharing

**Step Types:**
| Type | Trigger | Use Case |
|------|---------|----------|
| `api` | HTTP request | REST APIs, webhooks |
| `event` | Event emitted | Background jobs, workflows |
| `cron` | Schedule | Cleanup, reports, scraping |

### 4. Multi-Agent Orchestration

**Agent Delegation Matrix:**

| Task Type | Primary Agent | Support Agents | Handoff Format |
|-----------|---------------|----------------|----------------|
| Architecture analysis | code-archaeologist | documentation-specialist | "Analysis complete in [file]. Key findings: [summary]" |
| API Step development | motia-developer | api-architect | "Step ready at [path]. Integration needed for [scenarios]" |
| Event Step development | motia-developer | general-purpose | "Event step at [path]. Workflow tested." |
| Cron Step development | motia-developer | general-purpose | "Cron step at [path]. Schedule verified." |
| Python Steps | motia-developer | general-purpose | "Python step at [path]. Requirements updated." |
| State management | motia-developer | database-architect | "State patterns applied. Cache strategy documented." |
| Test coverage | test-strategy-specialist | general-purpose | "Test plan documented. Ready for implementation." |
| Documentation | documentation-specialist | code-archaeologist | "Docs updated for [component]. Technical review requested." |

**Important:** Use the pre-configured `motia-developer` subagent in `.claude/agents/` for Motia-specific coding tasks.

**Handoff Protocol:**
```markdown
## Handoff to [Agent Name]

**Context:** [What was done]
**Current State:** [Where things are now]
**Required Action:** [What needs to happen next]
**Files Modified:** [Absolute paths]
**Blockers:** [None / List any issues]
**Checkpoint:** [Latest checkpoint ID]
```

## Session Protocol

### Starting Deep Work
```bash
# Create session directory if not exists
mkdir -p /Users/dave/Work/job-aggregator/.claude/sessions/

# Session file naming
/Users/dave/Work/job-aggregator/.claude/sessions/deep-work-[YYYYMMDD-HHMM]-[task-slug].md
```

### Session File Structure
```markdown
# Deep Work Session: [Task Name]
**Started:** [Timestamp]
**Status:** [In Progress / Paused / Complete]
**Estimated Completion:** [Percentage]

## Objective
[Clear task description]

## Checkpoints Completed
- [x] A1: Codebase analyzed
- [x] A2: Architecture documented
- [ ] A3: Implementation plan created

## Current Phase
**Phase:** [Phase name]
**Working On:** [Specific subtask]
**Files In Progress:**
- /Users/dave/Work/job-aggregator/[file1.ts]
- /Users/dave/Work/job-aggregator/[file2.step.ts]

## Context Snapshot
**Key Decisions:**
- [Decision 1 with rationale]
- [Decision 2 with rationale]

**Assumptions:**
- [Assumption 1]
- [Assumption 2]

**Blockers/Questions:**
- [Any blockers or open questions]

## Next Steps
1. [Next immediate action]
2. [Following action]
3. [Subsequent action]

## Agent Handoffs
- [Timestamp] -> code-archaeologist: [Summary]
- [Timestamp] -> test-strategy-specialist: [Summary]

## Files Modified
- /Users/dave/Work/job-aggregator/[file1.ts] - [What changed]
- /Users/dave/Work/job-aggregator/[file2.step.ts] - [What changed]

## Artifacts Generated
- Session log: /Users/dave/Work/job-aggregator/.claude/sessions/[this-file]
- Test files: /Users/dave/Work/job-aggregator/tests/[tests]
- Documentation: /Users/dave/Work/job-aggregator/docs/[doc-files]
```

### Checkpoint Updates
After each checkpoint, update:
1. Checkpoints Completed list (check off completed items)
2. Current Phase section
3. Files Modified list
4. Next Steps (revise based on progress)
5. Commit checkpoint to session file

### Resuming Sessions
When resuming:
1. Read last session file
2. Review "Current Phase" and "Next Steps"
3. Verify "Files Modified" are in expected state
4. Continue from last checkpoint
5. Update session file immediately

## Quality Gates

### Motia Development Quality
```bash
# Start development server with hot reload
npm run dev

# Start production server (without hot reload)
npm run start

# Generate TypeScript types from step configs
npx motia generate-types

# Run tests
npm test

# Lint (if configured)
npm run lint
```

### Python Environment
```bash
# Install Python dependencies
pip install -r requirements.txt

# Verify Python steps are discovered
npm run dev  # Check Workbench for Python steps
```

**Quality Checklist:**
- [ ] All TypeScript types defined (no `any`)
- [ ] Step configs have proper schemas (Zod)
- [ ] Emits declared in config before use in handler
- [ ] `npx motia generate-types` run after config changes
- [ ] Steps follow naming conventions (`*.step.ts`, `*_step.py`)
- [ ] Error handling for external API failures
- [ ] Logging added for key operations
- [ ] API keys/secrets read from env (never hardcoded)
- [ ] State management uses proper TTL
- [ ] Workflows visible in Workbench

### Step Development Quality
- [ ] API steps return proper HTTP status codes
- [ ] Event steps handle errors gracefully
- [ ] Cron steps are idempotent
- [ ] Middleware applied where needed (auth, validation)
- [ ] Long-running tasks use Event steps, not API steps
- [ ] State accessed with proper error handling

### Polyglot Quality (TypeScript/Python/JavaScript)
- [ ] TypeScript: Uses strict types, no implicit any
- [ ] Python: Follows snake_case for step files
- [ ] JavaScript: ES modules syntax (import/export)
- [ ] Cross-language events use compatible schemas

## Task Completion Criteria

A deep work session is complete when:
1. **All checkpoints passed**
2. **Quality gates met**
3. **Tests written and passing**
4. **Documentation updated**
5. **Session log finalized**
6. **Integration verified in Workbench**
7. **Handoff notes prepared**

## Anti-Patterns to Avoid

**Don't:**
- Stop at "this is getting long" -> Use checkpoints
- Say "I'll let you review" mid-task -> Complete phase first
- Skip documentation -> Update as you go
- Assume file locations -> Use absolute paths
- Leave sessions open indefinitely -> Mark complete when done
- Hardcode API keys -> Always use environment variables
- Ignore error logging -> Log all significant operations
- Skip TypeScript types -> Define all interfaces
- Use API steps for background work -> Use Event steps
- Skip `generate-types` after config changes -> Always regenerate
- Forget to read `.cursor/rules/` guides -> Read before implementing

**Do:**
- Complete full checkpoint phases
- Save progress continuously
- Document decisions in session file
- Use absolute paths: `/Users/dave/Work/job-aggregator/...`
- Verify quality gates before moving forward
- Test step connections in Workbench
- Update session status accurately
- Clean up session files when task truly complete
- Read relevant `.cursor/rules/*.mdc` guides before implementing
- Use `motia-developer` subagent for Motia-specific tasks

## Example Session Flow

```markdown
# Deep Work Session: Implement Job Scraping Pipeline
**Started:** 2024-12-16 14:30
**Status:** In Progress
**Estimated Completion:** 40%

## Objective
Create a multi-step workflow that scrapes job listings from external
sources, processes them, and stores aggregated results in state.

## Checkpoints Completed
- [x] A1: Analyzed existing step patterns in codebase
- [x] A2: Documented scraping architecture approach
- [x] A3: Created step design for pipeline
- [x] I1: Implemented cron trigger step
- [ ] I2: Adding scraper event step
- [ ] I3: Implementing data normalization step
- [ ] Q1: Writing tests

## Current Phase
**Phase:** Implementation (Phase 2)
**Working On:** Job scraper event step with retry logic
**Files In Progress:**
- /Users/dave/Work/job-aggregator/src/events/scrape-jobs.step.ts

## Context Snapshot
**Key Decisions:**
- Using Event steps for scraping (long-running, not API)
- Storing results in state with 1-hour TTL
- Emitting events for each source to parallelize

**Assumptions:**
- External APIs are rate-limited, need backoff
- Job data normalized to common schema
- State sufficient for caching (no persistent DB needed initially)

**Blockers/Questions:**
- None currently

## Next Steps
1. Complete scraper step with error handling
2. Add data normalization step
3. Connect steps in Workbench
4. Write integration tests
5. Document workflow in README

## Files Modified
- /Users/dave/Work/job-aggregator/src/cron/trigger-scrape.step.ts - Cron trigger
- /Users/dave/Work/job-aggregator/src/events/scrape-jobs.step.ts - In progress

## Artifacts Generated
- Session log: /Users/dave/Work/job-aggregator/.claude/sessions/deep-work-20241216-1430-job-scraping.md
```

## Integration with Other Commands

**Before Deep Work:**
- `/plan` - For high-level design before implementation

**During Deep Work:**
- Delegate to specialists as needed (see Agent Delegation Matrix)
- Use `motia-developer` subagent for Motia-specific coding

**After Deep Work:**
- `/save` - Save documentation and plans

## Success Metrics

A successful deep work session demonstrates:
1. **Completeness:** All planned checkpoints reached
2. **Quality:** All quality gates passed
3. **Documentation:** Session log and code docs complete
4. **Clarity:** Next engineer can understand what was done and why
5. **Reliability:** Tests prove implementation works
6. **Visibility:** Steps visible and connected in Workbench
7. **Maintainability:** Code follows Motia patterns from `.cursor/rules/`

---

**Remember:** Deep work is about sustained, focused progress with comprehensive tracking. If interrupted, the session file should contain everything needed to resume exactly where you left off. Always consult `.cursor/rules/` guides for Motia patterns.
