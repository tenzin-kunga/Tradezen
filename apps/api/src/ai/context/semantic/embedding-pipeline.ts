import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SemanticDocument, EmbeddingEvent } from './types';
import { DefaultChunkingStrategy, type ChunkingStrategy } from './chunker';
import type { EmbeddingRepository } from './embedding-repository';
import { EmbeddingService } from '../../embedding.service';
import { SemanticMetricsService } from './semantic-metrics.service';

export interface EmbeddingPipeline {
  enqueue(doc: SemanticDocument): Promise<void>;
  handleEvent(event: EmbeddingEvent): Promise<void>;
}

@Injectable()
export class ImmediateEmbeddingPipeline implements EmbeddingPipeline {
  private readonly logger = new Logger(ImmediateEmbeddingPipeline.name);
  private readonly chunker: ChunkingStrategy;

  constructor(
    @Inject('EmbeddingRepository')
    private readonly repository: EmbeddingRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly metricsService: SemanticMetricsService,
  ) {
    this.chunker = new DefaultChunkingStrategy();
  }

  async enqueue(doc: SemanticDocument): Promise<void> {
    const start = Date.now();
    try {
      const chunks = this.chunker.chunk(doc.content);
      if (chunks.length === 0) return;

      const vectors = await Promise.all(
        chunks.map((c) =>
          this.embeddingService.generateEmbedding(doc.userId, c.content),
        ),
      );

      await this.repository.store(doc, chunks, vectors);
      const latency = Date.now() - start;
      this.metricsService.recordEmbedding(
        doc.sourceType,
        latency,
        chunks.length,
      );
      this.logger.debug(
        `Indexed ${doc.sourceType}:${doc.id} (${chunks.length} chunks, ${latency}ms)`,
      );
    } catch (e) {
      this.logger.error(`Failed to index ${doc.sourceType}:${doc.id}: ${e}`);
    }
  }

  async handleEvent(event: EmbeddingEvent): Promise<void> {
    if (event.operation === 'DELETE') {
      await this.repository.remove(event.sourceType, event.sourceId);
    }
    // CREATE and UPDATE are handled by enqueue() — callers pass the full document
  }
}
