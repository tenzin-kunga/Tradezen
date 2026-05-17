# Phase 6B: AI Intelligence — Implementation Plan

> **Date:** 2026-05-16
> **Branch:** develop
> **Strategy:** LangGraph workflows + hybrid coaching + enhanced journal intelligence

---

## Architecture Overview

### Current State (Phase 6A)
- **pgvector** with semantic search across journals, trades, notes
- **Chat persistence** — threads + messages stored in DB
- **EmbeddingService** — generates vectors via OpenRouter
- **MemoryService** — context retrieval for chat (not yet integrated into chat service)
- **Basic AI jobs** — journal summarization + pattern analysis (results not persisted)

### Target State
- **LangGraph workflows** for multi-step AI reasoning
- **Journal intelligence** — sentiment analysis, pattern detection, cross-referencing with trades
- **Hybrid coaching engine** — deterministic triggers → AI-generated personalized recommendations
- **Persisted AI insights** — results stored in DB for retrieval

---

## TZ-061: LangGraph Integration

### Goal
Set up LangGraph runtime with PostgreSQL-backed checkpoints and create base workflow infrastructure.

### Step 1: Install dependencies
```bash
cd apps/api
npm install @langchain/core @langchain/langgraph @langchain/openai
```

### Step 2: Create LangGraph configuration
Create `apps/api/src/ai/langgraph.config.ts`:
```typescript
import { ChatOpenAI } from '@langchain/openai';

export function createLLM(model?: string, temperature = 0.7) {
  return new ChatOpenAI({
    model: model ?? process.env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-oss-120b:free',
    temperature,
    configuration: {
      baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_TITLE ?? 'TradeZen',
      },
    },
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}
```

### Step 3: Create journal analysis workflow
Create `apps/api/src/ai/workflows/journal-analysis.workflow.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { db } from '../../db/drizzle';
import { journals, trades } from '../../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createLLM } from '../langgraph.config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const JournalAnalysisState = Annotation.Root({
  userId: Annotation<string>,
  dateFrom: Annotation<string>,
  dateTo: Annotation<string>,
  journalEntries: Annotation<any[]>,
  tradeData: Annotation<any[]>,
  sentiment: Annotation<string>,
  patterns: Annotation<string[]>,
  insights: Annotation<string[]>,
  summary: Annotation<string>,
});

@Injectable()
export class JournalAnalysisWorkflow {
  private readonly logger = new Logger('JournalAnalysisWorkflow');
  private graph;

  constructor() {
    const workflow = new StateGraph(JournalAnalysisState)
      .addNode('fetch_data', this.fetchData.bind(this))
      .addNode('analyze_sentiment', this.analyzeSentiment.bind(this))
      .addNode('detect_patterns', this.detectPatterns.bind(this))
      .addNode('generate_insights', this.generateInsights.bind(this))
      .addNode('compile_summary', this.compileSummary.bind(this))
      .addEdge('__start__', 'fetch_data')
      .addEdge('fetch_data', 'analyze_sentiment')
      .addEdge('analyze_sentiment', 'detect_patterns')
      .addEdge('detect_patterns', 'generate_insights')
      .addEdge('generate_insights', 'compile_summary')
      .addEdge('compile_summary', END);

    this.graph = workflow.compile();
  }

  async run(userId: string, dateFrom: string, dateTo: string) {
    const result = await this.graph.invoke({
      userId,
      dateFrom,
      dateTo,
      journalEntries: [],
      tradeData: [],
      sentiment: '',
      patterns: [],
      insights: [],
      summary: '',
    });

    return {
      sentiment: result.sentiment,
      patterns: result.patterns,
      insights: result.insights,
      summary: result.summary,
    };
  }

  private async fetchData(state: typeof JournalAnalysisState.State) {
    const journalRows = await db
      .select()
      .from(journals)
      .where(and(
        eq(journals.userId, state.userId),
        gte(journals.date, new Date(state.dateFrom)),
        lte(journals.date, new Date(state.dateTo)),
      ));

    const tradeRows = await db
      .select()
      .from(trades)
      .where(and(
        eq(trades.userId, state.userId),
        gte(trades.tradeDate, new Date(state.dateFrom)),
        lte(trades.tradeDate, new Date(state.dateTo)),
      ));

    return {
      ...state,
      journalEntries: journalRows,
      tradeData: tradeRows,
    };
  }

  private async analyzeSentiment(state: typeof JournalAnalysisState.State) {
    const llm = createLLM(undefined, 0.3);
    const text = state.journalEntries
      .map(j => `${j.mood || ''} ${j.preMarketNotes || ''} ${j.postMarketNotes || ''}`)
      .join(' ');

    const response = await llm.invoke([
      new SystemMessage('Analyze the emotional sentiment of these trading journal entries. Return one word: positive, neutral, negative, or mixed.'),
      new HumanMessage(text.substring(0, 4000)),
    ]);

    return { ...state, sentiment: response.content.toString().trim().toLowerCase() };
  }

  private async detectPatterns(state: typeof JournalAnalysisState.State) {
    const llm = createLLM(undefined, 0.5);
    const journalText = state.journalEntries
      .map(j => `Date: ${j.date}\nMood: ${j.mood}\nPre: ${j.preMarketNotes}\nPost: ${j.postMarketNotes}\nLessons: ${j.lessons}`)
      .join('\n---\n');

    const response = await llm.invoke([
      new SystemMessage('Identify recurring patterns in these journal entries. Return a JSON array of strings, each describing a pattern. Max 5 patterns.'),
      new HumanMessage(journalText.substring(0, 8000)),
    ]);

    let patterns: string[] = [];
    try {
      patterns = JSON.parse(response.content.toString());
    } catch {
      patterns = response.content.toString().split('\n').filter(s => s.trim().length > 10);
    }

    return { ...state, patterns };
  }

  private async generateInsights(state: typeof JournalAnalysisState.State) {
    const llm = createLLM(undefined, 0.5);
    const context = `
