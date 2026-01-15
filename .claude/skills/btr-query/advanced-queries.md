# Advanced Query Patterns

This document covers advanced techniques for querying the BTR context tree.

## Query Syntax

### Basic Natural Language Queries

The simplest queries use natural language:

```bash
# Find authentication-related contexts
btr query "how do we authenticate users"

# Find database patterns
btr query "database connection pooling settings"

# Find error handling approaches
btr query "API error response format"
```

### Domain-Scoped Queries

Narrow your search to a specific domain for more relevant results:

```bash
# Search only in the auth domain
btr query "token refresh" --domain auth

# Search only in the database domain
btr query "query optimization" --domain database

# Search only in testing domain
btr query "mocking external services" --domain testing
```

### Tag-Based Queries

Include technology or concept tags to refine results:

```bash
# Find TypeScript-specific patterns
btr query "type definitions for API responses" --tags typescript

# Find security-related content
btr query "input validation" --tags security,validation

# Find React hooks patterns
btr query "custom hooks" --tags react,hooks
```

## Query Strategies

### Strategy 1: Broad to Narrow

Start with a broad query, then narrow down:

```bash
# Step 1: Broad search
btr query "authentication"

# Step 2: Narrow based on results
btr query "JWT token validation middleware" --domain auth
```

### Strategy 2: Concept-Based Search

Search for concepts rather than specific implementations:

```bash
# Instead of: "redis caching code"
# Try: "how we cache frequently accessed data"

btr query "caching strategy for user sessions"
```

### Strategy 3: Problem-Based Search

Frame queries around the problem you're solving:

```bash
# Instead of: "rate limiter"
# Try: "preventing API abuse"

btr query "protecting endpoints from excessive requests"
```

## Output Formats

### Default Output (Summary)

```bash
btr query "authentication flow"
```

Output:
```
Found 3 relevant contexts:

1. auth/jwt-validation (relevance: 0.95)
   Summary: JWT token validation middleware with refresh token handling
   Tags: jwt, security, middleware

2. auth/oauth-google (relevance: 0.82)
   Summary: Google OAuth integration with user creation flow
   Tags: oauth, google, social-auth

3. auth/session-management (relevance: 0.71)
   Summary: Session storage and expiration handling with Redis
   Tags: sessions, redis, security
```

### JSON Output

```bash
btr query "authentication flow" --format json
```

Useful for programmatic processing of results.

### Verbose Output

```bash
btr query "authentication flow" --verbose
```

Includes full content of each matching context.

## Combining with Other Tools

### Pipeline with grep

Search within query results:

```bash
btr query "middleware patterns" --format json | jq '.results[].content' | grep -i "express"
```

### Export Results

Save query results for later reference:

```bash
btr query "all security patterns" --domain security --format json > security-patterns.json
```

## Query Best Practices

1. **Be Descriptive**: "how we validate user input in API handlers" > "validation"

2. **Use Domain Knowledge**: If you know the domain, specify it with `--domain`

3. **Include Context**: "React state management for shopping cart" > "state management"

4. **Iterate**: If results aren't relevant, try rephrasing or using different terms

5. **Check Related Domains**: Authentication might be in `auth`, `security`, or `api` domains

## Common Query Patterns

| Need | Query Example |
|------|---------------|
| Find implementation | `"how do we implement [feature]"` |
| Find decision rationale | `"why did we choose [technology]"` |
| Find configuration | `"[service] configuration settings"` |
| Find error handling | `"how we handle [type] errors"` |
| Find testing approach | `"testing strategy for [component]"` |
| Find integration | `"[service A] integration with [service B]"` |

## Troubleshooting

### No Results Found

1. Try broader search terms
2. Check spelling of technical terms
3. Try alternative terminology (e.g., "auth" vs "authentication")
4. List available domains: `btr list`

### Too Many Results

1. Add `--domain` flag to narrow scope
2. Add specific technology tags
3. Use more specific query language
4. Reduce `--limit` to see only top matches

### Irrelevant Results

1. Use quotes for exact phrases: `"JWT refresh token"`
2. Add domain context to disambiguate
3. Try problem-based rather than solution-based queries
