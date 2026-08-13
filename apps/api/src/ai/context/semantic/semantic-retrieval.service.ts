import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmbeddingRepository } from './embedding-repository';
import { EmbeddingService } from '../../embedding.service';
import { ProfileRegistry } from './profile-registry';
import { SemanticMetricsService } from './semantic-metrics.service';
import {
  RetrievalIntent,
  type SemanticResult,
  type SemanticSourceType,
} from './types';

@Injectable()
export class SemanticRetrievalService {
  private readonly logger = new Logger(SemanticRetrievalService.name);

  constructor(
    @Inject('EmbeddingRepository')
    private readonly repository: EmbeddingRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly profileRegistry: ProfileRegistry,
    private readonly metricsService: SemanticMetricsService,
  ) {}

  async retrieve(
    userId: string,
    query: string,
    intent: RetrievalIntent = RetrievalIntent.CHAT,
  ): Promise<SemanticResult[]> {
    const start = Date.now();
    const profile = this.profileRegistry.get(intent);
    const queryVector = await this.embeddingService.generateEmbedding(
      userId,
      query,
    );
    const records = await this.repository.search(
      userId,
      queryVector,
      profile.maxResults,
      profile.similarityThreshold,
    );

    // Deduplicate by sourceId, keeping highest similarity
    const seen = new Map<string, SemanticResult>();
    const similarities: number[] = [];
    for (const r of records) {
      similarities.push(r.similarity);
      const existing = seen.get(r.sourceId);
      if (!existing || r.similarity > existing.similarity) {
        seen.set(r.sourceId, {
          id: r.sourceId,
          sourceType: r.sourceType as SemanticSourceType,
          title: (r.metadata?.title as string) ?? r.content.slice(0, 80),
          content: r.content,
          similarity: r.similarity,
          metadata: r.metadata,
        });
      }
    }

    const latency = Date.now() - start;
    this.metricsService.recordRetrieval(latency, similarities);

    return Array.from(seen.values()).sort(
      (a, b) => b.similarity - a.similarity,
    );
  }

  async removeIndex(sourceType: string, sourceId: string): Promise<void> {
    await this.repository.remove(sourceType, sourceId);
  }

  async countEmbeddings(userId: string): Promise<number> {
    return this.repository.countByUser(userId);
  }
}