Sentiment: ${state.sentiment}
Patterns: ${state.patterns.join(', ')}
Trades: ${state.tradeData.length} total
Win rate: ${this.calculateWinRate(state.tradeData)}%
Total PnL: ${this.calculateTotalPnl(state.tradeData)}
    `;

    const response = await llm.invoke([
      new SystemMessage('Based on the journal patterns and trading performance, generate actionable insights. Return a JSON array of strings. Max 5 insights.'),
      new HumanMessage(context),
    ]);

    let insights: string[] = [];
    try {
      insights = JSON.parse(response.content.toString());
    } catch {
      insights = response.content.toString().split('\n').filter(s => s.trim().length > 10);
    }

    return { ...state, insights };
  }

  private async compileSummary(state: typeof JournalAnalysisState.State) {
    const llm = createLLM(undefined, 0.7);
    const context = `
Sentiment: ${state.sentiment}
Patterns: ${state.patterns.join('; ')}
Insights: ${state.insights.join('; ')}
    `;

    const response = await llm.invoke([
      new SystemMessage('Write a concise summary (max 300 words) of the trading journal analysis. Cover sentiment, key patterns, and actionable insights.'),
      new HumanMessage(context),
    ]);

    return { ...state, summary: response.content.toString() };
  }

  private calculateWinRate(trades: any[]): number {
    if (trades.length === 0) return 0;
    const wins = trades.filter(t => Number(t.pnl) > 0).length;
    return Math.round((wins / trades.length) * 100);
  }

  private calculateTotalPnl(trades: any[]): number {
    return Math.round(trades.reduce((sum, t) => sum + Number(t.pnl), 0) * 100) / 100;
  }
}
```

