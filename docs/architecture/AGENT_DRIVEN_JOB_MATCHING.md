# Agent-Driven Job Matching Architecture

## Overview

This document describes an **intelligent, agent-driven job matching system** using the Claude Agent SDK. Unlike a hardcoded multi-stage pipeline, this architecture allows Claude to make dynamic decisions about which specialized agents to invoke and in what order based on the specific job and user context.

## Key Differences: Agent-Driven vs Hardcoded Pipeline

| Aspect | Hardcoded Pipeline | Agent-Driven Architecture |
|--------|-------------------|---------------------------|
| **Flow Control** | Fixed sequence: Generate → Filter → Rank → Feedback | Dynamic: Orchestrator decides based on context |
| **Decision Points** | Predetermined thresholds | AI evaluates and adapts |
| **Context Awareness** | Limited to stage inputs | Full context available for intelligent routing |
| **Extensibility** | Requires code changes | Add new agents declaratively |
| **Error Recovery** | Fail or retry entire stage | Intelligent fallback and adaptation |
| **Parallelization** | Manual batching | Orchestrator spawns parallel subagents |

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Job Matching Request                              │
│  { userId, jobIds[], matchingPreferences, outputRequirements }          │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     MASTER ORCHESTRATOR AGENT                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ System Prompt:                                                    │   │
│  │ "You are a job matching orchestrator. Analyze requests and       │   │
│  │  delegate to specialized agents. Make intelligent decisions      │   │
│  │  about which agents to use and in what order."                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Available Subagents (via Task tool):                                   │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────────┐ │
│  │ job-analyst  │profile-match │company-rsrch │ document-gen │fit-eval│ │
│  └──────────────┴──────────────┴──────────────┴──────────────────────┘ │
│                                                                          │
│  MCP Tools:                                                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────────┐ │
│  │get_job_data  │get_profile   │semantic_match│ store_analysis       │ │
│  └──────────────┴──────────────┴──────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
           ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
           │ Subagent 1  │ │ Subagent 2  │ │ Subagent N  │
           │ (isolated)  │ │ (isolated)  │ │ (isolated)  │
           └─────────────┘ └─────────────┘ └─────────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  ▼
                    ┌─────────────────────────────┐
                    │   Results back to User      │
                    └─────────────────────────────┘
```

## Implementation

### Directory Structure

```
packages/job-matching-agents/
├── src/
│   ├── index.ts                    # Main exports
│   ├── orchestrator/
│   │   ├── job-matching-orchestrator.ts
│   │   └── prompts/
│   │       └── orchestrator-system.md
│   ├── agents/
│   │   ├── definitions.ts          # All agent definitions
│   │   ├── job-analyst.ts
│   │   ├── profile-matcher.ts
│   │   ├── company-researcher.ts
│   │   ├── document-generator.ts
│   │   └── fit-evaluator.ts
│   ├── tools/
│   │   ├── mcp-server.ts           # Custom MCP tools
│   │   ├── job-tools.ts
│   │   ├── profile-tools.ts
│   │   └── matching-tools.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── context-builder.ts
├── package.json
└── tsconfig.json
```

### Core Types

```typescript
// packages/job-matching-agents/src/types/index.ts

export interface JobMatchingRequest {
  userId: string;
  jobIds: string[];
  preferences: MatchingPreferences;
  outputRequirements: OutputRequirements;
}

export interface MatchingPreferences {
  priorityFactors: PriorityFactor[];
  minimumMatchScore: number;
  includeCompanyResearch: boolean;
  generateDocuments: boolean;
}

export interface PriorityFactor {
  factor: 'compensation' | 'culture' | 'technical_fit' | 'growth' | 'location';
  weight: number; // 0-100
}

export interface OutputRequirements {
  maxResults: number;
  includeDetailedAnalysis: boolean;
  includeRecommendations: boolean;
  documentFormats?: ('resume' | 'cover_letter')[];
}

