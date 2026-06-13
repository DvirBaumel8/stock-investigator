# Stock Investigator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack stock analysis system where a user enters a ticker, two AI agents run in parallel, and results stream to the UI in real time via Server-Sent Events.

**Architecture:** NestJS backend with TypeORM/PostgreSQL stores `Analysis` and `AgentResult` records. Two injectable agents (`TechnicalAgent`, `NewsSentimentAgent`) are launched concurrently via `Promise.all`. As each agent resolves, `AnalysisService` writes the result to DB and pushes it to an RxJS `Subject`, which the SSE controller streams to the browser. A 24-hour per-ticker cache returns existing DB records immediately without re-running agents.

**Tech Stack:** NestJS 10, TypeORM 0.3, PostgreSQL, RxJS 7, React 18, Vite 5, `yahoo-finance2`, `axios`, `@anthropic-ai/sdk` (`claude-opus-4-8`), `zod`

---

## File Structure

```
stock-investigator/
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── analysis/
│   │   │   ├── analysis.entity.ts
│   │   │   ├── analysis.service.ts
│   │   │   ├── analysis.service.spec.ts
│   │   │   ├── analysis.controller.ts
│   │   │   └── analysis.module.ts
│   │   ├── agent-result/
│   │   │   ├── agent-result.entity.ts
│   │   │   └── agent-result.module.ts
│   │   └── agents/
│   │       ├── agent.interface.ts
│   │       ├── technical/
│   │       │   ├── technical.agent.ts
│   │       │   └── technical.module.ts
│   │       └── news-sentiment/
│   │           ├── news-sentiment.agent.ts
│   │           ├── news-sentiment.agent.spec.ts
│   │           └── news-sentiment.module.ts
│   ├── .env.example
│   ├── nest-cli.json
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── hooks/
    │   │   └── useAnalysisStream.ts
    │   ├── components/
    │   │   ├── TickerInput.tsx
    │   │   ├── AgentResultCard.tsx
    │   │   └── AnalysisProgress.tsx
    │   └── pages/
    │       └── Home.tsx
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

---

## Task 1: Scaffold Backend

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/nest-cli.json`
- Create: `backend/.env.example`
- Create: `backend/src/main.ts` (placeholder)
- Create: `backend/src/app.module.ts` (placeholder)

- [ ] **Step 1: Create the backend directory and package.json**

Run from `stock-investigator/`:
```bash
mkdir -p backend/src
```

Create `backend/package.json`:
```json
{
  "name": "stock-investigator-backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "typeorm": "^0.3.0",
    "pg": "^8.0.0",
    "rxjs": "^7.0.0",
    "reflect-metadata": "^0.2.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^18.0.0",
    "@types/pg": "^8.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Create tsconfig.json and nest-cli.json**

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false
  }
}
```

Create `backend/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 3: Create .env.example**

Create `backend/.env.example`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/stock_investigator
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANALYSIS_CACHE_TTL_HOURS=24
PORT=3001
```

Also copy to `.env` for local development (fill in real values):
```bash
cp backend/.env.example backend/.env
```

- [ ] **Step 4: Install dependencies**

Run from `stock-investigator/backend/`:
```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Create placeholder main.ts and app.module.ts**

Create `backend/src/main.ts`:
```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:5173' });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
```

Create `backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';

@Module({})
export class AppModule {}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run from `backend/`:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add backend/
git -C /Users/dvir/claude/stock-investigator commit -m "feat: scaffold NestJS backend with dependencies"
```

---

## Task 2: Scaffold Frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx` (placeholder)
- Create: `frontend/src/App.tsx` (placeholder)

- [ ] **Step 1: Create Vite React TS project**

Run from `stock-investigator/`:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

Expected: `frontend/node_modules/` created.

- [ ] **Step 2: Create placeholder App.tsx and main.tsx**

`frontend/src/main.tsx` (already created by Vite — verify it looks like):
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Replace `frontend/src/App.tsx` with:
```tsx
export default function App() {
  return <div>Stock Investigator</div>;
}
```

