import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeService } from '../knowledge.service';
import { DocumentEmbedder } from './embedder';

export interface IndexingJob {
  documentId: string;
  userId: string;
}

@Injectable()
export class KnowledgeIndexingWorker {
  private readonly logger = new Logger(KnowledgeIndexingWorker.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly embedder: DocumentEmbedder,
  ) {}

  async processDocument(job: IndexingJob): Promise<void> {
    const { documentId, userId } = job;

    this.logger.log(`Starting indexing for document ${documentId}`);

    try {
      // Stage 1: Fetch document
      const doc = await this.knowledgeService.getDocument(userId, documentId);
      if (!doc) {
        this.logger.warn(`Document ${documentId} not found, skipping`);
        return;
      }

      // Stage 2: Chunk and embed
      const content = doc.content || '';
      if (content.length === 0) {
        this.logger.debug(
          `Document ${documentId} has no content, skipping embed`,
        );
        return;
      }

      const result = await this.embedder.embedDocument(
        userId,
        documentId,
        content,
      );

      // Stage 3: Log results
      this.logger.log(
        `Document ${documentId} indexed: ${result.chunksEmbedded} chunks embedded, ${result.skipped} skipped`,
      );

      // Future: Refresh relations, emit events, etc.
    } catch (e) {
      this.logger.error(`Failed to index document ${documentId}: ${e}`);
    }
  }

  async removeDocument(documentId: string): Promise<void> {
    await this.embedder.removeEmbeddings(documentId);
    this.logger.log(`Removed embeddings for document ${documentId}`);
  }
}