### Step 4: Create coaching workflow
Create `apps/api/src/ai/workflows/coaching.workflow.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { createLLM } from '../langgraph.config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const CoachingState = Annotation.Root({
  userId: Annotation<string>,
  analytics: Annotation<Record<string, unknown>>,
  behavioralScores: Annotation<Record<string, number>>,
  triggers: Annotation<string[]>,
  coachingMessage: Annotation<string>,
  severity: Annotation<string>,
});

@Injectable()
export class CoachingWorkflow {
  private readonly logger = new Logger('CoachingWorkflow');
  private graph;

  constructor() {
    const workflow = new StateGraph(CoachingState)
      .addNode('evaluate_triggers', this.evaluateTriggers.bind(this))
      .addNode('assess_severity', this.assessSeverity.bind(this))
      .addNode('generate_message', this.generateMessage.bind(this))
      .addEdge('__start__', 'evaluate_triggers')
      .addEdge('evaluate_triggers', 'assess_severity')
      .addEdge('assess_severity', 'generate_message')
      .addEdge('generate_message', END);

    this.graph = workflow.compile();
  }

  async run(analytics: Record<string, unknown>, behavioralScores: Record<string, number>) {
    const result = await this.graph.invoke({
      userId: '',
      analytics,
      behavioralScores,
      triggers: [],
      coachingMessage: '',
      severity: 'low',
    });

    return {
      triggers: result.triggers,
      coachingMessage: result.coachingMessage,
      severity: result.severity,
    };
  }

  private async evaluateTriggers(state: typeof CoachingState.State) {
    const triggers: string[] = [];
    const a = state.analytics;

    // Deterministic triggers
    if ((a as any).winRate < 40 && (a as any).totalTrades > 20) {
      triggers.push('Win rate below 40% with 20+ trades — strategy review needed');
    }
    if ((a as any).profitFactor < 1.0) {
      triggers.push('Profit factor below 1.0 — losses exceed gains');
    }
    if ((a as any).currentStreak?.type === 'loss' && (a as any).currentStreak?.count >= 5) {
      triggers.push(`5+ trade losing streak (${(a as any).currentStreak.count}) — consider taking a break`);
    }
    if ((a as any).behavioralStats?.fomoCount / Math.max((a as any).totalTrades, 1) > 0.3) {
      triggers.push('30%+ of trades are FOMO entries — emotional trading detected');
    }
    if ((a as any).sharpeRatio < 0) {
      triggers.push('Negative Sharpe ratio — risk-adjusted returns are poor');
    }

    // Behavioral score triggers
    const bs = state.behavioralScores;
    if (bs.fomoScore > 70) triggers.push('High FOMO score — trading emotionally');
    if (bs.revengeScore > 60) triggers.push('Revenge trading pattern detected');
    if (bs.discipline < 50) triggers.push('Low discipline — use stop losses and follow your plan');
    if (bs.consistency < 60) triggers.push('Inconsistent trading behavior');

    return { ...state, triggers };
  }

  private async assessSeverity(state: typeof CoachingState.State) {
    const count = state.triggers.length;
    let severity = 'low';
    if (count >= 4) severity = 'critical';
    else if (count >= 2) severity = 'medium';
    else if (count >= 1) severity = 'low';

    return { ...state, severity };
  }

  private async generateMessage(state: typeof CoachingState.State) {
    const llm = createLLM(undefined, 0.7);

    const context = `
