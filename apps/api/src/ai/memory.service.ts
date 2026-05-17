import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

export interface MemoryContext {
  journals: string[];
  trades: string[];
  notes: string[];
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger('MemoryService');

  constructor(private readonly embeddingService: EmbeddingService) {}

  async getContextForChat(userId: string, userMessage: string, limit = 3): Promise<MemoryContext> {
    const memories = await this.embeddingService.searchSimilar(userId, userMessage, limit * 3);

    const context: MemoryContext = { journals: [], trades: [], notes: [] };

    for (const memory of memories) {
      const sim = memory.similarity;
      if (sim < 0.7) continue;

      switch (memory.sourceType) {
        case 'journal':
          context.journals.push(memory.content);
          break;
        case 'trade':
          context.trades.push(memory.content);
          break;
        case 'note':
          context.notes.push(memory.content);
          break;
      }
    }

    return context;
  }

  async embedNewJournal(userId: string, journalId: string, content: string): Promise<void> {
    try {
      await this.embeddingService.embedAndStore(userId, 'journal', journalId, content);
    } catch (error) {
      this.logger.error(`Failed to embed journal ${journalId}: ${(error as Error).message}`);
    }
  }

  async embedNewTrade(userId: string, tradeId: string, content: string): Promise<void> {
    try {
      await this.embeddingService.embedAndStore(userId, 'trade', tradeId, content);
    } catch (error) {
      this.logger.error(`Failed to embed trade ${tradeId}: ${(error as Error).message}`);
    }
  }
}