Delete `frontend/src/App.css` and `frontend/src/index.css` if they exist (we'll use inline styles for simplicity).

Update `frontend/index.html` — remove the Vite default content from `<head>`, keep structure:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stock Investigator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify frontend builds**

Run from `frontend/`:
```bash
npm run build
```

Expected: `dist/` created, no errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add frontend/
git -C /Users/dvir/claude/stock-investigator commit -m "feat: scaffold React/Vite frontend"
```

---

## Task 3: Configure TypeORM + Database

**Files:**
- Modify: `backend/src/app.module.ts`

Prerequisites: PostgreSQL running locally with a database named `stock_investigator`.

Create the database if it doesn't exist:
```bash
createdb stock_investigator
```
Or via psql: `CREATE DATABASE stock_investigator;`

- [ ] **Step 1: Update app.module.ts with ConfigModule and TypeORM placeholder**

Replace `backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `backend/`:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify server starts and connects to DB**

Run from `backend/`:
```bash
npm run start:dev
```

Expected output contains: `Backend running on http://localhost:3001`
No error like `ECONNREFUSED` or `password authentication failed`.

Stop the server with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add backend/src/app.module.ts
git -C /Users/dvir/claude/stock-investigator commit -m "feat: configure NestJS ConfigModule and TypeORM with PostgreSQL"
```

---

## Task 4: Create Entities

**Files:**
- Create: `backend/src/analysis/analysis.entity.ts`
- Create: `backend/src/agent-result/agent-result.entity.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create the analysis entity**

Create `backend/src/analysis/analysis.entity.ts`:
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { AgentResult } from '../agent-result/agent-result.entity';

export enum AnalysisStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('analyses')
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  ticker: string;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => AgentResult, (result) => result.analysis, { eager: false })
  agentResults: AgentResult[];
}
```

- [ ] **Step 2: Create the agent-result entity**

Create `backend/src/agent-result/agent-result.entity.ts`:
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Analysis } from '../analysis/analysis.entity';

export enum AgentResultStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('agent_results')
export class AgentResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'analysis_id' })
  analysisId: string;

  @ManyToOne(() => Analysis, (analysis) => analysis.agentResults)
  @JoinColumn({ name: 'analysis_id' })
  analysis: Analysis;

  @Column({ name: 'agent_name', length: 50 })
  agentName: string;

  @Column({
    type: 'enum',
    enum: AgentResultStatus,
    default: AgentResultStatus.PENDING,
  })
  status: AgentResultStatus;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 3: Register entities in app.module.ts**

Update the `entities` array in `backend/src/app.module.ts`:
```typescript
import { Analysis } from './analysis/analysis.entity';
import { AgentResult } from './agent-result/agent-result.entity';

// Inside TypeOrmModule.forRootAsync useFactory:
entities: [Analysis, AgentResult],
```

Full updated `app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './analysis/analysis.entity';
import { AgentResult } from './agent-result/agent-result.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [Analysis, AgentResult],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Verify entities create tables**

Run from `backend/`:
```bash
npm run start:dev
```

Then in another terminal:
```bash
psql stock_investigator -c "\dt"
```

Expected output includes:
```
 public | agent_results | table | ...
 public | analyses      | table | ...
```

Stop the server.

- [ ] **Step 5: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add backend/src/analysis/analysis.entity.ts backend/src/agent-result/agent-result.entity.ts backend/src/app.module.ts
git -C /Users/dvir/claude/stock-investigator commit -m "feat: add Analysis and AgentResult TypeORM entities"
```

---

## Task 5: Define AgentInterface

**Files:**
- Create: `backend/src/agents/agent.interface.ts`

- [ ] **Step 1: Create the agent interface**

Create `backend/src/agents/agent.interface.ts`:
```typescript
export interface AgentInterface {
  readonly agentName: string;
  analyze(ticker: string): Promise<Record<string, unknown>>;
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add backend/src/agents/agent.interface.ts
git -C /Users/dvir/claude/stock-investigator commit -m "feat: define AgentInterface contract"
```

---

## Task 6: Create Stub Agents

Real agent implementations (Yahoo Finance indicators, Alpha Vantage + LLM) are deferred to a future phase. For now each agent returns a consistent JSON shape so the rest of the plumbing (SSE, DB, frontend) can be built and tested end-to-end.

**Files:**
- Create: `backend/src/agents/technical/technical.agent.ts`
- Create: `backend/src/agents/technical/technical.module.ts`
- Create: `backend/src/agents/news-sentiment/news-sentiment.agent.ts`
- Create: `backend/src/agents/news-sentiment/news-sentiment.module.ts`

- [ ] **Step 1: Create TechnicalAgent stub**

Create `backend/src/agents/technical/technical.agent.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AgentInterface } from '../agent.interface';

@Injectable()
export class TechnicalAgent implements AgentInterface {
  readonly agentName = 'technical';

  async analyze(ticker: string): Promise<Record<string, unknown>> {
    return {
      ticker,
      note: 'Stub — real implementation (Yahoo Finance + RSI/MACD) coming in a future phase',
      currentPrice: null,
      rsi14: null,
      macd: null,
      ma50: null,
      ma200: null,
      signals: [],
    };
  }
}
```

- [ ] **Step 2: Create TechnicalModule**

Create `backend/src/agents/technical/technical.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TechnicalAgent } from './technical.agent';

