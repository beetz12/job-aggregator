# /plan $ARGUMENTS

You are an expert technical planner and architect for the Motia Job Aggregator. Create a comprehensive, detailed plan for: **$ARGUMENTS**

## Planning Process (8 Phases)

### Phase 1: Requirements Gathering
**Goal**: Understand the feature requirements and user needs

Questions to consider:
- What is the user-facing feature or functionality?
- What type of Motia step(s) are needed (API, Event, Cron)?
- What inputs does this feature require (HTTP requests, events, scheduled triggers)?
- What outputs should be produced (API responses, emitted events, state updates)?
- Are there performance requirements (response time, throughput)?
- What error scenarios need handling (external API failures, invalid data, timeouts)?
- How does this fit into the existing workflow (standalone vs chained steps)?

**Deliverable**: Requirements summary

### Phase 2: Technical Discovery
**Goal**: Analyze the existing system and identify technical requirements

Investigation areas:
- **Existing Step Analysis**
  - Review existing steps in `src/` directory
  - Identify patterns to follow or extend
  - Check for reusable services/utilities

- **Motia Patterns (consult `.cursor/rules/`)**
  - API Steps: `.cursor/rules/motia/api-steps.mdc`
  - Event Steps: `.cursor/rules/motia/event-steps.mdc`
  - Cron Steps: `.cursor/rules/motia/cron-steps.mdc`
  - State Management: `.cursor/rules/motia/state-management.mdc`
  - Middleware: `.cursor/rules/motia/middlewares.mdc`

- **Architecture Patterns**
  - Project structure: `.cursor/architecture/architecture.mdc`
  - Error handling: `.cursor/architecture/error-handling.mdc`
  - Naming conventions (TypeScript/Python/JavaScript)

- **External Integrations**
  - APIs to integrate with (job boards, scrapers)
  - Authentication requirements
  - Rate limiting considerations
  - Data transformation needs

- **Tool Selection**
  - TypeScript vs Python vs JavaScript for each step
  - Libraries needed (Zod, axios, etc.)
  - Testing frameworks

**Deliverable**: Technical analysis with step mapping

### Phase 3: Architecture Design
**Goal**: Design the feature architecture and data flow

Design considerations:
- **Step Architecture**
  - Which step type for each operation (API/Event/Cron)
  - Config structure (subscribes, emits, schemas)
  - Handler logic outline
  - Middleware requirements

- **Workflow Design**
  - Event flow between steps
  - State management strategy
  - Error propagation approach
  - Retry mechanisms

- **Data Flow**
  - API Step -> Emit Event -> Event Step processes -> State updated
  - Cron Step -> Emit Event -> Event Step chain -> Workflow complete
  - Cross-step data sharing via state

- **Integration Points**
  - External API connections
  - State storage patterns
  - Event schema definitions
  - Middleware composition

- **Polyglot Considerations**
  - Best language for each step
  - Cross-language event compatibility
  - Shared type definitions

**Deliverable**: Architecture diagram and step specifications

### Phase 4: Data Models & Schemas
**Goal**: Define data structures and validation schemas

Specifications:
- **Zod Schemas (TypeScript)**
  - Request body schemas for API steps
  - Event payload schemas
  - State value schemas
  - Response schemas

- **Python Types**
  - Pydantic models for Python steps
  - Type hints for handlers
  - Event payload validation

- **Event Definitions**
  - Event topic naming conventions
  - Payload structure for each event
  - Cross-step event contracts

- **State Management**
  - State key naming conventions
  - TTL requirements
  - State shape definitions

**Deliverable**: Schema definitions and data model plan

### Phase 5: Implementation Task Breakdown
**Goal**: Create detailed development tasks

Task categories:
1. **API Step Development**
   - Route definitions and schemas
   - Request validation with Zod
   - Response handling
   - Event emits configuration
   - Middleware integration

2. **Event Step Development**
   - Topic subscription configuration
   - Event payload processing
   - Business logic implementation
   - State updates
   - Downstream event emits

3. **Cron Step Development**
   - Schedule configuration
   - Idempotent execution logic
   - Trigger event emits
   - Cleanup operations

4. **Service Layer**
   - Business logic extraction (`src/services/`)
   - External API clients
   - Data transformation utilities
   - Shared validation helpers

5. **State Management**
   - State access patterns
   - Cache invalidation strategy
   - Cross-step state sharing
   - TTL configuration

6. **Middleware Development**
   - Authentication middleware
   - Validation middleware
   - Error handling middleware
   - Logging middleware

7. **Configuration & Setup**
   - Environment variables
   - API key management
   - motia.config.ts updates
   - Type generation

8. **Testing & Validation**
   - Unit tests for services
   - Integration tests for steps
   - Event flow tests
   - Workbench verification

9. **Documentation**
   - Step documentation
   - API documentation
   - Workflow diagrams
   - README updates

**Deliverable**: Prioritized task list with specifications

### Phase 6: Testing Strategy
**Goal**: Define comprehensive testing approach

Testing layers:
- **Unit Tests**: Services, utilities, data transformations
- **Step Tests**:
  - API step request/response validation
  - Event step processing logic
  - Cron step execution
- **Integration Tests**:
  - Multi-step workflow execution
  - State persistence verification
  - Event flow validation
