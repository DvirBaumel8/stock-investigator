# Ticker List Feature — Design

**Date:** 2026-06-14
**Branch:** `feature/ticker-list`
**Status:** Approved

## Goal

Fetch the full list of active US-listed tickers, persist them in a new database
table, keep them fresh with a weekly cron, and expose them to the frontend via a
`GET /tickers` endpoint suitable for a search-as-you-type ticker picker.

## Decisions

- **Data source:** Alpha Vantage `LISTING_STATUS` endpoint (CSV). The API key is
  already configured in `.env` as `ALPHA_VANTAGE_API_KEY`. A single request per
  refresh fits comfortably within the free tier (25 req/day) for a weekly cron.
- **Scope:** active **Stocks + ETFs** (`assetType ∈ {Stock, ETF}`).
- **Refresh strategy:** upsert by `symbol` (insert new, update changed, keep
  existing). Symbols no longer present in the latest pull are **soft-delisted**
  (`active = false`) rather than deleted. The table is **seeded on startup if
  empty** so the endpoint works immediately without waiting for the first cron.
- **Endpoint shape:** `GET /tickers?search=&limit=` — search by symbol/name with
  a clamped limit. Ideal for a frontend autocomplete.
- **Cron cadence:** weekly, Sundays 00:00 (`@nestjs/schedule` `EVERY_WEEK`).

## Architecture (Approach A — dedicated module with isolated units)

New module at `backend/src/tickers/`, mirroring the codebase's per-domain module
pattern (`analysis/`, `agents/`). Each unit has one responsibility:

| Unit | Responsibility | Depends on |
|---|---|---|
| `Ticker` (entity) | Maps the `tickers` table | — |
| `AlphaVantageTickerProvider` | Fetch + parse the CSV into plain `TickerRecord[]`. No DB knowledge. | global `fetch`, `ConfigService` |
| `TickersService` | Persistence + logic: `upsertMany`, `search`, `count` | `Ticker` repository |
| `TickersRefreshService` | Orchestration: weekly `@Cron` + `OnModuleInit` startup seed. Wires provider → service. | provider, service |
| `TickersController` | `GET /tickers` | service |
| `TickersModule` | Wires the units together | — |

Additional wiring:

- Add **`@nestjs/schedule`** as a dependency.
- Register `ScheduleModule.forRoot()` in `app.module.ts`.
- Register `TickersModule` in `app.module.ts`.

The Alpha Vantage HTTP + CSV-parsing logic is isolated behind
`AlphaVantageTickerProvider` so it can be unit-tested with a sample CSV string,
without hitting the network.

## Data model — `tickers` table

```
id          uuid          PK (PrimaryGeneratedColumn 'uuid')
symbol      varchar(32)   UNIQUE, indexed  -- some live symbols exceed 10 chars (e.g. NXT(EXP20091224))
name        varchar
exchange    varchar
assetType   varchar       -- 'Stock' | 'ETF'
active      boolean       default true   -- soft-delist flag
lastSeenAt  timestamp     -- set each refresh a symbol appears in the pull
createdAt   @CreateDateColumn
updatedAt   @UpdateDateColumn
```

`synchronize: true` is already enabled, so the table is created automatically on
boot — no migration required.

## Data flow

### Refresh (weekly cron + startup-if-empty)

1. `TickersRefreshService` captures `runAt = new Date()` and calls
   `provider.fetchActiveTickers()`.
2. The provider issues `GET …/query?function=LISTING_STATUS&apikey=…`, parses the
   CSV, and keeps rows where `assetType ∈ {Stock, ETF}`, producing
   `TickerRecord[]` (`{ symbol, name, exchange, assetType }`).
3. `service.upsertMany(records, runAt)` performs
   `INSERT … ON CONFLICT (symbol) DO UPDATE`, setting `active = true` and
   `lastSeenAt = runAt` for every record.
4. Soft-delist: `UPDATE tickers SET active = false WHERE lastSeenAt < runAt` —
   marks symbols not present in this pull as inactive.
5. An `isRunning` boolean lock prevents overlapping runs. The startup seed only
   fires when `count() === 0`, and runs in the background so it does not block
   application boot.

### Read

`GET /tickers?search=AAP&limit=20` → `service.search(search, limit)`:

- With `search`: `WHERE active AND (symbol ILIKE 'AAP%' OR name ILIKE '%AAP%')
  ORDER BY symbol LIMIT n`.
- Without `search`: first `n` active rows, ordered by symbol.
- `limit` is clamped (default 20, max 100).
- Returns `[{ symbol, name, exchange, assetType }]` — internal columns
  (`active`, `lastSeenAt`, timestamps, `id`) are omitted from the response.

## Error handling

- Alpha Vantage returns rate-limit and error conditions as **JSON, not CSV**
  (e.g. an `Information` or `Note` field). The provider detects a non-CSV body
  (missing the expected header row) and **throws a clear error**.
- A failed refresh **logs the error and leaves existing data intact** (no wipe);
  the cron retries on its next scheduled run. A startup-seed failure logs and the
  endpoint returns `[]` until the next successful refresh.
- `search` input is escaped for `ILIKE` special characters (`%`, `_`); `limit` is
  validated and clamped.

## Testing (TDD)

Follows the existing `*.spec.ts` / Jest style already configured in the backend.

- **`AlphaVantageTickerProvider`:** parses a sample CSV string into records;
  filters out non-Stock/ETF rows; throws on a rate-limit JSON body.
- **`TickersService`:** `search` filtering, ordering, limit clamping; `upsertMany`
  insert + update + soft-delist behavior; `count`.
- **`TickersController`:** maps query params and clamps `limit`.

## Out of scope

- Authentication (none in the MVP).
- Exchange/market metadata beyond the four stored columns.
- Frontend ticker-picker UI (separate feature).
- Non-US listings.