export interface AgentFinding {
  agentName: string;
  timestamp: string;
  finding: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface MatchResult {
  jobId: string;
  overallScore: number;
  breakdown: ScoreBreakdown;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  agentFindings: AgentFinding[];
  generatedDocuments?: GeneratedDocument[];
}

export interface ScoreBreakdown {
  semanticMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  cultureMatch: number;
  compensationMatch: number;
}

export interface GeneratedDocument {
  type: 'resume' | 'cover_letter';
  content: string;
  format: 'markdown' | 'pdf';
  voiceStyle: string;
}
```

### Agent Definitions

```typescript
// packages/job-matching-agents/src/agents/definitions.ts

import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

/**
 * Specialized subagent definitions for job matching.
 * Each agent has isolated context and specific tools.
 */
export const JOB_MATCHING_AGENTS: Record<string, AgentDefinition> = {

  /**
   * Job Analyst Agent
   * Deeply analyzes job postings to extract requirements, signals, and red flags.
   */
  "job-analyst": {
    description: `Expert job posting analyst. Use when you need to:
      - Extract detailed requirements from job descriptions
      - Identify hidden signals about company culture or role expectations
      - Detect red flags or unusual requirements
      - Understand the true seniority level regardless of title`,
    prompt: `You are a job posting analyst with 15 years of recruiting experience.

Your task is to deeply analyze job postings and extract:

1. **Hard Requirements** (must-haves):
   - Required skills and technologies
   - Years of experience needed
   - Required certifications or degrees
   - Location/visa requirements

2. **Soft Requirements** (nice-to-haves):
   - Preferred skills
   - Bonus qualifications
   - Cultural fit indicators

3. **Hidden Signals**:
   - True seniority level (titles can be misleading)
   - Team size and structure hints
   - Growth trajectory indicators
   - Work-life balance signals
   - Urgency of hire

4. **Red Flags**:
   - Unrealistic requirements
   - Vague compensation ("competitive")
   - High turnover indicators
   - Scope creep in responsibilities

Output your analysis as structured JSON with confidence scores (0-100) for each finding.
Be specific and cite phrases from the job posting to support your analysis.`,
    tools: ["mcp__job-matching__get_job_details", "mcp__job-matching__extract_keywords"],
    model: "sonnet" // Fast model for analysis tasks
  },

  /**
   * Profile Matcher Agent
   * Matches user profiles to job requirements with nuanced understanding.
   */
  "profile-matcher": {
    description: `Profile matching specialist. Use when you need to:
      - Compare user skills/experience against job requirements
      - Identify transferable skills that may not be obvious matches
      - Calculate match scores with detailed breakdowns
      - Find skill gaps that could be addressed`,
    prompt: `You are a career matching expert who understands that job matching is nuanced.

Given a user profile and job requirements, perform deep matching:

1. **Direct Skill Matches**:
   - Exact matches between user skills and requirements
   - Version/level alignment (e.g., "5 years React" vs "3 years required")

2. **Transferable Skills**:
   - Skills that transfer across domains (e.g., "Python" experience helps with "Django")
   - Adjacent technologies (e.g., "PostgreSQL" experience applies to "MySQL")
   - Soft skill translations (e.g., "team lead" implies "mentorship")

3. **Experience Mapping**:
   - How past roles prepare them for this role
   - Project experience that demonstrates required capabilities
   - Industry knowledge that transfers

4. **Gap Analysis**:
   - Missing hard requirements (dealbreakers)
   - Missing nice-to-haves (addressable)
   - Gaps that can be quickly closed vs long-term development

Calculate a match score (0-100) with weighted components:
- Skills match: 35%
- Experience match: 30%
- Seniority alignment: 20%
- Cultural indicators: 15%

Provide specific examples from the profile that support each match.`,
    tools: [
      "mcp__job-matching__get_user_profile",
      "mcp__job-matching__semantic_similarity",
      "mcp__job-matching__get_job_requirements"
    ],
    model: "sonnet"
  },

  /**
   * Company Researcher Agent
   * Researches companies for culture, stability, and fit assessment.
   */
  "company-researcher": {
    description: `Company research specialist. Use when you need to:
      - Research company culture and values
      - Assess company stability and growth trajectory
      - Find recent news or funding information
      - Understand company reputation in the industry`,
    prompt: `You are a company research analyst helping candidates evaluate potential employers.

Research and analyze:

1. **Company Overview**:
   - Size, founding date, industry position
   - Funding status (if startup)
   - Recent growth or contraction signals

2. **Culture Assessment**:
   - Glassdoor/LinkedIn sentiment analysis
   - Leadership style indicators
   - Work-life balance reputation
   - Remote work policies

3. **Stability Indicators**:
   - Financial health signals
   - Recent layoffs or hiring freezes
   - Leadership changes
   - Market position

4. **Growth Opportunities**:
   - Career advancement paths
   - Learning and development culture
   - Internal mobility

5. **Red Flags**:
   - High turnover in role/department
   - Negative press or controversies
   - Unrealistic expectations in reviews

Provide a company score (0-100) and recommendation:
- STRONG_YES: Excellent company, strong culture fit
- YES: Good company, worth pursuing
- MAYBE: Mixed signals, proceed with caution
- PASS: Significant concerns

Cite your sources for all findings.`,
    tools: [
      "WebSearch",
      "WebFetch",
      "mcp__job-matching__cache_company_research"
    ],
    model: "sonnet"
  },

  /**
   * Document Generator Agent
   * Creates tailored resumes and cover letters.
   */
  "document-generator": {
    description: `Document generation specialist. Use when you need to:
      - Generate tailored resumes for specific jobs
      - Write personalized cover letters
      - Optimize documents for ATS systems
      - Apply specific voice styles to documents`,
    prompt: `You are an expert resume writer and career coach with ATS optimization expertise.

Generate documents following these principles:

**Resume Generation**:
1. ATS Optimization (2025 Best Practices):
   - Use standard section headers: "Work Experience", "Education", "Skills"
   - Avoid tables, columns, graphics, text boxes, skill bars
   - Include keywords from job description naturally
   - Target 1-2 pages with scannable structure

2. Content Strategy:
   - Lead with most relevant experience
   - Quantify achievements (metrics, percentages, dollar amounts)
   - Use action verbs appropriate to the role
   - Tailor skills section to job requirements

3. Voice Style:
   Apply the requested voice style consistently:
   - andrew_askins: Authentic, peer-level, humble confidence
   - professional: Formal but accessible, achievement-focused
   - friendly: Warm, conversational, shows personality
   - enthusiastic: High-energy, passionate, action-oriented

**Cover Letter Generation**:
1. Structure:
   - Opening hook that references specific company/role
   - 2-3 paragraphs showing fit and enthusiasm
   - Clear call to action

2. Personalization:
   - Reference specific company initiatives or values
   - Connect past experience to their specific needs
   - Show you've researched the company

3. Humanization:
   - Remove repetitive phrasing
   - Avoid adverbs and AI-sounding language
   - Include authentic voice and perspective

Output in the requested format (markdown or structured for PDF conversion).`,
    tools: [
      "mcp__job-matching__get_user_profile",
      "mcp__job-matching__get_job_details",
      "mcp__job-matching__get_voice_style_prompt",
      "mcp__job-matching__store_generated_document"
    ],
    model: "opus" // Use best model for creative writing
  },

  /**
   * Fit Evaluator Agent
   * Synthesizes all findings into final recommendations.
   */
  "fit-evaluator": {
    description: `Final fit evaluation specialist. Use when you need to:
      - Synthesize findings from multiple agents
      - Make final recommendations
      - Identify key decision factors
      - Provide actionable next steps`,
    prompt: `You are a career advisor synthesizing multiple data points into actionable recommendations.

Given findings from job analysis, profile matching, and company research, provide:

1. **Overall Fit Assessment**:
   - Composite score (0-100) with confidence interval
   - Key factors driving the score
   - Comparison to user's stated preferences

2. **Strengths Summary**:
   - Top 3-5 reasons this is a good match
   - Specific evidence for each strength

3. **Gaps & Concerns**:
   - Addressable gaps (with suggestions to close)
   - Potential dealbreakers
   - Questions to ask in interview

4. **Recommendation**:
   - STRONG_APPLY: Excellent fit, prioritize this application
   - APPLY: Good fit, worth pursuing
   - CONDITIONAL: Good fit IF certain conditions are met
   - SKIP: Not recommended for specific reasons

5. **Action Items**:
   - Specific next steps if applying
   - Skills to highlight in application
   - Questions to research before applying
   - Networking opportunities to explore

Be direct and specific. Avoid vague advice. Every recommendation should be actionable.`,
    tools: [
      "mcp__job-matching__get_agent_findings",
      "mcp__job-matching__store_fit_analysis"
    ],
    model: "opus" // Use best model for synthesis
  }
};
```

### MCP Tools Server

```typescript
// packages/job-matching-agents/src/tools/mcp-server.ts

import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { jobTools } from "./job-tools";
import { profileTools } from "./profile-tools";
import { matchingTools } from "./matching-tools";

/**
 * Custom MCP server providing domain-specific tools for job matching.
 * These tools give agents access to your application's data and services.
 */
export const jobMatchingMcpServer = createSdkMcpServer({
  name: "job-matching",
  version: "1.0.0",
  tools: [
    // Job-related tools
    tool(
      "get_job_details",
      "Retrieve full details for a job posting including description, requirements, and metadata",
      {
        jobId: z.string().describe("The unique identifier for the job")
      },
      async (args) => {
        const job = await jobTools.getJobDetails(args.jobId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(job, null, 2)
          }]
        };
      }
    ),

    tool(
      "get_job_requirements",
      "Extract structured requirements from a job posting",
      {
        jobId: z.string().describe("The job ID to extract requirements from")
      },
      async (args) => {
        const requirements = await jobTools.extractRequirements(args.jobId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(requirements, null, 2)
          }]
        };
      }
    ),

    tool(
      "extract_keywords",
      "Extract important keywords and phrases from job text",
      {
        text: z.string().describe("The text to extract keywords from"),
        maxKeywords: z.number().optional().describe("Maximum keywords to return")
      },
      async (args) => {
        const keywords = await jobTools.extractKeywords(args.text, args.maxKeywords);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(keywords, null, 2)
          }]
        };
      }
    ),

    // Profile-related tools
    tool(
      "get_user_profile",
      "Retrieve the user's profile including skills, experience, and preferences",
      {
        userId: z.string().describe("The user's unique identifier")
      },
      async (args) => {
        const profile = await profileTools.getUserProfile(args.userId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(profile, null, 2)
          }]
        };
      }
    ),

    tool(
      "get_voice_style_prompt",
      "Get the system prompt for a specific voice style",
      {
        style: z.enum(["andrew_askins", "professional", "friendly", "enthusiastic"])
          .describe("The voice style to retrieve")
      },
      async (args) => {
        const prompt = await profileTools.getVoiceStylePrompt(args.style);
        return {
          content: [{
            type: "text",
            text: prompt
          }]
        };
      }
    ),

    // Matching tools
    tool(
      "semantic_similarity",
      "Calculate semantic similarity between two text passages using embeddings",
      {
        text1: z.string().describe("First text passage"),
        text2: z.string().describe("Second text passage")
      },
      async (args) => {
        const score = await matchingTools.calculateSimilarity(args.text1, args.text2);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ similarity_score: score }, null, 2)
          }]
        };
      }
    ),

    tool(
      "store_agent_finding",
      "Store a finding from an agent for later synthesis",
      {
        agentName: z.string().describe("Name of the agent storing the finding"),
        findingType: z.string().describe("Type of finding (e.g., 'strength', 'gap', 'concern')"),
        finding: z.string().describe("The finding content"),
        confidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
        metadata: z.record(z.unknown()).optional().describe("Additional metadata")
      },
      async (args) => {
        await matchingTools.storeAgentFinding({
          agentName: args.agentName,
          timestamp: new Date().toISOString(),
          finding: args.finding,
          confidence: args.confidence,
          metadata: args.metadata || {}
        });
        return {
          content: [{
            type: "text",
            text: "Finding stored successfully"
          }]
        };
      }
    ),

    tool(
      "get_agent_findings",
      "Retrieve all findings from agents for a specific job match",
      {
        jobId: z.string().describe("The job ID to get findings for"),
        userId: z.string().describe("The user ID to get findings for")
      },
      async (args) => {
        const findings = await matchingTools.getAgentFindings(args.jobId, args.userId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(findings, null, 2)
          }]
        };
      }
    ),

    tool(
      "cache_company_research",
      "Cache company research results for reuse",
      {
        companyName: z.string().describe("Company name"),
        research: z.object({
          overview: z.string(),
          culture: z.string(),
          stability: z.string(),
          score: z.number(),
          recommendation: z.enum(["STRONG_YES", "YES", "MAYBE", "PASS"]),
          sources: z.array(z.string())
        }).describe("Research data to cache")
      },
      async (args) => {
        await matchingTools.cacheCompanyResearch(args.companyName, args.research);
        return {
          content: [{
            type: "text",
            text: `Company research for ${args.companyName} cached successfully`
          }]
        };
      }
    ),

    tool(
      "store_fit_analysis",
      "Store the final fit analysis results",
      {
        userId: z.string(),
        jobId: z.string(),
        analysis: z.object({
          overallScore: z.number(),
          breakdown: z.record(z.number()),
          strengths: z.array(z.string()),
          gaps: z.array(z.string()),
          recommendation: z.string(),
          actionItems: z.array(z.string())
        })
      },
      async (args) => {
        await matchingTools.storeFitAnalysis(args.userId, args.jobId, args.analysis);
        return {
          content: [{
            type: "text",
            text: "Fit analysis stored successfully"
          }]
        };
      }
    ),

    tool(
      "store_generated_document",
      "Store a generated document (resume/cover letter)",
      {
        userId: z.string(),
        jobId: z.string(),
        documentType: z.enum(["resume", "cover_letter"]),
        content: z.string(),
        format: z.enum(["markdown", "pdf"]),
        voiceStyle: z.string()
      },
      async (args) => {
        const url = await matchingTools.storeDocument(
          args.userId,
          args.jobId,
          args.documentType,
          args.content,
          args.format,
          args.voiceStyle
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ documentUrl: url }, null, 2)
          }]
        };
      }
    )
  ]
});
```

### Master Orchestrator

```typescript
// packages/job-matching-agents/src/orchestrator/job-matching-orchestrator.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import { JOB_MATCHING_AGENTS } from "../agents/definitions";
import { jobMatchingMcpServer } from "../tools/mcp-server";
import type {
  JobMatchingRequest,
  MatchResult,
  AgentFinding
} from "../types";