@Module({
  providers: [TechnicalAgent],
  exports: [TechnicalAgent],
})
export class TechnicalModule {}
```

- [ ] **Step 3: Create NewsSentimentAgent stub**

Create `backend/src/agents/news-sentiment/news-sentiment.agent.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AgentInterface } from '../agent.interface';

@Injectable()
export class NewsSentimentAgent implements AgentInterface {
  readonly agentName = 'news_sentiment';

  async analyze(ticker: string): Promise<Record<string, unknown>> {
    return {
      ticker,
      note: 'Stub — real implementation (Alpha Vantage + Claude Opus 4.8) coming in a future phase',
      overallSentiment: null,
      sentimentScore: null,
      summary: null,
      keyFactors: [],
      topHeadlines: [],
    };
  }
}
```

- [ ] **Step 4: Create NewsSentimentModule**

Create `backend/src/agents/news-sentiment/news-sentiment.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { NewsSentimentAgent } from './news-sentiment.agent';

@Module({
  providers: [NewsSentimentAgent],
  exports: [NewsSentimentAgent],
})
export class NewsSentimentModule {}
```

- [ ] **Step 5: Write a quick smoke test for each stub**

Create `backend/src/agents/technical/technical.agent.spec.ts`:
```typescript
import { TechnicalAgent } from './technical.agent';

describe('TechnicalAgent (stub)', () => {
  it('returns a record with agentName and ticker', async () => {
    const agent = new TechnicalAgent();
    const result = await agent.analyze('AAPL');
    expect(agent.agentName).toBe('technical');
    expect(result.ticker).toBe('AAPL');
    expect(Array.isArray(result.signals)).toBe(true);
  });
});
```

Create `backend/src/agents/news-sentiment/news-sentiment.agent.spec.ts`:
```typescript
import { NewsSentimentAgent } from './news-sentiment.agent';

describe('NewsSentimentAgent (stub)', () => {
  it('returns a record with agentName and ticker', async () => {
    const agent = new NewsSentimentAgent();
    const result = await agent.analyze('AAPL');
    expect(agent.agentName).toBe('news_sentiment');
    expect(result.ticker).toBe('AAPL');
    expect(Array.isArray(result.topHeadlines)).toBe(true);
  });
});
```

- [ ] **Step 6: Run stub tests**

```bash
npm test -- technical.agent.spec.ts news-sentiment.agent.spec.ts
```

Expected: PASS — 2 tests green.

- [ ] **Step 7: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add backend/src/agents/
git -C /Users/dvir/claude/stock-investigator commit -m "feat: add stub agents implementing AgentInterface (real logic deferred)"
```

---

## Task 7: Implement AnalysisService

**Files:**
- Create: `backend/src/analysis/analysis.service.ts`
- Create: `backend/src/analysis/analysis.service.spec.ts`
- Create: `backend/src/agent-result/agent-result.module.ts`

- [ ] **Step 1: Write failing tests for AnalysisService cache logic**

Create `backend/src/analysis/analysis.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AnalysisService } from './analysis.service';
import { Analysis, AnalysisStatus } from './analysis.entity';
import { AgentResult, AgentResultStatus } from '../agent-result/agent-result.entity';
import { TechnicalAgent } from '../agents/technical/technical.agent';
import { NewsSentimentAgent } from '../agents/news-sentiment/news-sentiment.agent';

const makeAnalysis = (overrides: Partial<Analysis> = {}): Analysis => ({
  id: 'test-uuid',
  ticker: 'AAPL',
  status: AnalysisStatus.COMPLETED,
  createdAt: new Date(),
  completedAt: new Date(),
  agentResults: [],
  ...overrides,
} as Analysis);

describe('AnalysisService', () => {
  let service: AnalysisService;
  let analysisRepo: any;
  let agentResultRepo: any;

  beforeEach(async () => {
    analysisRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    agentResultRepo = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: getRepositoryToken(Analysis), useValue: analysisRepo },
        { provide: getRepositoryToken(AgentResult), useValue: agentResultRepo },
        { provide: TechnicalAgent, useValue: { agentName: 'technical', analyze: jest.fn() } },
        { provide: NewsSentimentAgent, useValue: { agentName: 'news_sentiment', analyze: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => '24' } },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
  });

  describe('createOrGetAnalysis', () => {
    it('returns cached analysis when a completed one exists within 24h', async () => {
      const cached = makeAnalysis();
      analysisRepo.findOne.mockResolvedValueOnce(cached);

      const result = await service.createOrGetAnalysis('AAPL');

      expect(result.cached).toBe(true);
      expect(result.analysis.id).toBe('test-uuid');
      expect(analysisRepo.save).not.toHaveBeenCalled();
    });

    it('creates new analysis when no recent completed one exists', async () => {
      analysisRepo.findOne.mockResolvedValueOnce(null);
      const newAnalysis = makeAnalysis({ status: AnalysisStatus.RUNNING });
      analysisRepo.save.mockResolvedValueOnce(newAnalysis);

      const result = await service.createOrGetAnalysis('AAPL');

      expect(result.cached).toBe(false);
      expect(analysisRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'AAPL', status: AnalysisStatus.RUNNING }),
      );
    });

    it('normalizes ticker to uppercase', async () => {
      analysisRepo.findOne.mockResolvedValueOnce(null);
      analysisRepo.save.mockResolvedValueOnce(makeAnalysis({ ticker: 'AAPL', status: AnalysisStatus.RUNNING }));

      await service.createOrGetAnalysis('aapl');

      expect(analysisRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'AAPL' }),
      );
    });
  });
});
```

