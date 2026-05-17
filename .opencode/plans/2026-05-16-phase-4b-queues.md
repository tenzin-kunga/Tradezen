# Phase 4B: Queue System — Implementation Plan

> **Date:** 2026-05-16
> **Branch:** develop
> **Strategy:** BullMQ on existing Redis, single-process workers

---

## Architecture Overview

### Current State
- Redis container provisioned but **completely unused** by app code
- CSV import: synchronous, blocks request thread, all-or-nothing transaction
- AI chat: streaming SSE, no background processing
- Zero queue infrastructure

### Target State
- BullMQ queues on existing Redis (`tradezen-redis:6379`)
- 2 queues: `csv-import` and `ai-processing`
- Worker runs in same NestJS process (single-instance)
- Job status tracking via API
- Progress reporting for long-running jobs

---

## TZ-040: Setup BullMQ

### Goal
Establish Redis connection, queue definitions, and worker infrastructure.

### Step 1: Install dependencies
```bash
cd apps/api
npm install bullmq @nestjs/bullmq ioredis
```

### Step 2: Update docker-compose.yml
Add `REDIS_HOST=redis` to API service environment block:
```yaml
services:
  api:
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
```

### Step 3: Create queues module
Create `apps/api/src/queues/queues.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CsvImportProcessor } from './csv-import.processor';
import { AiProcessingProcessor } from './ai-processing.processor';
import { JobStatusService } from './job-status.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    }),
    BullModule.registerQueue(
      { name: 'csv-import' },
      { name: 'ai-processing' },
    ),
  ],
  providers: [CsvImportProcessor, AiProcessingProcessor, JobStatusService],
  exports: [BullModule, JobStatusService],
})
export class QueuesModule {}
```

### Step 4: Create job status service
Create `apps/api/src/queues/job-status.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

export interface JobStatus {
  id: string;
  name: string;
  progress: number;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  data: Record<string, unknown>;
  result?: unknown;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
}

@Injectable()
export class JobStatusService {
  private readonly logger = new Logger('JobStatus');

  constructor(
    @InjectQueue('csv-import') private csvQueue: Queue,
    @InjectQueue('ai-processing') private aiQueue: Queue,
  ) {}

  async getJobStatus(queueName: string, jobId: string): Promise<JobStatus | null> {
    const queue = queueName === 'csv-import' ? this.csvQueue : this.aiQueue;
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id!,
      name: job.name,
      progress: job.progress as number,
      state,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  async getJobHistory(queueName: string, limit = 10): Promise<JobStatus[]> {
    const queue = queueName === 'csv-import' ? this.csvQueue : this.aiQueue;
    const jobs = await queue.getJobs(['completed', 'failed'], 0, limit - 1);
    return Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id!,
          name: job.name,
          progress: job.progress as number,
          state,
          data: job.data,
          result: job.returnvalue,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        };
      }),
    );
  }
}
```

### Step 5: Register QueuesModule in app.module.ts
Add `QueuesModule` to imports in `apps/api/src/app.module.ts`.

### Step 6: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 7: Run lint
```bash
npm run lint -- --filter=api
```

### Step 8: Commit
```bash
git add apps/api/src/queues/queues.module.ts apps/api/src/queues/job-status.service.ts apps/api/src/app.module.ts apps/api/package.json apps/api/package-lock.json docker-compose.yml
git commit -m "feat: setup BullMQ with Redis connection and job tracking (TZ-040)

- Install bullmq, @nestjs/bullmq, ioredis
- Create csv-import and ai-processing queues
- JobStatusService for polling job progress
- Connect to existing Redis container
- Add REDIS_HOST/REDIS_PORT to docker-compose"
```

---

## TZ-041: CSV Import Worker

### Goal
Move CSV import from synchronous request thread to async queue job with progress tracking.

