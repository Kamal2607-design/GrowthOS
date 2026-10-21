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

| Area                                               | Status                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| Authentication and JWT/session flow                | Completed and tested                                                 |
| Google OAuth                                       | Completed and tested                                                 |
| Vision CRUD                                        | Completed and tested                                                 |
| Goal CRUD and ownership validation                 | Completed and tested                                                 |
| Action CRUD and status lifecycle                   | Completed and tested                                                 |
| ActionSuggestion accept/reject workflow            | Completed and tested                                                 |
| Transaction-safe suggestion acceptance             | Completed and tested                                                 |
| Duplicate active Action protection                 | Completed and tested                                                 |
| Document upload, extraction/OCR, and analysis      | Completed and tested                                                 |
| Document candidate review and source tracking      | Completed and tested                                                 |
| Reflection CRUD and AI analysis                    | Completed and tested                                                 |
| Goal progress and AI analysis                      | Completed and tested                                                 |
| Memory CRUD and duplicate protection               | Completed and tested                                                 |
| Memory normalization                               | Completed and tested                                                 |
| `nomic-embed-text` embeddings and pgvector storage | Completed and tested                                                 |
| Semantic Memory retrieval                          | Completed and tested; threshold is provisional                       |
| Context assembly                                   | Completed and tested                                                 |
| RAG with strict personal-context grounding         | Completed and tested                                                 |
| Daily Growth Loop — Phase 5.1 Daily Context        | Implemented; live API tested                                         |
| Daily action suggestion generation                 | Implemented; live generation tested; quality issues under refinement |
| Daily planner memory and goal-progress context     | Implemented and tested                                               |
| Daily planner prompt enrichment                    | Implemented; prompt tests passing                                    |
| Daily planner quality and duplicate validation     | Implemented; unit tests passing                                      |
| Goal relevance validation for daily suggestions    | Pending                                                              |
| Full live-generation acceptance check              | Pending after goal relevance and grounding refinements               |
| Phase 7 — React UI/UX                              | Next major milestone after focused Phase 6 verification              |