describe('calculateMA', () => {
  it('returns the simple moving average of the last N values', () => {
    const closes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(calculateMA(closes, 5)).toBeCloseTo(8, 2); // avg of [6,7,8,9,10]
  });

  it('returns NaN when not enough data', () => {
    expect(calculateMA([1, 2], 5)).toBeNaN();
  });
});

describe('calculateEMA', () => {
  it('returns array with length values.length - period + 1', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const ema = calculateEMA(closes, 12);
    expect(ema.length).toBe(9); // 20 - 12 + 1
  });

  it('first value equals SMA of first period values', () => {
    const closes = [10, 20, 30, 40, 50];
    const ema = calculateEMA(closes, 3);
    expect(ema[0]).toBeCloseTo(20, 2); // SMA(10, 20, 30) = 20
  });
});

describe('calculateRSI', () => {
  it('returns 100 when all changes are gains', () => {
    const closes = Array.from({ length: 16 }, (_, i) => 100 + i);
    expect(calculateRSI(closes, 14)).toBeCloseTo(100, 0);
  });

  it('returns 0 when all changes are losses', () => {
    const closes = Array.from({ length: 16 }, (_, i) => 100 - i);
    expect(calculateRSI(closes, 14)).toBeCloseTo(0, 0);
  });

  it('returns a value between 0 and 100 for mixed data', () => {
    const closes = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.15, 43.61, 44.33, 44.83, 45.1, 45.15, 45.23];
    const rsi = calculateRSI(closes, 14);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });
});

