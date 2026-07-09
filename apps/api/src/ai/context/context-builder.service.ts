import { Injectable, Logger } from '@nestjs/common';
import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  BuiltContext,
} from './context-provider';
import type { RetrievalTrace } from './retrieval-pipeline';
import { TradesProvider } from './providers/trades.provider';
import { AnalyticsProvider } from './providers/analytics.provider';
import { ResearchProvider } from './providers/research.provider';
import { DocumentsProvider } from './providers/documents.provider';
import { PortfolioProvider } from './providers/portfolio.provider';
import { NewsProvider } from './providers/news.provider';
import { MemoryProvider } from './semantic/memory-provider';
import { RetrievalPipeline } from './retrieval-pipeline';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);
  private readonly providers: ContextProvider[];
  private readonly pipeline: RetrievalPipeline;
  private readonly cache = new Map<
    string,
    { blocks: ContextBlock[]; expiresAt: number; trace?: RetrievalTrace }
  >();

  constructor(
    trades: TradesProvider,
    analytics: AnalyticsProvider,
    research: ResearchProvider,
    documents: DocumentsProvider,
    portfolio: PortfolioProvider,
    news: NewsProvider,
    memory: MemoryProvider,
  ) {
    this.providers = [
      trades,
      memory,
      analytics,
      research,
      documents,
      portfolio,
      news,
    ].sort((a, b) => a.priority - b.priority);
    this.pipeline = new RetrievalPipeline(this.providers);
  }

  async buildContext(
    userId: string,
    request: ContextRequest = {},
    lastUserMessage?: string,
  ): Promise<BuiltContext> {
    const cacheKey = `${userId}:${JSON.stringify(request)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return this.assembleResult(cached.blocks, [], cached.trace);
    }

    const { blocks, trace } = await this.pipeline.execute(
      userId,
      request,
      lastUserMessage,
    );

    // Cache with provider-specific TTLs
    const minCache = Math.min(
      ...this.providers
        .filter((p) => p.supports(request))
        .map((p) => p.cacheMs),
      60_000,
    );
    this.cache.set(cacheKey, {
      blocks,
      expiresAt: Date.now() + minCache,
      trace,
    });

    const skipped = this.providers
      .filter((p) => !p.supports(request))
      .map((p) => p.id);

    return this.assembleResult(blocks, skipped, trace);
  }

  async previewContext(
    userId: string,
    request: ContextRequest = {},
  ): Promise<BuiltContext> {
    return this.buildContext(userId, request);
  }

  private assembleResult(
    blocks: ContextBlock[],
    skipped: string[],
    trace?: RetrievalTrace,
  ): BuiltContext {
    return {
      blocks,
      totalTokens: blocks.reduce((s, b) => s + b.tokens, 0),
      warnings: trace?.warnings ?? [],
      metadata: {
        providersUsed: blocks.map((b) => b.source),
        providersSkipped: skipped,
        latencies: trace?.latencies ?? {},
        retrievalTrace: trace,
      },
    };
  }
}