Triggers:
${state.triggers.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Severity: ${state.severity}

Analytics Summary:
- Win Rate: ${(state.analytics as any).winRate}%
- Total PnL: ${(state.analytics as any).totalPnl}
- Profit Factor: ${(state.analytics as any).profitFactor}
- FOMO Score: ${state.behavioralScores.fomoScore}/100
- Discipline Score: ${state.behavioralScores.discipline}/100
    `;

    const systemPrompt = state.severity === 'critical'
      ? 'You are a compassionate but firm trading coach. The user is in a critical state. Be direct about the issues but supportive. Provide 3 specific actionable recommendations. Keep it under 200 words.'
      : 'You are a supportive trading coach. Provide personalized feedback based on the triggers and analytics. Be encouraging but honest. Provide 2-3 actionable recommendations. Keep it under 150 words.';

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(context),
    ]);

    return { ...state, coachingMessage: response.content.toString() };
  }
}
```

### Step 5: Register workflows in app.module.ts
Add `JournalAnalysisWorkflow` and `CoachingWorkflow` to providers.

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
git add apps/api/src/ai/langgraph.config.ts apps/api/src/ai/workflows/journal-analysis.workflow.ts apps/api/src/ai/workflows/coaching.workflow.ts apps/api/src/app.module.ts apps/api/package.json apps/api/package-lock.json
git commit -m "feat: LangGraph integration with journal analysis and coaching workflows (TZ-061)

- LangChain/OpenAI LLM via OpenRouter
- JournalAnalysisWorkflow: sentiment → patterns → insights → summary
- CoachingWorkflow: deterministic triggers → severity → AI coaching message
- StateGraph with typed annotations
- Hybrid approach: rules-based triggers + AI-generated recommendations"
```

---

## TZ-062: Journal Intelligence Engine

### Goal
Enhance journal AI processing with LangGraph workflows, persist results, and add semantic analysis.

### Step 1: Create AI insights table migration
Create `apps/api/migrations/014_ai_insights.sql`:
```sql
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insights_user ON ai_insights(user_id);
CREATE INDEX idx_insights_type ON ai_insights(user_id, insight_type);
CREATE INDEX idx_insights_created ON ai_insights(user_id, created_at DESC);
```

### Step 2: Add ai_insights to Drizzle schema
Add to `apps/api/src/db/schema/index.ts`:
```typescript
export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightType: varchar('insight_type', { length: 50 }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_insights_user').on(table.userId),
  typeIdx: index('idx_insights_type').on(table.userId, table.insightType),
  createdIdx: index('idx_insights_created').on(table.userId, table.createdAt),
}));
```

### Step 3: Create journal intelligence service
Create `apps/api/src/ai/journal-intelligence.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { aiInsights } from '../db/schema';
import { eq } from 'drizzle-orm';
import { JournalAnalysisWorkflow } from './workflows/journal-analysis.workflow';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class JournalIntelligenceService {
  private readonly logger = new Logger('JournalIntelligence');

  constructor(
    private readonly workflow: JournalAnalysisWorkflow,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async analyzeJournals(userId: string, dateFrom: string, dateTo: string): Promise<{
    sentiment: string;
    patterns: string[];
    insights: string[];
    summary: string;
  }> {
    const result = await this.workflow.run(userId, dateFrom, dateTo);

    // Persist insights
    await db.insert(aiInsights).values({
      userId,
      insightType: 'journal_analysis',
      content: result.summary,
      metadata: {
        sentiment: result.sentiment,
        patterns: result.patterns,
        insights: result.insights,
        dateFrom,
        dateTo,
      },
    });

    // Embed the summary for semantic search
    await this.embeddingService.embedAndStore(
      userId,
      'ai_insight',
      `journal_analysis_${Date.now()}`,
      result.summary,
    );

    this.logger.log(`Journal analysis complete for user ${userId}`);
    return result;
  }

  async getInsights(userId: string, type?: string, limit = 10): Promise<Array<{ id: string; type: string; content: string; metadata: unknown; createdAt: Date }>> {
    const query = db.select().from(aiInsights).where(eq(aiInsights.userId, userId));

    if (type) {
      query.where(eq(aiInsights.insightType, type));
    }

    const results = await query.orderBy(aiInsights.createdAt).limit(limit);

    return results.map(r => ({
      id: r.id,
      type: r.insightType,
      content: r.content,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }));
  }
}
```

### Step 4: Update AI processing processor
Update `apps/api/src/queues/ai-processing.processor.ts` to use the new workflow instead of the basic prompt-based approach.

### Step 5: Add REST endpoint
Add to `apps/api/src/chat/chat.controller.ts`:
```typescript
@Post('ai/analyze-journals')
async analyzeJournals(
  @CurrentUser('id') userId: string,
  @Body('dateFrom') dateFrom: string,
  @Body('dateTo') dateTo: string,
) {
  return this.journalIntelligenceService.analyzeJournals(userId, dateFrom, dateTo);
}

@Get('ai/insights')
async getInsights(
  @CurrentUser('id') userId: string,
  @Query('type') type?: string,
  @Query('limit') limit?: string,
) {
  return this.journalIntelligenceService.getInsights(userId, type, parseInt(limit) || 10);
}
```

### Step 6: Register service in chat module
Add `JournalIntelligenceService` to providers.

### Step 7: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 8: Run lint
```bash
npm run lint -- --filter=api
```

### Step 9: Commit
```bash
git add apps/api/migrations/014_ai_insights.sql apps/api/src/db/schema/index.ts apps/api/src/ai/journal-intelligence.service.ts apps/api/src/queues/ai-processing.processor.ts apps/api/src/chat/chat.controller.ts apps/api/src/chat/chat.module.ts
git commit -m "feat: journal intelligence engine with LangGraph workflows (TZ-062)

- JournalAnalysisWorkflow replaces basic summarization
- Sentiment analysis, pattern detection, insight generation
- AI insights persisted in ai_insights table
- Semantic embedding of analysis summaries
- REST endpoints for analysis and insight retrieval"
```

---

## TZ-064: AI Coaching Engine

### Goal
Hybrid coaching: deterministic triggers → AI-generated personalized recommendations.

### Step 1: Create coaching table migration
Create `apps/api/migrations/015_coaching_sessions.sql`:
```sql
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL,
  triggers JSONB NOT NULL,
  message TEXT NOT NULL,
  analytics_snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coaching_user ON coaching_sessions(user_id);
CREATE INDEX idx_coaching_severity ON coaching_sessions(user_id, severity);
CREATE INDEX idx_coaching_created ON coaching_sessions(user_id, created_at DESC);
```

### Step 2: Add coaching_sessions to Drizzle schema
Add to `apps/api/src/db/schema/index.ts`.

### Step 3: Create coaching engine service
Create `apps/api/src/ai/coaching-engine.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { coachingSessions } from '../db/schema';
import { CoachingWorkflow } from './workflows/coaching.workflow';
import { TradesService } from '../trades/trades.service';
import { BehavioralService } from '../analytics/behavioral.service';

@Injectable()
export class CoachingEngineService {
  private readonly logger = new Logger('CoachingEngine');

  constructor(
    private readonly workflow: CoachingWorkflow,
    private readonly tradesService: TradesService,
    private readonly behavioralService: BehavioralService,
  ) {}

  async evaluateAndCoach(userId: string): Promise<{
    triggers: string[];
    coachingMessage: string;
    severity: string;
  }> {
    // Gather analytics
    const analytics = await this.tradesService.getAnalytics(userId);
    const advanced = await this.tradesService.getAdvancedAnalytics(userId);
    const behavioral = await this.behavioralService.analyzeBehavior(userId);

    const combinedAnalytics = { ...analytics, ...advanced };
    const scores = {
      fomoScore: behavioral.fomo.fomoScore,
      revengeScore: behavioral.revenge.revengeScore,
      discipline: behavioral.scores.discipline,
      consistency: behavioral.scores.consistency,
      lossChasing: behavioral.scores.lossChasing,
    };

    // Run coaching workflow
    const result = await this.workflow.run(combinedAnalytics, scores);

    // Persist coaching session
    await db.insert(coachingSessions).values({
      userId,
      severity: result.severity,
      triggers: result.triggers,
      message: result.coachingMessage,
      analyticsSnapshot: combinedAnalytics,
    });

    // If critical severity, also embed for semantic search
    if (result.severity === 'critical') {
      await this.embeddingService.embedAndStore(
        userId,
        'coaching',
        `coaching_${Date.now()}`,
        result.coachingMessage,
      );
    }

    this.logger.log(`Coaching session for user ${userId}: severity=${result.severity}, triggers=${result.triggers.length}`);
    return result;
  }

  async getCoachingHistory(userId: string, limit = 10): Promise<Array<{ id: string; severity: string; message: string; triggers: string[]; createdAt: Date }>> {
    const sessions = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.userId, userId))
      .orderBy(coachingSessions.createdAt)
      .limit(limit);

    return sessions.map(s => ({
      id: s.id,
      severity: s.severity,
      message: s.message,
      triggers: s.triggers as string[],
      createdAt: s.createdAt,
    }));
  }

  async getActiveCoaching(userId: string): Promise<{ severity: string; message: string; triggers: string[] } | null> {
    const latest = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.userId, userId))
      .orderBy(coachingSessions.createdAt)
      .limit(1);

    if (latest.length === 0) return null;

    const s = latest[0];
    return {
      severity: s.severity,
      message: s.message,
      triggers: s.triggers as string[],
    };
  }
}
```

### Step 4: Add REST endpoints
Add to `apps/api/src/chat/chat.controller.ts`:
```typescript
@Post('ai/coaching/evaluate')
async evaluateCoaching(@CurrentUser('id') userId: string) {
  return this.coachingEngineService.evaluateAndCoach(userId);
}