describe('calculateMACD', () => {
  it('returns macdLine, signalLine, and histogram', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.3) * 10);
    const result = calculateMACD(closes);
    expect(result).toHaveProperty('macdLine');
    expect(result).toHaveProperty('signalLine');
    expect(result).toHaveProperty('histogram');
    expect(typeof result.macdLine).toBe('number');
    expect(typeof result.signalLine).toBe('number');
    expect(typeof result.histogram).toBe('number');
  });

  it('histogram equals macdLine minus signalLine', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
    const result = calculateMACD(closes);
    expect(result.histogram).toBeCloseTo(result.macdLine - result.signalLine, 8);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run from `backend/`:
```bash
npm test -- indicators.util.spec.ts
```

Expected: FAIL — `Cannot find module './indicators.util'`

- [ ] **Step 3: Implement indicator utilities**

Create `backend/src/agents/technical/indicators.util.ts`:
```typescript
export function calculateMA(closes: number[], period: number): number {
  if (closes.length < period) return NaN;
  const slice = closes.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

export function calculateEMA(values: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  const initialSMA =
    values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  ema.push(initialSMA);

  for (let i = period; i < values.length; i++) {
    ema.push(values[i] * multiplier + ema[ema.length - 1] * (1 - multiplier));
  }

  return ema;
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) throw new Error('Not enough data for RSI');

  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map((c) => Math.max(c, 0));
  const losses = changes.map((c) => Math.max(-c, 0));

  let avgGain =
    gains.slice(0, period).reduce((sum, g) => sum + g, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((sum, l) => sum + l, 0) / period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(closes: number[]): {
  macdLine: number;
  signalLine: number;
  histogram: number;
} {
  // EMA(12) has closes.length - 11 elements; EMA(26) has closes.length - 25 elements.
  // Align: ema26[i] pairs with ema12[i + 14] (both refer to closes[i + 25]).
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  const macdValues = ema26.map((e26, i) => ema12[i + 14] - e26);
  const signalValues = calculateEMA(macdValues, 9);

  const macdLine = macdValues[macdValues.length - 1];
  const signalLine = signalValues[signalValues.length - 1];

  return { macdLine, signalLine, histogram: macdLine - signalLine };
}

export function generateSignals(
  rsi: number,
  macd: { macdLine: number; signalLine: number; histogram: number },
  currentPrice: number,
  ma50: number,
  ma200: number,
): string[] {
  const signals: string[] = [];

  if (rsi < 30) signals.push('RSI oversold (<30)');
  else if (rsi > 70) signals.push('RSI overbought (>70)');
  else signals.push('RSI neutral');

  if (macd.histogram > 0) signals.push('MACD bullish momentum');
  else signals.push('MACD bearish momentum');

  if (!isNaN(ma50)) {
    signals.push(
      currentPrice > ma50 ? 'Trading above MA50' : 'Trading below MA50',
    );
  }

  if (!isNaN(ma200)) {
    signals.push(
      currentPrice > ma200 ? 'Trading above MA200' : 'Trading below MA200',
    );
    if (!isNaN(ma50)) {
      signals.push(
        ma50 > ma200 ? 'Golden cross: MA50 > MA200' : 'Death cross: MA50 < MA200',
      );
    }
  }

  return signals;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- indicators.util.spec.ts
```

Expected: PASS — all tests green.

- [ ] **Step 5: Implement TechnicalAgent**

Create `backend/src/agents/technical/technical.agent.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import yahooFinance from 'yahoo-finance2';
import { AgentInterface } from '../agent.interface';
import {
  calculateRSI,
  calculateMACD,
  calculateMA,
  generateSignals,
} from './indicators.util';

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: Error;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError!;
}

@Injectable()
export class TechnicalAgent implements AgentInterface {
  readonly agentName = 'technical';
  private readonly logger = new Logger(TechnicalAgent.name);

  async analyze(ticker: string): Promise<Record<string, unknown>> {
    this.logger.log(`Running technical analysis for ${ticker}`);

    const [quote, historical] = await Promise.all([
      withRetry(() => yahooFinance.quote(ticker)),
      withRetry(() => {
        const period1 = new Date();
        period1.setFullYear(period1.getFullYear() - 2);
        return yahooFinance.historical(ticker, {
          period1,
          period2: new Date(),
          interval: '1d',
        });
      }),
    ]);

    const closes = historical
      .filter((d) => d.close != null)
      .map((d) => d.close as number);

    if (closes.length < 34) {
      throw new Error(`Insufficient historical data for ${ticker}: ${closes.length} days`);
    }

    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const ma50 = calculateMA(closes, 50);
    const ma200 = calculateMA(closes, 200);
    const currentPrice = quote.regularMarketPrice ?? closes[closes.length - 1];
    const signals = generateSignals(rsi, macd, currentPrice, ma50, ma200);

    return {
      ticker,
      currentPrice,
      change: quote.regularMarketChange ?? null,
      changePercent: quote.regularMarketChangePercent ?? null,
      rsi14: Math.round(rsi * 100) / 100,
      macd: {
        macdLine: Math.round(macd.macdLine * 10000) / 10000,
        signalLine: Math.round(macd.signalLine * 10000) / 10000,
        histogram: Math.round(macd.histogram * 10000) / 10000,
      },
      ma50: Math.round(ma50 * 100) / 100,
      ma200: isNaN(ma200) ? null : Math.round(ma200 * 100) / 100,
      signals,
      dataPoints: closes.length,
    };
  }
}
```

- [ ] **Step 6: Create technical module**

Create `backend/src/agents/technical/technical.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TechnicalAgent } from './technical.agent';

@Module({
  providers: [TechnicalAgent],
  exports: [TechnicalAgent],
})
export class TechnicalModule {}
```

- [ ] **Step 7: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add backend/src/agents/
git -C /Users/dvir/claude/stock-investigator commit -m "feat: implement TechnicalAnalysisAgent with RSI/MACD/MA indicators"
```

---

## Task 8: Implement AnalysisController + AnalysisModule

**Files:**
- Create: `backend/src/analysis/analysis.controller.ts`
- Create: `backend/src/analysis/analysis.module.ts`

- [ ] **Step 1: Create the controller**

Create `backend/src/analysis/analysis.controller.ts`:
```typescript
import { Controller, Param, Post, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post(':ticker')
  async createAnalysis(@Param('ticker') ticker: string) {
    const { analysis, cached } = await this.analysisService.createOrGetAnalysis(ticker);
    return {
      id: analysis.id,
      ticker: analysis.ticker,
      status: analysis.status,
      cached,
      createdAt: analysis.createdAt,
    };
  }

  @Sse(':id/stream')
  streamAnalysis(@Param('id') id: string): Observable<MessageEvent> {
    return this.analysisService.getStream(id);
  }
}
```

- [ ] **Step 2: Create the analysis module**

Create `backend/src/analysis/analysis.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './analysis.entity';
import { AgentResult } from '../agent-result/agent-result.entity';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { TechnicalModule } from '../agents/technical/technical.module';
import { NewsSentimentModule } from '../agents/news-sentiment/news-sentiment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis, AgentResult]),
    TechnicalModule,
    NewsSentimentModule,
  ],
  providers: [AnalysisService],
  controllers: [AnalysisController],
})
export class AnalysisModule {}
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add backend/src/analysis/analysis.controller.ts backend/src/analysis/analysis.module.ts
git -C /Users/dvir/claude/stock-investigator commit -m "feat: add AnalysisController with POST and SSE endpoints"
```

---

## Task 9: Wire All Modules + Bootstrap

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Register AnalysisModule in AppModule**

Replace `backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis } from './analysis/analysis.entity';
import { AgentResult } from './agent-result/agent-result.entity';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [Analysis, AgentResult],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AnalysisModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Update main.ts with CORS and port from env**

