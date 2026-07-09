import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../db/drizzle';
import { embeddings } from '@tradezen/db';
import { eq, and } from 'drizzle-orm';
import { EmbeddingService } from '../../ai/embedding.service';
import { chunkText, computeContentHash, type ChunkingConfig } from './chunker';

@Injectable()
export class DocumentEmbedder {
  private readonly logger = new Logger(DocumentEmbedder.name);

  constructor(private readonly embeddingService: EmbeddingService) {}

  async embedDocument(
    userId: string,
    documentId: string,
    content: string,
    config: Partial<ChunkingConfig> = {},
  ): Promise<{ chunksEmbedded: number; skipped: number }> {
    const contentHash = computeContentHash(content);

    // Check if already embedded with same content
    const existing = await db
      .select({ contentHash: embeddings.contentHash })
      .from(embeddings)
      .where(
        and(
          eq(embeddings.userId, userId),
          eq(embeddings.sourceType, 'knowledge_document'),
          eq(embeddings.sourceId, documentId),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0].contentHash === contentHash) {
      this.logger.debug(`Document ${documentId} unchanged, skipping embed`);
      return { chunksEmbedded: 0, skipped: 1 };
    }

    // Remove old embeddings for this document
    await db
      .delete(embeddings)
      .where(
        and(
          eq(embeddings.userId, userId),
          eq(embeddings.sourceType, 'knowledge_document'),
          eq(embeddings.sourceId, documentId),
        ),
      );

    // Chunk the content
    const chunks = chunkText(content, config);

    if (chunks.length === 0) {
      return { chunksEmbedded: 0, skipped: 0 };
    }

    // Embed each chunk
    let embedded = 0;
    for (const chunk of chunks) {
      try {
        const vector = await this.embeddingService.generateEmbedding(
          chunk.content,
        );
        await db.insert(embeddings).values({
          userId,
          sourceType: 'knowledge_document',
          sourceId: documentId,
          chunkIndex: chunk.index,
          content: chunk.content,
          contentHash,
          embedding: vector,
          embeddingModel: 'text-embedding-3-small',
          embeddingVersion: 1,
          metadata: {
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
          },
        });
        embedded++;
      } catch (e) {
        this.logger.error(
          `Failed to embed chunk ${chunk.index} for document ${documentId}: ${e}`,
        );
      }
    }

    this.logger.log(
      `Embedded document ${documentId}: ${embedded}/${chunks.length} chunks`,
    );
    return { chunksEmbedded: embedded, skipped: 0 };
  }

  async removeEmbeddings(documentId: string): Promise<void> {
    await db
      .delete(embeddings)
      .where(
        and(
          eq(embeddings.sourceType, 'knowledge_document'),
          eq(embeddings.sourceId, documentId),
        ),
      );
  }
}