@Get('ai/coaching/history')
async getCoachingHistory(
  @CurrentUser('id') userId: string,
  @Query('limit') limit?: string,
) {
  return this.coachingEngineService.getCoachingHistory(userId, parseInt(limit) || 10);
}

@Get('ai/coaching/active')
async getActiveCoaching(@CurrentUser('id') userId: string) {
  return this.coachingEngineService.getActiveCoaching(userId);
}
```

### Step 5: Add tRPC procedures
Add to `apps/api/src/trpc/trades.router.ts`:
```typescript
evaluateCoaching: protectedProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ input }) => {
    return coachingEngineService.evaluateAndCoach(input.userId);
  }),

getCoachingHistory: protectedProcedure
  .input(z.object({ userId: z.string(), limit: z.number().optional() }))
  .query(async ({ input }) => {
    return coachingEngineService.getCoachingHistory(input.userId, input.limit || 10);
  }),
```

### Step 6: Register service in app.module.ts
Add `CoachingEngineService` to providers.

### Step 7: Verify TypeScript compiles
```bash
cd apps/api && npx tsc --noEmit
```

### Step 8: Run lint
```bash
npm run lint -- --filter=api
```

### Step 9: Commit
```bash
git add apps/api/migrations/015_coaching_sessions.sql apps/api/src/db/schema/index.ts apps/api/src/ai/coaching-engine.service.ts apps/api/src/chat/chat.controller.ts apps/api/src/trpc/trades.router.ts apps/api/src/app.module.ts
git commit -m "feat: AI coaching engine with hybrid deterministic + AI approach (TZ-064)