- **Workbench Verification**:
  - Step visibility in UI
  - Connection visualization
  - Manual trigger testing

**Deliverable**: Test plan with coverage targets

### Phase 7: Monitoring & Observability
**Goal**: Plan for operational monitoring

Considerations:
- **Logging Strategy**:
  - Step execution logging
  - Event flow tracing
  - Error logging with context
  - Performance metrics

- **Metrics**:
  - Step execution time
  - Event processing latency
  - Error rates by step
  - State operation metrics

- **Error Handling**:
  - Graceful degradation patterns
  - User-friendly error messages
  - Retry logic configuration
  - Dead letter handling

- **Workbench Monitoring**:
  - Real-time workflow visualization
  - Event inspection
  - State debugging

**Deliverable**: Monitoring and observability plan

### Phase 8: Documentation & Handoff
**Goal**: Create comprehensive documentation

Requirements:
- Feature documentation (what it does, how to use)
- Step documentation (config, handler, emits)
- API documentation (endpoints, schemas)
- Workflow diagrams (event flow)
- Configuration guide (env variables)

**Deliverable**: Complete documentation set

---

## Save Locations

All plans should be saved to `/Users/dave/Work/job-aggregator/`:

| Type | Directory |
|------|-----------|
| Feature Plans | `/Users/dave/Work/job-aggregator/docs/plans/` |
| API Plans | `/Users/dave/Work/job-aggregator/docs/api/` |
| Architecture | `/Users/dave/Work/job-aggregator/docs/architecture/` |
| Research | `/Users/dave/Work/job-aggregator/docs/research/` |
| Implementation | `/Users/dave/Work/job-aggregator/docs/implementation/` |

**File Naming**: `UPPERCASE_WITH_UNDERSCORES.md`

Examples:
- `FEATURE_JOB_SCRAPER_PLAN.md`
- `FEATURE_AGGREGATION_PIPELINE_PLAN.md`
- `API_JOBS_ENDPOINT_PLAN.md`
- `WORKFLOW_SCRAPE_PROCESS_PLAN.md`

---

## Document Template

```markdown
# [Plan Title]

**Date**: YYYY-MM-DD
**Author**: Claude AI
**Status**: Draft
**Type**: [Feature/API/Workflow/etc.]

## Table of Contents
[Auto-generated based on sections]

## Executive Summary
[2-3 sentence overview]

## Requirements
[From Phase 1]

## Technical Analysis
[From Phase 2]

## Architecture
[From Phase 3]

## Data Models & Schemas
[From Phase 4]

## Implementation Tasks
[From Phase 5]

## Testing Strategy
[From Phase 6]

## Monitoring Plan
[From Phase 7]

## Documentation Checklist
[From Phase 8]

---
## Document Metadata

**Last Updated**: YYYY-MM-DD
**Implementation Status**: Not Started
**Related Documents**: [List any related plans]

**Change Log**:
- [Date] - Initial plan creation
```

---

## Agent Delegation

Delegate to specialists when needed:
- **code-archaeologist**: Understanding existing codebase structure
- **motia-developer**: Step implementation (use the subagent in `.claude/agents/`)
- **api-architect**: API contract and workflow design
- **database-architect**: State management and data patterns
- **test-strategy-specialist**: Comprehensive test planning
- **documentation-specialist**: Technical writing

---

## Motia-Specific Planning Considerations

### Step Type Selection
| Scenario | Step Type | Rationale |
|----------|-----------|-----------|
| HTTP endpoint needed | API Step | Direct request/response |
| Background processing | Event Step | Non-blocking, scalable |
| Scheduled task | Cron Step | Time-based triggers |
| Long-running operation | Event Step | Don't block API responses |
| Data aggregation | Event Step chain | Multi-step workflow |

### Event Flow Patterns
```
Pattern 1: API -> Event Processing
  api.step.ts (emit: 'process-data')
    -> process-data.step.ts (emit: 'data-processed')
      -> notify.step.ts (final)

Pattern 2: Cron -> Event Chain
  trigger.cron.step.ts (emit: 'start-scrape')
    -> scrape.step.ts (emit: 'scrape-complete')
      -> aggregate.step.ts (emit: 'aggregation-complete')
        -> store.step.ts (final)

Pattern 3: Parallel Processing
  api.step.ts (emit: ['process-a', 'process-b'])
    -> process-a.step.ts (emit: 'a-done')
    -> process-b.step.ts (emit: 'b-done')
      -> combine.step.ts (subscribes: ['a-done', 'b-done'])
```

### State Management Guidelines
- Use state for cross-step data sharing
- Set appropriate TTL for cached data
- Use descriptive key names: `jobs:source:${sourceId}`
- Handle state misses gracefully

---

## After Planning

1. Save plan to appropriate directory
2. Confirm with: `Saved to /Users/dave/Work/job-aggregator/docs/[subdirectory]/FILENAME.md`
3. Wait for next instruction (do not auto-implement)

---

## Important References

Before planning, review:
- `.cursor/rules/motia/*.mdc` - Step patterns and examples
- `.cursor/architecture/*.mdc` - Architecture guidelines
- `AGENTS.md` - AI development guide
- `CLAUDE.md` - Claude-specific instructions
- Existing steps in `src/` - Current patterns in use
