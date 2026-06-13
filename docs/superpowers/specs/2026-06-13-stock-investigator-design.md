# Stock Investigator — System Design

**Date:** 2026-06-13
**Status:** Approved

## Overview

A full-stack web application that accepts a USA stock ticker and orchestrates a multi-agent analysis pipeline. Each agent specializes in a distinct analytical domain. Results stream to the frontend in real time as agents complete. Analysis history is persisted in PostgreSQL.

---

## Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Frontend | React (TypeScript)          |
| Backend  | NestJS (TypeScript)         |
| Database | PostgreSQL via TypeORM      |
| Hosting  | TBD                         |

---

## High-Level Architecture

```
React FE
  │
  ├─ POST /analysis/:ticker      → triggers analysis, returns analysisId
  └─ GET  /analysis/:id/stream   → SSE stream, one event per agent result
       │
       ▼
NestJS BE
  ├─ AnalysisModule              → orchestration: cache check, launch agents, SSE
  ├─ TechnicalAnalysisAgent      → fetches OHLCV from Yahoo Finance, computes indicators
  ├─ NewsAndSentimentAgent       → fetches news via Alpha Vantage / Yahoo news + LLM sentiment
  └─ PostgreSQL via TypeORM      → persists Analysis + AgentResult records
```

### Request Flow

1. User enters ticker → FE POST `/analysis/:ticker`
2. BE checks cache: if a `completed` Analysis for the same ticker exists within the last **24 hours**, return it immediately with a cache hit flag
3. Otherwise: create `Analysis` record (status: `pending`), return its `id`
4. FE opens SSE stream on `/analysis/:id/stream`
5. BE launches all agents concurrently via `Promise.all`
6. As each agent resolves: write `AgentResult` to DB, emit SSE event to client
7. When all agents finish: update `Analysis.status` → `completed`, close SSE stream

---

## Data Model

### `Analysis`

| Column       | Type                                          | Notes              |
|--------------|-----------------------------------------------|--------------------|
| id           | UUID (PK)                                     |                    |
| ticker       | VARCHAR(10)                                   |                    |
| status       | ENUM(`pending`, `running`, `completed`, `failed`) |               |
| createdAt    | TIMESTAMP                                     |                    |
| completedAt  | TIMESTAMP                                     | nullable           |

### `AgentResult`

| Column      | Type                                  | Notes                              |
|-------------|---------------------------------------|------------------------------------|
| id          | UUID (PK)                             |                                    |
| analysisId  | UUID (FK → Analysis)                  |                                    |
| agentName   | VARCHAR(50)                           | `technical` / `news_sentiment`     |
| status      | ENUM(`pending`, `completed`, `failed`) |                                   |
| output      | JSONB                                 | schema-free per agent (see below)  |
| error       | TEXT                                  | nullable                           |
| durationMs  | INT                                   |                                    |
| createdAt   | TIMESTAMP                             |                                    |

The `output` column is intentionally schema-free JSONB. Each agent defines its own output shape. This allows the final output format (per-agent opinions, a combined verdict, a numerical grade, a buy/sell/hold signal) to be decided independently of the data layer.

**Output format is a deferred design decision.** It is the first thing to resolve before building agent internals.

---

## Backend Structure (NestJS)

```
src/
├── analysis/
│   ├── analysis.controller.ts      -- POST /analysis/:ticker, GET /analysis/:id/stream
│   ├── analysis.service.ts         -- orchestration, cache check, Promise.all, SSE emit
│   ├── analysis.entity.ts
│   └── analysis.module.ts
├── agents/
│   ├── base-agent.interface.ts     -- AgentInterface: analyze(ticker): Promise<AgentOutput>
│   ├── technical/
│   │   ├── technical.agent.ts      -- Yahoo Finance OHLCV, RSI / MACD / moving averages
│   │   └── technical.module.ts
│   └── news-sentiment/
│       ├── news-sentiment.agent.ts -- Alpha Vantage news feed + LLM sentiment pass
│       └── news-sentiment.module.ts
├── agent-result/
│   ├── agent-result.entity.ts
│   └── agent-result.module.ts
└── app.module.ts
```

