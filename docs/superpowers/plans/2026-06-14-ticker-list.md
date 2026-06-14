# Ticker List Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch active US tickers (Stocks + ETFs) from Alpha Vantage, persist them in a new `tickers` table, refresh weekly via cron (plus seed-on-startup-if-empty), and expose them via a `GET /tickers` search endpoint.

**Architecture:** A self-contained `TickersModule` in the NestJS backend with isolated units: a provider (fetch + parse CSV), an entity, a persistence service (upsert/search/count), a refresh orchestrator (cron + startup seed), and a controller. The Alpha Vantage HTTP + CSV logic is isolated behind the provider so it is unit-testable without the network.

**Tech Stack:** NestJS 10, TypeORM 0.3, PostgreSQL, `@nestjs/schedule`, Jest, global `fetch` (Node 24).

All paths are relative to `backend/`. Run all commands from `backend/`.

---

### Task 1: Add the scheduler dependency

**Files:**
- Modify: `backend/package.json` (via npm)

- [ ] **Step 1: Install `@nestjs/schedule`**

Run: `npm install @nestjs/schedule`
Expected: package added to `dependencies`, install succeeds with no errors.

- [ ] **Step 2: Verify it resolves**

Run: `node -e "require('@nestjs/schedule'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore: add @nestjs/schedule for ticker cron

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Ticker entity

**Files:**
- Create: `backend/src/tickers/ticker.entity.ts`

Entities are declarative (no behavior), so there is no separate unit test — the build and the later integration check verify it.

- [ ] **Step 1: Create the entity**

```typescript
// backend/src/tickers/ticker.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tickers')
export class Ticker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 10 })
  symbol: string;

  @Column()
  name: string;

  @Column()
  exchange: string;

  @Column()
  assetType: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamp' })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tickers/ticker.entity.ts
git commit -m "$(cat <<'EOF'
feat: add Ticker entity

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Alpha Vantage provider (fetch + parse)

**Files:**
- Create: `backend/src/tickers/alpha-vantage-ticker.provider.ts`
- Test: `backend/src/tickers/alpha-vantage-ticker.provider.spec.ts`

The CSV columns from `LISTING_STATUS` are: `symbol,name,exchange,assetType,ipoDate,delistingDate,status`. Names can contain commas, so the parser anchors fields from the end of the row (status is always last) and joins the middle back into `name`.

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/tickers/alpha-vantage-ticker.provider.spec.ts
import { AlphaVantageTickerProvider } from './alpha-vantage-ticker.provider';

const makeProvider = (apiKey: string | undefined = 'KEY') =>
  new AlphaVantageTickerProvider({
    get: () => apiKey,
  } as any);

const CSV = [
  'symbol,name,exchange,assetType,ipoDate,delistingDate,status',
  'AAPL,Apple Inc,NASDAQ,Stock,1980-12-12,null,Active',
  'SPY,SPDR S&P 500 ETF Trust,NYSE ARCA,ETF,1993-01-29,null,Active',
  'WARR,Warrant Co,NYSE,Warrant,2020-01-01,null,Active',
  'BRKA,"Berkshire, Hathaway",NYSE,Stock,1980-01-01,null,Active',
].join('\n');