/**
 * Orchestrator system prompt that guides intelligent agent selection.
 */
const ORCHESTRATOR_SYSTEM_PROMPT = `You are a job matching orchestrator responsible for helping users find their best job matches.

## Your Capabilities

You have access to specialized subagents via the Task tool:
- **job-analyst**: Deep analysis of job postings
- **profile-matcher**: Match user profiles to job requirements
- **company-researcher**: Research companies for culture and stability
- **document-generator**: Create tailored resumes and cover letters
- **fit-evaluator**: Synthesize findings into recommendations

## Decision Framework

When you receive a job matching request, decide which agents to invoke based on:

1. **Request Requirements**: What does the user actually need?
   - Quick match scores only? Skip document generation.
   - Detailed analysis? Use all relevant agents.
   - Specific concerns about company? Prioritize company-researcher.

2. **Efficiency**: Don't invoke agents unnecessarily
   - If a job clearly doesn't match basic criteria, don't do deep analysis
   - Use parallel agent calls when findings are independent
   - Cache and reuse company research for same company

3. **Intelligent Ordering**: Some findings inform others
   - job-analyst findings help profile-matcher understand requirements
   - company-researcher findings inform fit-evaluator's recommendation
   - Only invoke document-generator after confirming good fit

4. **Adaptive Behavior**: Adjust based on intermediate results
   - If profile-matcher finds <50% match, skip document generation
   - If company-researcher finds red flags, escalate to user
   - If multiple jobs from same company, research once

## Output Requirements

Provide results in this structure:
{
  "matches": [
    {
      "jobId": "...",
      "overallScore": 85,
      "recommendation": "STRONG_APPLY",
      "breakdown": {...},
      "strengths": [...],
      "gaps": [...],
      "actionItems": [...],
      "documents": [...] // if requested
    }
  ],
  "summary": "Brief summary of overall findings",
  "nextSteps": ["Actionable recommendations"]
}

## Important Guidelines

- Always explain your reasoning for which agents you invoke
- Surface uncertainties and confidence levels
- Be direct about poor matches - don't waste user's time
- Prioritize actionable insights over comprehensive analysis
`;