Replace `backend/src/main.ts`:
```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 3: Verify backend starts with no errors**

Run from `backend/`:
```bash
npm run start:dev
```

Expected: `Backend running on http://localhost:3001` — no module resolution errors.

- [ ] **Step 4: Smoke-test the POST endpoint**

In another terminal:
```bash
curl -s -X POST http://localhost:3001/analysis/AAPL | jq .
```

Expected JSON:
```json
{
  "id": "<uuid>",
  "ticker": "AAPL",
  "status": "running",
  "cached": false,
  "createdAt": "<timestamp>"
}
```

- [ ] **Step 5: Smoke-test the SSE stream**

```bash
curl -N http://localhost:3001/analysis/<id-from-step-4>/stream
```

Expected: SSE events arrive as agents complete — each line starts with `data:`.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add backend/src/app.module.ts backend/src/main.ts
git -C /Users/dvir/claude/stock-investigator commit -m "feat: wire all NestJS modules and configure CORS"
```

---

## Task 10: Build React Frontend

**Files:**
- Create: `frontend/src/hooks/useAnalysisStream.ts`
- Create: `frontend/src/components/TickerInput.tsx`
- Create: `frontend/src/components/AgentResultCard.tsx`
- Create: `frontend/src/components/AnalysisProgress.tsx`
- Create: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create shared types file**

Create `frontend/src/types.ts`:
```typescript
export type AgentResultStatus = 'pending' | 'completed' | 'failed';

