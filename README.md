# GrowthOS

GrowthOS is an AI-powered personal growth platform designed to turn a user's vision and long-term goals into meaningful daily action.

> **Core idea:** AI proposes. The user decides. The system learns from execution.

## Web app

The responsive React app in `client/` works on desktop and phones (sidebar on desktop, bottom tabs with a central AI button on phones, installable to the home screen). It has a vibrant violet/magenta "Aurora" theme with a dark mode (toggle, or follows the system).

| Page | What it does | APIs |
|---|---|---|
| Dashboard | Greeting, streaks, today's focus ring, open actions, AI suggestions waiting, 14-day activity chart, goal progress, AI insights, productivity trend, "Ask GrowthOS" | daily-growth/today, actions, reflections, goal-progress, action-suggestions |
| Today | Actions grouped by status: add, edit, start, complete, delete; today's AI suggestions with accept/dismiss; "Suggest actions" (daily planner) | daily-growth/today + generate, actions, action-suggestions |
| AI Planner | "Make a plan" (action planner), "Ask GrowthOS" (RAG; recommendations can be added as actions), "Plan my day", "Ideas for one goal", and a suggestion inbox with goal filters and bulk dismiss of older items | action-planner, rag, daily-growth/generate, action-suggestions (list, per-goal generate, accept, reject) |
| Goals & vision | Vision editor; goals by status; per-goal metrics, activity chart, AI progress analysis, AI action ideas, goal actions; edit/pause/complete/delete | vision, goals, goal-progress (+ analyze), actions, action-suggestions |
| Reflect | Daily reflection (mood scale matches the API), AI analysis with recommendations sent to the inbox, history with delete | reflections (+ analyze), daily-growth/today |
| Library | Upload, extract, analyse and review document findings; memories with semantic search, add (normalised and embedded automatically), archive, delete | documents/*, memories/* |

```bash
cd server && npm run dev     # API on http://localhost:5000
cd client && npm run dev     # app on http://localhost:5173 (proxies /api)
cd client && npm test        # 32 component and page tests
```

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
| Document upload, extraction/OCR, and analysis      | Completed; upload endpoint and storage containment added Oct 21      |
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
| Daily action suggestion generation                 | Live-tested with qwen3:4b; repeats dropped, one automatic re-plan     |
| Daily planner memory and goal-progress context     | Implemented and tested                                               |
| Daily planner prompt enrichment                    | Implemented; prompt tests passing                                    |
| Daily planner quality and duplicate validation     | Implemented; unit tests passing                                      |
| Goal relevance validation for daily suggestions    | Live-tested: no test-goal or cross-domain assignments observed       |
| Same-day reflection grounding validation           | Live-tested: no unsupported reflection claims observed               |
| Full live-generation acceptance check              | Done Oct 21 on local PostgreSQL 17 + Ollama; see *Live verification* |
| Phase 7 — React UI (web + mobile, `client/`)       | Implemented: dashboard, Today, AI Planner, Goals, Reflect, Library   |

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

Password login and Google login both set an httpOnly cookie named `growthos_token` (override with `JWT_COOKIE_NAME`), and logout clears that same cookie. API clients can send `Authorization: Bearer <token>` instead. The cookie name, attributes, and middleware lookup live in `src/config/auth-cookie.js`.

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

- Document intelligence: `/api/documents/*` (see *Documents* below)
- Action planning: `/api/action-planner/*`
- Health check: `GET /api/health`

### Documents

```text
POST   /api/documents/upload
POST   /api/documents
GET    /api/documents
GET    /api/documents/:id
GET    /api/documents/:id/text
POST   /api/documents/:id/extract
DELETE /api/documents/:id
```

Analysis and candidate review endpoints (`/:id/analyze`, `/:id/candidates`, and the accept/reject routes) are unchanged.

**Uploading.** Send the file as the raw request body:

- `Content-Type` is the document type: `text/plain`, `application/pdf`, `image/png`, or `image/jpeg`.
- `X-File-Name` is the display name, URL-encoded if it contains non-ASCII characters.
- In Postman, choose *Body → binary*. From a browser, call `fetch('/api/documents/upload', { method: 'POST', body: file, headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) }, credentials: 'include' })`.

The default size limit is 20 MB (`DOCUMENT_MAX_UPLOAD_MB`). The file content must match its declared type, for example a PDF must start with `%PDF-`.

**Storage rules.**

- The server chooses where files live: `DOCUMENT_STORAGE_DIR/<userId>/<random-uuid>.<ext>`, defaulting to `server/storage/documents`, which is gitignored. Only that relative name is saved in `Document.filePath`.
- Before any file is read or passed to `pdftoppm`/`tesseract`, its path is resolved (following symlinks) and must sit inside the requesting user's own directory.
- `POST /api/documents` still exists but only accepts a `filePath` inside that directory.
- Deleting a document also removes its stored file.

**Documents registered before this change.** Documents registered with a path elsewhere on the machine keep their saved text, analysis, and candidates. However, `POST /:id/extract` now returns `409` for them; upload the file again to re-extract it.

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

Accept and reject claim the suggestion with a single conditional update (`status = 'pending'` in the `UPDATE ... WHERE`), so concurrent requests cannot both succeed; the loser receives `400 SUGGESTION_NOT_PENDING`. Creating an Action with `POST /api/actions` and a `suggestionId` also accepts that suggestion in the same transaction. The `/api/action-planner` endpoint validates every goal reference before writing and persists its suggestions in one transaction, so a failed plan leaves nothing behind.

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

All unit test suites can be run from `server/` with:

```bash
npm test
```

This runs `node --test "tests/**/*.test.js"`. These validate classification rules and syntax. They do not replace running the endpoint against the actual local database.

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
- `src/services/ai/daily-planner-goal-relevance.service.js`
- `src/services/ai/daily-planner-grounding.service.js`

