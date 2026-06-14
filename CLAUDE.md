# Stock Investigator

A full-stack web application for multi-agent USA stock analysis.

## What It Does

Users enter a stock ticker. The system runs multiple specialized AI agents in parallel, streaming results to the frontend in real time. Each agent covers a distinct analytical domain. Results are persisted in PostgreSQL with a 24-hour cache per ticker.

## Stack

- **Frontend**: React (TypeScript)
- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL (TypeORM)

## Architecture

- Agents run concurrently via `Promise.all`
- Results stream to the FE via Server-Sent Events (SSE) as each agent completes
- Each agent implements a shared `AgentInterface`: `analyze(ticker): Promise<AgentOutput>`
- Output schema is JSONB and intentionally flexible per agent

## MVP Agents

1. **Technical Analysis** — OHLCV data from Yahoo Finance, computes RSI / MACD / moving averages
2. **News & Sentiment** — Alpha Vantage News API + LLM sentiment pass

## Key Design Decisions

- **No authentication** in MVP
- **24-hour cache** per ticker — same ticker within 24h returns cached result
- **Output format is deferred** — agent output shape (per-agent opinions vs combined verdict vs grade) is decided before building agent internals, not now
- **Agent intelligence layer is a separate phase** — LLM tooling, prompt design, and self-improvement feedback loop are out of scope for v1

## External APIs

- Yahoo Finance (unofficial, no key required) — market data
- Alpha Vantage free tier (25 req/day) — news sentiment; also `LISTING_STATUS` for the ticker universe (see Ticker List)

Keys live in `.env` via NestJS `ConfigModule`. Never hardcoded.

## Ticker List

A `tickers/` module maintains the universe of tradable US symbols:

- **Source**: Alpha Vantage `LISTING_STATUS` (CSV), active Stocks + ETFs
- **Storage**: `tickers` table (`symbol`, `name`, `exchange`, `assetType`, `active`, `lastSeenAt`). `symbol` is `varchar(32)` — some listed symbols exceed 10 chars (e.g. `NXT(EXP20091224)`).
- **Refresh**: weekly cron (`@nestjs/schedule`, Sundays 00:00) upserts by symbol and soft-delists (`active=false`) symbols no longer listed. Seeds once on startup if the table is empty. A failed fetch is logged and leaves existing data intact.
- **API**: `GET /tickers?search=&limit=` — search by symbol prefix / name substring, `limit` clamped to 100 (default 20). Returns `{ symbol, name, exchange, assetType }[]`.

## Future Work

See `docs/superpowers/specs/2026-06-13-stock-investigator-design.md` → "Future Work" section for the planned Agent Intelligence Layer, including the self-improvement feedback loop.

## Project Structure

```
stock-investigator/
├── backend/          -- NestJS app
├── frontend/         -- React app
└── docs/
    └── superpowers/
        └── specs/    -- design documents
```
