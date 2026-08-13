import { Injectable, Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { embeddings } from '@tradezen/db';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { UserSettingsService } from '../user-settings/user-settings.service';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger('EmbeddingService');
  private readonly embeddingModel =
    process.env.EMBEDDING_MODEL?.trim() || 'openai/text-embedding-3-small';

  constructor(private readonly userSettings: UserSettingsService) {}

  async generateEmbedding(userId: string, text: string): Promise<number[]> {
    const creds = await this.userSettings.getDecryptedApiKey(userId);
    const cloudApiKey = creds?.key;
    if (!cloudApiKey) {
      throw new Error(
        'No API key configured for this user. Add one in Settings.',
      );
    }
    const cloudBaseUrl = creds?.baseUrl ?? 'https://openrouter.ai/api/v1';
    const response = await fetch(`${cloudBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cloudApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.embeddingModel, input: [text] }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async storeEmbedding(
    userId: string,
    sourceType: string,
    sourceId: string,
    content: string,
    embedding: number[],
  ): Promise<void> {
    await db.insert(embeddings).values({
      userId,
      sourceType,
      sourceId,
      content,
      embedding,
    });
  }

  async embedAndStore(
    userId: string,
    sourceType: string,
    sourceId: string,
    content: string,
  ): Promise<void> {
    const embedding = await this.generateEmbedding(userId, content);
    await this.storeEmbedding(userId, sourceType, sourceId, content, embedding);
  }

  async searchSimilar(
    userId: string,
    query: string,
    limit = 5,
    sourceType?: string,
  ): Promise<
    Array<{
      sourceType: string;
      sourceId: string;
      content: string;
      similarity: number;
    }>
  > {
    const queryEmbedding = await this.generateEmbedding(userId, query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const conditions = [eq(embeddings.userId, userId)];
    if (sourceType) {
      conditions.push(eq(embeddings.sourceType, sourceType));
    }

    const results = await db.execute(sql`
      SELECT source_type as "sourceType", source_id as "sourceId", content, 1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM embeddings
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);

    return results as unknown as Array<{
      sourceType: string;
      sourceId: string;
      content: string;
      similarity: number;
    }>;
  }
}
