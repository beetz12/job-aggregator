# /save $CONTENT_DESCRIPTION

Save documentation, plans, or research to the appropriate location in the Motia Job Aggregator project.

## Default Save Location

**Primary**: `/Users/dave/Work/job-aggregator/docs/plans/`

## Save Directories

| Type | Directory |
|------|-----------|
| Implementation Plans | `/Users/dave/Work/job-aggregator/docs/plans/` |
| API Documentation | `/Users/dave/Work/job-aggregator/docs/api/` |
| Architecture Decisions | `/Users/dave/Work/job-aggregator/docs/architecture/` |
| Research & Analysis | `/Users/dave/Work/job-aggregator/docs/research/` |
| Workflow Documentation | `/Users/dave/Work/job-aggregator/docs/workflows/` |

## File Naming Convention

Use `UPPERCASE_WITH_UNDERSCORES.md` format with type prefix:

| Prefix | Purpose |
|--------|---------|
| `FEATURE_` | New feature plans (job scraping, aggregation, notifications) |
| `STEP_` | Step-specific documentation (API, Event, Cron steps) |
| `WORKFLOW_` | Multi-step workflow documentation |
| `API_` | API endpoint documentation |
| `EVENT_` | Event schema and flow documentation |
| `SERVICE_` | Service layer documentation |
| `FIX_` | Bug fix documentation |
| `REFACTOR_` | Code refactoring plans |
| `DOCS_` | Documentation updates |
| `RESEARCH_` | Research and analysis |
| `TEST_` | Testing strategies |

## Examples

```bash
# Feature implementation plan
/save FEATURE_JOB_SCRAPER
-> Saves to: /Users/dave/Work/job-aggregator/docs/plans/FEATURE_JOB_SCRAPER.md

# Step documentation
/save STEP_SCRAPE_JOBS
-> Saves to: /Users/dave/Work/job-aggregator/docs/plans/STEP_SCRAPE_JOBS.md

# Workflow documentation
/save WORKFLOW_AGGREGATION_PIPELINE
-> Saves to: /Users/dave/Work/job-aggregator/docs/workflows/WORKFLOW_AGGREGATION_PIPELINE.md

# API documentation
/save API_JOBS_ENDPOINT
-> Saves to: /Users/dave/Work/job-aggregator/docs/api/API_JOBS_ENDPOINT.md

# Architecture decision
/save docs/architecture/DECISION_STATE_MANAGEMENT
-> Saves to: /Users/dave/Work/job-aggregator/docs/architecture/DECISION_STATE_MANAGEMENT.md

# Event documentation
/save EVENT_JOB_PROCESSED
-> Saves to: /Users/dave/Work/job-aggregator/docs/plans/EVENT_JOB_PROCESSED.md
```

## Document Structure

### Required Header
```markdown
# [Document Title]

**Date**: YYYY-MM-DD
**Author**: Claude AI
**Status**: Draft | In Progress | Complete
**Type**: [Feature/Step/Workflow/API/Event/etc.]
```

### For Longer Documents
```markdown
## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)
```

### Required Footer
```markdown
---
## Document Metadata

**Last Updated**: YYYY-MM-DD
**Implementation Status**: Not Started | In Progress | Complete
**Related Documents**:
- [Link to related doc]

**Change Log**:
- [Date] - Initial creation
```

## Quality Checklist

Before saving, verify:

### Content
- [ ] Clear, descriptive title
- [ ] No placeholder text remaining
- [ ] No sensitive information (API keys, passwords)

### Technical Accuracy
- [ ] File paths are correct for this project
- [ ] Code examples follow Motia patterns
- [ ] Step types match their purpose (API/Event/Cron)
- [ ] Event names follow conventions
- [ ] Dependencies listed correctly

### Motia-Specific
- [ ] Step configs documented correctly
- [ ] Event flows are clear
- [ ] State management patterns explained
- [ ] References to `.cursor/rules/` guides where helpful

### Formatting
- [ ] Consistent markdown formatting
- [ ] Code blocks have language tags
- [ ] Tables properly formatted

## Save Process

1. **Determine filename** from $CONTENT_DESCRIPTION
2. **Select directory** based on content type
3. **Create directory** if it doesn't exist
4. **Create file** with proper structure
5. **Confirm**: `Saved to /Users/dave/Work/job-aggregator/docs/[subdir]/FILENAME.md`

## Important Notes

- **Never overwrite** existing files without confirmation
- **Always use absolute paths** in confirmation messages
- **Include timestamps** in documents
- **Use relative paths** for internal document references
- **Reference Motia guides** when documenting patterns (`.cursor/rules/`)
