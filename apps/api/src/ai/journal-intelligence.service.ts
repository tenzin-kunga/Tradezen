import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { aiInsights } from '@tradezen/db';
import { eq, desc, and } from 'drizzle-orm';
import { JournalAnalysisWorkflow } from './workflows/journal-analysis.workflow';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class JournalIntelligenceService {
  private readonly logger = new Logger('JournalIntelligence');

  constructor(
    private readonly workflow: JournalAnalysisWorkflow,
    private readonly embeddingService: EmbeddingService,
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

    await this.embeddingService.embedAndStore(
      userId,
      'ai_insight',
      `journal_analysis_${Date.now()}`,
      result.summary,
    );

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
