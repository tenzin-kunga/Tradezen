import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { aiInsights } from '@tradezen/db';
import { desc, eq } from 'drizzle-orm';
import { TradesService } from '../trades/trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { AIClient } from './ai-client';
import {
  buildInsightContext,
  InsightContext,
} from './insights/insight-context';
import {
  InsightCard,
  InsightCandidate,
  InsightSourceId,
} from './insights/insight-source';
import { RULES } from './insights/rules';
import { CoachingPushPolicy, PushCandidate } from './insights/push-policy';
import {
  CACHE_TTL_MS,
  MIN_TOTAL_TRADES,
  MAX_INSIGHTS,
  MAX_RISK_CARDS,
} from './insights/thresholds';

const NARRATIVE_TYPE = 'portfolio_narrative';

const NARRATIVE_SYSTEM_PROMPT = `You are a trading journal coach. Write a concise portfolio summary of at most 2 short paragraphs (max 80 words). No greetings, no financial advice, no questions. Mention only observations supported by the supplied data. Do not repeat the insight cards verbatim.`;

export interface InsightsResponse {
  insights: InsightCard[];
  narrative?: string;
  generatedAt: string;
}

interface CandidateCacheEntry {
  ctx: InsightContext;
  candidates: InsightCandidate[];
  expiresAt: number;
}

interface InsightMetadata {
  ruleId?: string;
  title?: string;
  pushable?: boolean;
  source?: InsightSourceId;
}

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger('AiInsightsService');

  // In-memory candidate cache (TTL 6h). Shared by getInsights and
  // getCoachingPush so a trade event never triggers a full analytics rebuild.
  // ponytail: single instance only; multi-instance deployments need Redis.
  private readonly candidateCache = new Map<string, CandidateCacheEntry>();

  constructor(
    private readonly tradesService: TradesService,
    private readonly behavioralService: BehavioralService,
    private readonly portfolioService: PortfolioService,
    private readonly aiClient: AIClient,
    private readonly pushPolicy: CoachingPushPolicy,
  ) {}

  async getInsights(userId: string): Promise<InsightsResponse> {
    const cached = await this.getCached(userId);
    if (cached) return cached;

    const { ctx, candidates } = await this.buildCandidates(userId);

    const totalTrades = ctx.analytics.totalTrades ?? 0;
    if (totalTrades < MIN_TOTAL_TRADES) {
      return {
        insights: [],
        narrative: undefined,
        generatedAt: new Date().toISOString(),
      };
    }

    const selected = selectTopInsights(candidates);
    const cards = selected.map((c) => c.card);

    const narrative = await this.generateNarrative(ctx, cards);

    await this.storeInsights(userId, selected, narrative);
    return {
      insights: cards,
      narrative: narrative ?? undefined,
      generatedAt: new Date().toISOString(),
    };
  }

  // Proactive coaching entry point. Reuses the cached candidates so it costs
  // no extra analytics queries, and lets the PushPolicy decide whether the
  // highest-priority pushable insight deserves to interrupt the user.
  async getCoachingPush(userId: string): Promise<PushCandidate | null> {
    const { candidates } = await this.buildCandidates(userId);
    return this.pushPolicy.evaluate(userId, candidates);
  }

  private async buildCandidates(userId: string): Promise<CandidateCacheEntry> {
    this.evictExpiredCache();
    const hit = this.candidateCache.get(userId);
    if (hit && hit.expiresAt > Date.now()) return hit;

    const ctx = await buildInsightContext(userId, {
      tradesService: this.tradesService,
      behavioralService: this.behavioralService,
      portfolioService: this.portfolioService,
    });

    const candidates = RULES.flatMap((rule) => rule.generate(ctx));
    const entry: CandidateCacheEntry = {
      ctx,
      candidates,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    this.candidateCache.set(userId, entry);
    return entry;
  }

  private async getCached(userId: string): Promise<InsightsResponse | null> {
    const rows = await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.userId, userId))
      .orderBy(desc(aiInsights.createdAt));

    const cardRows = rows.filter((r) => r.insightType !== NARRATIVE_TYPE);
    const narrativeRow = rows.find((r) => r.insightType === NARRATIVE_TYPE);

    if (cardRows.length === 0) return null;

    const newest = new Date(cardRows[0].createdAt ?? 0).getTime();
    if (Date.now() - newest >= CACHE_TTL_MS) return null;

    const cards: InsightCard[] = cardRows.slice(0, MAX_INSIGHTS).map((r) => {
      const md = r.metadata as InsightMetadata | null;
      return {
        id: r.id,
        ruleId: md?.ruleId ?? '',
        category: (r.insightType as InsightCard['category']) || 'performance',
        title: md?.title ?? '',
        message: r.content,
        metrics: (r.metadata ?? {}) as Record<string, unknown>,
        pushable: md?.pushable ?? false,
        source: md?.source ?? 'analytics',
        createdAt: (r.createdAt ?? new Date()).toISOString(),
      };
    });

    const generatedAt = cardRows.reduce(
      (latest, r) => Math.max(latest, new Date(r.createdAt ?? 0).getTime()),
      0,
    );

    return {
      insights: cards,
      narrative: narrativeRow?.content ?? undefined,
      generatedAt: new Date(generatedAt).toISOString(),
    };
  }

  private async generateNarrative(
    ctx: InsightContext,
    cards: InsightCard[],
  ): Promise<string | null> {
    try {
      const response = await this.aiClient.complete(
        [
          { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
          { role: 'user', content: buildNarrativeContext(ctx, cards) },
        ],
        { temperature: 0.3, timeoutMs: 15000 },
      );
      const text = response.content?.trim();
      return text ? text : null;
    } catch (err) {
      this.logger.warn(`Portfolio narrative generation failed: ${String(err)}`);
      return null;
    }
  }

  private async storeInsights(
    userId: string,
    selected: InsightCandidate[],
    narrative: string | null,
  ): Promise<void> {
    for (const c of selected) {
      await db.insert(aiInsights).values({
        userId,
        insightType: c.card.category,
        content: c.card.message,
        metadata: {
          ...c.card.metrics,
          ruleId: c.card.ruleId,
          title: c.card.title,
          priority: c.priority,
          pushable: c.card.pushable,
          source: c.card.source,
        },
      });
    }

    if (narrative) {
      await db.insert(aiInsights).values({
        userId,
        insightType: NARRATIVE_TYPE,
        content: narrative,
        metadata: {},
      });
    }
  }

  private evictExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.candidateCache) {
      if (entry.expiresAt <= now) {
        this.candidateCache.delete(key);
      }
    }
  }
}