### Step 1: Create CSV import processor
Create `apps/api/src/queues/csv-import.processor.ts`:
```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { trades } from '../db/schema';

interface CsvImportJobData {
  userId: string;
  csvContent: string;
  fileName: string;
}

interface CsvImportProgress {
  processed: number;
  total: number;
  imported: number;
  errors: string[];
}

@Processor('csv-import')
export class CsvImportProcessor extends WorkerHost {
  private readonly logger = new Logger('CsvImportProcessor');

  async process(job: Job<CsvImportJobData>): Promise<{ imported: number; errors: string[] }> {
    const { userId, csvContent, fileName } = job.data;
    this.logger.log(`Processing CSV import for user ${userId}: ${fileName}`);

    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have header and at least one data row');
    }

    const header = this.parseCsvLine(lines[0]);
    const requiredColumns = ['symbol', 'direction', 'entry_price', 'exit_price', 'lot_size'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const columnMap = this.buildColumnMap(header);
    const errors: string[] = [];
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const progress: CsvImportProgress = {
        processed: i,
        total: lines.length - 1,
        imported,
        errors: errors.slice(-10), // Keep last 10 errors
      };
      await job.updateProgress(progress);

      if (job.data) {
        // Check if job was cancelled
        const state = await job.getState();
        if (state === 'failed') break;
      }

      try {
        const values = this.parseCsvLine(lines[i]);
        const trade = this.mapCsvRowToTrade(values, columnMap, userId);
        
        await db.insert(trades).values(trade);
        imported++;
      } catch (error) {
        errors.push(`Row ${i + 1}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`CSV import complete: ${imported} imported, ${errors.length} errors`);
    return { imported, errors };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private buildColumnMap(header: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    header.forEach((col, idx) => {
      map[col.toLowerCase().trim()] = idx;
    });
    return map;
  }

  private mapCsvRowToTrade(
    values: string[],
    columnMap: Record<string, number>,
    userId: string,
  ) {
    const get = (col: string) => values[columnMap[col]] ?? '';
    
    const entry = parseFloat(get('entry_price'));
    const exit = parseFloat(get('exit_price'));
    const lot = parseFloat(get('lot_size'));
    
    if (isNaN(entry) || isNaN(exit) || isNaN(lot)) {
      throw new Error('Invalid numeric values');
    }

    const pnl = (exit - entry) * lot * 100000; // Standard forex contract size

    return {
      userId,
      symbol: get('symbol').toUpperCase(),
      direction: get('direction').toLowerCase(),
      entry,
      exit,
      lot,
      pnl,
      tradeDate: get('trade_date') ? new Date(get('trade_date')) : new Date(),
      strategy: get('strategy') || null,
      notes: get('notes') || null,
      stopLoss: get('stop_loss') ? parseFloat(get('stop_loss')) : null,
      takeProfit: get('take_profit') ? parseFloat(get('take_profit')) : null,
      fomoCheck: get('fomo_check')?.toLowerCase() === 'true',
      vengeanceTrade: get('vengeance_trade')?.toLowerCase() === 'true',
      trendAlignment: get('trend_alignment')?.toLowerCase() === 'true',
    };
  }
}
```

### Step 2: Update trades controller
Replace synchronous import with queue job submission:

```typescript
@Post('import/csv')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
}))
async importCsv(
  @CurrentUser('id') userId: string,
  @UploadedFile() file: Express.Multer.File,
): Promise<{ jobId: string; message: string }> {
  const csvContent = file.buffer.toString('utf-8');
  const job = await this.csvQueue.add('import', {
    userId,
    csvContent,
    fileName: file.originalname,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400 }, // Keep for 24h
    removeOnFail: { age: 604800 }, // Keep failed for 7 days
  });

  return { jobId: job.id!, message: 'CSV import started. Poll status with job ID.' };
}
```

### Step 3: Add job status endpoints
Add to `apps/api/src/trades/trades.controller.ts`:
```typescript
@Get('import/jobs/:jobId')
async getImportJobStatus(@Param('jobId') jobId: string) {
  return this.jobStatusService.getJobStatus('csv-import', jobId);
}

@Get('import/jobs')
async getImportJobHistory(@Query('limit') limit?: string) {
  return this.jobStatusService.getJobHistory('csv-import', parseInt(limit) || 10);
}
```

### Step 4: Inject queue and job status service
Update trades controller constructor:
```typescript
constructor(
  private readonly tradesService: TradesService,
  @InjectQueue('csv-import') private csvQueue: Queue,
  private readonly jobStatusService: JobStatusService,
) {}
```

### Step 5: Add tRPC procedures
Add to `apps/api/src/trpc/trades.router.ts`:
```typescript
getCsvImportJobStatus: protectedProcedure
  .input(z.object({ jobId: string }))
  .query(async ({ input }) => {
    return jobStatusService.getJobStatus('csv-import', input.jobId);
  }),

getCsvImportJobHistory: protectedProcedure
  .input(z.object({ limit: z.number().optional() }))
  .query(async ({ input }) => {
    return jobStatusService.getJobHistory('csv-import', input.limit || 10);
  }),
```

### Step 6: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 7: Run lint
```bash
npm run lint -- --filter=api
```

### Step 8: Commit
```bash
git add apps/api/src/queues/csv-import.processor.ts apps/api/src/trades/trades.controller.ts apps/api/src/trades/trades.module.ts apps/api/src/trpc/trades.router.ts
git commit -m "feat: async CSV import worker with progress tracking (TZ-041)