describe('AlphaVantageTickerProvider', () => {
  describe('parseCsv', () => {
    it('parses Stock and ETF rows into records', () => {
      const records = makeProvider().parseCsv(CSV);
      expect(records).toContainEqual({
        symbol: 'AAPL',
        name: 'Apple Inc',
        exchange: 'NASDAQ',
        assetType: 'Stock',
      });
      expect(records).toContainEqual({
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        exchange: 'NYSE ARCA',
        assetType: 'ETF',
      });
    });

    it('filters out non-Stock/ETF asset types', () => {
      const records = makeProvider().parseCsv(CSV);
      expect(records.find((r) => r.symbol === 'WARR')).toBeUndefined();
    });

    it('handles commas inside the name field', () => {
      const records = makeProvider().parseCsv(CSV);
      expect(records).toContainEqual({
        symbol: 'BRKA',
        name: 'Berkshire, Hathaway',
        exchange: 'NYSE',
        assetType: 'Stock',
      });
    });

    it('throws when Alpha Vantage returns a JSON error/rate-limit body', () => {
      const body = '{ "Information": "rate limit reached" }';
      expect(() => makeProvider().parseCsv(body)).toThrow(/non-CSV/);
    });
  });

  describe('fetchActiveTickers', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('throws when the API key is missing', async () => {
      await expect(makeProvider(undefined).fetchActiveTickers()).rejects.toThrow(
        /ALPHA_VANTAGE_API_KEY/,
      );
    });

    it('fetches and parses the CSV body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => CSV,
      }) as any;

      const records = await makeProvider().fetchActiveTickers();
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
        'function=LISTING_STATUS',
      );
      expect(records.find((r) => r.symbol === 'AAPL')).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- alpha-vantage-ticker.provider`
Expected: FAIL — cannot find module `./alpha-vantage-ticker.provider`.

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/tickers/alpha-vantage-ticker.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TickerRecord {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
}

@Injectable()
export class AlphaVantageTickerProvider {
  private readonly logger = new Logger(AlphaVantageTickerProvider.name);
  private readonly baseUrl = 'https://www.alphavantage.co/query';

  constructor(private readonly configService: ConfigService) {}

  async fetchActiveTickers(): Promise<TickerRecord[]> {
    const apiKey = this.configService.get<string>('ALPHA_VANTAGE_API_KEY');
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
    }
    const url = `${this.baseUrl}?function=LISTING_STATUS&state=active&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage request failed: HTTP ${response.status}`);
    }
    const body = await response.text();
    return this.parseCsv(body);
  }

  // Columns: symbol,name,exchange,assetType,ipoDate,delistingDate,status
  // Names can contain commas, so anchor fields from the end (status is last).
  parseCsv(body: string): TickerRecord[] {
    const trimmed = body.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      throw new Error(
        `Alpha Vantage returned a non-CSV response: ${trimmed.slice(0, 200)}`,
      );
    }

    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const header = lines[0]?.toLowerCase();
    if (!header || !header.startsWith('symbol,')) {
      throw new Error(
        `Unexpected Alpha Vantage CSV header: ${header ?? '(empty)'}`,
      );
    }

    const records: TickerRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 7) continue;

      const symbol = cols[0].trim();
      const assetType = cols[cols.length - 4].trim();
      const exchange = cols[cols.length - 5].trim();
      const name = cols
        .slice(1, cols.length - 5)
        .join(',')
        .trim()
        .replace(/^"|"$/g, '');

      if (!symbol) continue;
      if (assetType !== 'Stock' && assetType !== 'ETF') continue;

      records.push({ symbol, name, exchange, assetType });
    }
    return records;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- alpha-vantage-ticker.provider`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/tickers/alpha-vantage-ticker.provider.ts src/tickers/alpha-vantage-ticker.provider.spec.ts
git commit -m "$(cat <<'EOF'
feat: add Alpha Vantage ticker provider with CSV parsing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: TickersService (persistence + search)

**Files:**
- Create: `backend/src/tickers/tickers.service.ts`
- Test: `backend/src/tickers/tickers.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/tickers/tickers.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike, LessThan } from 'typeorm';
import { TickersService } from './tickers.service';
import { Ticker } from './ticker.entity';

describe('TickersService', () => {
  let service: TickersService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TickersService,
        { provide: getRepositoryToken(Ticker), useValue: repo },
      ],
    }).compile();

    service = module.get<TickersService>(TickersService);
  });

  describe('count', () => {
    it('delegates to the repository', async () => {
      repo.count.mockResolvedValueOnce(42);
      expect(await service.count()).toBe(42);
    });
  });

  describe('upsertMany', () => {
    it('does nothing for an empty list', async () => {
      await service.upsertMany([], new Date());
      expect(repo.upsert).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('upserts rows with active=true and lastSeenAt=runAt, conflict on symbol', async () => {
      const runAt = new Date('2026-06-14T00:00:00Z');
      await service.upsertMany(
        [{ symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' }],
        runAt,
      );
      expect(repo.upsert).toHaveBeenCalledWith(
        [
          {
            symbol: 'AAPL',
            name: 'Apple Inc',
            exchange: 'NASDAQ',
            assetType: 'Stock',
            active: true,
            lastSeenAt: runAt,
          },
        ],
        ['symbol'],
      );
    });

    it('soft-delists symbols not seen in this run', async () => {
      const runAt = new Date('2026-06-14T00:00:00Z');
      await service.upsertMany(
        [{ symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' }],
        runAt,
      );
      expect(repo.update).toHaveBeenCalledWith(
        { lastSeenAt: LessThan(runAt) },
        { active: false },
      );
    });
  });

  describe('search', () => {
    it('searches by symbol prefix and name substring when given a term', async () => {
      await service.search('aap', 5);
      expect(repo.find).toHaveBeenCalledWith({
        where: [
          { active: true, symbol: ILike('aap%') },
          { active: true, name: ILike('%aap%') },
        ],
        order: { symbol: 'ASC' },
        take: 5,
      });
    });

    it('clamps the limit to the max of 100', async () => {
      await service.search('a', 9999);
      expect(repo.find.mock.calls[0][0].take).toBe(100);
    });

    it('uses the default limit of 20 when none is given', async () => {
      await service.search('a');
      expect(repo.find.mock.calls[0][0].take).toBe(20);
    });

    it('returns active tickers ordered by symbol when no term is given', async () => {
      await service.search();
      expect(repo.find).toHaveBeenCalledWith({
        where: { active: true },
        order: { symbol: 'ASC' },
        take: 20,
      });
    });

    it('escapes ILIKE special characters in the search term', async () => {
      await service.search('a%b_c', 5);
      expect(repo.find.mock.calls[0][0].where[0].symbol).toEqual(
        ILike('a\\%b\\_c%'),
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tickers.service`
Expected: FAIL — cannot find module `./tickers.service`.

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/tickers/tickers.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, LessThan } from 'typeorm';
import { Ticker } from './ticker.entity';
import { TickerRecord } from './alpha-vantage-ticker.provider';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UPSERT_CHUNK = 500;

