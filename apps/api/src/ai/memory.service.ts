import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmbeddingPipeline } from './context/semantic/embedding-pipeline';
import { SemanticSourceType } from './context/semantic/types';
import { FormatterRegistry } from './context/semantic/formatters/registry';

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
    private readonly formatterRegistry: FormatterRegistry,
  ) {}

  private async embedEntity(
    sourceType: SemanticSourceType,
    entity: object,
    userId: string,
    label: string,
  ): Promise<void> {
    const formatter = this.formatterRegistry.get(sourceType);
    if (!formatter) return;
    try {
      await this.pipeline.enqueue(formatter.format(entity, userId));
    } catch (error) {
      this.logger.error(
        `Failed to embed ${label} ${(entity as { id?: string }).id}: ${(error as Error).message}`,
      );
    }
  }

  async embedNewJournal(
    userId: string,
    journal: {
      id: string;
      date: string;
      preMarketNotes: string | null;
      postMarketNotes: string | null;
      mood: string | null;
      marketConditions: string | null;
      lessons: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    },
  ): Promise<void> {
    await this.embedEntity(
      SemanticSourceType.JOURNAL,
      journal,
      userId,
      'journal',
    );
  }

  async embedNewTrade(
    userId: string,
    trade: {
      id: string;
      symbol: string;
      direction: string;
      entryPrice: string;
      exitPrice: string;
      pnl: string;
      strategy: string | null;
      notes: string | null;
      lotSize: string | null;
      stopLoss: string | null;
      takeProfit: string | null;
      commission: string | null;
      contractSize: string | null;
      tradeDate: Date | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    },
  ): Promise<void> {
    await this.embedEntity(SemanticSourceType.TRADE, trade, userId, 'trade');
  }
}
