import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { db } from '../db/drizzle';
import { aiInsights } from '@tradezen/db';
import { eq, desc, and } from 'drizzle-orm';
import { JournalAnalysisWorkflow } from './workflows/journal-analysis.workflow';
import type { EmbeddingPipeline } from './context/semantic/embedding-pipeline';
import { SemanticSourceType } from './context/semantic/types';
import { FormatterRegistry } from './context/semantic/formatters/registry';

@Injectable()
export class JournalIntelligenceService {
  private readonly logger = new Logger('JournalIntelligence');

  constructor(
    private readonly workflow: JournalAnalysisWorkflow,
    @Inject('EmbeddingPipeline') private readonly pipeline: EmbeddingPipeline,
    private readonly formatterRegistry: FormatterRegistry,
  ) {}

  async analyzeJournals(
    userId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<{
    sentiment: string;
    patterns: string[];
    insights: string[];
    summary: string;
  }> {
    const result = await this.workflow.run(userId, dateFrom, dateTo);

    const [insight] = await db
      .insert(aiInsights)
      .values({
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
      })
      .returning({ id: aiInsights.id });

    try {
      const formatter = this.formatterRegistry.get(
        SemanticSourceType.AI_INSIGHT,
      );
      if (formatter) {
        await this.pipeline.enqueue(
          formatter.format(
            {
              id: insight.id,
              insightType: 'journal_analysis',
              content: result.summary,
              metadata: {
                sentiment: result.sentiment,
                patterns: result.patterns,
                insights: result.insights,
                dateFrom,
                dateTo,
              },
            },
            userId,
          ),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to embed insight ${insight.id}: ${(error as Error).message}`,
      );
    }

    this.logger.log(`Journal analysis complete for user ${userId}`);
    return result;
  }

  async getInsights(
    userId: string,
    type?: string,
    limit = 10,
  ): Promise<
    Array<{
      id: string;
      type: string;
      content: string;
      metadata: unknown;
      createdAt: Date | null;
    }>
  > {
    const conditions = [eq(aiInsights.userId, userId)];
    if (type) {
      conditions.push(eq(aiInsights.insightType, type));
    }

    const results = await db
      .select()
      .from(aiInsights)
      .where(and(...conditions))
      .orderBy(desc(aiInsights.createdAt))
      .limit(limit);

    return results.map((r) => ({
      id: r.id,
      type: r.insightType,
      content: r.content,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }));
  }
}