The quality helper performs normalized title comparison and conservative title-overlap checks. The validator checks, in order: suggestion titles, goal membership in the planner's active-goal context, goal relevance, same-day reflection grounding, existing pending/in-progress Actions, pending Suggestions, and duplicates within the generated batch. These heuristics are not full semantic understanding.

**Goal relevance** (`daily-planner-goal-relevance.service.js`) rejects a suggestion only on explicit evidence:

- `DAILY_PLANNER_GOAL_IS_PLACEHOLDER` — the assigned goal's own title or description labels it as test data (for example `INSUFFICIENT DATA GOAL`, `TEST - …`, `placeholder`). Detection is text-based, never ID-based, and never activity-based: a real goal with little data is not a placeholder.
- `DAILY_PLANNER_GOAL_MISMATCH` — the suggestion (title + description) and the goal (title + description) both match a known domain (`health_fitness`, `software_ai`, `career_finance`) and share none, such as leg raises assigned to the AI-engineering goal. Broad goals, generic suggestions, and `goalId: null` are allowed. Reasoning text is ignored because it usually restates the goal. Ambiguous words such as "run", "program", "model", "client", and "raise" are deliberately excluded from the vocabularies.

**Reflection grounding** (`daily-planner-grounding.service.js`) applies only when the planner context has no reflection for today. It rejects text that asserts a same-day reflection, such as "based on today's reflection" or "the user reported earlier today", with `DAILY_PLANNER_UNSUPPORTED_REFLECTION_CLAIM`. Suggestions to *write* today's reflection, and references to historical memories or past reflections, remain valid.

The prompt uses the same placeholder detector to annotate explicit test goals with `Planning status: Test/placeholder goal`. It labels retrieved memories as historical context and forbids same-day reflection claims when no reflection exists.

All of these errors return `422` from `POST /api/daily-growth/generate`. As before, a single invalid suggestion rejects the whole batch, so nothing is partially persisted. The endpoint also now returns `503` for daily-context database failures (matching `GET /today`) and for Ollama request failures, and `422` for malformed Qwen JSON. These previously fell through to `500`.

Unit test results (`npm test`):

| Test suite                                                 |       Result |
| ---------------------------------------------------------- | -----------: |
| `tests/daily-planner-context.builder.test.js`              |   4/4 passed |
| `tests/daily-planner-intelligence-context.service.test.js` |   9/9 passed |
| `tests/daily-planner-quality.service.test.js`              |   7/7 passed |
| `tests/daily-planner-goal-relevance.service.test.js`       | 16/16 passed |
| `tests/daily-planner-grounding.service.test.js`            |   7/7 passed |
| `tests/daily-planner-validation.service.test.js`           | 17/17 passed |
| `tests/daily-planner-persistence.service.test.js`          |   9/9 passed |
| `tests/daily-planner-prompt.service.test.js`               | 11/11 passed |

