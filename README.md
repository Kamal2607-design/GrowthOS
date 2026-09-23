GrowthOS

GrowthOS is an AI-powered personal growth platform designed to turn a user's vision and long-term goals into meaningful daily action.

Core idea: AI proposes. The user decides. The system learns from execution.

Current backend flow

Vision
↓
Goals
↓
Action Suggestions
↓
User Review
├── Accept → Action
└── Reject
↓
Execution
↓
Reflection
↓
Memory
↓
Better Suggestions

Current implementation status

Authentication — completed and tested

Google OAuth — completed and tested

Vision CRUD APIs — completed and tested

Goal CRUD APIs — completed and tested

Action CRUD APIs — completed and tested

ActionSuggestion schema and migration — completed

ActionSuggestion accept/reject workflow — completed and tested

AI Action Planner — next

Tech stack

Backend

Node.js

Express

JavaScript / ES Modules

PostgreSQL

Prisma 8

JWT

bcryptjs

Google OAuth

Temporal API for Prisma 8 timestamp values

AI foundation

Ollama

Qwen3 4B

nomic-embed-text planned for semantic retrieval

pgvector planned for persistent semantic memory

API overview

Authentication

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
GET /api/auth/google
GET /api/auth/google/callback

Vision

GET /api/vision
POST /api/vision
PATCH /api/vision
DELETE /api/vision

Goals

POST /api/goals
GET /api/goals
GET /api/goals/:id
PATCH /api/goals/:id
DELETE /api/goals/:id

Supported goal statuses:

active
completed
paused
abandoned

Actions

POST /api/actions
GET /api/actions
GET /api/actions/:id
PATCH /api/actions/:id
DELETE /api/actions/:id

Useful filters:

GET /api/actions?status=pending
GET /api/actions?goalId=1
GET /api/actions?status=completed&goalId=1

Action statuses:

pending
in_progress
completed
cancelled

Action Suggestions

POST /api/action-suggestions
GET /api/action-suggestions
GET /api/action-suggestions/:id
POST /api/action-suggestions/:id/accept
POST /api/action-suggestions/:id/reject

Suggestion statuses:

pending
accepted
rejected
expired

Suggestion sources:

ai
manual

ActionSuggestion design

ActionSuggestion intentionally stays separate from Action.

An AI model must not directly create an executable Action.

Qwen
↓
Validated structured recommendation
↓
ActionSuggestion
↓
User accepts / edits / rejects
↓
Action

This creates a human-in-the-loop boundary between AI recommendation and user commitment.

Prisma 8 rules

This project uses Prisma 8. Do not use older Prisma Client examples.

Use:

db.orm.public.Goal.all();

db.orm.public.Goal.first({ id: goalId, userId });

db.orm.public.Goal.create({
userId,
title: "Example",
});

await db.orm.public.Goal
.where({ id: goalId, userId })
.update({
title: "Updated goal",
});

Do not replace these with old APIs such as:

findMany()
findUnique()
create({ data: ... })
update({ where: ..., data: ... })
delete({ where: ... })

Prisma 8 timestamps

The current PostgreSQL runtime uses Temporal values for timestamp fields.

Use:

Temporal.Instant.from(value);
Temporal.Now.instant();

Do not use:

new Date(value);

The generated Prisma runtime imports the Temporal polyfill in src/prisma/db.ts.

Planned AI layer

The next feature is the AI Action Planner.

Planned structure:

src/ai/
├── ollama.client.js
├── action-planner.service.js
└── prompts/
└── action-planner.prompt.js

Planned endpoint:

POST /api/action-suggestions/generate

Planned flow:

Request
↓
AI Controller
↓
Action Planner
↓
Context Builder
↓
Vision + Goals + Existing Actions
↓
Ollama / Qwen3 4B
↓
Structured JSON
↓
Validation
↓
ActionSuggestion records
↓
User review

The first AI context should remain intentionally small:

Vision

Goals

Existing Actions

Later context can include:

completed actions

reflections

memories

documents

semantic retrieval using pgvector

Development principles

User control: AI recommends; users commit.

User ownership: every protected resource is scoped to the authenticated user.

Structured AI output: model output must be validated before persistence.

Incremental AI: start with a small context and progressively add memory.

Prisma 8 consistency: use the current Prisma 8 ORM API and Temporal timestamp types.

Portfolio quality: every major AI feature should demonstrate a clear engineering boundary rather than simply calling an LLM.

Repository structure

growth-os/
├── client/
├── server/
│ └── src/
│ ├── controllers/
│ ├── middleware/
│ ├── routes/
│ ├── services/
│ ├── prisma/
│ └── app.js
├── mcp/
│ └── document-server/
├── docs/
├── prompts/
├── uploads/
└── README.md

Local development

The backend is currently designed to run locally with:

Node.js
PostgreSQL
pgvector
Ollama

The API runs on:

http://localhost:5000

Health check:

GET /api/health

Documentation

See the accompanying GrowthOS Use Cases & Backend Implementation Documentation for the detailed use cases, API matrix, human-in-the-loop architecture, implementation status, and next AI-layer plan.