export interface AgentResultEvent {
  id: string;
  agentName: string;
  status: AgentResultStatus;
  output: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface AnalysisResponse {
  id: string;
  ticker: string;
  status: string;
  cached: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Implement useAnalysisStream hook**

Create `frontend/src/hooks/useAnalysisStream.ts`:
```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentResultEvent, AnalysisResponse } from '../types';

const API_BASE = 'http://localhost:3001';

interface UseAnalysisStreamReturn {
  analysisId: string | null;
  analysisInfo: AnalysisResponse | null;
  agentResults: AgentResultEvent[];
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  startAnalysis: (ticker: string) => void;
  reset: () => void;
}

export function useAnalysisStream(): UseAnalysisStreamReturn {
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisInfo, setAnalysisInfo] = useState<AnalysisResponse | null>(null);
  const [agentResults, setAgentResults] = useState<AgentResultEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    esRef.current?.close();
    setAnalysisId(null);
    setAnalysisInfo(null);
    setAgentResults([]);
    setIsLoading(false);
    setIsComplete(false);
    setError(null);
  }, []);

  const startAnalysis = useCallback(async (ticker: string) => {
    reset();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/analysis/${ticker.toUpperCase().trim()}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data: AnalysisResponse = await response.json();

      setAnalysisId(data.id);
      setAnalysisInfo(data);

      const es = new EventSource(`${API_BASE}/analysis/${data.id}/stream`);
      esRef.current = es;

      es.onmessage = (event) => {
        const result: AgentResultEvent = JSON.parse(event.data);
        setAgentResults((prev) => {
          const idx = prev.findIndex((r) => r.id === result.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = result;
            return updated;
          }
          return [...prev, result];
        });
      };

      es.addEventListener('complete', () => {
        setIsComplete(true);
        setIsLoading(false);
        es.close();
      });

      es.onerror = () => {
        setIsLoading(false);
        setIsComplete(true);
        es.close();
      };
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  return { analysisId, analysisInfo, agentResults, isLoading, isComplete, error, startAnalysis, reset };
}
```

- [ ] **Step 3: Implement TickerInput component**

Create `frontend/src/components/TickerInput.tsx`:
```tsx
import { useState, FormEvent } from 'react';

interface TickerInputProps {
  onSubmit: (ticker: string) => void;
  isLoading: boolean;
}

export function TickerInput({ onSubmit, isLoading }: TickerInputProps) {
  const [ticker, setTicker] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (t) onSubmit(t);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="e.g. AAPL"
        maxLength={10}
        disabled={isLoading}
        style={{ padding: '8px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc', width: 140 }}
      />
      <button
        type="submit"
        disabled={isLoading || !ticker.trim()}
        style={{ padding: '8px 16px', fontSize: 16, borderRadius: 6, cursor: 'pointer', background: '#1a6cf6', color: '#fff', border: 'none' }}
      >
        {isLoading ? 'Analyzing…' : 'Analyze'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Implement AgentResultCard component**

Create `frontend/src/components/AgentResultCard.tsx`:
```tsx
import { AgentResultEvent } from '../types';

const AGENT_LABELS: Record<string, string> = {
  technical: 'Technical Analysis',
  news_sentiment: 'News & Sentiment',
};

interface AgentResultCardProps {
  result: AgentResultEvent;
}

export function AgentResultCard({ result }: AgentResultCardProps) {
  const label = AGENT_LABELS[result.agentName] ?? result.agentName;

  const cardStyle: React.CSSProperties = {
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: 16,
    background: '#fff',
    minWidth: 300,
    maxWidth: 520,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>{label}</strong>
        <StatusBadge status={result.status} />
      </div>

      {result.status === 'pending' && (
        <div style={{ color: '#888', fontSize: 13 }}>Running…</div>
      )}

      {result.status === 'failed' && (
        <div style={{ color: '#c0392b', fontSize: 13 }}>Error: {result.error}</div>
      )}

      {result.status === 'completed' && result.output && (
        <OutputRenderer agentName={result.agentName} output={result.output} />
      )}

      {result.durationMs != null && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#aaa' }}>
          Completed in {(result.durationMs / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AgentResultEvent['status'] }) {
  const colors: Record<string, string> = {
    pending: '#f39c12',
    completed: '#27ae60',
    failed: '#c0392b',
  };
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: colors[status], color: '#fff' }}>
      {status}
    </span>
  );
}

function OutputRenderer({ agentName, output }: { agentName: string; output: Record<string, unknown> }) {
  if (agentName === 'technical') return <TechnicalOutput data={output} />;
  if (agentName === 'news_sentiment') return <NewsOutput data={output} />;
  return <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(output, null, 2)}</pre>;
}

function TechnicalOutput({ data }: { data: Record<string, unknown> }) {
  const signals = data.signals as string[] | undefined;
  return (
    <div style={{ fontSize: 13 }}>
      <div><b>Price:</b> ${(data.currentPrice as number)?.toFixed(2)}</div>
      <div><b>RSI(14):</b> {data.rsi14 as number}</div>
      {data.ma50 && <div><b>MA50:</b> ${(data.ma50 as number).toFixed(2)}</div>}
      {data.ma200 && <div><b>MA200:</b> ${(data.ma200 as number).toFixed(2)}</div>}
      {signals && signals.length > 0 && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
          {signals.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
        </ul>
      )}
    </div>
  );
}

function NewsOutput({ data }: { data: Record<string, unknown> }) {
  const headlines = data.topHeadlines as Array<{ title: string; sentiment: string }> | undefined;
  const sentimentColor = data.overallSentiment === 'bullish' ? '#27ae60' : data.overallSentiment === 'bearish' ? '#c0392b' : '#888';
  return (
    <div style={{ fontSize: 13 }}>
      <div>
        <b>Sentiment:</b>{' '}
        <span style={{ color: sentimentColor, fontWeight: 600 }}>{data.overallSentiment as string}</span>
        {' '}({((data.sentimentScore as number) >= 0 ? '+' : '')}{(data.sentimentScore as number)?.toFixed(2)})
      </div>
      <div style={{ marginTop: 6, color: '#555' }}>{data.summary as string}</div>
      {headlines && (
        <div style={{ marginTop: 8 }}>
          <b>Recent headlines:</b>
          <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
            {headlines.slice(0, 3).map((h, i) => (
              <li key={i} style={{ marginBottom: 2 }}>{h.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement AnalysisProgress component**

Create `frontend/src/components/AnalysisProgress.tsx`:
```tsx
interface AnalysisProgressProps {
  ticker: string;
  cached: boolean;
  cachedAt?: string;
  isComplete: boolean;
  totalAgents: number;
  completedAgents: number;
}

export function AnalysisProgress({ ticker, cached, cachedAt, isComplete, totalAgents, completedAgents }: AnalysisProgressProps) {
  return (
    <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: 14 }}>
      <strong>{ticker}</strong>
      {cached && cachedAt && (
        <span style={{ marginLeft: 10, fontSize: 12, color: '#888', background: '#e8e8e8', padding: '2px 8px', borderRadius: 10 }}>
          Cached · {new Date(cachedAt).toLocaleString()}
        </span>
      )}
      {!isComplete && (
        <span style={{ marginLeft: 10, color: '#555' }}>
          {completedAgents}/{totalAgents} agents complete
        </span>
      )}
      {isComplete && (
        <span style={{ marginLeft: 10, color: '#27ae60' }}>✓ Analysis complete</span>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Build the Home page**

Create `frontend/src/pages/Home.tsx`:
```tsx
import { useAnalysisStream } from '../hooks/useAnalysisStream';
import { TickerInput } from '../components/TickerInput';
import { AgentResultCard } from '../components/AgentResultCard';
import { AnalysisProgress } from '../components/AnalysisProgress';

export function Home() {
  const { agentResults, analysisInfo, isLoading, isComplete, error, startAnalysis, reset } = useAnalysisStream();

  const completedAgents = agentResults.filter((r) => r.status !== 'pending').length;

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Stock Investigator</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Multi-agent stock analysis powered by AI</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <TickerInput onSubmit={startAnalysis} isLoading={isLoading} />
        {(agentResults.length > 0 || error) && (
          <button onClick={reset} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>
            Reset
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: '#c0392b', background: '#fdf0ee', padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>
          Error: {error}
        </div>
      )}

      {analysisInfo && (
        <AnalysisProgress
          ticker={analysisInfo.ticker}
          cached={analysisInfo.cached}
          cachedAt={analysisInfo.cached ? analysisInfo.createdAt : undefined}
          isComplete={isComplete}
          totalAgents={2}
          completedAgents={completedAgents}
        />
      )}

      {agentResults.length > 0 && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {agentResults.map((result) => (
            <AgentResultCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Wire up App.tsx**

Replace `frontend/src/App.tsx`:
```tsx
import { Home } from './pages/Home';

export default function App() {
  return <Home />;
}
```

- [ ] **Step 8: Verify frontend builds**

Run from `frontend/`:
```bash
npm run build
```

Expected: `dist/` created, no TypeScript errors.

- [ ] **Step 9: End-to-end smoke test**

Start both servers in separate terminals:
```bash
# Terminal 1
cd stock-investigator/backend && npm run start:dev

# Terminal 2
cd stock-investigator/frontend && npm run dev
```

Open `http://localhost:5173` in a browser.

1. Type `AAPL` and click Analyze
2. Observe: POST response returns an `id`, SSE stream opens
3. Cards appear as agents complete (technical first or news_sentiment first, whichever finishes first)
4. After both complete, "Analysis complete" status shows
5. Run `AAPL` again within 24h — observe "Cached" badge

- [ ] **Step 10: Commit**

```bash
git -C /Users/dvir/claude/stock-investigator add frontend/src/
git -C /Users/dvir/claude/stock-investigator commit -m "feat: build React frontend with SSE streaming and agent result cards"
```

---

## Self-Review

**Spec coverage:**
- [x] Two stub agents implementing `AgentInterface` (Task 6) — real logic deferred
- [x] `AgentInterface` contract: `agentName + analyze(ticker)` (Task 5)
- [x] SSE streaming: `@Sse()` controller, RxJS Subject pipe (Task 8, Task 9)
- [x] PostgreSQL persistence: Analysis + AgentResult entities (Task 4)
- [x] 24-hour caching: `MoreThanOrEqual(cutoff)` in `createOrGetAnalysis` (Task 7)
- [x] No authentication: none added
- [x] React frontend with flexible output rendering: `OutputRenderer` dispatches by agent name (Task 10)
- [x] Cached result badge: `AnalysisProgress` shows "Cached · timestamp" (Task 10)
- [x] Single agent failure doesn't block others: `Promise.all` continues, failed agent emits status=failed (Task 7)
- [x] All agents fail → Analysis.status=failed: `anySucceeded` check in `runAgents` (Task 7)

**Deferred (not in this plan):**
- Real TechnicalAgent logic: Yahoo Finance, RSI/MACD/MA calculations
- Real NewsSentimentAgent logic: Alpha Vantage news feed + Claude Opus 4.8 sentiment

**Type consistency check:**
- `AgentInterface.analyze()` returns `Promise<Record<string, unknown>>` — both stubs return this ✓
- `AgentResultEvent` used in hook, card, and types.ts — all match ✓
- `AnalysisStatus` enum imported from entity in service and module ✓
- `subject.next({ type: 'complete', data: {} })` cast as `any` to satisfy NestJS `MessageEvent` shape ✓

**Placeholder scan:** Stub agents intentionally return `note: 'Stub — real implementation coming in a future phase'` — this is expected, not a plan gap.