@Injectable()
export class TickersService {
  constructor(
    @InjectRepository(Ticker)
    private readonly tickerRepo: Repository<Ticker>,
  ) {}

  count(): Promise<number> {
    return this.tickerRepo.count();
  }

  async upsertMany(records: TickerRecord[], runAt: Date): Promise<void> {
    if (records.length === 0) return;

    const rows = records.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchange,
      assetType: r.assetType,
      active: true,
      lastSeenAt: runAt,
    }));

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      await this.tickerRepo.upsert(rows.slice(i, i + UPSERT_CHUNK), ['symbol']);
    }

    // Symbols not present in this refresh are soft-delisted.
    await this.tickerRepo.update(
      { lastSeenAt: LessThan(runAt) },
      { active: false },
    );
  }

  async search(search?: string, limit?: number): Promise<Ticker[]> {
    const take = Math.min(Math.max(1, limit ?? DEFAULT_LIMIT), MAX_LIMIT);

    const term = search?.trim();
    if (term) {
      const q = this.escapeLike(term);
      return this.tickerRepo.find({
        where: [
          { active: true, symbol: ILike(`${q}%`) },
          { active: true, name: ILike(`%${q}%`) },
        ],
        order: { symbol: 'ASC' },
        take,
      });
    }

    return this.tickerRepo.find({
      where: { active: true },
      order: { symbol: 'ASC' },
      take,
    });
  }

  private escapeLike(input: string): string {
    return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tickers.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tickers/tickers.service.ts src/tickers/tickers.service.spec.ts
git commit -m "$(cat <<'EOF'
feat: add TickersService with upsert, soft-delist, and search

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: TickersRefreshService (cron + startup seed)

**Files:**
- Create: `backend/src/tickers/tickers-refresh.service.ts`
- Test: `backend/src/tickers/tickers-refresh.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/tickers/tickers-refresh.service.spec.ts
import { TickersRefreshService } from './tickers-refresh.service';

describe('TickersRefreshService', () => {
  let provider: any;
  let tickersService: any;
  let service: TickersRefreshService;

  beforeEach(() => {
    provider = { fetchActiveTickers: jest.fn().mockResolvedValue([]) };
    tickersService = {
      count: jest.fn().mockResolvedValue(0),
      upsertMany: jest.fn().mockResolvedValue(undefined),
    };
    service = new TickersRefreshService(provider, tickersService);
  });

  describe('onModuleInit', () => {
    it('seeds when the table is empty', async () => {
      tickersService.count.mockResolvedValueOnce(0);
      const spy = jest.spyOn(service, 'refresh').mockResolvedValue();
      await service.onModuleInit();
      expect(spy).toHaveBeenCalled();
    });

    it('does not seed when the table already has tickers', async () => {
      tickersService.count.mockResolvedValueOnce(5);
      const spy = jest.spyOn(service, 'refresh').mockResolvedValue();
      await service.onModuleInit();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('fetches records and upserts them with a run timestamp', async () => {
      const records = [
        { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' },
      ];
      provider.fetchActiveTickers.mockResolvedValueOnce(records);

      await service.refresh();

      expect(provider.fetchActiveTickers).toHaveBeenCalled();
      expect(tickersService.upsertMany).toHaveBeenCalledWith(
        records,
        expect.any(Date),
      );
    });

    it('does not throw and leaves data intact when the provider fails', async () => {
      provider.fetchActiveTickers.mockRejectedValueOnce(new Error('rate limit'));
      await expect(service.refresh()).resolves.toBeUndefined();
      expect(tickersService.upsertMany).not.toHaveBeenCalled();
    });

    it('skips when a refresh is already running', async () => {
      (service as any).isRunning = true;
      await service.refresh();
      expect(provider.fetchActiveTickers).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tickers-refresh.service`
Expected: FAIL — cannot find module `./tickers-refresh.service`.

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/tickers/tickers-refresh.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlphaVantageTickerProvider } from './alpha-vantage-ticker.provider';
import { TickersService } from './tickers.service';