/**
 * Main orchestrator function that processes job matching requests.
 */
export async function processJobMatchingRequest(
  request: JobMatchingRequest
): Promise<{
  matches: MatchResult[];
  summary: string;
  nextSteps: string[];
  agentActivity: AgentActivity[];
}> {
  const agentActivity: AgentActivity[] = [];

  // Build the prompt with context
  const prompt = buildOrchestratorPrompt(request);

  // Create async generator for streaming input (required for MCP servers)
  async function* generateMessages() {
    yield {
      type: "user" as const,
      message: {
        role: "user" as const,
        content: prompt
      }
    };
  }

  const results: MatchResult[] = [];
  let summary = "";
  let nextSteps: string[] = [];

  // Execute the orchestrator query
  for await (const message of query({
    prompt: generateMessages(),
    options: {
      model: "opus", // Use best model for orchestration decisions
      maxTurns: 50, // Allow enough turns for complex matching

      // MCP server with custom tools
      mcpServers: {
        "job-matching": jobMatchingMcpServer
      },

      // All tools available to orchestrator
      allowedTools: [
        // Core tools
        "Task",  // Required for subagent invocation
        "Read",
        "WebSearch",
        "WebFetch",

        // Custom MCP tools
        "mcp__job-matching__get_job_details",
        "mcp__job-matching__get_user_profile",
        "mcp__job-matching__semantic_similarity",
        "mcp__job-matching__store_agent_finding",
        "mcp__job-matching__get_agent_findings",
        "mcp__job-matching__cache_company_research",
        "mcp__job-matching__store_fit_analysis",
        "mcp__job-matching__store_generated_document"
      ],

      // Specialized subagent definitions
      agents: JOB_MATCHING_AGENTS,

      // System prompt for orchestration logic
      appendSystemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,

      // Hooks for monitoring and control
      hooks: {
        PreToolUse: [
          {
            matcher: "Task",
            hooks: [
              async (input: any) => {
                // Log subagent invocations
                agentActivity.push({
                  type: "subagent_invoked",
                  agentName: input.tool_input?.subagent_type,
                  timestamp: new Date().toISOString(),
                  description: input.tool_input?.description
                });
                return { continue: true };
              }
            ]
          }
        ],
        PostToolUse: [
          {
            matcher: "Task",
            hooks: [
              async (input: any, output: any) => {
                // Log subagent completion
                agentActivity.push({
                  type: "subagent_completed",
                  agentName: input.tool_input?.subagent_type,
                  timestamp: new Date().toISOString(),
                  durationMs: output.duration_ms
                });
                return { continue: true };
              }
            ]
          }
        ]
      }
    }
  })) {
    // Process streaming messages
    if (message.type === "result" && message.subtype === "success") {
      // Parse final results
      const parsed = parseOrchestratorResult(message.result);
      results.push(...parsed.matches);
      summary = parsed.summary;
      nextSteps = parsed.nextSteps;
    }

    // Track subagent context
    if ("parent_tool_use_id" in message && message.parent_tool_use_id) {
      agentActivity.push({
        type: "subagent_message",
        timestamp: new Date().toISOString(),
        parentToolUseId: message.parent_tool_use_id
      });
    }
  }

  return { matches: results, summary, nextSteps, agentActivity };
}

