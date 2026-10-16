# GrowthOS

GrowthOS is an AI-powered personal growth platform designed to turn a user's vision and long-term goals into meaningful daily action.

> **Core idea:** AI proposes. The user decides. The system learns from execution.

## Product loop

```text
VISION
  ↓
ACTIVE GOALS
  ↓
CONTEXT ASSEMBLY
  ↓
AI ACTION SUGGESTIONS
  ↓
USER REVIEW
  ├── Accept → ACTION
  └── Reject
  ↓
EXECUTION
  ↓
REFLECTION
  ↓
REFLECTION ANALYSIS / GOAL PROGRESS
  ↓
MEMORY
  ↓
BETTER FUTURE SUGGESTIONS
```

## Current implementation status

| Area                                               | Status                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| Authentication and JWT/session flow                | Completed and tested                                               |
| Google OAuth                                       | Completed and tested                                               |
| Vision CRUD                                        | Completed and tested                                               |
| Goal CRUD and ownership validation                 | Completed and tested                                               |
| Action CRUD and status lifecycle                   | Completed and tested                                               |
| ActionSuggestion accept/reject workflow            | Completed and tested                                               |
| Transaction-safe suggestion acceptance             | Completed and tested                                               |
| Duplicate active Action protection                 | Completed and tested                                               |
| Document upload, extraction/OCR, and analysis      | Completed and tested                                               |
| Document candidate review and source tracking      | Completed and tested                                               |
| Reflection CRUD and AI analysis                    | Completed and tested                                               |
| Goal progress and AI analysis                      | Completed and tested                                               |
| Memory CRUD and duplicate protection               | Completed and tested                                               |
| Memory normalization                               | Completed and tested                                               |
| `nomic-embed-text` embeddings and pgvector storage | Completed and tested                                               |
| Semantic Memory retrieval                          | Completed and tested; threshold is provisional                     |
| Context assembly                                   | Completed and tested                                               |
| RAG with strict personal-context grounding         | Completed and tested                                               |
| Daily Growth Loop — Phase 5.1 Daily Context        | Implementation package prepared; live API integration test pending |
| Daily action suggestion orchestration              | Next phase after 5.1                                               |

For the detailed engineering history, decisions, tests, and next steps, see [`GrowthOS_Development_Journal.md`](./GrowthOS_Development_Journal.md).

## Tech stack

### Backend

- Node.js and Express
- JavaScript / ES modules
- PostgreSQL and pgvector
- Prisma 8 contract-based ORM runtime
- JWT, cookies, bcryptjs, Google OAuth
- Temporal API for timestamp values in the current Prisma 8 runtime

### AI and document processing

- Ollama with Qwen3 4B
- `nomic-embed-text` embeddings (768 dimensions)
- Tesseract OCR and Poppler for scanned document processing
- pgvector cosine-similarity retrieval for Memory search

