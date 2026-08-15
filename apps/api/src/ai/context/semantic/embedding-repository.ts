import { Injectable } from '@nestjs/common';
import { db } from '../../../db/drizzle';
import { embeddings } from '@tradezen/db';
import { eq, and, sql } from 'drizzle-orm';
import { rowsOf } from '../../corpus-baseline.service';
import type { SemanticDocument, EmbeddingRecord } from './types';
import type { Chunk } from './chunker';

export interface ModelInfo {
  model: string;
  version: number;
}

export interface EmbeddingRepository {
  store(
    doc: SemanticDocument,
    chunks: Chunk[],
    vectors: number[][],
    modelInfo: ModelInfo,
  ): Promise<void>;
  search(
    userId: string,
    queryVector: number[],
    limit: number,
    threshold: number,
  ): Promise<EmbeddingRecord[]>;
  remove(sourceType: string, sourceId: string): Promise<void>;
  countByUser(userId: string): Promise<number>;
}

@Injectable()
export class PostgresEmbeddingRepository implements EmbeddingRepository {
  async store(
    doc: SemanticDocument,
    chunks: Chunk[],
    vectors: number[][],
    modelInfo: ModelInfo,
  ): Promise<void> {
    // Remove old embeddings for this source
    await this.remove(doc.sourceType, doc.id);

    for (let i = 0; i < chunks.length; i++) {
      await db.insert(embeddings).values({
        userId: doc.userId,
        sourceType: doc.sourceType,
        sourceId: doc.id,
        chunkIndex: chunks[i].index,
        content: chunks[i].content,
        embedding: vectors[i],
        embeddingModel: modelInfo.model,
        embeddingVersion: modelInfo.version,
        metadata: {
          ...doc.metadata,
          ...(doc.provenance ? { provenance: doc.provenance } : {}),
          ...(doc.createdAt ? { createdAt: doc.createdAt } : {}),
          ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {}),
          title: doc.title,
          startOffset: chunks[i].startOffset,
          endOffset: chunks[i].endOffset,
        },
      });
    }
  }

  async search(
    userId: string,
    queryVector: number[],
    limit: number,
    threshold: number,
  ): Promise<EmbeddingRecord[]> {
    const vectorStr = `[${queryVector.join(',')}]`;

    const results = await db.execute(sql`
      SELECT
        id,
        source_type as "sourceType",
        source_id as "sourceId",
        chunk_index as "chunkIndex",
        content,
        1 - (embedding <=> ${vectorStr}::vector) as similarity,
        COALESCE(metadata, '{}') as metadata
      FROM embeddings
      WHERE user_id = ${userId}
        AND 1 - (embedding <=> ${vectorStr}::vector) >= ${threshold}
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);

    return rowsOf(results).map((r: any) => ({
      id: r.id,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      chunkIndex: r.chunkIndex,
      content: r.content,
      similarity: Number(r.similarity),
      metadata:
        typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
    }));
  }

  async remove(sourceType: string, sourceId: string): Promise<void> {
    await db
      .delete(embeddings)
      .where(
        and(
          eq(embeddings.sourceType, sourceType),
          eq(embeddings.sourceId, sourceId),
        ),
      );
  }

  async countByUser(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(embeddings)
      .where(eq(embeddings.userId, userId));
    return result?.count ?? 0;
  }
}