/**
 * Build the orchestrator prompt with full context.
 */
function buildOrchestratorPrompt(request: JobMatchingRequest): string {
  return `
## Job Matching Request

**User ID**: ${request.userId}
**Jobs to Analyze**: ${request.jobIds.length} jobs
**Job IDs**: ${request.jobIds.join(", ")}

### User Preferences
${JSON.stringify(request.preferences, null, 2)}

### Output Requirements
${JSON.stringify(request.outputRequirements, null, 2)}

---

Please analyze these jobs for the user and provide match results.
Decide which agents to invoke based on the requirements and use your judgment
to provide the most useful analysis efficiently.
`;
}

/**
 * Parse the orchestrator's final result.
 */
function parseOrchestratorResult(result: string): {
  matches: MatchResult[];
  summary: string;
  nextSteps: string[];
} {
  try {
    // Extract JSON from the result
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse orchestrator result:", e);
  }

  return { matches: [], summary: result, nextSteps: [] };
}

interface AgentActivity {
  type: "subagent_invoked" | "subagent_completed" | "subagent_message";
  agentName?: string;
  timestamp: string;
  description?: string;
  durationMs?: number;
  parentToolUseId?: string;
}
```

### Example: Intelligent Flow Demonstration

```typescript
// packages/job-matching-agents/src/examples/intelligent-flow.ts

