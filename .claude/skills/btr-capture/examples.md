# BTR Capture Examples

This document provides comprehensive examples of using the btr-capture skill.

## Capturing Code Snippets

### Example 1: Save a Utility Function

**User says:** "Save this debounce function we just wrote"

**Action:**
```bash
btr curate frontend debounce-utility --content "$(cat <<'EOF'
/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}
EOF
)" --tags typescript,utilities,performance,react
```

### Example 2: Save an API Endpoint Pattern

**User says:** "Remember this rate limiting middleware"

**Action:**
```bash
btr curate api rate-limiting-middleware --content "$(cat <<'EOF'
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from './redis';

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 15 * 60, // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Usage: app.use('/api/', apiLimiter);
EOF
)" --tags express,redis,security,middleware,rate-limiting
```

## Capturing Design Decisions

### Example 3: Architecture Decision Record

**User says:** "Save why we chose PostgreSQL over MongoDB"

**Action:**
```bash
btr curate architecture database-selection --content "$(cat <<'EOF'
# Database Selection: PostgreSQL over MongoDB

## Decision
We chose PostgreSQL as our primary database instead of MongoDB.

## Context
- Application requires complex relational queries
- Strong data consistency needed for financial transactions
- Team has more SQL experience

## Consequences
- Pros: ACID compliance, complex joins, mature tooling
- Cons: Less flexible schema, requires migrations

## Date: 2024-01-15
EOF
)" --tags postgresql,mongodb,decisions,database,architecture
```

### Example 4: Security Pattern

**User says:** "Capture this input validation approach"

**Action:**
```bash
btr curate security input-validation --content "$(cat <<'EOF'
# Input Validation Strategy

All user inputs must be validated using Zod schemas before processing:

1. Define schema at the edge (API route handler)
2. Use strict mode to prevent unknown properties
3. Transform data types during validation
4. Return user-friendly error messages

Example:
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1, 'Name is required'),
});
EOF
)" --tags zod,validation,security,best-practice,typescript
```

## Capturing Configuration Examples

### Example 5: Environment Setup

**User says:** "Save our Docker Compose configuration"

**Action:**
```bash
btr curate devops docker-compose-dev --content "$(cat <<'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF
)" --tags docker,postgres,redis,development,configuration
```

## Capturing Test Patterns

### Example 6: Testing Strategy

**User says:** "Remember this mocking pattern for external APIs"

**Action:**
```bash
btr curate testing api-mocking-pattern --content "$(cat <<'EOF'
# External API Mocking Pattern

Use MSW (Mock Service Worker) for consistent API mocking:

import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(ctx.json({ id: req.params.id, name: 'Test User' }));
  }),
  rest.post('/api/users', async (req, res, ctx) => {
    const body = await req.json();
    return res(ctx.status(201), ctx.json({ id: '123', ...body }));
  }),
];

export const server = setupServer(...handlers);

// In test setup:
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
EOF
)" --tags msw,testing,mocking,jest,api
```

## Tips for Effective Capture

1. **Be specific with topics**: Use descriptive, kebab-case names like `jwt-refresh-token-flow` instead of just `jwt`

2. **Include context**: Add comments explaining why something was implemented a certain way

3. **Use appropriate domains**: Keep domains broad enough to be useful but specific enough to organize content

4. **Tag generously**: Tags improve discoverability; include technology names, patterns, and concepts

5. **Capture the full context**: Include imports, type definitions, and usage examples when relevant
