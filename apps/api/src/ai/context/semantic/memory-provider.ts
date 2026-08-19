import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SemanticRetrievalService } from './semantic-retrieval.service';
import { DefaultMemoryFormatter } from './memory-formatter';
import { SemanticMetricsService } from './semantic-metrics.service';
import { RetrievalIntent, type SemanticResult } from './types';
import { RetrievalClient } from '../../retrieval-client';
import type {
  ContextProvider,
  ContextRequest,
  ContextBlock,
  ProviderCapability,
  ScoringRule,
  ProviderScore,
} from '../context-provider';

@Injectable()
export class MemoryProvider implements ContextProvider {
  id = 'memory';
  priority = 15;
  timeoutMs = 300;
  cacheMs = 30_000;

  private formatter = new DefaultMemoryFormatter();

  constructor(
    private readonly semantic: SemanticRetrievalService,
    private readonly retrievalClient: RetrievalClient,
    private readonly metricsService: SemanticMetricsService,
  ) {}

  capabilities(): ProviderCapability[] {
    return [
      {
        id: 'memory',
        description: 'Semantic memory retrieval',
        patterns: ['memory'],
      },
    ];
  }

  // Regex gating retired (Slice 4): the QueryPlanner decides whether RAG runs,
  // by intent / factual-question routing, not keyword heuristics.
  scoringRules(): ScoringRule[] {
    return [];
  }

  score(_request: ContextRequest, _lastUserMessage?: string): ProviderScore {
    // Neutral score — selection is planner-owned.
    return { provider: this.id, score: 0.5, reasons: ['planner-selected'] };
  }

  dataCompleteness(block: ContextBlock | null, _: ContextRequest): number {
    if (!block) return 0;
    const hasResults = /similarity/.test(block.content);
    return hasResults ? 0.8 : 0.2;
  }

  supports(request: ContextRequest): boolean {
    if (request.providers && !request.providers.includes('memory'))
      return false;
    return true;
  }

  async build(
    userId: string,
    _request: ContextRequest,
    lastUserMessage?: string,
  ): Promise<ContextBlock> {
    if (!lastUserMessage) {
      return this.formatter.format([]);
    }

    // Slice 5/6: RetrievalClient (Python /retrieval) when enabled; shadow mode
    // runs both paths and serves the old result. SemanticRetrievalService stays
    // the default until the cutover is validated.
    if (this.retrievalClient.shouldCall()) {
      const requestId = randomUUID();
      const newStart = Date.now();
      const newResult = await this.retrievalClient.search(userId, {
        query: lastUserMessage,
        intent: RetrievalIntent.CHAT,
        requestId,
      });
      const newLatencyMs = Date.now() - newStart;
      const newBlock = this.formatter.format(
        this.toSemanticResults(newResult.documents),
      );

      // Shadow evaluation (Slice 6): serve the old result, record the comparison.
      if (this.retrievalClient.isShadow()) {
        const oldStart = Date.now();
        const oldResults = await this.semantic.retrieve(
          userId,
          lastUserMessage,
          RetrievalIntent.CHAT,
        );
        const oldLatencyMs = Date.now() - oldStart;
        const oldBlock = this.formatter.format(oldResults);

        this.metricsService.recordShadowComparison({
          oldLatencyMs,
          newLatencyMs,
          oldCount: oldResults.length,
          newCount: newResult.documents.length,
          oldAvgScore: average(oldResults.map((r) => r.similarity)),
          newAvgScore: average(newResult.documents.map((d) => d.score)),
          oldTokens: oldBlock.tokens,
          newTokens: newBlock.tokens,
          degraded: newResult.debug.degraded ?? false,
        });
        return oldBlock;
      }

      return newBlock;
    }

    const results = await this.semantic.retrieve(
      userId,
      lastUserMessage,
      RetrievalIntent.CHAT,
    );

    return this.formatter.format(results);
  }

  private toSemanticResults(
    documents: Array<{
      documentId: string;
      sourceId?: string;
      sourceType: string;
      title?: string;
      content: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>,
  ): SemanticResult[] {
    return documents.map((doc) => ({
      id: doc.sourceId ?? doc.documentId,
      sourceType: doc.sourceType as SemanticResult['sourceType'],
      title: doc.title ?? doc.content.slice(0, 80),
      content: doc.content,
      similarity: doc.score,
      metadata: doc.metadata ?? {},
    }));
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
