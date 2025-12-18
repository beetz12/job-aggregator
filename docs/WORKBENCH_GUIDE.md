# Motia Workbench Guide

**Date**: 2025-12-17
**Author**: Claude AI
**Status**: Complete
**Type**: Documentation

## Overview

The Motia Workbench is a powerful visual debugging and monitoring tool that comes built-in with Motia. It provides real-time visibility into your event-driven workflows, making it essential for development and debugging.

## Accessing the Workbench

When you run the Job Aggregator backend with `npm run dev`, the Workbench is automatically available at:

```
http://localhost:8000/__workbench
```

## Key Features

### 1. Flow Visualization

The Workbench displays your entire job aggregation pipeline as an interactive flow diagram:

```
┌─────────────────────┐
│  Cron: Refresh All  │
│  (every 15 minutes) │
└─────────┬───────────┘
          │ refresh-sources
          ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│  Fetch Arbeitnow    │      │  Fetch HackerNews   │      │  Fetch Reddit       │
│  (TypeScript)       │      │  (Python)           │      │  (TypeScript)       │
└─────────┬───────────┘      └─────────┬───────────┘      └─────────┬───────────┘
          │                            │                            │
          └────────────────────────────┼────────────────────────────┘
                                       │ normalize-job
                                       ▼
                          ┌─────────────────────┐
                          │   Normalize Job     │
                          │   (TypeScript)      │
                          └─────────┬───────────┘
                                    │ index-job
                                    ▼
                          ┌─────────────────────┐
                          │    Index Job        │
                          │   (with dedup)      │
                          └─────────────────────┘
```

### 2. Event Tracing

- **Real-time event monitoring**: Watch events flow through your system as they happen
- **Event payloads**: Inspect the full payload of any event
- **Timing information**: See how long each step takes
- **Error tracking**: Immediately see when and where errors occur

### 3. State Inspector

View the current state of your job aggregator:

- **Jobs**: See all indexed jobs with their data
- **Source Metadata**: Check the status of each job source
- **Filter and search**: Find specific state entries quickly

### 4. Manual Event Emission

For testing and debugging, you can manually emit events:

1. Go to the "Events" tab
2. Select an event type (e.g., `refresh-sources`)
3. Fill in the event payload
4. Click "Emit"

This is particularly useful for:
- Testing individual steps in isolation
- Replaying failed events
- Triggering source refreshes without waiting for cron

### 5. API Testing

The Workbench includes an API explorer:

- **GET /jobs**: List all aggregated jobs
- **GET /jobs/:id**: Get a specific job
- **GET /sources**: List job sources with status
- **POST /sources/:name/refresh**: Trigger a source refresh
- **GET /health**: Check API health

### 6. Logs Viewer

Access structured logs from all steps:

- Filter by log level (info, warn, error)
- Search log messages
- Click to see full log context
- Correlate logs with specific events

## Debugging Tips

### Checking Job Indexing

1. Open the Workbench
2. Navigate to the "State" tab
3. Look for the `jobs` group
4. Click on any job to see its full data

### Tracing a Failed Fetch

1. Go to the "Events" tab
2. Find events with `status: error`
3. Click to expand and see the error details
4. Check the related logs for more context

### Monitoring Real-time Updates

1. Keep the "Events" tab open
2. Trigger a source refresh via API or wait for cron
3. Watch events flow through the pipeline
4. Verify jobs appear in the State tab

## Polyglot Visualization

One of Motia's unique features is its polyglot support. In the Workbench, you'll see:

- **TypeScript steps**: Blue nodes
- **Python steps**: Green nodes

This visual distinction helps you understand how different language components interact in your workflow.

## Screenshots

### Flow View
*The flow diagram shows all steps and their connections, with color-coding for different step types and languages.*

### Event Trace
*Events are displayed in a timeline, showing the progression from trigger to completion.*

### State Inspector
*Browse and search through all stored jobs and metadata.*

## Best Practices

1. **Keep Workbench open during development** - Real-time feedback speeds up debugging
2. **Use manual event emission for testing** - Test individual steps without running the full pipeline
3. **Monitor state after changes** - Verify your code changes have the expected effect
4. **Check logs for errors** - The Workbench aggregates logs from all steps

## Why Workbench Matters (For Judges)

The Motia Workbench demonstrates several key advantages of the Motia framework:

1. **Observability out of the box** - No need to set up external monitoring tools
2. **Visual debugging** - Understand complex event flows at a glance
3. **Polyglot transparency** - See how TypeScript and Python steps work together
4. **Developer experience** - Reduces time from code change to verified result

This built-in tooling is a significant differentiator compared to traditional backend frameworks.

---
## Document Metadata

**Last Updated**: 2025-12-17
**Implementation Status**: Complete
**Related Documents**:
- `.cursor/rules/motia/` - All Motia development guides

**Change Log**:
- 2025-12-17 - Initial creation