Total: 80/80 passing. These are unit tests; they have not yet been confirmed by a live generation run.

### Test fixture: insufficient-data Goal 6

Goal 6 (`INSUFFICIENT DATA GOAL`) and Action 17 (`TEST - Complete one measurable step`) were intentionally created to test insufficient-data goal-progress behavior. Do not delete them or hardcode their numeric IDs into production validation.

The planner should distinguish explicit test fixtures from meaningful personal goals when that status is available. A legitimate goal with little or no activity must not automatically be treated as test data.

### Live verification — October 21, 2026

Run on a fresh local database (PostgreSQL 17 + pgvector 0.8.7, migrated with `prisma db migrate`) and Ollama 0.31 with `qwen3:4b` and `nomic-embed-text`, through both the services and the web app.

- **Root cause of the 409 bottleneck:** qwen3:4b frequently re-proposes tasks the user already has (in 4 of 4 baseline plans). Previously one repeat rejected the whole plan. Now:
  - Repeats of existing work are **dropped** and the rest of the plan is kept; only when nothing new remains is the plan rejected (`409`, "nothing new to suggest").
  - Integrity violations (test/placeholder goal, unrelated goal, unsupported same-day reflection, inactive goal, malformed output) still reject the whole plan, which is then **re-planned once automatically** with the rejection reason in the prompt.
  - The prompt now lists everything already planned as an explicit exclusion list right before the output instructions.
  - Duplicate detection ignores filler words ("a short …" vs "one …").
- **Runaway generation:** one live call decoded 1,700+ tokens and occupied Ollama for minutes. Every Qwen call is now capped (`OLLAMA_MAX_TOKENS`, 1,024 for the planners) and times out (`OLLAMA_TIMEOUT_MS`, default 120 s); timeouts and an unreachable Ollama return `503` with a clear message.
- **Measured:** across live runs no suggestion was assigned to the test goal or to an unrelated goal, and none claimed a same-day reflection. With only a few open actions, the 4B model still often has nothing new to add for the daily plan; per-goal ideas and the action planner produce new suggestions more reliably. A JSON-schema `format` was tried for the planners and made duplicates more frequent with this model, so plain JSON mode plus the caps is used.
- **Other fixes found while testing:** goal-progress day labels were one day early east of UTC; accepted document memories used a type the Memory API rejects; reflection-analysis suggestions are now replaced atomically and deduplicated; context assembly (planner and RAG) now uses the most recent open actions and reflections and survives a memory-search failure; per-goal AI suggestions are validated, deduplicated and saved in one transaction.

### Earlier live-generation issues (resolved)

The latest `GET /api/daily-growth/today` context contained 3 active goals, 5 pending Actions, 1 in-progress Action, 17 pending Suggestions, and no current Reflection or ReflectionAnalysis.

The latest generation attempt returned `409 DUPLICATE_PENDING_SUGGESTION`, correctly rejecting a repeated suggestion. It also exposed two quality issues:

1. Qwen assigned fitness suggestions to Goal 6, the insufficient-data test fixture, instead of the real fitness goal (Goal 5).
2. Qwen described an alleged same-day reflection about leg raises despite the supplied daily context having `reflection: null` and `reflectionAnalysis: null`. Historical memory must not be presented as today's reflection or proof of a same-day activity.

The pending-suggestion backlog contains older repetitive items. Review stale suggestions through existing workflows rather than deleting database records directly.

### Next steps

1. ~~Add conservative, deterministic goal-relevance validation without hardcoding Goal 6's ID.~~ Done.
2. ~~Add tests for correct Goal 4/Goal 5 assignments, obvious mismatches, null `goalId`, and legitimate broad goals.~~ Done.
3. ~~Prompt grounding: do not claim a reflection exists when reflection fields are null; do not treat memory as proof of today's activity.~~ Done in prompt and validator; confirm in the live run.
4. ~~Rerun prompt, quality, validation, and persistence suites.~~ Done — 80/80 via `npm test`.
5. ~~Review stale pending Suggestions~~ The AI Planner inbox can dismiss all older suggestions at once.
6. ~~Retest `GET /today` and `POST /generate` live~~ Done; see *Live verification*.
7. ~~Fix core API issues that block a browser UI~~ Done; see *Core API fixes* below.
8. ~~Phase 7 — React UI/UX~~ Done; see *Web app*.
9. Consider a larger local model (for example `qwen3:8b`) if daily plans should more often contain new ideas; the validation and retry logic is model-independent.