All agents implement `AgentInterface`. `AnalysisService` calls all registered agents and adds new agents by registration only — no changes to the orchestration logic.

---

## Frontend Structure (React)

```
src/
├── pages/
│   └── Home.tsx                    -- ticker input + live results page
├── components/
│   ├── TickerInput.tsx             -- search input + submit
│   ├── AnalysisProgress.tsx        -- overall status, agent running/done indicators
│   ├── AgentResultCard.tsx         -- generic JSONB renderer for any agent output
│   └── AgentResultCard/
│       ├── TechnicalCard.tsx       -- specialized layout for technical signals
│       └── NewsSentimentCard.tsx   -- specialized layout for news + sentiment
└── hooks/
    └── useAnalysisStream.ts        -- SSE connection, event dispatch, cleanup
```

### UX Notes

- User enters ticker, hits Analyze → card area shows agents in pending/running/done state
- Each agent's card renders as its SSE event arrives
- **Output rendering is intentionally flexible**: the card renders whatever JSON the agent returns. Specialized card layouts (TechnicalCard, NewsSentimentCard) are added once the output schema is decided
- Cached results display a "Analyzed X hours ago" badge
- A top-level `AnalysisSummary` slot is reserved for a combined verdict — it only renders if the BE includes a `summary` field in the response. This is optional and deferred

---

## External Data Sources

| Agent           | Data Source                          | Notes                            |
|-----------------|--------------------------------------|----------------------------------|
| Technical       | Yahoo Finance (unofficial API)       | OHLCV, free, no key required     |
| News & Sentiment| Alpha Vantage News Sentiment API     | Free tier: 25 req/day            |

All external calls are wrapped with 2-attempt retry + exponential backoff. On final failure, the agent returns `status: failed` with an error message.

---

## Caching

- Cache TTL: **24 hours**
- Cache key: `ticker` (case-normalized, e.g. `AAPL`)
- Cache hit: BE returns the existing `Analysis` + all its `AgentResult` records immediately, with a `cached: true` flag
- Cache miss: full pipeline runs

---

## Error Handling

- **Single agent failure**: the other agent continues normally. The failed agent's SSE event carries `status: failed` and an error string. The FE renders a failure state on that card without blocking the rest.
- **All agents fail**: `Analysis.status` → `failed`
- **SSE client disconnect**: NestJS detects closed observable subscription; BE stops emitting
- **API rate limit**: handled by retry logic; if exhausted, agent is marked `failed`

---

## Configuration

All secrets and tunables live in `.env` / NestJS `ConfigModule`:

```
ALPHA_VANTAGE_API_KEY=
ANALYSIS_CACHE_TTL_HOURS=24
DATABASE_URL=
```

---

## MVP Scope

- [ ] 2 agents: Technical Analysis, News & Sentiment
- [ ] SSE streaming
- [ ] PostgreSQL persistence + 24h caching
- [ ] No authentication
- [ ] React frontend with flexible output rendering

---

## Future Work

The following was explicitly deferred and should be designed as a **separate spec** once the core system is built:

### Agent Intelligence Layer

1. **LLM tooling per agent**: Which model (Claude Sonnet/Opus?), which tools (web search, code execution), system prompt design, what context/markdown files to provide each agent.

2. **Agent self-improvement feedback loop**: The most interesting future feature. Concept:
   - After an agent produces a buy/sell/hold signal, a scheduled job checks the actual stock price N days later (e.g. 14 days)
   - If the prediction was wrong by a significant margin, the system triggers a "reflection" LLM call: the agent is shown its original analysis + the actual outcome and asked to identify what it missed
   - The reflection is stored and injected into future analyses as learned context (prompt augmentation or few-shot examples)
   - This requires: outcome tracking schema, a scheduled evaluation job, a reflection prompt, and a mechanism for versioning/storing learned insights per agent

3. **Prompt versioning**: Track which prompt version produced which analysis, to measure improvement over time.

4. **Additional agents**: Earnings & Fundamentals, Macro/Sector Analysis, Insider Trading signals, Options flow.

5. **Combined verdict**: A meta-agent or aggregation service that synthesizes all agent outputs into a single signal with confidence score.

These concerns should be designed together in a dedicated session once v1 is live and real agent outputs are available to reason about.