function selectTopInsights(candidates: InsightCandidate[]): InsightCandidate[] {
  const sorted = [...candidates].sort((a, b) => a.priority - b.priority);

  const seen = new Set<string>();
  let riskCount = 0;
  const out: InsightCandidate[] = [];

  for (const c of sorted) {
    const cat = c.card.category;
    if (cat === 'risk') {
      if (riskCount >= MAX_RISK_CARDS) continue;
      riskCount++;
    } else if (seen.has(cat)) {
      continue;
    }
    seen.add(cat);
    out.push(c);
    if (out.length >= MAX_INSIGHTS) break;
  }

  return out;
}

function buildNarrativeContext(
  ctx: InsightContext,
  cards: InsightCard[],
): string {
  const p = ctx.portfolio.summary;
  const topSymbol = ctx.portfolio.symbols[0];
  const topStrategy = ctx.portfolio.strategies[0];

  const lines = [
    `Total trades: ${p.totalTrades ?? 0}`,
    `Realized P&L: ${fmt(p.realizedPnl)}`,
    `Win rate: ${typeof p.winRate === 'number' ? p.winRate.toFixed(1) : 0}%`,
    `Profit factor: ${typeof p.profitFactor === 'number' ? p.profitFactor : 0}`,
    `Symbols traded: ${ctx.portfolio.symbols.length}`,
    `Strategies: ${ctx.portfolio.strategies.length}`,
    `Top symbol by P&L: ${topSymbol?.symbol ?? 'n/a'} (${topSymbol?.allocationPct?.toFixed?.(0) ?? 0}% allocation)`,
    `Top strategy by P&L: ${topStrategy?.strategy ?? 'n/a'}`,
    `Long/short trades: ${ctx.portfolio.byDirection.long}/${ctx.portfolio.byDirection.short}`,
    `Insight cards: ${cards.map((c) => `${c.category}: ${c.message}`).join(' | ')}`,
  ];

  return lines.join('\n');
}

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(Number(n)).toFixed(0)}`;
}