- Move CSV import from synchronous to BullMQ queue
- Progress reporting: processed/total/imported/errors
- Job status polling endpoint
- Job history endpoint
- File type validation (CSV only)
- Retry with exponential backoff (3 attempts)
- Results kept 24h (completed), 7 days (failed)"
```

---

## TZ-042: AI Processing Queue

### Goal
Background AI processing for journal summarization and pattern analysis.

### Step 1: Create AI processing processor
Create `apps/api/src/queues/ai-processing.processor.ts`:
```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { journals } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

interface JournalSummarizeJobData {
  userId: string;
  dateFrom: string;
  dateTo: string;
}

interface PatternAnalysisJobData {
  userId: string;
  days: number;
}

@Processor('ai-processing')
export class AiProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger('AiProcessingProcessor');

  async process(job: Job<JournalSummarizeJobData | PatternAnalysisJobData>): Promise<unknown> {
    if (job.name === 'journal-summarize') {
      return this.summarizeJournals(job as Job<JournalSummarizeJobData>);
    }
    if (job.name === 'pattern-analysis') {
      return this.analyzePatterns(job as Job<PatternAnalysisJobData>);
    }
    throw new Error(`Unknown job type: ${job.name}`);
  }

  private async summarizeJournals(job: Job<JournalSummarizeJobData>): Promise<{ summary: string; journalCount: number }> {
    const { userId, dateFrom, dateTo } = job.data;
    this.logger.log(`Summarizing journals for user ${userId}: ${dateFrom} to ${dateTo}`);

    const journalRows = await db
      .select()
      .from(journals)
      .where(and(
        eq(journals.userId, userId),
        gte(journals.date, new Date(dateFrom)),
        lte(journals.date, new Date(dateTo)),
      ));

    if (journalRows.length === 0) {
      return { summary: 'No journals found for the specified date range.', journalCount: 0 };
    }

    await job.updateProgress({ stage: 'building_prompt', total: journalRows.length });

    // Build prompt from journal content
    const prompt = this.buildSummarizationPrompt(journalRows);

    // Call OpenRouter API (reuse existing chat service pattern)
    const summary = await this.callOpenRouter(prompt, job);

    this.logger.log(`Journal summarization complete: ${journalRows.length} journals summarized`);
    return { summary, journalCount: journalRows.length };
  }

  private async analyzePatterns(job: Job<PatternAnalysisJobData>): Promise<{ insights: string[] }> {
    const { userId, days } = job.data;
    this.logger.log(`Analyzing patterns for user ${userId}: last ${days} days`);

    // Fetch trades for pattern analysis
    const tradeRows = await db
      .select()
      .from(trades)
      .where(and(
        eq(trades.userId, userId),
        gte(trades.tradeDate, new Date(Date.now() - days * 86400000)),
      ));

    if (tradeRows.length < 10) {
      return { insights: ['Not enough trades for pattern analysis (minimum 10).'] };
    }

    await job.updateProgress({ stage: 'analyzing', total: tradeRows.length });

    // Build pattern analysis prompt
    const prompt = this.buildPatternAnalysisPrompt(tradeRows);

    // Call OpenRouter API
    const response = await this.callOpenRouter(prompt, job);

    // Parse insights from response
    const insights = this.parseInsights(response);

    this.logger.log(`Pattern analysis complete: ${insights.length} insights generated`);
    return { insights };
  }

  private buildSummarizationPrompt(journals: any[]): string {
    const content = journals.map(j => 
      `Date: ${j.date}\nPre-market: ${j.preMarketNotes || 'N/A'}\nPost-market: ${j.postMarketNotes || 'N/A'}\nMood: ${j.mood || 'N/A'}\nLessons: ${j.lessons || 'N/A'}`
    ).join('\n\n---\n\n');

    return `You are a trading journal analyst. Summarize the following journal entries into key insights, patterns, and actionable recommendations. Keep it concise (max 500 words).\n\n${content}`;
  }

  private buildPatternAnalysisPrompt(trades: any[]): string {
    const stats = this.calculateTradeStats(trades);
    
    return `You are a trading performance analyst. Analyze the following trading statistics and provide insights on patterns, strengths, weaknesses, and areas for improvement.\n\n${JSON.stringify(stats, null, 2)}`;
  }

  private calculateTradeStats(trades: any[]) {
    const wins = trades.filter(t => Number(t.pnl) > 0);
    const losses = trades.filter(t => Number(t.pnl) <= 0);
    const totalPnl = trades.reduce((sum, t) => sum + Number(t.pnl), 0);
    
    return {
      totalTrades: trades.length,
      winRate: Math.round((wins.length / trades.length) * 100),
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgWin: wins.length > 0 ? Math.round((wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length) * 100) / 100 : 0,
      avgLoss: losses.length > 0 ? Math.round((losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length) * 100) / 100 : 0,
      bestTrade: Math.max(...trades.map(t => Number(t.pnl))),
      worstTrade: Math.min(...trades.map(t => Number(t.pnl))),
      byStrategy: this.groupBy(trades, 'strategy'),
      bySymbol: this.groupBy(trades, 'symbol'),
    };
  }

  private groupBy(trades: any[], field: string) {
    const map = new Map<string, { trades: number; pnl: number; wins: number }>();
    for (const t of trades) {
      const key = t[field] || 'Unknown';
      if (!map.has(key)) map.set(key, { trades: 0, pnl: 0, wins: 0 });
      const stat = map.get(key)!;
      stat.trades++;
      stat.pnl += Number(t.pnl);
      if (Number(t.pnl) > 0) stat.wins++;
    }
    return Object.fromEntries(map);
  }

  private async callOpenRouter(prompt: string, job: Job): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
    const model = process.env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-oss-120b:free';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'TradeZen',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? 'No response generated.';
  }

  private parseInsights(response: string): string[] {
    // Split by bullet points or numbered list
    return response
      .split(/\n[\d\*\-•]+\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }
}
```

### Step 2: Add AI processing endpoints
Add to `apps/api/src/chat/chat.controller.ts`:
```typescript
@Post('jobs/summarize-journals')
async summarizeJournals(
  @CurrentUser('id') userId: string,
  @Body('dateFrom') dateFrom: string,
  @Body('dateTo') dateTo: string,
) {
  const job = await this.aiQueue.add('journal-summarize', {
    userId,
    dateFrom,
    dateTo,
  }, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  });

  return { jobId: job.id!, message: 'Journal summarization started.' };
}