/**
 * This example demonstrates how the agent-driven architecture makes
 * intelligent decisions that a hardcoded pipeline cannot.
 */

import { processJobMatchingRequest } from "../orchestrator/job-matching-orchestrator";

async function demonstrateIntelligentFlow() {
  console.log("=== Intelligent Agent-Driven Job Matching ===\n");

  // Example 1: Quick screening (orchestrator skips heavy analysis)
  console.log("--- Scenario 1: Quick Screening ---");
  const quickResult = await processJobMatchingRequest({
    userId: "user-123",
    jobIds: ["job-A", "job-B", "job-C", "job-D", "job-E"],
    preferences: {
      priorityFactors: [
        { factor: "compensation", weight: 40 },
        { factor: "technical_fit", weight: 60 }
      ],
      minimumMatchScore: 70,
      includeCompanyResearch: false,
      generateDocuments: false
    },
    outputRequirements: {
      maxResults: 3,
      includeDetailedAnalysis: false,
      includeRecommendations: true
    }
  });

  console.log("Agent Activity:");
  quickResult.agentActivity.forEach(a => {
    console.log(`  - ${a.type}: ${a.agentName || "orchestrator"}`);
  });
  console.log(`\nMatches found: ${quickResult.matches.length}`);
  console.log(`Summary: ${quickResult.summary}\n`);

  // In this scenario, the orchestrator INTELLIGENTLY:
  // 1. Uses job-analyst + profile-matcher for quick scoring
  // 2. SKIPS company-researcher (not requested)
  // 3. SKIPS document-generator (not requested)
  // 4. Only uses fit-evaluator for top matches
  // A hardcoded pipeline would run ALL stages unnecessarily.

  // Example 2: Deep analysis with conditional document generation
  console.log("--- Scenario 2: Deep Analysis ---");
  const deepResult = await processJobMatchingRequest({
    userId: "user-456",
    jobIds: ["dream-job-1", "backup-job-2"],
    preferences: {
      priorityFactors: [
        { factor: "culture", weight: 35 },
        { factor: "growth", weight: 30 },
        { factor: "technical_fit", weight: 25 },
        { factor: "compensation", weight: 10 }
      ],
      minimumMatchScore: 60,
      includeCompanyResearch: true,
      generateDocuments: true
    },
    outputRequirements: {
      maxResults: 2,
      includeDetailedAnalysis: true,
      includeRecommendations: true,
      documentFormats: ["resume", "cover_letter"]
    }
  });

  console.log("Agent Activity (showing intelligent ordering):");
  deepResult.agentActivity.forEach(a => {
    console.log(`  - ${a.type}: ${a.agentName || "orchestrator"} (${a.durationMs || 0}ms)`);
  });

  // In this scenario, the orchestrator INTELLIGENTLY:
  // 1. Runs job-analyst on both jobs (parallel)
  // 2. Runs profile-matcher on both jobs (parallel)
  // 3. Runs company-researcher (checks if companies are same, researches once if so)
  // 4. DECIDES based on match scores whether to generate documents:
  //    - If dream-job-1 scores 85%, generate documents
  //    - If backup-job-2 scores 55%, SKIP document generation
  // 5. Runs fit-evaluator to synthesize all findings

  // A hardcoded pipeline would generate documents for ALL jobs regardless of fit.

  console.log("\n=== Key Differences from Hardcoded Pipeline ===\n");
  console.log("1. ADAPTIVE FLOW: Agents invoked based on need, not fixed sequence");
  console.log("2. CONDITIONAL EXECUTION: Documents only generated for good matches");
  console.log("3. INTELLIGENT CACHING: Same company researched once across jobs");
  console.log("4. PARALLEL EXECUTION: Independent analyses run concurrently");
  console.log("5. EARLY TERMINATION: Poor matches filtered without full analysis");
}