### Core API fixes — October 21, 2026

These fixes were made before starting Phase 7 because a browser client would hit them:

- **Auth cookie:** password login used a misspelled cookie name (`growthos_tokennn`) while Google login and logout used `growthos_token`. Google users therefore failed cookie authentication, and logout did not clear the password-login cookie. All four places now use one shared helper and the name `growthos_token`. **Anyone logged in before this change must log in again.**
- **CORS:** `cors()` with defaults sent a wildcard origin, which browsers refuse to combine with cookies. The API now allows the origins in `CLIENT_ORIGIN` (comma-separated, default `http://localhost:5173`) with credentials. Requests without an `Origin` header, such as Postman or curl, are unaffected.
- **Express 5 empty bodies:** Express 5 leaves `req.body` undefined when no JSON body is sent. Thirteen handlers destructured it and returned `500`; they now fall back to `{}` and return their normal `400` validation errors.
- **Suggestion state:** `POST /api/actions` with a `suggestionId` left the suggestion `pending`, so it could be accepted again later. Reject had no pending guard, and accept only checked the status before its update. Both now use a single conditional update (see *ActionSuggestion design*).
- **Action planner:** goal references were validated inside the create loop, so an invalid later suggestion left earlier ones saved. The whole plan is now validated first and persisted in one transaction.
- **Per-goal suggestion prompt:** the Vision record was interpolated directly and appeared as `[object Object]`; the prompt now lists the vision's statement, values, identity, and future self.

Unit and HTTP tests (`npm test`, no database required):

| Test suite                      |       Result |
| ------------------------------- | -----------: |
| `tests/auth-cookie.test.js`     |   7/7 passed |
| `tests/api-http.test.js`        | 19/19 passed |
| `tests/action-planning.test.js` |   5/5 passed |

Against the previous code, 18 of the 19 HTTP tests fail; the 19th is a control (a request with no `Origin` header). The concurrency guards and transactions need a live database to verify. Recommended Postman checks:

1. Log in with a password, then `GET /api/auth/me` using only the cookie. Log out and confirm `/me` returns `401`.
2. Repeat with Google login.
3. Accept a suggestion, then try to reject it: expect `400`. Create an Action with a pending `suggestionId`: the suggestion becomes `accepted`, and accepting it again returns `400`.
4. Trigger an action-planner failure, for example by stopping Ollama mid-request or forcing an invalid goal reference, and confirm that no new suggestions were saved.

### Document storage security fix — October 21, 2026

`POST /api/documents` used to store any client-supplied `filePath`. Extraction then read that path from disk and `GET /:id/text` returned the contents, so any signed-in user could read any file the server could read, including `server/.env` with the JWT secret and database URL. There was also no upload endpoint.

The fix adds `POST /api/documents/upload` and a storage module (`src/services/document-storage.service.js`) that confines every read and delete to the requesting user's storage directory (see *Documents* above).

| Test suite                                |       Result |
| ----------------------------------------- | -----------: |
| `tests/document-storage.service.test.js`  | 13/13 passed |
| `tests/document-upload-http.test.js`      |   7/7 passed |

Against the previous code, 6 of the 7 HTTP tests fail. Registering `/etc/hosts` passed every check and only failed at the database insert. The storage tests cover absolute paths, `../` into another user's folder, symlink escapes, names starting with `-`, deletes that must not leave storage, and content and type checks.

Recommended live checks:

1. Upload a PDF, extract it, read `/:id/text`, then delete it and confirm the file is gone from `server/storage/documents/<userId>/`.
2. `POST /api/documents` with `"filePath": "/etc/hosts"` (plus `fileName`, `mimeType`, `fileSize`) returns `400`.
3. Extracting an older document registered with an outside path returns `409`.

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

Copy `server/.env.example` to `server/.env` and run `npm run dev` in `server/` (Node's watch mode) or `npm start`. Set `CLIENT_ORIGIN` to the frontend's dev-server origin (Vite's default is `http://localhost:5173`); the frontend must send requests with `credentials: 'include'` for the auth cookie to be used. Uploaded documents are stored under `server/storage/documents` unless `DOCUMENT_STORAGE_DIR` is set. Run the tests from `server/` with `npm test`.