For the detailed engineering history, decisions, tests, and next steps, see [`GrowthOS_Development_Journal.md`](./GrowthOS_Development_Journal.md). The latest status in this README is current through **October 21, 2026**.

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
GET  /api/daily-growth/today
POST /api/daily-growth/generate
```

`GET /today` is the read-only orchestration endpoint. It composes existing data and does not create Actions or Memories.

`POST /generate` assembles the daily context, enriches it with relevant memories and objective goal progress, asks Qwen for candidate suggestions, validates the response, and persists only valid pending `ActionSuggestion` records. It does not directly create executable Actions.

**Live-test status as of October 21, 2026:** context retrieval and intelligence enrichment are working. A generation attempt returned `409 DUPLICATE_PENDING_SUGGESTION`, demonstrating that duplicate validation rejected a repeated suggestion. Live testing also exposed incorrect assignment to a test placeholder goal and an unsupported claim about a same-day reflection. These are open quality issues; successful live-generation acceptance is not yet confirmed.

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

## Daily Context: implementation reference and verification

The following files are part of the implemented Daily Growth context module. Keep this list as an implementation reference:

```text
src/services/daily-growth-loop.service.js
src/services/daily-growth-context.builder.js
src/controllers/daily-growth-loop.controller.js
src/routes/daily-growth-loop.routes.js
```

The route should be mounted in `src/app.js` using the existing route conventions. Example:

```js
import dailyGrowthLoopRoutes from "./routes/daily-growth-loop.routes.js";
app.use("/api/daily-growth", dailyGrowthLoopRoutes);
```

To verify the live endpoint, restart the server if needed and call:

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

## Engineering journal — status as of October 21, 2026

### Phase 5 — Daily Growth Loop

- **5.1 Daily context:** implemented and live-tested. Context includes Vision, active Goals, Actions grouped by status, pending Suggestions, Reflection, ReflectionAnalysis, and summary counts.
- **5.2 Daily suggestion generation:** implemented. The pipeline generates candidates, validates them, and persists suggestions only.
- **5.3 Decision and execution:** suggestion acceptance/rejection and Action lifecycle have been tested. The daily context endpoint remains read-only.
- **5.4 Goal progress feedback:** objective activity metrics and reflection correlation are implemented and tested, including zero-action and insufficient-data scenarios.

### Phase 6.1 — Growth context integration

The daily planner enriches its context with relevant personal memories and objective progress for active goals. The live diagnostic showed 3 relevant memories and progress data for 3 goals, with both memory and goal-progress retrieval marked `available`.

Relevant files include:

- `src/services/daily-planner-intelligence-context.service.js`
- `src/services/daily-growth-generation.service.js`
- `src/services/ai/daily-planner-prompt.service.js`

### Phase 6.1.1 — Suggestion quality validation

Implemented:

- `src/services/ai/daily-planner-quality.service.js`
- `src/services/ai/daily-planner-validation.service.js`
- `tests/daily-planner-quality.service.test.js`

The helper performs normalized title comparison and conservative title-overlap checks. The validator checks suggestion titles, goal membership in the planner's active-goal context, existing pending/in-progress Actions, pending Suggestions, and duplicates within the generated batch. These title heuristics are not full semantic understanding.

Latest recorded test results:

| Test suite                                        |       Result |
| ------------------------------------------------- | -----------: |
| `tests/daily-planner-quality.service.test.js`     |   7/7 passed |
| `tests/daily-planner-validation.service.test.js`  | 12/12 passed |
| `tests/daily-planner-persistence.service.test.js` |   9/9 passed |
| `tests/daily-planner-prompt.service.test.js`      |   8/8 passed |

These are recorded results from the latest runs shared on October 21, 2026; rerun them after future code changes.

### Test fixture: insufficient-data Goal 6

Goal 6 (`INSUFFICIENT DATA GOAL`) and Action 17 (`TEST - Complete one measurable step`) were intentionally created to test insufficient-data goal-progress behavior. Do not delete them or hardcode their numeric IDs into production validation.

The planner should distinguish explicit test fixtures from meaningful personal goals when that status is available. A legitimate goal with little or no activity must not automatically be treated as test data.

### Live-generation issues still open

The latest `GET /api/daily-growth/today` context contained 3 active goals, 5 pending Actions, 1 in-progress Action, 17 pending Suggestions, and no current Reflection or ReflectionAnalysis.

The latest generation attempt returned `409 DUPLICATE_PENDING_SUGGESTION`, correctly rejecting a repeated suggestion. It also exposed two quality issues:

1. Qwen assigned fitness suggestions to Goal 6, the insufficient-data test fixture, instead of the real fitness goal (Goal 5).
2. Qwen described an alleged same-day reflection about leg raises despite the supplied daily context having `reflection: null` and `reflectionAnalysis: null`. Historical memory must not be presented as today's reflection or proof of a same-day activity.

The pending-suggestion backlog contains older repetitive items. Review stale suggestions through existing workflows rather than deleting database records directly.

### Next steps

1. Add conservative, deterministic goal-relevance validation without hardcoding Goal 6's ID.
2. Add tests for correct Goal 4/Goal 5 assignments, obvious mismatches, null `goalId`, and legitimate broad goals.
3. Verify prompt grounding: do not claim a reflection exists when reflection fields are null; do not treat memory as proof of today's activity.
4. Rerun prompt, quality, validation, and persistence suites.
5. Review stale pending Suggestions through existing workflows.
6. Retest `GET /api/daily-growth/today` and `POST /api/daily-growth/generate`; verify appropriate goal assignments, no unsupported reflection claims, duplicate rejection, and no partial persistence.
7. After focused Phase 6 verification, begin **Phase 7 — React UI/UX**: Vision overview, goals/progress, today's Actions, suggestion accept/reject, reflection, and clear loading/empty/error states.

### Architecture and project rules to preserve

- AI proposes; the user decides.
- AI suggestions must not directly create or modify Goals, Actions, or Memories.
- Keep persistence ownership checks and transaction safeguards.
- Do not hardcode goal IDs to identify test fixtures.
- Do not interpret missing data as proof that no relevant history exists.
- Preserve Prisma 8 contract-based ORM and Temporal conventions.
- Keep application code in JavaScript.
- Inspect existing contracts and tests before changing implementation.
- Do not indefinitely expand backend intelligence; move to UI after focused Phase 6 work is verified.

---

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