// Run demonstration
demonstrateIntelligentFlow().catch(console.error);
```

### Context Sharing Between Agents

```typescript
// packages/job-matching-agents/src/utils/context-builder.ts

/**
 * Agents share context through:
 * 1. MCP tools (store_agent_finding / get_agent_findings)
 * 2. Orchestrator passing findings in Task prompts
 * 3. Shared state via database/cache
 */

export interface SharedContext {
  requestId: string;
  userId: string;
  jobId: string;
  findings: Map<string, AgentFinding[]>;
}

/**
 * Context builder for passing information between agents.
 * The orchestrator uses this to construct prompts for subagents
 * that include relevant findings from other agents.
 */
export function buildSubagentContext(
  basePrompt: string,
  context: SharedContext,
  relevantAgents: string[]
): string {
  let contextBlock = `\n\n## Context from Previous Analysis\n`;

  for (const agentName of relevantAgents) {
    const findings = context.findings.get(agentName);
    if (findings && findings.length > 0) {
      contextBlock += `\n### Findings from ${agentName}:\n`;
      findings.forEach(f => {
        contextBlock += `- ${f.finding} (confidence: ${f.confidence}%)\n`;
      });
    }
  }

  return basePrompt + contextBlock;
}

/**
 * Example of how the orchestrator builds context-aware prompts.
 *
 * When invoking fit-evaluator, the orchestrator includes findings
 * from job-analyst, profile-matcher, and company-researcher.
 */