- CoachingWorkflow: evaluates 10+ deterministic triggers
- Severity assessment: low/medium/critical
- AI-generated personalized coaching messages
- Coaching sessions persisted with analytics snapshot
- REST + tRPC endpoints for evaluation and history
- Critical sessions embedded for semantic search"
```

---

## Execution Order

```
TZ-061 (LangGraph foundation)
    │
    ├──→ TZ-062 (journal intelligence)
    └──→ TZ-064 (coaching engine)
```

## Verification Checklist

- [ ] LangGraph workflows compile and run
- [ ] JournalAnalysisWorkflow produces sentiment, patterns, insights, summary
- [ ] CoachingWorkflow evaluates triggers and generates coaching message
- [ ] AI insights persisted in ai_insights table
- [ ] Coaching sessions persisted in coaching_sessions table
- [ ] REST endpoints return correct data
- [ ] TypeScript compiles with zero errors
- [ ] npm run lint passes

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LangGraph dependency conflicts | Test installation in isolation first |
| OpenRouter API rate limits | Async via BullMQ, retry with backoff |
| LLM output parsing failures | Fallback to regex split if JSON parse fails |
| Coaching message quality | Severity-based system prompts for different tones |
| Memory bloat from embeddings | Limit embeddings to summaries, not raw data |