@Post('jobs/pattern-analysis')
async patternAnalysis(
  @CurrentUser('id') userId: string,
  @Body('days') days?: number,
) {
  const job = await this.aiQueue.add('pattern-analysis', {
    userId,
    days: days || 30,
  }, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  });

  return { jobId: job.id!, message: 'Pattern analysis started.' };
}

@Get('jobs/:jobId')
async getJobStatus(@Param('jobId') jobId: string) {
  return this.jobStatusService.getJobStatus('ai-processing', jobId);
}

@Get('jobs')
async getJobHistory(@Query('limit') limit?: string) {
  return this.jobStatusService.getJobHistory('ai-processing', parseInt(limit) || 10);
}
```

### Step 3: Inject AI queue in chat controller
Update chat controller constructor:
```typescript
constructor(
  private readonly chatService: ChatService,
  @InjectQueue('ai-processing') private aiQueue: Queue,
  private readonly jobStatusService: JobStatusService,
) {}
```

### Step 4: Add tRPC procedures
Add to `apps/api/src/trpc/trades.router.ts` or create `ai.router.ts`:
```typescript
summarizeJournals: protectedProcedure
  .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const job = await aiQueue.add('journal-summarize', {
      userId: ctx.userId,
      ...input,
    });
    return { jobId: job.id! };
  }),

patternAnalysis: protectedProcedure
  .input(z.object({ days: z.number().optional() }))
  .mutation(async ({ ctx, input }) => {
    const job = await aiQueue.add('pattern-analysis', {
      userId: ctx.userId,
      days: input.days || 30,
    });
    return { jobId: job.id! };
  }),
```

### Step 5: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 6: Run lint
```bash
npm run lint -- --filter=api
```

### Step 7: Commit
```bash
git add apps/api/src/queues/ai-processing.processor.ts apps/api/src/chat/chat.controller.ts apps/api/src/chat/chat.module.ts apps/api/src/trpc/trades.router.ts
git commit -m "feat: AI processing queue for journal summarization and pattern analysis (TZ-042)

- Journal summarization: batch journals → LLM summary
- Pattern analysis: trade statistics → AI insights
- Job status polling for both queue types
- Reuses OpenRouter API with existing config
- Retry with exponential backoff (2 attempts)
- Expose via REST and tRPC"
```

---

## Execution Order

```
TZ-040 (BullMQ foundation)
    │
    ├──→ TZ-041 (CSV import worker)
    └──→ TZ-042 (AI processing queue)
```

## Verification Checklist

- [ ] Redis connection established (test with `redis-cli ping`)
- [ ] BullMQ queues created: `csv-import`, `ai-processing`
- [ ] CSV import returns job ID immediately (non-blocking)
- [ ] Job status polling returns progress updates
- [ ] Job history shows completed/failed jobs
- [ ] AI processing jobs complete successfully
- [ ] TypeScript compiles with zero errors
- [ ] npm run lint passes

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Redis connection fails | Graceful degradation: fallback to sync import |
| Job queue grows unbounded | `removeOnComplete` with 24h TTL, `removeOnFail` with 7d TTL |
| Worker crashes mid-job | BullMQ automatic retry with backoff |
| Large CSV files timeout | Progress reporting, chunked processing |
| OpenRouter API rate limits | Retry with backoff, max 2 attempts |