export function buildFitEvaluatorPrompt(
  jobId: string,
  userId: string,
  context: SharedContext
): string {
  return buildSubagentContext(
    `Evaluate the fit between user ${userId} and job ${jobId}.`,
    context,
    ["job-analyst", "profile-matcher", "company-researcher"]
  );
}

/**
 * Agents can also share context by storing findings via MCP tools.
 * The fit-evaluator retrieves all findings using get_agent_findings.
 *
 * This pattern allows agents to:
 * 1. Work independently with isolated context
 * 2. Contribute findings to a shared pool
 * 3. Access relevant findings from other agents when needed
 *
 * The orchestrator decides WHEN to share context, providing control
 * over information flow that a hardcoded pipeline lacks.
 */
```

### Integration with Motia Backend

```typescript
// apps/backend/src/api/intelligent-match.step.ts

import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { processJobMatchingRequest } from "@job-aggregator/job-matching-agents";

export const config: ApiRouteConfig = {
  type: "api",
  name: "IntelligentJobMatch",
  description: "Agent-driven intelligent job matching",
  path: "/api/v1/intelligent-match",
  method: "POST",
  emits: ["intelligent-match-complete"],
  flows: ["job-matching"]
};

const inputSchema = z.object({
  userId: z.string().uuid(),
  jobIds: z.array(z.string()).min(1).max(20),
  preferences: z.object({
    priorityFactors: z.array(z.object({
      factor: z.enum(["compensation", "culture", "technical_fit", "growth", "location"]),
      weight: z.number().min(0).max(100)
    })),
    minimumMatchScore: z.number().min(0).max(100).default(50),
    includeCompanyResearch: z.boolean().default(false),
    generateDocuments: z.boolean().default(false)
  }),
  outputRequirements: z.object({
    maxResults: z.number().min(1).max(50).default(10),
    includeDetailedAnalysis: z.boolean().default(true),
    includeRecommendations: z.boolean().default(true),
    documentFormats: z.array(z.enum(["resume", "cover_letter"])).optional()
  })
});

export const handler: Handlers["IntelligentJobMatch"] = async (req, { emit, logger }) => {
  const input = inputSchema.parse(req.body);

  logger.info("Starting intelligent job matching", {
    userId: input.userId,
    jobCount: input.jobIds.length
  });

  try {
    const result = await processJobMatchingRequest({
      userId: input.userId,
      jobIds: input.jobIds,
      preferences: input.preferences,
      outputRequirements: input.outputRequirements
    });

    // Emit event for downstream processing
    await emit({
      topic: "intelligent-match-complete",
      data: {
        userId: input.userId,
        matchCount: result.matches.length,
        agentActivityCount: result.agentActivity.length
      }
    });

    return {
      status: 200,
      body: {
        matches: result.matches,
        summary: result.summary,
        nextSteps: result.nextSteps,
        metadata: {
          agentActivity: result.agentActivity,
          processingModel: "agent-driven-v1"
        }
      }
    };
  } catch (error) {
    logger.error("Intelligent matching failed", { error });
    return {
      status: 500,
      body: { error: "Job matching failed", details: error.message }
    };
  }
};
```

## Summary: Why Agent-Driven is Better

### 1. Intelligent Decision Making
- Orchestrator analyzes request context before deciding which agents to invoke
- Can skip unnecessary work (e.g., no document generation for poor matches)
- Adapts strategy based on intermediate results

### 2. Context-Aware Routing
- Later agents receive relevant findings from earlier agents
- Orchestrator decides what context each agent needs
- Prevents information overload in specialized agents

### 3. Parallel Execution
- Independent analyses run concurrently
- Orchestrator identifies parallelization opportunities
- Reduces total processing time

### 4. Graceful Degradation
- If one agent fails, orchestrator can adapt
- Can provide partial results with transparency about gaps
- User gets value even with incomplete analysis

### 5. Extensibility
- Add new agents by adding to the `agents` definition
- No code changes to orchestration logic needed
- Agents automatically available for intelligent selection

### 6. Transparency
- Full visibility into agent decisions via `agentActivity` log
- User can understand WHY certain analyses were performed
- Builds trust through explainability

## Next Steps

1. **Implement tool handlers** in `job-tools.ts`, `profile-tools.ts`, `matching-tools.ts`
2. **Add database integration** for persisting findings and documents
3. **Build frontend** for displaying agent-driven results with activity timeline
4. **Add monitoring** for agent performance and cost tracking
5. **Implement caching** for company research and semantic embeddings