@Injectable()
export class TickersRefreshService implements OnModuleInit {
  private readonly logger = new Logger(TickersRefreshService.name);
  private isRunning = false;

  constructor(
    private readonly provider: AlphaVantageTickerProvider,
    private readonly tickersService: TickersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.tickersService.count();
    if (count === 0) {
      this.logger.log('Tickers table is empty — seeding on startup');
      // Run in the background so we do not block application boot.
      void this.refresh();
    }
  }

  // EVERY_WEEK = '0 0 * * 0' — Sundays at 00:00.
  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyRefresh(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Ticker refresh already in progress — skipping');
      return;
    }
    this.isRunning = true;
    const runAt = new Date();
    try {
      const records = await this.provider.fetchActiveTickers();
      await this.tickersService.upsertMany(records, runAt);
      this.logger.log(`Ticker refresh complete: ${records.length} active tickers`);
    } catch (err) {
      this.logger.error(`Ticker refresh failed: ${(err as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tickers-refresh.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tickers/tickers-refresh.service.ts src/tickers/tickers-refresh.service.spec.ts
git commit -m "$(cat <<'EOF'
feat: add weekly ticker refresh cron with startup seeding

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: TickersController (GET /tickers)

**Files:**
- Create: `backend/src/tickers/tickers.controller.ts`
- Test: `backend/src/tickers/tickers.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/tickers/tickers.controller.spec.ts
import { TickersController } from './tickers.controller';

describe('TickersController', () => {
  let controller: TickersController;
  let tickersService: any;

  beforeEach(() => {
    tickersService = {
      search: jest.fn().mockResolvedValue([
        {
          id: 'uuid-1',
          symbol: 'AAPL',
          name: 'Apple Inc',
          exchange: 'NASDAQ',
          assetType: 'Stock',
          active: true,
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };
    controller = new TickersController(tickersService);
  });

  it('passes search and parsed limit to the service', async () => {
    await controller.list('aap', '5');
    expect(tickersService.search).toHaveBeenCalledWith('aap', 5);
  });

  it('passes undefined limit when none is provided', async () => {
    await controller.list('aap', undefined);
    expect(tickersService.search).toHaveBeenCalledWith('aap', undefined);
  });

  it('passes undefined limit when the limit is not a number', async () => {
    await controller.list(undefined, 'abc');
    expect(tickersService.search).toHaveBeenCalledWith(undefined, undefined);
  });

  it('returns only public fields', async () => {
    const result = await controller.list(undefined, undefined);
    expect(result).toEqual([
      { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', assetType: 'Stock' },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tickers.controller`
Expected: FAIL — cannot find module `./tickers.controller`.

- [ ] **Step 3: Write the implementation**

```typescript
// backend/src/tickers/tickers.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { TickersService } from './tickers.service';

@Controller('tickers')
export class TickersController {
  constructor(private readonly tickersService: TickersService) {}

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit !== undefined ? parseInt(limit, 10) : undefined;
    const safeLimit =
      parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined;

    const tickers = await this.tickersService.search(search, safeLimit);

    return tickers.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      exchange: t.exchange,
      assetType: t.assetType,
    }));
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tickers.controller`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tickers/tickers.controller.ts src/tickers/tickers.controller.spec.ts
git commit -m "$(cat <<'EOF'
feat: add GET /tickers search endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Wire up the module and app

**Files:**
- Create: `backend/src/tickers/tickers.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create the module**

```typescript
// backend/src/tickers/tickers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticker } from './ticker.entity';
import { TickersService } from './tickers.service';
import { TickersController } from './tickers.controller';
import { AlphaVantageTickerProvider } from './alpha-vantage-ticker.provider';
import { TickersRefreshService } from './tickers-refresh.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticker])],
  providers: [
    TickersService,
    AlphaVantageTickerProvider,
    TickersRefreshService,
  ],
  controllers: [TickersController],
})
export class TickersModule {}
```

- [ ] **Step 2: Update `app.module.ts`**

Replace the entire file with:

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './analysis/analysis.entity';
import { AgentResult } from './agent-result/agent-result.entity';
import { Ticker } from './tickers/ticker.entity';
import { AnalysisModule } from './analysis/analysis.module';
import { TickersModule } from './tickers/tickers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [Analysis, AgentResult, Ticker],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AnalysisModule,
    TickersModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Run the whole test suite**

Run: `npm test`
Expected: PASS — all suites (existing + new tickers suites) green.

- [ ] **Step 4: Build to confirm everything compiles and wires**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/tickers/tickers.module.ts src/app.module.ts
git commit -m "$(cat <<'EOF'
feat: wire TickersModule and ScheduleModule into the app

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Integration check and documentation

**Files:**
- Modify: `CLAUDE.md` (repo root — one level above `backend/`)

- [ ] **Step 1: Boot the app and confirm it connects and creates the table**

Run (from `backend/`):
```bash
( npm run start:dev > /tmp/si_tickers_boot.log 2>&1 & echo $! > /tmp/si_tickers.pid )
sleep 12
grep -iE "Nest application successfully started|tickers|error" /tmp/si_tickers_boot.log | tail -20
```
Expected: "Nest application successfully started" and a log line about seeding the empty tickers table (or a refresh attempt). No fatal errors. (The seed will fail gracefully if the Alpha Vantage key is still a placeholder — that is acceptable and logged, not fatal.)

- [ ] **Step 2: Hit the endpoint**

Run: `curl -s "http://localhost:3001/tickers?search=AAP&limit=5"`
Expected: a JSON array (empty `[]` if the key is a placeholder and no seed ran, or matching tickers if a real key seeded the table). The endpoint must respond with HTTP 200 and valid JSON, not an error.

- [ ] **Step 3: Stop the app**

Run:
```bash
kill "$(cat /tmp/si_tickers.pid)" 2>/dev/null; pkill -f "nest start" 2>/dev/null; echo stopped
```
Expected: prints `stopped`.

- [ ] **Step 4: Update the root `CLAUDE.md`**

In `CLAUDE.md`, find the `## Project Structure` section's code block and add a `tickers` note under `backend/`. Then add a new section after `## External APIs` documenting the feature. Insert this new section immediately before `## Future Work`:

```markdown
## Ticker List

A `tickers/` module maintains the universe of tradable US symbols:

- **Source**: Alpha Vantage `LISTING_STATUS` (CSV), active Stocks + ETFs
- **Storage**: `tickers` table (`symbol`, `name`, `exchange`, `assetType`, `active`, `lastSeenAt`)
- **Refresh**: weekly cron (`@nestjs/schedule`, Sundays 00:00) upserts by symbol and soft-delists (`active=false`) symbols no longer listed. Seeds once on startup if the table is empty.
- **API**: `GET /tickers?search=&limit=` — search by symbol prefix / name substring, `limit` clamped to 100 (default 20). Returns `{ symbol, name, exchange, assetType }[]`.

```

- [ ] **Step 5: Verify the doc edit and run the full suite once more**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add ../CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: document ticker list feature in CLAUDE.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Notes for the implementer

- `@Cron(CronExpression.EVERY_WEEK)` fires Sundays at 00:00 (`0 0 * * 0`).
- The startup seed and the weekly cron both call `refresh()`, which is guarded by an `isRunning` flag so the two cannot overlap.
- A real `ALPHA_VANTAGE_API_KEY` is needed for the seed/refresh to populate data. With the placeholder key, the provider throws, the error is logged, and the table stays empty — the endpoint still returns `200 []`.
- `synchronize: true` creates the `tickers` table automatically; no migration is required. Adding `Ticker` to the root `entities` array (Task 7) is what makes that happen.
