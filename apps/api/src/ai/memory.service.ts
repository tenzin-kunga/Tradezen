import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmbeddingPipeline } from './context/semantic/embedding-pipeline';
import { SemanticSourceType } from './context/semantic/types';

export interface MemoryContext {
  journals: string[];
  trades: string[];
  notes: string[];
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @Inject('EmbeddingPipeline') private readonly pipeline: EmbeddingPipeline,
  ) {}

  async embedNewJournal(
    userId: string,
    journalId: string,
    content: string,
  ): Promise<void> {
    try {
      await this.pipeline.enqueue({
        id: journalId,
        userId,
        sourceType: SemanticSourceType.JOURNAL,
        content,
        metadata: {},
      });
    } catch (error) {
      this.logger.error(
        `Failed to embed journal ${journalId}: ${(error as Error).message}`,
      );
    }
  }

  async embedNewTrade(
    userId: string,
    tradeId: string,
    content: string,
  ): Promise<void> {
    try {
      await this.pipeline.enqueue({
        id: tradeId,
        userId,
        sourceType: SemanticSourceType.TRADE,
        content,
        metadata: {},
      });
    } catch (error) {
      this.logger.error(
        `Failed to embed trade ${tradeId}: ${(error as Error).message}`,
      );
    }
  }
}