## API overview

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
GET  /api/auth/google
GET  /api/auth/google/callback
```

### Vision

```text
GET    /api/vision
POST   /api/vision
PATCH  /api/vision
DELETE /api/vision
```

### Goals

```text
POST   /api/goals
GET    /api/goals
GET    /api/goals/:id
PATCH  /api/goals/:id
DELETE /api/goals/:id
```

Goal statuses: `active`, `completed`, `paused`, `abandoned`.

### Actions

```text
POST   /api/actions
GET    /api/actions
GET    /api/actions/:id
PATCH  /api/actions/:id
DELETE /api/actions/:id
```

Useful filters:

```text
GET /api/actions?status=pending
GET /api/actions?goalId=1
GET /api/actions?status=completed&goalId=1
```

Action statuses: `pending`, `in_progress`, `completed`, `cancelled`.

### Action Suggestions

```text
POST /api/action-suggestions
GET  /api/action-suggestions
GET  /api/action-suggestions/:id
POST /api/action-suggestions/:id/accept
POST /api/action-suggestions/:id/reject
```

Suggestion statuses: `pending`, `accepted`, `rejected`, `expired`. Sources: `ai`, `manual`.

### Reflections

```text
POST   /api/reflections
GET    /api/reflections
GET    /api/reflections/:id
PATCH  /api/reflections/:id
DELETE /api/reflections/:id
POST   /api/reflections/:id/analyze
```

### Goal Progress

```text
POST /api/goal-progress/:goalId/progress/analyze
```

### Memories

```text
POST   /api/memories
GET    /api/memories
GET    /api/memories/:id
PATCH  /api/memories/:id
PATCH  /api/memories/:id/archive
DELETE /api/memories/:id
POST   /api/memories/:id/normalize
POST   /api/memories/normalize-pending
POST   /api/memories/:id/embed
POST   /api/memories/search
```

### Context and RAG

```text
POST /api/context
POST /api/rag
```

### Daily Growth Loop

```text
GET /api/daily-growth/today
```

This endpoint is the first read-only orchestration step. It composes existing data and does not create Actions or Memories.

### Other implemented areas

- Document intelligence: `/api/documents/*`
- Action planning: `/api/action-planner/*`
- Health check: `GET /api/health`

## ActionSuggestion design

An AI model must not directly create an executable Action.

```text
Qwen
  ↓
Validated structured recommendation
  ↓
ActionSuggestion
  ↓
User review / acceptance
  ↓
Action
```

The acceptance workflow validates ownership and pending status, uses a transaction, and guards against duplicate active Actions.

## Prisma 8 conventions

Use the project's current Prisma 8 API:

```js
db.orm.public.Goal.all();

db.orm.public.Goal.first({ id: goalId, userId });

db.orm.public.Goal.create({
  userId,
  title: "Example",
});

await db.orm.public.Goal.where({ id: goalId, userId }).update({
  title: "Updated goal",
});
```

Do not replace these with legacy Prisma Client patterns such as `findMany()`, `findUnique()`, `create({ data })`, or `update({ where, data })`.

For timestamp fields, use `Temporal.Instant.from(value)` and `Temporal.Now.instant()`. Do not use `new Date(value)` for the project's Temporal-backed timestamp values.

## Daily Context: install and test

Copy these generated files into the corresponding locations in the existing server repository:

```text
src/services/daily-growth-loop.service.js
src/services/daily-growth-context.builder.js
src/controllers/daily-growth-loop.controller.js
src/routes/daily-growth-loop.routes.js
```

Then add to `src/app.js`:

```js
import dailyGrowthLoopRoutes from "./routes/daily-growth-loop.routes.js";
app.use("/api/daily-growth", dailyGrowthLoopRoutes);
```

Restart the server and call:

```http
GET http://localhost:5000/api/daily-growth/today
```

Use the same authenticated cookie/session as the other protected endpoints. No request body is required.

### Expected checks

1. **Success:** `200`, `success: true`, and a `context` object.
2. **No Vision or Reflection:** still `200`; missing optional data is represented as `null`.
3. **Actions:** verify due/created/completed-today, pending, in-progress, and overdue groupings.
4. **Suggestions:** only pending suggestions relevant to active Goals, unassigned suggestions, or the current day's Reflection are returned.
5. **Unauthenticated:** authentication middleware should reject the request.
6. **Cross-user isolation:** sign in as another user and confirm the first user's data is absent.
7. **Dependency failure:** if a required database read fails, expect `503` with a specific `code`, not a successful empty response.

The generated pure-builder tests can be run with:

```bash
node --test tests/daily-growth-context.builder.test.js
npm run check
```

These validate classification rules and syntax. They do not replace running the endpoint against the actual local database.

## Development principles

1. **User control:** AI recommends; users commit.
2. **User ownership:** every protected resource is scoped to the authenticated user.
3. **Structured AI output:** validate model output before persistence.
4. **Incremental AI:** reuse existing domain services and add complexity only when needed.
5. **Grounding:** do not invent personal facts from weakly related context.
6. **Prisma 8 consistency:** follow the current ORM API and Temporal timestamp conventions.
7. **Portfolio quality:** demonstrate explicit boundaries, testable behavior, and robust error handling.

## Local development

The backend is designed to run with Node.js, PostgreSQL/pgvector, and Ollama. The API default is `http://localhost:5000`.
